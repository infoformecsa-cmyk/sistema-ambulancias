"use client"

import { useEffect, useState } from "react"
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

/* 🔥 INIT */
useEffect(()=>{
if(!id) return
cargarTodo()
},[id])

/* 🔄 REFRESH TIEMPO */
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

/* 🔥 CAMBIO ESTADO SEGURO */
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

/* 🔒 SOLO EL ÚLTIMO EVENTO */
const {data:ultimo} = await supabase
.from("historial_operativo")
.select("*")
.eq("ambulancia_id",id)
.order("fecha_inicio",{ascending:false})
.limit(1)

if(ultimo && ultimo.length > 0){

const last = ultimo[0]

/* 🔥 BLOQUEO DUPLICADO REAL */
const ahora = new Date().getTime()
const ultimoTiempo = new Date(last.fecha_inicio).getTime()

if(
last.estado === estadoPendiente &&
!last.fecha_fin &&
(ahora - ultimoTiempo) < 60000
){
alert("Acción duplicada bloqueada")
setLoading(false)
return
}

/* cerrar SOLO ese evento */
if(!last.fecha_fin){
await supabase
.from("historial_operativo")
.update({ fecha_fin: new Date().toISOString() })
.eq("id", last.id)
}

}

/* crear nuevo */
await supabase
.from("historial_operativo")
.insert({
ambulancia_id:id,
estado:estadoPendiente,
motivo:motivoCambio,
fecha_inicio:new Date().toISOString(),
usuario
})

/* sync ambulancia */
await supabase
.from("ambulancias")
.update({
estado:estadoPendiente,
motivo_no_operativo:
estadoPendiente === "operativa" ? null : motivoCambio
})
.eq("id",id)

alert("Estado actualizado")

setMostrarModal(false)
setMotivoCambio("")
setEstadoPendiente("")

await cargarTodo()

}catch(e){
console.log(e)
alert("Error en cambio de estado")
}

setLoading(false)
}

/* 🔥 ALERTA CORRECTA */
function renderAlerta(){

if(!ambulancia) return null

if(ambulancia.estado === "no operativa"){
return <div style={{background:"#fee2e2",padding:12,borderRadius:6}}>
🚨 FUERA DE SERVICIO
</div>
}

if(ambulancia.estado === "mantenimiento"){
return <div style={{background:"#fef9c3",padding:12,borderRadius:6}}>
🔧 EN MANTENIMIENTO
</div>
}

/* solo si operativa evalúa km */
if(!ambulancia.kilometraje_mtto || !ambulancia.kilometraje_actual){
return <div style={{background:"#dcfce7",padding:12,borderRadius:6}}>
✅ OPERATIVA
</div>
}

const faltan = ambulancia.kilometraje_mtto - ambulancia.kilometraje_actual

if(faltan <= 0){
return <div style={{background:"#fee2e2",padding:12,borderRadius:6}}>
🚨 MTTO VENCIDO
</div>
}

if(faltan <= 400){
return <div style={{background:"#fef9c3",padding:12,borderRadius:6}}>
⚠️ {faltan} km para mantenimiento
</div>
}

return <div style={{background:"#dcfce7",padding:12,borderRadius:6}}>
✅ OPERATIVA
</div>
}

/* 🔥 TIEMPO PRO */
function calcularTiempo(inicio:string, fin:string|null){

const i = new Date(inicio)
const f = fin ? new Date(fin) : new Date()

if(f < i) return "0 h"

const diff = f.getTime() - i.getTime()

const dias = Math.floor(diff / (1000*60*60*24))
const horas = Math.floor((diff % (1000*60*60*24)) / (1000*60*60))
const minutos = Math.floor((diff % (1000*60*60)) / (1000*60))

if(dias > 0) return `${dias}d ${horas}h`
if(horas > 0) return `${horas}h ${minutos}m`

return `${minutos} min`
}

/* 🔥 ELIMINAR EVENTO */
async function eliminarEvento(idEvento:string){

if(!confirm("Eliminar registro?")) return

await supabase
.from("historial_operativo")
.delete()
.eq("id",idEvento)

cargarHistorial()
}

/* 🔥 KM */
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

if(!ambulancia) return <div style={{padding:40}}>Cargando...</div>

return(

<div style={{padding:30,fontFamily:"Arial",maxWidth:900}}>

<h1>🚑 Ficha Mecánica</h1>

<button onClick={()=>router.push("/dashboard")}>← Volver</button>

<hr/>

<h2>Estado Operativo</h2>

<div style={{background:"#f3f4f6",padding:15,borderRadius:8}}>
<p><b>KM:</b> {ambulancia.kilometraje_actual}</p>
<p><b>Estado:</b> {ambulancia.estado}</p>
{renderAlerta()}
</div>

<div style={{marginTop:15}}>

<button onClick={()=>abrirCambioEstado("operativa")} style={{background:"#16a34a",color:"white",padding:10}}>
🟢 Operativa
</button>

<button onClick={()=>abrirCambioEstado("mantenimiento")} style={{background:"#f59e0b",color:"white",padding:10,marginLeft:10}}>
🔧 Mantenimiento
</button>

<button onClick={()=>abrirCambioEstado("no operativa")} style={{background:"#dc2626",color:"white",padding:10,marginLeft:10}}>
🔴 Fuera de servicio
</button>

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

<table style={{width:"100%"}}>
<thead>
<tr>
<th>Estado</th>
<th>Motivo</th>
<th>Tiempo</th>
<th></th>
</tr>
</thead>

<tbody>

{historial.map(h=>(
<tr key={h.id}>
<td>{h.estado}</td>
<td>{h.motivo}</td>
<td>{calcularTiempo(h.fecha_inicio,h.fecha_fin)}</td>
<td>
<button onClick={()=>eliminarEvento(h.id)}>🗑</button>
</td>
</tr>
))}

</tbody>
</table>

{/* MODAL */}
{mostrarModal && (
<div style={{
position:"fixed",
top:0,left:0,width:"100%",height:"100%",
background:"rgba(0,0,0,0.5)",
display:"flex",justifyContent:"center",alignItems:"center"
}}>
<div style={{background:"white",padding:20,width:400}}>
<h3>Motivo</h3>
<textarea value={motivoCambio} onChange={(e)=>setMotivoCambio(e.target.value)} />
<br/><br/>
<button onClick={confirmarCambioEstado}>
{loading ? "Guardando..." : "Confirmar"}
</button>
<button onClick={()=>setMostrarModal(false)}>Cancelar</button>
</div>
</div>
)}

</div>

)
}