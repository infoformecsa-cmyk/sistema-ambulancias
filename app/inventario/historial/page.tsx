"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { useRouter } from "next/navigation"
import type { CSSProperties } from "react"

export default function HistorialChecklist(){

const router = useRouter()

const [ambulancias,setAmbulancias] = useState<any[]>([])
const [ambulancia,setAmbulancia] = useState("")

const [checklists,setChecklists] = useState<any[]>([])
const [detalle,setDetalle] = useState<any>({})

const [fechaInicio,setFechaInicio] = useState("")
const [fechaFin,setFechaFin] = useState("")

useEffect(()=>{
cargarAmbulancias()
},[])

/* ========================= */

async function cargarAmbulancias(){

const { data } = await supabase
.from("ambulancias")
.select("id,codigo_operativo")

const ordenadas = (data || []).sort((a,b)=>
a.codigo_operativo.localeCompare(b.codigo_operativo,undefined,{numeric:true})
)

setAmbulancias(ordenadas)
}

/* ========================= */

async function cargarHistorial(id:string){

if(!id){
setChecklists([])
setDetalle({})
return
}

setChecklists([])
setDetalle({})

let query = supabase
.from("inventario_checklist")
.select(`
*,
estado,
inventario_items (
  nombre,
  categoria
)
`)
.eq("ambulancia_id", id)

if(fechaInicio){
query = query.gte("created_at", `${fechaInicio}T00:00:00`)
}
if(fechaFin){
query = query.lte("created_at", `${fechaFin}T23:59:59`)
}

const { data, error } = await query.order("created_at",{ascending:false})

if(error){
console.error(error)
return
}

if(!data || data.length === 0){
setChecklists([])
setDetalle({})
return
}

/* ========================= */
/* AGRUPAR */
/* ========================= */

const grupos:any = {}

data.forEach(item=>{

const fecha = new Date(item.created_at)
fecha.setSeconds(0,0)

const key = fecha.toISOString()

if(!grupos[key]){
grupos[key] = []
}

grupos[key].push(item)

})

const lista = Object.keys(grupos).map(fecha=>({
fecha,
items: grupos[fecha]
}))

lista.sort((a,b)=> new Date(b.fecha).getTime() - new Date(a.fecha).getTime())

setChecklists(lista)
procesarDetalle(lista[0].items)

}

/* ========================= */

function procesarDetalle(items:any[]){

const grupos:any = {}

items.forEach(i=>{

const cat = i.inventario_items?.categoria || "OTROS"

if(!grupos[cat]){
grupos[cat] = []
}

grupos[cat].push(i)

})

setDetalle(grupos)

}

/* ========================= */
/* ✅ FIX AQUÍ */
/* ========================= */

function getEstadoVisual(estado:string){

if(estado === "BORRADOR"){
return { label:"🟡 BORRADOR", color:"#f59e0b" }
}

if(estado === "FINALIZADO"){
return { label:"🟢 FINALIZADO", color:"#22c55e" }
}

/* 🔥 SOLUCIÓN */
if(estado === "ABASTECIMIENTO"){
return { label:"🔵 ABASTECIMIENTO", color:"#3b82f6" }
}

/* 🔒 fallback controlado */
return { label:"⚪ SIN CLASIFICAR", color:"#6b7280" }

}

/* ========================= */
/* 🔥 BORRAR CHECKLIST */
/* ========================= */

async function borrarChecklist(items:any[]){

const confirmar = confirm("⚠️ ¿Eliminar este checklist completo?")
if(!confirmar) return

try{

const ids = items.map(i=>i.id)

await supabase
.from("inventario_checklist")
.delete()
.in("id", ids)

alert("🗑️ Checklist eliminado")

cargarHistorial(ambulancia)

}catch(e){
console.error(e)
alert("Error al eliminar")
}

}

/* ========================= */

return(

<div style={container}>

<button onClick={()=>router.push("/bitacora/dashboard")} style={btn}>
⬅ Volver
</button>

<h1>📊 HISTORIAL CHECKLIST</h1>

<select
value={ambulancia}
onChange={(e)=>{
const id = e.target.value
setAmbulancia(id)
setChecklists([])
setDetalle({})
cargarHistorial(id)
}}
style={input}
>
<option value="">Seleccionar ambulancia</option>
{ambulancias.map(a=>(
<option key={a.id} value={a.id}>{a.codigo_operativo}</option>
))}
</select>

<div style={{display:"flex",gap:10}}>

<input type="date" value={fechaInicio} onChange={e=>setFechaInicio(e.target.value)} style={input}/>
<input type="date" value={fechaFin} onChange={e=>setFechaFin(e.target.value)} style={input}/>

<button onClick={()=>cargarHistorial(ambulancia)} style={input}>
Filtrar
</button>

</div>

<h2 style={tituloSeccion}>🗂 CHECKLISTS</h2>

<div style={tabla}>

{checklists.length === 0 && (
<div style={empty}>Sin registros</div>
)}

{checklists.map((c,i)=>{

const estado = c.items[0]?.estado
const estadoVisual = getEstadoVisual(estado)

return(

<div key={i} style={rowClickable}>

<div onClick={()=>procesarDetalle(c.items)}>
📅 {new Date(c.fecha).toLocaleString()}
</div>

<div onClick={()=>procesarDetalle(c.items)}>
🧾 {c.items.length} items
</div>

<div style={{
color:estadoVisual.color,
fontWeight:"bold"
}} onClick={()=>procesarDetalle(c.items)}>
{estadoVisual.label}
</div>

<button
onClick={()=>borrarChecklist(c.items)}
style={btnEliminar}
>
🗑️
</button>

</div>

)

})}

</div>

<h2 style={tituloSeccion}>📋 DETALLE OPERATIVO</h2>

<div style={tabla}>

{Object.keys(detalle).length === 0 && (
<div style={empty}>Selecciona un checklist</div>
)}

{Object.keys(detalle).map((cat,i)=>(

<div key={i} style={bloqueCategoria}>

<h3 style={tituloCategoria}>
🧩 {cat.toUpperCase()} ({detalle[cat].length})
</h3>

{detalle[cat].map((d:any)=>{

const estadoVisual = getEstadoVisual(d.estado)

return(

<div key={d.id} style={row}>

<div>{d.inventario_items?.nombre}</div>
<div>{d.lote || "-"}</div>
<div>{d.cantidad}</div>
<div>{d.fecha_caducidad || "-"}</div>

<div style={{
background:estadoVisual.color,
padding:"5px",
borderRadius:6,
textAlign:"center",
fontWeight:"bold"
}}>
{estadoVisual.label}
</div>

</div>

)

})}

</div>

))}

</div>

</div>
)
}

