"use client"

import { useEffect, useState } from "react"
import type { CSSProperties } from "react"
import { supabase } from "@/lib/supabaseClient"
import { useRouter, useParams } from "next/navigation"

export default function FichaAmbulancia(){

const router = useRouter()
const params = useParams()
const id = params?.id as string

const [ambulancia,setAmbulancia] = useState<any>(null)
const [historial,setHistorial] = useState<any[]>([])

const [nuevoKm,setNuevoKm] = useState("")
const [kmMtto,setKmMtto] = useState("")

const [mostrarModal,setMostrarModal] = useState(false)
const [estadoPendiente,setEstadoPendiente] = useState("")
const [motivoCambio,setMotivoCambio] = useState("")
const [loading,setLoading] = useState(false)

const [foto,setFoto] = useState<File | null>(null)

/* 🔥 VISOR */
const [fotoVista,setFotoVista] = useState<string | null>(null)

useEffect(()=>{
if(!id) return
cargarTodo()
},[id])

useEffect(()=>{
const interval = setInterval(()=>{
setHistorial(prev => [...prev])
},60000)
return ()=>clearInterval(interval)
},[])

async function cargarTodo(){
await Promise.all([
cargarAmbulancia(),
cargarHistorial()
])
}

async function cargarAmbulancia(){
const {data} = await supabase
.from("ambulancias")
.select("*")
.eq("id",id)
.single()

if(data) setAmbulancia(data)
}

async function cargarHistorial(){
const {data} = await supabase
.from("historial_operativo")
.select("*")
.eq("ambulancia_id",id)
.order("fecha_inicio",{ascending:false})

setHistorial(data || [])
}

/* KM */

async function actualizarKilometraje(){
if(!nuevoKm) return

await supabase
.from("ambulancias")
.update({ kilometraje_actual: Number(nuevoKm) })
.eq("id",id)

setNuevoKm("")
cargarAmbulancia()
}

async function guardarMtto(){
if(!kmMtto) return

await supabase
.from("ambulancias")
.update({ kilometraje_mtto: Number(kmMtto) })
.eq("id",id)

setKmMtto("")
cargarAmbulancia()
}

/* FOTO */

async function subirFoto(): Promise<string | null>{

if(!foto) return null

try{

const nombre = `ambulancia_${id}_${Date.now()}`

const { error } = await supabase.storage
.from("ambulancias")
.upload(nombre, foto, { upsert: true })

if(error){
console.log("ERROR SUBIENDO FOTO:", error)
alert("Error subiendo imagen: " + error.message)
return null
}

const { data } = supabase.storage
.from("ambulancias")
.getPublicUrl(nombre)

return data.publicUrl

}catch(e){
console.log("ERROR GENERAL:", e)
alert("Error inesperado subiendo imagen")
return null
}

}

/* CAMBIO ESTADO */

function abrirCambioEstado(estado:string){
setEstadoPendiente(estado)
setMostrarModal(true)
}

async function confirmarCambioEstado(){

if(loading) return

if(!motivoCambio){
alert("Ingrese motivo")
return
}

setLoading(true)

try{

const usuario = localStorage.getItem("nombre")

const {data:ultimo} = await supabase
.from("historial_operativo")
.select("*")
.eq("ambulancia_id",id)
.order("fecha_inicio",{ascending:false})
.limit(1)

const last = ultimo && ultimo.length > 0 ? ultimo[0] : null

if(last && !last.fecha_fin && last.estado === estadoPendiente){
alert("La ambulancia ya está en ese estado")
setLoading(false)
return
}

if(last && !last.fecha_fin){
await supabase
.from("historial_operativo")
.update({ fecha_fin: new Date().toISOString() })
.eq("id", last.id)
}

const foto_url = await subirFoto()

await supabase
.from("historial_operativo")
.insert({
ambulancia_id:id,
estado:estadoPendiente,
motivo:motivoCambio,
fecha_inicio:new Date().toISOString(),
usuario,
foto_url
})

await supabase
.from("ambulancias")
.update({
estado:estadoPendiente,
motivo_no_operativo:
estadoPendiente === "operativa" ? null : motivoCambio
})
.eq("id",id)

setMostrarModal(false)
setMotivoCambio("")
setFoto(null)

await cargarTodo()

}catch(e){
alert("Error en cambio de estado")
}

setLoading(false)
}

/* VISUAL */

function estadoColor(){
if(ambulancia.estado === "operativa") return "#16a34a"
if(ambulancia.estado === "mantenimiento") return "#f59e0b"
return "#dc2626"
}

function renderAlerta(){
if(ambulancia.estado === "no operativa"){
return <div style={alertRed}>🚨 FUERA DE SERVICIO</div>
}
if(ambulancia.estado === "mantenimiento"){
return <div style={alertYellow}>🔧 EN MANTENIMIENTO</div>
}
return <div style={alertGreen}>✅ OPERATIVA</div>
}

/* 🔥 NUEVO TIEMPO MEJORADO */
function calcularTiempo(i:string,f:string|null){

const inicio = new Date(i)
const fin = f ? new Date(f) : new Date()

const offset = 5 * 60 * 60 * 1000
const diff = (fin.getTime() - inicio.getTime()) + offset

if(diff <= 0) return "0 h"

const totalHoras = Math.floor(diff / (1000*60*60))
const dias = Math.floor(totalHoras / 24)
const horas = totalHoras % 24

if(dias > 0){
return `${dias}d ${horas}h`
}

return `${horas} h`
}

async function eliminarEvento(idEvento:string){
if(!confirm("Eliminar registro?")) return
await supabase.from("historial_operativo").delete().eq("id",idEvento)
cargarHistorial()
}

if(!ambulancia) return <div style={{padding:40}}>Cargando...</div>

return(

<div style={{padding:30,fontFamily:"Arial",maxWidth:900}}>

<h1>🚑 Ficha Mecánica</h1>

<div style={{background:"#e5f3ff",padding:15,borderRadius:10,marginBottom:10}}>
<h2 style={{margin:0}}>
{ambulancia.codigo_operativo} | {ambulancia.placa}
</h2>
</div>

<button onClick={()=>router.push("/dashboard")}>← Volver</button>

<hr/>

<h2>Estado Operativo</h2>

<div style={{background:"#f3f4f6",padding:15,borderRadius:8}}>
<p><b>KM:</b> {ambulancia.kilometraje_actual}</p>
<p><b>Estado:</b> <span style={{color:estadoColor()}}>{ambulancia.estado}</span></p>
{renderAlerta()}
</div>

<div style={{marginTop:15, display:"flex",gap:10}}>
<button onClick={()=>abrirCambioEstado("operativa")} style={btnGreen}>Operativa</button>
<button onClick={()=>abrirCambioEstado("mantenimiento")} style={btnYellow}>Mantenimiento</button>
<button onClick={()=>abrirCambioEstado("no operativa")} style={btnRed}>Fuera servicio</button>
</div>

<hr/>

<h2>Registro Diario</h2>

<input type="number" value={nuevoKm} onChange={(e)=>setNuevoKm(e.target.value)} />
<button onClick={actualizarKilometraje}>Actualizar</button>

<hr/>

<h2>Mantenimiento Preventivo</h2>

<p>Próximo: {ambulancia.kilometraje_mtto || "-"}</p>

<input type="number" value={kmMtto} onChange={(e)=>setKmMtto(e.target.value)} />
<button onClick={guardarMtto}>Guardar</button>

<hr/>

<h2>Historial Operativo</h2>

<table style={{width:"100%",borderCollapse:"collapse"}}>

<thead style={{background:"#f3f4f6"}}>
<tr>
<th>Fecha</th>
<th>Estado</th>
<th>Motivo</th>
<th>Tiempo</th>
<th>Foto</th>
<th></th>
</tr>
</thead>

<tbody>

{historial.map(h=>(
<tr key={h.id} style={{borderBottom:"1px solid #ddd"}}>

<td>{new Date(h.created_at || h.fecha_inicio).toLocaleString()}</td>
<td>{h.estado}</td>
<td>{h.motivo}</td>
<td>{calcularTiempo(h.fecha_inicio,h.fecha_fin)}</td>

<td>
{h.foto_url && (
<img
src={h.foto_url}
style={{width:60,height:60,objectFit:"cover",borderRadius:6,cursor:"pointer"}}
onClick={()=>setFotoVista(h.foto_url)}
/>
)}
</td>

<td>
<button onClick={()=>eliminarEvento(h.id)}>🗑</button>
</td>

</tr>
))}

</tbody>

</table>

{/* VISOR */}
{fotoVista && (
<div style={visorBg} onClick={()=>setFotoVista(null)}>
<img src={fotoVista} style={visorImg}/>
</div>
)}

{/* MODAL */}
{mostrarModal && (
<div style={modalBg}>
<div style={modalBox}>
<h3>Motivo del cambio</h3>

<textarea
value={motivoCambio}
onChange={(e)=>setMotivoCambio(e.target.value)}
style={{width:"100%",height:100}}
/>

<br/><br/>

<input type="file" onChange={(e)=>setFoto(e.target.files?.[0] || null)} />

<br/><br/>

<button 
onClick={confirmarCambioEstado}
disabled={loading}
style={{
opacity: loading ? 0.6 : 1,
cursor: loading ? "not-allowed" : "pointer"
}}
>
{loading ? "Guardando..." : "Confirmar"}
</button>

<button onClick={()=>setMostrarModal(false)} style={{marginLeft:10}}>
Cancelar
</button>

</div>
</div>
)}

</div>
)
}

