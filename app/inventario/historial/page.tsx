"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"

export default function HistorialChecklist(){

const [ambulancias,setAmbulancias] = useState<any[]>([])
const [ambulancia,setAmbulancia] = useState("")
const [datos,setDatos] = useState<any[]>([])

/* 🔥 NUEVO */
const [fechaInicio,setFechaInicio] = useState("")
const [fechaFin,setFechaFin] = useState("")
const [soloUltimo,setSoloUltimo] = useState(false)

useEffect(()=>{
cargarAmbulancias()
},[])

async function cargarAmbulancias(){
const { data } = await supabase.from("ambulancias").select("id,codigo_operativo")

const ordenadas = (data || []).sort((a,b)=>
a.codigo_operativo.localeCompare(b.codigo_operativo, undefined, {numeric:true})
)

setAmbulancias(ordenadas)
}

/* ========================= */

async function cargarHistorial(id:string){

let query = supabase
.from("inventario_checklist")
.select(`
*,
inventario_items (
  nombre
)
`)
.eq("ambulancia_id", id)

/* 🔥 FILTROS */
if(fechaInicio){
query = query.gte("fecha_registro", fechaInicio)
}

if(fechaFin){
query = query.lte("fecha_registro", fechaFin)
}

const { data } = await query.order("fecha_registro",{ascending:false})

let lista = data || []

/* 🔥 SOLO ÚLTIMO */
if(soloUltimo){
const mapa:any = {}

for(const item of lista){
if(!mapa[item.item_id]){
mapa[item.item_id] = item
}
}

lista = Object.values(mapa)
}

procesar(lista)
}

/* ========================= */

function procesar(data:any[]){

const hoy = new Date()

const procesado = data.map(i=>{

let estado = "OK"

if(i.fecha_caducidad){
const fecha = new Date(i.fecha_caducidad)
const diff = (fecha.getTime() - hoy.getTime()) / (1000*60*60*24)

if(diff <= 0) estado = "VENCIDO"
else if(diff <= 30) estado = "POR_VENCER"
}

return {...i, estado}
})

setDatos(procesado)
}

/* ========================= */

function colorEstado(e:string){
if(e==="VENCIDO") return "#7f1d1d"
if(e==="POR_VENCER") return "#f59e0b"
return "#22c55e"
}

/* ========================= */
/* 🔥 EXPORTAR */
/* ========================= */

function exportarCSV(){

if(datos.length === 0){
alert("No hay datos")
return
}

const encabezados = ["Fecha","Item","Lote","Cantidad","Caducidad","Estado"]

const filas = datos.map(d=>[
d.fecha_registro ? new Date(d.fecha_registro).toLocaleString() : "",
d.inventario_items?.nombre || d.item_id,
d.lote || "",
d.cantidad,
d.fecha_caducidad || "",
d.estado
])

const csv = [encabezados, ...filas]
.map(e=>e.join(","))
.join("\n")

const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })

const url = URL.createObjectURL(blob)

const link = document.createElement("a")
link.href = url
link.setAttribute("download","historial_checklist.csv")
document.body.appendChild(link)
link.click()
}

/* ========================= */
/* UI */
/* ========================= */

return(

<div style={container}>

<h1>📊 Historial Checklist</h1>

<select
value={ambulancia}
onChange={(e)=>{
setAmbulancia(e.target.value)
cargarHistorial(e.target.value)
}}
style={input}
>
<option value="">Seleccionar ambulancia</option>
{ambulancias.map(a=>(
<option key={a.id} value={a.id}>{a.codigo_operativo}</option>
))}
</select>

{/* 🔥 FILTROS */}
<div style={{display:"flex",gap:10,marginBottom:20}}>

<input type="date" value={fechaInicio} onChange={e=>setFechaInicio(e.target.value)} style={input}/>
<input type="date" value={fechaFin} onChange={e=>setFechaFin(e.target.value)} style={input}/>

<button onClick={()=>cargarHistorial(ambulancia)} style={input}>
Filtrar
</button>

<button onClick={()=>{
setFechaInicio("")
setFechaFin("")
setSoloUltimo(false)
cargarHistorial(ambulancia)
}} style={input}>
Reset
</button>

<button onClick={()=>{
setSoloUltimo(!soloUltimo)
cargarHistorial(ambulancia)
}} style={input}>
{soloUltimo ? "Ver todos" : "Solo último"}
</button>

<button onClick={exportarCSV} style={input}>
⬇️ Exportar
</button>

</div>

<div style={tabla}>

<div style={headerRow}>
<div>Fecha Registro</div>
<div>Item</div>
<div>Lote</div>
<div>Cantidad</div>
<div>Caducidad</div>
<div>Estado</div>
</div>

{datos.map(d=>(

<div key={d.id} style={row}>

<div>
{d.fecha_registro
? new Date(d.fecha_registro).toLocaleString()
: "-"}
</div>

<div>{d.inventario_items?.nombre || d.item_id}</div>

<div>{d.lote || "-"}</div>

<div>{d.cantidad}</div>

<div>{d.fecha_caducidad || "-"}</div>

<div style={{
background:colorEstado(d.estado),
padding:"5px",
borderRadius:6,
textAlign:"center"
}}>
{d.estado}
</div>

</div>

))}

</div>

</div>
)
}

/* ========================= */
/* ESTILOS (RESPETADOS) */
/* ========================= */

const container = {
background:"#020617",
color:"white",
minHeight:"100vh",
padding:30
}

const input = {
padding:10,
marginBottom:20,
borderRadius:8,
background:"#1f2937",
color:"white",
border:"none"
}

const tabla = {
background:"#111827",
borderRadius:10,
padding:10
}

const headerRow = {
display:"grid",
gridTemplateColumns:"1fr 1fr 1fr 1fr 1fr 1fr",
fontWeight:"bold",
padding:10,
borderBottom:"1px solid #1f2937"
}

const row = {
display:"grid",
gridTemplateColumns:"1fr 1fr 1fr 1fr 1fr 1fr",
padding:10,
borderBottom:"1px solid #1f2937"
}