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

/* ========================= */

async function cargarAmbulancias(){

const { data, error } = await supabase
.from("ambulancias")
.select("id,codigo_operativo")

if(error){
console.error("❌ Error ambulancias:", error)
return
}

setAmbulancias(
(data || []).sort((a,b)=>
a.codigo_operativo.localeCompare(b.codigo_operativo, undefined, {numeric:true})
)
)
}

/* ========================= */

async function cargarHistorial(id:string){

if(!id){
setDatos([])
return
}

let query = supabase
.from("inventario_checklist")
.select(`
*,
inventario_items (
  nombre
)
`)
.eq("ambulancia_id", id.trim())

if(fechaInicio){
query = query.gte("created_at", `${fechaInicio}T00:00:00`)
}

if(fechaFin){
query = query.lte("created_at", `${fechaFin}T23:59:59`)
}

let { data, error } = await query.order("created_at",{ascending:false})

if(error){
console.error("❌ Error query:", error)
}

/* fallback */
if(!data || data.length === 0){
const { data: allData } = await supabase
.from("inventario_checklist")
.select(`*, inventario_items ( nombre )`)
.order("created_at",{ascending:false})

data = allData || []
}

let lista = data

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
/* 🔥 BORRAR POR AMBULANCIA */
/* ========================= */

async function eliminarRegistros(){

if(!ambulancia){
alert("Selecciona una ambulancia")
return
}

const ok = confirm("⚠️ Esto eliminará los registros. ¿Continuar?")
if(!ok) return

let query = supabase
.from("inventario_checklist")
.delete()
.eq("ambulancia_id", ambulancia)

if(fechaInicio){
query = query.gte("created_at", `${fechaInicio}T00:00:00`)
}

if(fechaFin){
query = query.lte("created_at", `${fechaFin}T23:59:59`)
}

const { error } = await query

if(error){
alert("Error al eliminar")
console.error(error)
}else{
alert("✅ Registros eliminados")
cargarHistorial(ambulancia)
}

}

/* ========================= */
/* 🔥 BORRAR SOLO LO VISIBLE */
/* ========================= */

async function eliminarVisibles(){

if(datos.length === 0){
alert("No hay datos")
return
}

const ok = confirm("Eliminar SOLO los registros visibles?")
if(!ok) return

const ids = datos.map(d=>d.id)

const { error } = await supabase
.from("inventario_checklist")
.delete()
.in("id", ids)

if(error){
console.error(error)
alert("Error")
}else{
alert("✅ Eliminados")
setDatos([])
}

}

/* ========================= */

function exportarCSV(){

if(datos.length === 0){
alert("No hay datos")
return
}

const encabezados = ["Fecha","Item","Lote","Cantidad","Caducidad","Estado"]

const filas = datos.map(d=>[
d.created_at ? new Date(d.created_at).toLocaleString() : "",
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
cargarHistorial(id)
}}
style={input}
>
<option value="">Seleccionar ambulancia</option>
{ambulancias.map(a=>(
<option key={a.id} value={a.id}>{a.codigo_operativo}</option>
))}
</select>

<div style={{display:"flex",gap:10,flexWrap:"wrap"}}>

<input type="date" value={fechaInicio} onChange={e=>setFechaInicio(e.target.value)} style={input}/>
<input type="date" value={fechaFin} onChange={e=>setFechaFin(e.target.value)} style={input}/>

<button onClick={()=>cargarHistorial(ambulancia)} style={input}>Filtrar</button>

<button onClick={()=>{
setFechaInicio("")
setFechaFin("")
setSoloUltimo(false)
cargarHistorial(ambulancia)
}} style={input}>Reset</button>

<button onClick={()=>{
setSoloUltimo(!soloUltimo)
cargarHistorial(ambulancia)
}} style={input}>
{soloUltimo ? "Ver todos" : "Solo último"}
</button>

<button onClick={exportarCSV} style={input}>⬇️ Exportar</button>

{/* 🔥 NUEVOS BOTONES */}
<button onClick={eliminarRegistros} style={btnDanger}>
🗑️ Borrar por ambulancia
</button>

<button onClick={eliminarVisibles} style={btnDanger}>
🔥 Borrar visibles
</button>

</div>

<div style={tabla}>

<div style={headerRow}>
<div>Fecha</div>
<div>Item</div>
<div>Lote</div>
<div>Cantidad</div>
<div>Caducidad</div>
<div>Estado</div>
</div>

{datos.map(d=>(

<div key={d.id} style={row}>

<div>{d.created_at ? new Date(d.created_at).toLocaleString() : "-"}</div>
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
const input = {padding:10,borderRadius:8,background:"#1f2937",color:"white",border:"none"}
const btn = {marginBottom:20,background:"#1f2937",color:"white",padding:10,borderRadius:8}
const btnDanger = {background:"#7f1d1d",color:"white",padding:10,borderRadius:8,border:"none",cursor:"pointer"}
const tabla = {background:"#111827",borderRadius:10,padding:10,marginTop:20}
const headerRow = {display:"grid",gridTemplateColumns:"repeat(6,1fr)",fontWeight:"bold",padding:10}
const row = {display:"grid",gridTemplateColumns:"repeat(6,1fr)",padding:10}