/* ESTILOS */

const btnGreen: CSSProperties = {background:"#16a34a",color:"white",padding:10,borderRadius:6}
const btnYellow: CSSProperties = {background:"#f59e0b",color:"white",padding:10,borderRadius:6}
const btnRed: CSSProperties = {background:"#dc2626",color:"white",padding:10,borderRadius:6}

const alertGreen: CSSProperties = {background:"#dcfce7",padding:12,borderRadius:6}
const alertYellow: CSSProperties = {background:"#fef9c3",padding:12,borderRadius:6}
const alertRed: CSSProperties = {background:"#fee2e2",padding:12,borderRadius:6}

const modalBg: CSSProperties = {
position:"fixed",
top:0,
left:0,
width:"100%",
height:"100%",
background:"rgba(0,0,0,0.5)",
display:"flex",
justifyContent:"center",
alignItems:"center"
}

const modalBox: CSSProperties = {
background:"white",
padding:20,
width:400,
borderRadius:10
}

const visorBg: CSSProperties = {
position:"fixed",
top:0,
left:0,
width:"100%",
height:"100%",
background:"rgba(0,0,0,0.8)",
display:"flex",
justifyContent:"center",
alignItems:"center",
zIndex:9999
}

const visorImg: CSSProperties = {
maxWidth:"90%",
maxHeight:"90%",
borderRadius:10
}