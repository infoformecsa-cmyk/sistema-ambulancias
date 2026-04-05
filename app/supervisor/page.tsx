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

const [panel,setPanel] = useState(false)
const [ambulanciaActiva,setAmbulanciaActiva] = useState<any>(null)
const [estadoPendiente,setEstadoPendiente] = useState("")
const [motivo,setMotivo] = useState("")
const [foto,setFoto] = useState<File | null>(null)

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
console.error("Error cargando ambulancias:", error)
}

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

/* ========================= */
/* 🚑 KM CORREGIDO SIN ROMPER NADA */
/* ========================= */

async function actualizarKm(id:string){

const km = Number(editKm[id])

if(!km || km <= 0){
alert("Ingrese kilometraje válido")
return
}

const usuario = localStorage.getItem("email") || "supervisor@ambulancias.ec"

/* 🔥 FIX HORARIO ECUADOR (NO rompe nada) */
const ahora = new Date()
const fechaLocal = new Date(ahora.getTime() - (ahora.getTimezoneOffset() * 60000))

/* 1. ACTUALIZA DASHBOARD */
const { error: errorUpdate } = await supabase
.from("ambulancias")
.update({ kilometraje_actual: km })
.eq("id",id)

if(errorUpdate){
console.error("ERROR UPDATE:", errorUpdate)
alert("Error actualizando kilometraje")
return
}

/* ========================= */
/* 🔥 REGISTRO DOBLE (SIN BORRAR NADA) */
/* ========================= */

const registros = [
{
ambulancia_id: String(id),
usuario: usuario,
kilometraje: km,
created_at: fechaLocal.toISOString()
},
{
ambulancia_id: String(id),
usuario: usuario,
kilometraje: km,
created_at: fechaLocal.toISOString()
}
]

const { error: errorInsert } = await supabase
.from("registro_kilometraje")
.insert(registros)

if(errorInsert){
console.error("ERROR INSERT KM:", errorInsert)
alert("Error guardando historial de kilometraje")
return
}

/* DEBUG */
console.log("✅ KM guardado:", {
ambulancia_id: id,
km,
fecha: fechaLocal
})

alert("✅ Kilometraje registrado correctamente")

setEditKm({...editKm,[id]:""})
cargar()
}

/* ========================= */
/* FOTO */
/* ========================= */

async function subirFoto(id:string){

if(!foto) return null

const nombre = `ambulancia_${id}_${Date.now()}`

const {error} = await supabase.storage
.from("ambulancias")
.upload(nombre,foto)

if(error){
console.error("Error subiendo foto:", error)
return null
}

const {data} = supabase.storage
.from("ambulancias")
.getPublicUrl(nombre)

return data.publicUrl
}

/* ========================= */

function abrirPanel(a:any,estado:string){
setAmbulanciaActiva(a)
setEstadoPendiente(estado)
setPanel(true)
}

/* ========================= */

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

const last = ultimo && ultimo.length>0 ? ultimo[0] : null

if(last && !last.fecha_fin){
await supabase
.from("historial_operativo")
.update({fecha_fin:new Date().toISOString()})
.eq("id",last.id)
}

await supabase
.from("historial_operativo")
.insert({
ambulancia_id:ambulanciaActiva.id,
estado:estadoPendiente,
motivo,
fecha_inicio:new Date().toISOString(),
usuario,
foto_url
})

await supabase
.from("ambulancias")
.update({estado:estadoPendiente})
.eq("id",ambulanciaActiva.id)

setPanel(false)
setMotivo("")
setFoto(null)

cargar()
}

/* UI */

function colorEstado(e:string){
if(e==="operativa") return "#16a34a"
if(e==="mantenimiento") return "#f59e0b"
return "#dc2626"
}

function bordeEstado(e:string){
if(e==="operativa") return "#16a34a"
if(e==="mantenimiento") return "#f59e0b"
return "#dc2626"
}

function cerrarSesion(){
localStorage.clear()
router.push("/")
}

