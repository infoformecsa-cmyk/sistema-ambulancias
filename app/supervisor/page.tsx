"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { useRouter } from "next/navigation"

export default function Supervisor(){

const router = useRouter()

const [ambulancias,setAmbulancias] = useState<any[]>([])
const [grupo,setGrupo] = useState("ALFA")

const [editKm,setEditKm] = useState<Record<string,string>>({})
const [guardandoKm,setGuardandoKm] = useState<Record<string,boolean>>({})

const [panel,setPanel] = useState(false)
const [ambulanciaActiva,setAmbulanciaActiva] = useState<any>(null)
const [estadoPendiente,setEstadoPendiente] = useState("")
const [motivo,setMotivo] = useState("")

useEffect(()=>{
cargar()
},[grupo])

async function cargar(){

const {data,error} = await supabase
.from("ambulancias")
.select("*")
.eq("tipo",grupo)
.order("codigo_operativo")

if(error){
console.error("Error cargando:", error)
return
}

setAmbulancias(data || [])
}

/* ALERTAS */
const mantenimientoVencido = ambulancias.filter(a=>a.kilometraje_mtto && a.kilometraje_actual >= a.kilometraje_mtto)

const mantenimientoProximo = ambulancias.filter(a=>{
if(!a.kilometraje_mtto) return false
const diff = a.kilometraje_mtto - a.kilometraje_actual
return diff > 0 && diff <= 500
})

async function actualizarKm(id:string){

if(guardandoKm[id]) return

const km = Number(editKm[id])

if(!km || km <= 0){
alert("Ingrese kilometraje válido")
return
}

setGuardandoKm(prev => ({...prev,[id]:true}))

const usuario = localStorage.getItem("email") || "supervisor"

const { error: errorUpdate } = await supabase
.from("ambulancias")
.update({ kilometraje_actual: km })
.eq("id",id)

if(errorUpdate){
console.error(errorUpdate)
alert("Error actualizando KM")
setGuardandoKm(prev => ({...prev,[id]:false}))
return
}

const { error: errorInsert } = await supabase
.from("registro_kilometraje")
.insert([{
ambulancia_id:id,
usuario,
kilometraje: km,
created_at:new Date().toISOString()
}])

if(errorInsert){
console.error(errorInsert)
alert("Error guardando KM")
}

setEditKm({...editKm,[id]:""})
setGuardandoKm(prev => ({...prev,[id]:false}))

cargar()
}

function abrirPanel(a:any,estado:string){
setAmbulanciaActiva(a)
setEstadoPendiente(estado)
setPanel(true)
}

async function confirmarCambio(){

if(!motivo){
alert("Ingrese motivo")
return
}

if(!ambulanciaActiva){
alert("Error interno")
return
}

const usuario = localStorage.getItem("nombre") || "supervisor"

/* INSERT CORRECTO */
const { error } = await supabase
.from("historial_operativo")
.insert([{
ambulancia_id:ambulanciaActiva.id,
estado:estadoPendiente,
motivo,
fecha_inicio:new Date().toISOString(),
usuario
}])

if(error){
console.error(error)
alert("Error guardando historial")
return
}

/* UPDATE ESTADO */
const { error: errorUpdate } = await supabase
.from("ambulancias")
.update({estado:estadoPendiente})
.eq("id",ambulanciaActiva.id)

if(errorUpdate){
console.error(errorUpdate)
alert("Error actualizando estado")
return
}

setPanel(false)
setMotivo("")
setAmbulanciaActiva(null)

cargar()
}

function cerrarSesion(){
localStorage.clear()
router.push("/")
}

function colorEstado(e:string){
if(e==="operativa") return "#22c55e"
if(e==="mantenimiento") return "#f59e0b"
return "#ef4444"
}

/* UI */

return(

<div style={{
padding:30,
background:"#020617",
minHeight:"100vh",
color:"white"
}}>

<h1 style={{fontSize:28}}>🚑 Panel Supervisor</h1>

<button onClick={cerrarSesion} style={{
background:"#ef4444",
padding:10,
borderRadius:8,
color:"white",
marginBottom:20
}}>
Cerrar sesión
</button>

<div style={{display:"flex",gap:10,marginBottom:20}}>

<button onClick={()=>setGrupo("ALFA")} style={{
background:grupo==="ALFA"?"#2563eb":"#1e293b",
padding:10,
borderRadius:8,
color:"white"
}}>
ALFA
</button>

<button onClick={()=>setGrupo("BRAVO")} style={{
background:grupo==="BRAVO"?"#2563eb":"#1e293b",
padding:10,
borderRadius:8,
color:"white"
}}>
BRAVO
</button>

<button onClick={()=>router.push("/supervisor/asistencia")} style={{
background:"#0ea5e9",
padding:10,
borderRadius:8,
color:"white"
}}>
📋 Asistencia
</button>

</div>

{mantenimientoVencido.length>0 && (
<div style={{background:"#7f1d1d",padding:15,borderRadius:10,marginBottom:10}}>
🚨 {mantenimientoVencido.map(a=>a.codigo_operativo).join(", ")}
</div>
)}

{mantenimientoProximo.length>0 && (
<div style={{background:"#78350f",padding:15,borderRadius:10,marginBottom:10}}>
⚠️ {mantenimientoProximo.map(a=>{
const diff = a.kilometraje_mtto - a.kilometraje_actual
return `${a.codigo_operativo} (${diff} km)`
}).join(", ")}
</div>
)}

<div style={{
display:"grid",
gridTemplateColumns:"repeat(auto-fill,minmax(250px,1fr))",
gap:20
}}>

{ambulancias.map(a=>(

<div key={a.id} style={{
background:"#0f172a",
padding:20,
borderRadius:12,
border:"1px solid #1e293b"
}}>

<h3>🚑 {a.codigo_operativo}</h3>

<p>KM: {a.kilometraje_actual}</p>

<input
placeholder="Nuevo KM"
value={editKm[a.id] || ""}
onChange={(e)=>setEditKm({...editKm,[a.id]:e.target.value})}
style={{
width:"100%",
padding:8,
margin:"10px 0",
background:"#1e293b",
color:"white",
border:"none",
borderRadius:6
}}
/>

<button onClick={()=>actualizarKm(a.id)} style={{
background:"#2563eb",
padding:8,
borderRadius:6,
color:"white"
}}>
{guardandoKm[a.id] ? "..." : "Guardar KM"}
</button>

<p>Próx: {a.kilometraje_mtto || "-"}</p>

<p style={{color:colorEstado(a.estado)}}>{a.estado}</p>

<div style={{display:"flex",gap:8,marginTop:10}}>

<button onClick={()=>abrirPanel(a,"operativa")} style={{background:"#22c55e",padding:6,color:"white",borderRadius:6}}>
Operativa
</button>

<button onClick={()=>abrirPanel(a,"mantenimiento")} style={{background:"#f59e0b",padding:6,color:"white",borderRadius:6}}>
Mtto
</button>

<button onClick={()=>abrirPanel(a,"no operativa")} style={{background:"#ef4444",padding:6,color:"white",borderRadius:6}}>
Fuera
</button>

</div>

</div>

))}

</div>

{panel && ambulanciaActiva && (
<div style={{
position:"fixed",
top:0,left:0,width:"100%",height:"100%",
background:"rgba(0,0,0,0.7)",
display:"flex",
alignItems:"center",
justifyContent:"center"
}}>

<div style={{background:"#0f172a",padding:20,borderRadius:10,width:300}}>

<h3>{ambulanciaActiva.codigo_operativo}</h3>

<textarea
placeholder="Motivo"
value={motivo}
onChange={(e)=>setMotivo(e.target.value)}
style={{width:"100%",height:100,marginBottom:10}}
/>

<button onClick={confirmarCambio} style={{
background:"#22c55e",
padding:10,
color:"white",
borderRadius:6
}}>
Confirmar
</button>

</div>

</div>
)}

</div>
)
}