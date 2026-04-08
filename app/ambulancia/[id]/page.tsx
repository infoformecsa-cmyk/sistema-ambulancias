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

const [tipoMtto,setTipoMtto] = useState("")
const [area,setArea] = useState<string[]>([])
const [foto,setFoto] = useState<File | null>(null)

const [loading,setLoading] = useState(false)
const [editando,setEditando] = useState<any>(null)

/* ========================= */

useEffect(()=>{
if(!id) return
cargarTodo()
},[id])

async function cargarTodo(){
await Promise.all([cargarAmbulancia(),cargarHistorial()])
}

async function cargarAmbulancia(){
const {data} = await supabase.from("ambulancias").select("*").eq("id",id).single()
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

/* ========================= */

function abrirCambioEstado(estado:string){
setEditando(null)
setEstadoPendiente(estado)
setMostrarModal(true)
}

/* ========================= */

async function confirmarCambioEstado(){

if(!estadoPendiente) return

if(!motivoCambio.trim()){
alert("⚠️ Debes ingresar un motivo")
return
}

setLoading(true)

let fotoUrl = null

try{

if(foto){
const nombre = `${Date.now()}_${foto.name}`

const { error } = await supabase.storage
.from("imagenes")
.upload(nombre,foto)

if(!error){
const { data:url } = supabase.storage
.from("imagenes")
.getPublicUrl(nombre)

fotoUrl = url.publicUrl
}
}

await supabase
.from("ambulancias")
.update({ estado: estadoPendiente })
.eq("id",id)

if(editando){

const { error } = await supabase
.from("historial_operativo")
.update({
estado: estadoPendiente,
motivo: motivoCambio.trim(),
tipo_mantenimiento: tipoMtto || null,
area: area.length ? area : null,
})
.eq("id", editando.id)

if(error){
console.error(error)
alert("❌ Error real: " + error.message)
return
}

}else{

const { error: insertError } = await supabase
.from("historial_operativo")
.insert({
ambulancia_id: id,
estado: estadoPendiente,
motivo: motivoCambio.trim(),
tipo_mantenimiento: tipoMtto || null,
area: area.length ? area : null,
foto_url: fotoUrl,
fecha_inicio: new Date().toISOString()
})

if(insertError){
console.error(insertError)
alert("❌ Error real: " + insertError.message)
return
}

}

setMostrarModal(false)
setMotivoCambio("")
setTipoMtto("")
setArea([])
setFoto(null)
setEditando(null)

await cargarTodo()

}catch(err){
console.error(err)
alert("❌ Error general")
}

setLoading(false)
}

/* ========================= */

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

async function eliminarRegistro(idRegistro:string){
if(!confirm("¿Eliminar registro?")) return
await supabase.from("historial_operativo").delete().eq("id",idRegistro)
cargarHistorial()
}

/* ========================= */

function estadoColor(){
if(ambulancia.estado === "operativa") return "#22c55e"
if(ambulancia.estado === "mantenimiento") return "#f59e0b"
return "#ef4444"
}

/* ========================= */

if(!ambulancia) return <div style={loadingStyle}>🚑 Cargando...</div>

return(
<div style={container}>

<div style={header}>
<div>
<h1 style={title}>🚑 {ambulancia.codigo_operativo}</h1>
<p style={sub}>Placa: {ambulancia.placa}</p>
</div>

<button onClick={()=>router.push("/dashboard")} style={btnBack}>
⬅ Volver
</button>
</div>

<div style={grid}>
<div style={card}><p>KM Actual</p><h2>{ambulancia.kilometraje_actual}</h2></div>
<div style={card}><p>Estado</p><h2 style={{color:estadoColor()}}>{ambulancia.estado}</h2></div>
<div style={card}><p>Próx. Mtto</p><h2>{ambulancia.kilometraje_mtto || "-"}</h2></div>
</div>

<div style={{...estadoBox,borderColor:estadoColor()}}>
Estado: {ambulancia.estado.toUpperCase()}
</div>

<div style={acciones}>
<button onClick={()=>abrirCambioEstado("operativa")} style={btn("#22c55e")}>Operativa</button>
<button onClick={()=>abrirCambioEstado("mantenimiento")} style={btn("#f59e0b")}>Mtto</button>
<button onClick={()=>abrirCambioEstado("no operativa")} style={btn("#ef4444")}>Fuera</button>
</div>

<div style={section}>
<h3>📏 Registro KM</h3>
<input style={input} type="number" value={nuevoKm} onChange={(e)=>setNuevoKm(e.target.value)} />
<button style={btnPrimary} onClick={actualizarKilometraje}>Actualizar</button>
</div>

<div style={section}>
<h3>🛠 Mantenimiento</h3>
<p>Próximo: {ambulancia.kilometraje_mtto || "-"}</p>
<input style={input} type="number" value={kmMtto} onChange={(e)=>setKmMtto(e.target.value)} />
<button style={btnPrimary} onClick={guardarMtto}>Guardar</button>
</div>

<div style={section}>
<h3>📋 Historial</h3>

<div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr 2fr 1fr auto",fontWeight:"bold"}}>
<div>Fecha</div><div>Estado</div><div>Tipo</div><div>Área</div><div>Motivo</div><div>Foto</div><div></div>
</div>

{historial.map(h=>(
<div key={h.id} style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr 2fr 1fr auto",gap:10,padding:10}}>

<div>{new Date(h.fecha_inicio).toLocaleString()}</div>
<div style={{color:estadoColor()}}>{h.estado}</div>
<div>{h.tipo_mantenimiento || "-"}</div>
<div>{Array.isArray(h.area) ? h.area.join(", ") : "-"}</div>
<div>{h.motivo}</div>

<div>{h.foto_url && <a href={h.foto_url} target="_blank">📷</a>}</div>

<div style={{display:"flex",gap:5}}>
<button onClick={()=>{
setEditando(h)
setEstadoPendiente(h.estado)
setMotivoCambio(h.motivo || "")
setTipoMtto(h.tipo_mantenimiento || "")
setArea(Array.isArray(h.area) ? h.area : [])
setMostrarModal(true)
}}>✏️</button>

<button onClick={()=>eliminarRegistro(h.id)}>🗑️</button>
</div>

</div>
))}

</div>

{/* MODAL */}
{mostrarModal && (
<div style={modalBg}>
<div style={modal}>

<h3>{editando ? "Editar registro" : "Cambiar estado"}</h3>

<p>Nuevo estado: <b>{estadoPendiente}</b></p>

<textarea
placeholder="Motivo del cambio"
value={motivoCambio}
onChange={(e)=>setMotivoCambio(e.target.value)}
style={textarea}
/>

<select value={tipoMtto} onChange={(e)=>setTipoMtto(e.target.value)} style={input}>
<option value="">Tipo de mantenimiento</option>
<option value="preventivo">Preventivo</option>
<option value="correctivo">Correctivo</option>
</select>

{/* 🔥 CHECKBOX MULTI ÁREA */}
<div style={{marginTop:10}}>

<p style={{marginBottom:5}}>Área</p>

{[
{label:"Mecánico", value:"mecanico"},
{label:"Eléctrico", value:"electrico"},
{label:"Aire acondicionado", value:"aire"}
].map(op=>{

const activo = area.includes(op.value)

return(
<label key={op.value} style={{display:"flex",gap:8,marginBottom:5,cursor:"pointer"}}>

<input
type="checkbox"
checked={activo}
onChange={(e)=>{

if(e.target.checked){
setArea([...area, op.value])
}else{
setArea(area.filter(a=>a !== op.value))
}

}}
/>

{op.label}

</label>
)
})}

</div>

<input type="file" onChange={(e)=>setFoto(e.target.files?.[0] || null)} />

<div style={{display:"flex",gap:10,marginTop:10}}>
<button onClick={confirmarCambioEstado} style={btnPrimary}>
{loading ? "Guardando..." : "Confirmar"}
</button>

<button onClick={()=>setMostrarModal(false)} style={btnBack}>
Cancelar
</button>
</div>

</div>
</div>
)}

</div>
)
}