return(

<div style={{padding:30,fontFamily:"Arial",maxWidth:1000,margin:"auto"}}>

<h1>👨‍⚕️ Panel Supervisor</h1>

<button onClick={cerrarSesion} style={btnSalir}>
Cerrar sesión
</button>

<div style={{display:"flex",gap:10,margin:"20px 0"}}>

<button onClick={()=>setGrupo("ALFA")} style={grupo==="ALFA"?btnActive:btn}>
ALFA
</button>

<button onClick={()=>setGrupo("BRAVO")} style={grupo==="BRAVO"?btnActive:btn}>
BRAVO
</button>

<button onClick={()=>router.push("/supervisor/asistencia")}>
📋 Asistencia Personal
</button>

</div>

{mantenimientoVencido.length > 0 && (
<div style={{background:"#fee2e2",padding:15,borderRadius:10,marginBottom:20}}>
<b>🚨 Mantenimiento vencido</b>
<br/>
{mantenimientoVencido.map(a=>(
<div key={a.id}>{a.codigo_operativo}</div>
))}
</div>
)}

{mantenimientoProximo.length > 0 && (
<div style={{background:"#fef9c3",padding:15,borderRadius:10,marginBottom:20}}>
<b>⚠️ Mantenimiento próximo</b>
<br/>
{mantenimientoProximo.map(a=>{
const diff = a.kilometraje_mtto - a.kilometraje_actual
return <div key={a.id}>{a.codigo_operativo} → {diff} km</div>
})}
</div>
)}

{ambulancias.map(a=>(
<div key={a.id} style={{
background:"white",
padding:20,
borderRadius:12,
marginBottom:15,
boxShadow:"0 2px 8px rgba(0,0,0,0.08)",
borderLeft:`6px solid ${bordeEstado(a.estado)}`
}}>

<h3>🚑 {a.codigo_operativo} | {a.placa}</h3>

<p><b>KM:</b> {a.kilometraje_actual || 0}</p>

<input
placeholder="Nuevo KM"
value={editKm[a.id] || ""}
onChange={(e)=>setEditKm({...editKm,[a.id]:e.target.value})}
/>

<button onClick={()=>actualizarKm(a.id)}>Guardar KM</button>

<p><b>Próximo mantenimiento:</b> {a.kilometraje_mtto || "-"}</p>

<p>
Estado: <span style={{color:colorEstado(a.estado)}}>{a.estado}</span>
</p>

<div style={{display:"flex",gap:10,marginTop:10}}>

<button style={btnEstado("#16a34a")} onClick={()=>abrirPanel(a,"operativa")}>
Operativa
</button>

<button style={btnEstado("#f59e0b")} onClick={()=>abrirPanel(a,"mantenimiento")}>
Mtto
</button>

<button style={btnEstado("#dc2626")} onClick={()=>abrirPanel(a,"no operativa")}>
Fuera
</button>

</div>

</div>
))}

{panel && (
<div style={panelBg}>
<div style={panelBox}>

<h2>
🚑 {ambulanciaActiva?.codigo_operativo} | {ambulanciaActiva?.placa}
</h2>

<p><b>Nuevo estado:</b> {estadoPendiente}</p>

<textarea
placeholder="Motivo"
value={motivo}
onChange={(e)=>setMotivo(e.target.value)}
style={{width:"100%",height:120}}
/>

<br/><br/>

<input type="file" onChange={(e)=>setFoto(e.target.files?.[0] || null)} />

<br/><br/>

<button onClick={confirmarCambio} style={btnConfirm}>
Confirmar cambio
</button>

<button onClick={()=>setPanel(false)} style={btnCancel}>
Cancelar
</button>

</div>
</div>
)}

</div>
)
}

/* ESTILOS */

const btn: CSSProperties = {padding:"8px 16px",borderRadius:20,background:"#e5e7eb",border:"none"}
const btnActive: CSSProperties = {padding:"8px 16px",borderRadius:20,background:"#2563eb",color:"white",border:"none"}
const btnSalir: CSSProperties = {background:"#374151",color:"white",padding:10,borderRadius:6}

const btnEstado = (c:string): CSSProperties => ({
background:c,
color:"white",
padding:"8px 12px",
borderRadius:6,
border:"none"
})

const panelBg: CSSProperties = {
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

const panelBox: CSSProperties = {
background:"white",
padding:30,
width:500,
borderRadius:12
}

const btnConfirm: CSSProperties = {
background:"#16a34a",
color:"white",
padding:10,
borderRadius:6,
marginRight:10
}

const btnCancel: CSSProperties = {
background:"#dc2626",
color:"white",
padding:10,
borderRadius:6
}