"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"

type DatosType = Record<string, {
  tiene?: boolean
  cantidad?: number
  fecha?: string
}>

export default function Checklist(){

const [ambulancias,setAmbulancias] = useState<any[]>([])
const [items,setItems] = useState<any[]>([])

const [ambulancia,setAmbulancia] = useState("")
const [guardando,setGuardando] = useState(false)

const [responsable,setResponsable] = useState({
  nombre:"",
  apellido:""
})

const [datos,setDatos] = useState<DatosType>({})

useEffect(()=>{
  cargar()
},[])

async function cargar(){

const {data:amb} = await supabase.from("ambulancias").select("*")

const {data:inv} = await supabase
.from("inventario_items")
.select("*")
.order("categoria",{ascending:true})

setAmbulancias(amb || [])

/* 🔥 FILTRO LIMPIO (AQUÍ ESTÁ LA MEJORA) */
setItems(
  (inv || []).filter(i =>
    i.nombre &&
    i.nombre.length > 3 &&
    !i.nombre.toLowerCase().includes("farma") &&
    !i.nombre.toLowerCase().includes("no ingresado")
  )
)

}

/* ========================= */
/* 🔥 SEMÁFORO */
/* ========================= */
function getSemaforo(fecha?: string){

if(!fecha) return {color:"#6b7280",label:"SIN FECHA"}

const hoy = new Date()
const cad = new Date(fecha)

const diff = cad.getTime() - hoy.getTime()
const dias = diff / (1000*60*60*24)

if(dias <= 0) return {color:"#ef4444",label:"CADUCADO"}
if(dias <= 30) return {color:"#f59e0b",label:"PRÓXIMO"}
return {color:"#22c55e",label:"OK"}
}

/* ========================= */
function actualizar(id:string, campo:string, valor:any){

setDatos((prev)=>({
...prev,
[id]:{
...prev[id],
[campo]:valor
}
}))
}

/* ========================= */
/* 🔥 GUARDADO OPTIMIZADO (PARALELO) */
/* ========================= */
async function guardar(){

if(!ambulancia){
alert("Seleccione ambulancia")
return
}

if(!responsable.nombre){
alert("Ingrese responsable")
return
}

setGuardando(true)

try{

const inserts = items.map(item=>{
const d = datos[item.id]
if(!d) return null

return supabase.from("inventario_checklist").insert({
ambulancia_id:ambulancia,
item_id:item.id,
tiene:d.tiene || false,
cantidad:Number(d.cantidad || 0),
fecha_caducidad:d.fecha || null,
nombre_responsable:responsable.nombre,
apellido_responsable:responsable.apellido
})
}).filter(Boolean)

await Promise.all(inserts as any)

alert("✅ Checklist guardado")

setDatos({})
setResponsable({nombre:"",apellido:""})
setAmbulancia("")

}catch(e){
console.error(e)
alert("Error guardando")
}

setGuardando(false)
}

/* ========================= */
function colorCategoria(cat:string){

if(cat==="medicamentos") return "#7c2d12"
if(cat==="respiratorio") return "#1e40af"
if(cat==="trauma") return "#92400e"
if(cat==="lenceria") return "#6d28d9"
if(cat==="canalizacion") return "#065f46"
return "#111827"

}

/* ========================= */
/* UI */
/* ========================= */

return(

<div style={container}>

{/* HEADER */}
<div style={header}>
<h1 style={{margin:0}}>🚑 Checklist Ambulancia</h1>
<p style={{margin:0,color:"#9ca3af"}}>
Control clínico inteligente
</p>
</div>

{/* PANEL SUPERIOR */}
<div style={panel}>

<select
value={ambulancia}
onChange={(e)=>setAmbulancia(e.target.value)}
style={input}
>
<option value="">Seleccione ambulancia</option>
{ambulancias.map(a=>(
<option key={a.id} value={a.id}>
{a.codigo_operativo}
</option>
))}
</select>

<input
placeholder="Nombre"
value={responsable.nombre}
onChange={(e)=>setResponsable({...responsable,nombre:e.target.value})}
style={input}
/>

<input
placeholder="Apellido"
value={responsable.apellido}
onChange={(e)=>setResponsable({...responsable,apellido:e.target.value})}
style={input}
/>

</div>

{/* TABLA */}
<div style={tableContainer}>

<table style={{width:"100%",borderCollapse:"collapse"}}>

<thead style={thead}>
<tr>
<th style={th}>Item</th>
<th style={th}>✔</th>
<th style={th}>Cant</th>
<th style={th}>Caducidad</th>
<th style={th}>Estado</th>
</tr>
</thead>

<tbody>

{/* 🔥 SOLO CATEGORÍAS CON ITEMS VÁLIDOS */}
{Array.from(new Set(items.filter(i=>i.nombre).map(i=>i.categoria))).map(cat => (

<>

<tr>
<td colSpan={5} style={{
background:colorCategoria(cat),
color:"white",
padding:10,
fontWeight:"bold"
}}>
{cat.toUpperCase()}
</td>
</tr>

{items
.filter(i=>i.categoria===cat && i.nombre)
.map(i=>{

const d = datos[i.id]
const sem = getSemaforo(d?.fecha)

return(
<tr key={i.id} style={row}>

<td style={td}>
{i.nombre}
<div style={{fontSize:10,color:"#9ca3af"}}>
Base: {i.cantidad_base || 0}
</div>
</td>

<td style={td}>
<input
type="checkbox"
checked={d?.tiene || false}
onChange={(e)=>actualizar(i.id,"tiene",e.target.checked)}
style={{transform:"scale(1.3)"}}
/>
</td>

<td style={td}>
<input
type="number"
value={d?.cantidad || ""}
onChange={(e)=>actualizar(i.id,"cantidad",e.target.value)}
style={inputSmall}
/>
</td>

<td style={td}>
<input
type="date"
value={d?.fecha || ""}
onChange={(e)=>actualizar(i.id,"fecha",e.target.value)}
style={inputSmall}
/>
</td>

<td style={td}>
<span style={{
background:sem.color,
color:"white",
padding:"5px 10px",
borderRadius:20,
fontSize:11,
fontWeight:"bold"
}}>
{sem.label}
</span>
</td>

</tr>
)

})}

</>
))}

</tbody>
</table>

</div>

{/* BOTÓN */}
<button onClick={guardar} style={btn}>
{guardando ? "Guardando..." : "💾 Guardar Checklist"}
</button>

</div>
)
}

