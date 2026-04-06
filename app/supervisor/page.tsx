"use client"

import { useEffect, useState } from "react"
import type { CSSProperties } from "react"
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
const [foto,setFoto] = useState<File | null>(null)

useEffect(()=>{cargar()},[grupo])

async function cargar(){
const {data} = await supabase
.from("ambulancias")
.select("*")
.eq("tipo",grupo)
.order("codigo_operativo")

setAmbulancias(data || [])
}

/* ALERTAS */
const mantenimientoVencido = ambulancias.filter(a=>{
if(!a.kilometraje_mtto) return false
return a.kilometraje_actual >= a.kilometraje_mtto
})

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

const usuario = localStorage.getItem("email") || "supervisor@ambulancias.ec"

await supabase.from("ambulancias")
.update({ kilometraje_actual: km })
.eq("id",id)

await supabase.from("registro_kilometraje").insert([{
ambulancia_id: String(id),
usuario,
kilometraje: km,
created_at: new Date()
}])

alert("✅ Kilometraje registrado")

setEditKm({...editKm,[id]:""})
setGuardandoKm(prev => ({...prev,[id]:false}))
cargar()
}

async function subirFoto(id:string){
if(!foto) return null
const nombre = `ambulancia_${id}_${Date.now()}`
await supabase.storage.from("ambulancias").upload(nombre,foto)
const {data} = supabase.storage.from("ambulancias").getPublicUrl(nombre)
return data.publicUrl
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

const usuario = localStorage.getItem("nombre") || "supervisor"
const foto_url = await subirFoto(ambulanciaActiva.id)

const {data:ultimo} = await supabase
.from("historial_operativo")
.select("*")
.eq("ambulancia_id",ambulanciaActiva.id)
.order("fecha_inicio",{ascending:false})
.limit(1)

const last = ultimo?.[0]

if(last && !last.fecha_fin){
await supabase.from("historial_operativo")
.update({fecha_fin:new Date().toISOString()})
.eq("id",last.id)
}

await supabase.from("historial_operativo").insert({
ambulancia_id:ambulanciaActiva.id,
estado:estadoPendiente,
motivo,
fecha_inicio:new Date().toISOString(),
usuario,
foto_url
})

await supabase.from("ambulancias")
.update({estado:estadoPendiente})
.eq("id",ambulanciaActiva.id)

setPanel(false)
setMotivo("")
setFoto(null)

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

<div style={container}>

{/* HEADER */}
<div style={header}>
<div>
<h1 style={title}>🚑 Panel Supervisor</h1>
<p style={sub}>Gestión operativa en tiempo real</p>
</div>

<button onClick={cerrarSesion} style={btnSalir}>Cerrar sesión</button>
</div>

{/* FILTROS */}
<div style={tabs}>
<button onClick={()=>setGrupo("ALFA")} style={grupo==="ALFA"?tabActive:tab}>ALFA</button>
<button onClick={()=>setGrupo("BRAVO")} style={grupo==="BRAVO"?tabActive:tab}>BRAVO</button>
<button onClick={()=>router.push("/supervisor/asistencia")} style={tab}>📋 Asistencia</button>
</div>

{/* ALERTAS */}
{mantenimientoVencido.length > 0 && (
<div style={alertRed}>
🚨 Mantenimiento vencido: {mantenimientoVencido.map(a=>a.codigo_operativo).join(", ")}
</div>
)}

{mantenimientoProximo.length > 0 && (
<div style={alertYellow}>
⚠️ Próximo mantenimiento: {mantenimientoProximo.map(a=>{
const diff = a.kilometraje_mtto - a.kilometraje_actual
return `${a.codigo_operativo} (${diff} km)`
}).join(", ")}
</div>
)}

{/* CARDS */}
{ambulancias.map(a=>(
<div key={a.id} style={card}>

<div style={cardHeader}>
<h3>🚑 {a.codigo_operativo} | {a.placa}</h3>
<span style={{color:colorEstado(a.estado)}}>{a.estado}</span>
</div>

<p>KM actual: <b>{a.kilometraje_actual || 0}</b></p>

<div style={{display:"flex",gap:10}}>
<input
placeholder="Nuevo KM"
value={editKm[a.id] || ""}
onChange={(e)=>setEditKm({...editKm,[a.id]:e.target.value})}
style={input}
/>

<button onClick={()=>actualizarKm(a.id)} style={btnPrimary}>
{guardandoKm[a.id] ? "..." : "Guardar"}
</button>
</div>

<p>Próximo mantenimiento: {a.kilometraje_mtto || "-"}</p>

<div style={estadoBtns}>
<button style={btnEstado("#22c55e")} onClick={()=>abrirPanel(a,"operativa")}>Operativa</button>
<button style={btnEstado("#f59e0b")} onClick={()=>abrirPanel(a,"mantenimiento")}>Mtto</button>
<button style={btnEstado("#ef4444")} onClick={()=>abrirPanel(a,"no operativa")}>Fuera</button>
</div>

</div>
))}

{/* MODAL */}
{panel && (
<div style={modalBg}>
<div style={modalBox}>

<h2>{ambulanciaActiva?.codigo_operativo}</h2>

<textarea
placeholder="Motivo"
value={motivo}
onChange={(e)=>setMotivo(e.target.value)}
style={input}
/>

<input type="file" onChange={(e)=>setFoto(e.target.files?.[0] || null)} />

<div style={{marginTop:10}}>
<button onClick={confirmarCambio} style={btnPrimary}>Confirmar</button>
<button onClick={()=>setPanel(false)} style={btnDanger}>Cancelar</button>
</div>

</div>
</div>
)}

</div>
)
}

/* ESTILOS */

const container = {
background:"#020617",
color:"white",
minHeight:"100vh",
padding:30
}

const header = {display:"flex",justifyContent:"space-between",marginBottom:20}
const title = {fontSize:28}
const sub = {opacity:0.6}

const btnSalir = {background:"#ef4444",color:"white",padding:10,borderRadius:8}

const tabs = {display:"flex",gap:10,marginBottom:20}
const tab = {background:"#1e293b",padding:"8px 16px",borderRadius:20,color:"white"}
const tabActive = {background:"#2563eb",padding:"8px 16px",borderRadius:20,color:"white"}

const alertRed = {background:"#7f1d1d",padding:15,borderRadius:10,marginBottom:10}
const alertYellow = {background:"#78350f",padding:15,borderRadius:10,marginBottom:10}

const card = {
background:"#0f172a",
padding:20,
borderRadius:12,
marginBottom:15,
border:"1px solid #1e293b"
}

const cardHeader = {display:"flex",justifyContent:"space-between"}

const input = {
background:"#1e293b",
color:"white",
border:"none",
padding:10,
borderRadius:8
}

const btnPrimary = {background:"#2563eb",color:"white",padding:10,borderRadius:8}
const btnDanger = {background:"#ef4444",color:"white",padding:10,borderRadius:8}

const estadoBtns = {display:"flex",gap:10,marginTop:10}

const btnEstado = (c:string): CSSProperties => ({
background:c,
color:"white",
padding:"6px 10px",
borderRadius:6,
border:"none"
})

const modalBg = {
position:"fixed",
top:0,left:0,width:"100%",height:"100%",
background:"rgba(0,0,0,0.7)",
display:"flex",
justifyContent:"center",
alignItems:"center"
}

const modalBox = {
background:"#0f172a",
padding:25,
borderRadius:12,
width:400
}