/* ========================= */

const container: CSSProperties = {
background:"#020617",
color:"white",
minHeight:"100vh",
padding:30
}

const input: CSSProperties = {
padding:10,
borderRadius:8,
background:"#1f2937",
color:"white",
border:"none"
}

const btn: CSSProperties = {
marginBottom:20,
background:"#1f2937",
color:"white",
padding:10,
borderRadius:8
}

const btnEliminar: CSSProperties = {
background:"#ef4444",
color:"white",
border:"none",
padding:"5px 10px",
borderRadius:6,
cursor:"pointer"
}

const tabla: CSSProperties = {
background:"#111827",
borderRadius:10,
padding:10,
marginTop:20
}

const row: CSSProperties = {
display:"grid",
gridTemplateColumns:"repeat(5,1fr)",
padding:10,
borderBottom:"1px solid #1f2937"
}

const rowClickable: CSSProperties = {
display:"grid",
gridTemplateColumns:"2fr 1fr 1fr auto",
padding:12,
borderBottom:"1px solid #1f2937",
background:"rgba(255,255,255,0.02)"
}

const bloqueCategoria: CSSProperties = {
marginBottom:25,
padding:10,
borderRadius:10,
background:"rgba(56,189,248,0.05)",
border:"1px solid rgba(56,189,248,0.2)"
}

const tituloCategoria: CSSProperties = {
color:"#38bdf8",
fontWeight:"bold",
letterSpacing:"1px",
textTransform:"uppercase",
marginBottom:10
}

const tituloSeccion: CSSProperties = {
marginTop:20,
fontSize:18,
fontWeight:"bold",
letterSpacing:"1px"
}

const empty: CSSProperties = {
padding:20,
opacity:0.6
}