/* ========================= */
/* ESTILOS PRO */
/* ========================= */

const container: React.CSSProperties = {
background:"#0f172a",
color:"white",
minHeight:"100vh",
padding:20,
fontFamily:"system-ui"
}

const header: React.CSSProperties = {
marginBottom:20
}

const panel: React.CSSProperties = {
display:"flex",
gap:10,
flexWrap:"wrap",
marginBottom:20
}

const tableContainer: React.CSSProperties = {
background:"#111827",
borderRadius:12,
overflow:"auto",
maxHeight:"65vh"
}

const thead: React.CSSProperties = {
position:"sticky",
top:0,
background:"#1f2937"
}

const row: React.CSSProperties = {
borderBottom:"1px solid #1f2937"
}

const th: React.CSSProperties = {
padding:10,
fontSize:12,
textAlign:"left"
}

const td: React.CSSProperties = {
padding:10,
fontSize:13
}

const input: React.CSSProperties = {
padding:10,
borderRadius:8,
border:"none",
background:"#1f2937",
color:"white"
}

const inputSmall: React.CSSProperties = {
padding:6,
borderRadius:6,
border:"none",
background:"#1f2937",
color:"white",
width:90
}

const btn: React.CSSProperties = {
marginTop:20,
background:"#22c55e",
color:"black",
padding:"14px 24px",
borderRadius:10,
border:"none",
cursor:"pointer",
fontWeight:"bold",
width:"100%"
}