/* ESTILOS */
const container: CSSProperties = {background:"#020617",color:"white",minHeight:"100vh",padding:30}
const header: CSSProperties = {display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}
const title = {fontSize:30,fontWeight:"bold"}
const sub = {opacity:0.6}
const btnBack: CSSProperties = {background:"#1e293b",padding:"10px 15px",borderRadius:8,color:"white"}
const grid: CSSProperties = {display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:20,marginBottom:20}
const card: CSSProperties = {background:"#0f172a",padding:20,borderRadius:12}
const estadoBox: CSSProperties = {border:"2px solid",padding:10,borderRadius:10,marginBottom:20}
const acciones: CSSProperties = {display:"flex",gap:10,marginBottom:20}
const btn = (c:string): CSSProperties => ({background:c,padding:"10px 15px",borderRadius:8,color:"white"})
const section: CSSProperties = {background:"#0f172a",padding:20,borderRadius:12,marginBottom:20}
const input: CSSProperties = {padding:10,marginTop:5,borderRadius:6,background:"#020617",color:"white"}
const btnPrimary: CSSProperties = {background:"#2563eb",color:"white",padding:"10px 15px",borderRadius:6}
const textarea: CSSProperties = {width:"100%",padding:10,marginTop:10,background:"#020617",color:"white"}
const modalBg: CSSProperties = {position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(0,0,0,0.7)",display:"flex",justifyContent:"center",alignItems:"center"}
const modal: CSSProperties = {background:"#0f172a",padding:20,borderRadius:12,width:400}
const loadingStyle: CSSProperties = {height:"100vh",display:"flex",justifyContent:"center",alignItems:"center",background:"black",color:"white"}