"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { useRouter } from "next/navigation"

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

/* 🔥 LIMPIAR ANTES DE CARGAR */
setChecklists([])
setDetalle({})

let query = supabase
.from("inventario_checklist")
.select(`
*,
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

/* 🔥 SI NO HAY DATOS → VACÍO REAL */
if(!data || data.length === 0){
setChecklists([])
setDetalle({})
return
}

/* ========================= */
/* AGRUPAR POR MINUTO */
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

/* auto seleccionar último */
procesarDetalle(lista[0].items)

}

/* ========================= */
/* DETALLE POR CATEGORIA */
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

return(

<div style={container}>

<button onClick={()=>router.push("/bitacora/dashboard")} style={btn}>
⬅ Volver
</button>

<h1>📊 Historial Checklist</h1>

<select
value={ambulancia}
onChange={(e)=>{
const id = e.target.value
setAmbulancia(id)

/* 🔥 LIMPIEZA INMEDIATA */
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

{/* ========================= */}
{/* CHECKLISTS */}
{/* ========================= */}

<h2>🗂 CHECKLISTS</h2>

<div style={tabla}>

{checklists.length === 0 && (
<div style={{padding:20,opacity:0.6}}>
Sin registros para esta ambulancia
</div>
)}

{checklists.map((c,i)=>(

<div key={i} style={rowClickable} onClick={()=>procesarDetalle(c.items)}>

<div>
📅 {new Date(c.fecha).toLocaleString()}
</div>

<div>
🧾 {c.items.length} items
</div>

</div>

))}

</div>

{/* ========================= */}
{/* DETALLE */}
{/* ========================= */}

<h2>📋 DETALLE OPERATIVO</h2>

<div style={tabla}>

{Object.keys(detalle).length === 0 && (
<div style={{padding:20,opacity:0.6}}>
Selecciona un checklist
</div>
)}

{Object.keys(detalle).map((cat,i)=>(

<div key={i} style={bloqueCategoria}>

<h3 style={tituloCategoria}>
🧩 {cat.toUpperCase()} ({detalle[cat].length})
</h3>

{detalle[cat].map((d:any)=>(

<div key={d.id} style={row}>

<div>{d.inventario_items?.nombre}</div>
<div>{d.lote || "-"}</div>
<div>{d.cantidad}</div>
<div>{d.fecha_caducidad || "-"}</div>

<div style={estadoOK}>
OK
</div>

</div>

))}

</div>

))}

</div>

</div>
)
}

/* ========================= */
/* ESTILOS */
/* ========================= */

const container = {background:"#020617",color:"white",minHeight:"100vh",padding:30}

const input = {
padding:10,
borderRadius:8,
background:"#1f2937",
color:"white",
border:"none"
}

const btn = {
marginBottom:20,
background:"#1f2937",
color:"white",
padding:10,
borderRadius:8
}

const tabla = {
background:"#111827",
borderRadius:10,
padding:10,
marginTop:20
}

const row = {
display:"grid",
gridTemplateColumns:"repeat(5,1fr)",
padding:10,
borderBottom:"1px solid #1f2937"
}

const rowClickable = {
display:"flex",
justifyContent:"space-between",
padding:12,
borderBottom:"1px solid #1f2937",
cursor:"pointer",
background:"rgba(255,255,255,0.02)"
}

const bloqueCategoria = {
marginBottom:25,
padding:10,
borderRadius:10,
background:"rgba(56,189,248,0.05)",
border:"1px solid rgba(56,189,248,0.2)"
}

const tituloCategoria = {
color:"#38bdf8",
fontWeight:"bold",
letterSpacing:"1px",
textTransform:"uppercase",
marginBottom:10,
textShadow:"0 0 8px rgba(56,189,248,0.6)"
}

const estadoOK = {
background:"#22c55e",
padding:"5px",
borderRadius:6,
textAlign:"center",
fontWeight:"bold"
}