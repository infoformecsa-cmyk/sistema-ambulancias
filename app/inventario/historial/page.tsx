"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { useRouter } from "next/navigation"

export default function HistorialChecklist(){

const router = useRouter()

const [ambulancias,setAmbulancias] = useState<any[]>([])
const [ambulancia,setAmbulancia] = useState("")
const [datos,setDatos] = useState<any[]>([])

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

if(!id){
setDatos([])
return
}

console.log("🔍 Ambulancia seleccionada:", id)

/* ========================= */
/* 🔥 QUERY PRINCIPAL */
/* ========================= */

let query = supabase
.from("inventario_checklist")
.select(`
*,
inventario_items (
  nombre
)
`)
.eq("ambulancia_id", id)

/* FILTROS POR FECHA (REAL) */
if(fechaInicio){
query = query.gte("created_at", `${fechaInicio}T00:00:00`)
}

if(fechaFin){
query = query.lte("created_at", `${fechaFin}T23:59:59`)
}

let { data } = await query.order("created_at",{ascending:false})

/* ========================= */
/* 🔥 FALLBACK INTELIGENTE */
/* ========================= */

if(!data || data.length === 0){

console.warn("⚠️ No hubo datos por ambulancia_id, aplicando fallback...")

let fallbackQuery = supabase
.from("inventario_checklist")
.select(`
*,
inventario_items (
  nombre
)
`)

/* aplicar mismos filtros */
if(fechaInicio){
fallbackQuery = fallbackQuery.gte("created_at", `${fechaInicio}T00:00:00`)
}

if(fechaFin){
fallbackQuery = fallbackQuery.lte("created_at", `${fechaFin}T23:59:59`)
}

const { data: fallbackData } = await fallbackQuery.order("created_at",{ascending:false})

data = fallbackData || []
}

console.log("📦 Datos obtenidos:", data)

/* ========================= */

let lista = data || []

/* SOLO ÚLTIMO */
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

function exportarCSV(){

if(datos.length === 0){
alert("No hay datos")
return
}

const encabezados = ["Fecha","Item","Lote","Cantidad","Caducidad","Estado"]

const filas = datos.map(d=>[
(d.fecha_registro || d.created_at)
? new Date(d.fecha_registro || d.created_at).toLocaleString()
: "",
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

<div style={{marginBottom:20}}>
<button
onClick={()=>router.push("/bitacora/dashboard")}
style={{
background:"#1f2937",
color:"white",
padding:"10px 15px",
borderRadius:8,
border:"none",
cursor:"pointer"
}}
>
⬅ Volver
</button>
</div>

<h1>📊 Historial Checklist</h1>

<select
value={ambulancia}
onChange={(e)=>{
const id = e.target.value
setAmbulancia(id)
cargarHistorial(id)
}}
style={input}
>
<option value="">Seleccionar ambulancia</option>
{ambulancias.map(a=>(
<option key={a.id} value={a.id}>{a.codigo_operativo}</option>
))}
</select>

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
{(d.fecha_registro || d.created_at)
? new Date(d.fecha_registro || d.created_at).toLocaleString()
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

/* ESTILOS */
const container = {background:"#020617",color:"white",minHeight:"100vh",padding:30}
const input = {padding:10,marginBottom:20,borderRadius:8,background:"#1f2937",color:"white",border:"none"}
const tabla = {background:"#111827",borderRadius:10,padding:10}
const headerRow = {display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr 1fr 1fr",fontWeight:"bold",padding:10,borderBottom:"1px solid #1f2937"}
const row = {display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr 1fr 1fr",padding:10,borderBottom:"1px solid #1f2937"}