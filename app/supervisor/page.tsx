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
const mantenimientoVencido = ambulancias.filter(a=>a.kilometraje_mtto && a.kilometraje_actual >= a.kilometraje_mtto)

const mantenimientoProximo = ambulancias.filter(a=>{
if(!a.kilometraje_mtto) return false
const diff = a.kilometraje_mtto - a.kilometraje_actual
return diff > 0 && diff <= 500
})

async function actualizarKm(id:string){
if(guardandoKm[id]) return

const km = Number(editKm[id])
if(!km || km <= 0) return alert("Ingrese kilometraje válido")

setGuardandoKm(p=>({...p,[id]:true}))

await supabase.from("ambulancias").update({ kilometraje_actual: km }).eq("id",id)

await supabase.from("registro_kilometraje").insert([{
ambulancia_id:id,
usuario: localStorage.getItem("email"),
kilometraje: km,
created_at:new Date()
}])

setEditKm({...editKm,[id]:""})
setGuardandoKm(p=>({...p,[id]:false}))
cargar()
}

function abrirPanel(a:any,estado:string){
setAmbulanciaActiva(a)
setEstadoPendiente(estado)
setPanel(true)
}

async function confirmarCambio(){
if(!motivo) return alert("Ingrese motivo")

await supabase.from("historial_operativo").insert({
ambulancia_id:ambulanciaActiva.id,
estado:estadoPendiente,
motivo,
fecha_inicio:new Date().toISOString()
})

await supabase.from("ambulancias")
.update({estado:estadoPendiente})
.eq("id",ambulanciaActiva.id)

setPanel(false)
setMotivo("")
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
<h1 style={title}>🚑 Panel Supervisor</h1>

<button onClick={cerrarSesion} style={btnLogout}>
Cerrar sesión
</button>
</div>

{/* FILTROS */}
<div style={filtros}>
<button onClick={()=>setGrupo("ALFA")} style={grupo==="ALFA"?btnActive:btn}>ALFA</button>
<button onClick={()=>setGrupo("BRAVO")} style={grupo==="BRAVO"?btnActive:btn}>BRAVO</button>
<button onClick={()=>router.push("/supervisor/asistencia")} style={btnAlt}>
📋 Asistencia
</button>
</div>

{/* ALERTAS */}
{mantenimientoVencido.length>0 && (
<div style={alertRed}>
🚨 {mantenimientoVencido.map(a=>a.codigo_operativo).join(", ")}
</div>
)}

{mantenimientoProximo.length>0 && (
<div style={alertYellow}>
⚠️ {mantenimientoProximo.map(a=>{
const diff = a.kilometraje_mtto - a.kilometraje_actual
return `${a.codigo_operativo} (${diff} km)`
}).join(", ")}
</div>
)}

{/* CARDS */}
<div style={grid}>

{ambulancias.map(a=>(

<div key={a.id} style={card}>

<h3 style={cardTitle}>
🚑 {a.codigo_operativo}
</h3>

<p style={text}><b>KM:</b> {a.kilometraje_actual}</p>

<div style={kmBox}>
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

<p style={text}><b>Próx. Mtto:</b> {a.kilometraje_mtto || "-"}</p>

<p style={{color:colorEstado(a.estado)}}>
● {a.estado}
</p>

<div style={actions}>
<button style={btnSuccess} onClick={()=>abrirPanel(a,"operativa")}>Operativa</button>
<button style={btnWarn} onClick={()=>abrirPanel(a,"mantenimiento")}>Mtto</button>
<button style={btnDanger} onClick={()=>abrirPanel(a,"no operativa")}>Fuera</button>
</div>

</div>

))}

</div>

{/* MODAL */}
{panel && ambulanciaActiva && (
<div style={modalBg}>
<div style={modal}>

<h3>{ambulanciaActiva.codigo_operativo}</h3>

<textarea
placeholder="Motivo"
value={motivo}
onChange={(e)=>setMotivo(e.target.value)}
style={textarea}
/>

<button onClick={confirmarCambio} style={btnSuccess}>
Confirmar
</button>

</div>
</div>
)}

</div>
)
}

/* 🎨 ESTILOS PRO */

const container:CSSProperties = {
padding:30,
background:"#020617",
minHeight:"100vh",
color:"white"
}

const header = {display:"flex",justifyContent:"space-between",marginBottom:20}
const title = {fontSize:26}

const filtros = {display:"flex",gap:10,marginBottom:20}

const btn = {background:"#1e293b",padding:10,color:"white",borderRadius:8}
const btnActive = {background:"#2563eb",padding:10,color:"white",borderRadius:8}
const btnAlt = {background:"#0ea5e9",padding:10,color:"white",borderRadius:8}

const btnLogout = {background:"#ef4444",padding:10,color:"white",borderRadius:8}

const alertRed = {background:"#7f1d1d",padding:15,borderRadius:10,marginBottom:10}
const alertYellow = {background:"#78350f",padding:15,borderRadius:10,marginBottom:10}

const grid = {
display:"grid",
gridTemplateColumns:"repeat(auto-fill,minmax(250px,1fr))",
gap:20
}

const card = {
background:"#0f172a",
padding:20,
borderRadius:12,
border:"1px solid #1e293b"
}

const cardTitle = {fontSize:18,marginBottom:10}
const text = {fontSize:14,opacity:0.8}

const kmBox = {display:"flex",gap:10,margin:"10px 0"}

const input = {
flex:1,
padding:8,
borderRadius:6,
background:"#1e293b",
color:"white",
border:"none"
}

const actions = {display:"flex",gap:8,marginTop:10}

const btnPrimary = {background:"#2563eb",color:"white",padding:"6px 10px",borderRadius:6}
const btnSuccess = {background:"#22c55e",color:"white",padding:"6px 10px",borderRadius:6}
const btnWarn = {background:"#f59e0b",color:"white",padding:"6px 10px",borderRadius:6}
const btnDanger = {background:"#ef4444",color:"white",padding:"6px 10px",borderRadius:6}

const modalBg = {
position:"fixed",top:0,left:0,width:"100%",height:"100%",
background:"rgba(0,0,0,0.7)",display:"flex",alignItems:"center",justifyContent:"center"
}

const modal = {
background:"#0f172a",
padding:20,
borderRadius:10,
width:300
}

const textarea = {
width:"100%",
height:100,
marginBottom:10
}