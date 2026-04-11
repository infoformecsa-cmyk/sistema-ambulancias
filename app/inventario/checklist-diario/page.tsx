"use client"

export const dynamic = "force-dynamic"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"

const COLORES_KIT:any = {
celeste:"#06b6d4",
azul:"#3b82f6",
rojo:"#ef4444",
amarillo:"#f59e0b"
}

const ORDEN = [
"lenceria","dispositivos","sondas","respiratorio",
"oxigeno","canalizacion","biomedicos","limpieza",
"curaciones","medicamentos","trauma","proteccion"
]

export default function ChecklistSimple(){

const [items,setItems] = useState<any[]>([])
const [kits,setKits] = useState<any[]>([])
const [ambulancias,setAmbulancias] = useState<any[]>([])

const [ambulancia,setAmbulancia] = useState("")
const [responsable,setResponsable] = useState("")

const [expandido,setExpandido] = useState<any>({})
const [datos,setDatos] = useState<any>({})
const [guardando,setGuardando] = useState(false)

/* ========================= */

useEffect(()=>{
const d = localStorage.getItem("checklist_simple")
const a = localStorage.getItem("checklist_simple_ambulancia")
const r = localStorage.getItem("checklist_simple_responsable")

if(d) setDatos(JSON.parse(d))
if(a) setAmbulancia(a)
if(r) setResponsable(r)

cargar()
},[])

/* AUTOGUARDADO LOCAL */
useEffect(()=>{
const interval = setInterval(()=>{
localStorage.setItem("checklist_simple", JSON.stringify(datos))
localStorage.setItem("checklist_simple_ambulancia", ambulancia)
localStorage.setItem("checklist_simple_responsable", responsable)
},5000)

return ()=>clearInterval(interval)
},[datos,ambulancia,responsable])

/* ========================= */

async function cargar(){

const {data} = await supabase.from("inventario_items").select("*")
const {data:amb} = await supabase.from("ambulancias").select("*")

const limpio = (data || []).map(i => ({
...i,
categoria: (i.categoria || "").toLowerCase().trim()
}))

setKits(limpio.filter(i=>i.subcategoria==="kit_parto"))
setItems(limpio.filter(i=>i.subcategoria!=="kit_parto"))

const ordenadas = (amb || []).sort((a,b)=>{
return a.codigo_operativo.localeCompare(
b.codigo_operativo,
undefined,
{ numeric: true, sensitivity: "base" }
)
})

setAmbulancias(ordenadas)
}

/* ========================= */

function toggle(k:string){
setExpandido((p:any)=>({...p,[k]:!p[k]}))
}

function actualizarCantidad(id:string,val:any){
setDatos({...datos,[id]:val})
}

function getMin(i:any){
return i.cantidad_minima>0 ? i.cantidad_minima : "-"
}

/* ========================= */
/* 💾 GUARDAR BORRADOR EN SUPABASE */
/* ========================= */

async function guardarBorrador(){

if(!ambulancia || !responsable.trim()){
alert("⚠️ Complete ambulancia y responsable")
return
}

try{

for(const itemId in datos){

const cantidad = Number(datos[itemId] || 0)

await supabase.from("inventario_checklist").insert({
ambulancia_id: ambulancia,
item_id: itemId,
cantidad,
estado: "BORRADOR",
fecha_registro: new Date().toISOString(),
responsable: responsable.trim()
})

}

alert("💾 Borrador guardado en sistema")

}catch(e){
console.error(e)
alert("Error guardando borrador")
}
}

/* ========================= */
/* 🚫 VALIDAR DUPLICADO */
/* ========================= */

async function yaExisteChecklistHoy(){

const hoyInicio = new Date()
hoyInicio.setHours(0,0,0,0)

const hoyFin = new Date()
hoyFin.setHours(23,59,59,999)

const { data } = await supabase
.from("inventario_checklist")
.select("id")
.eq("ambulancia_id", ambulancia)
.eq("estado", "FINALIZADO")
.gte("fecha_registro", hoyInicio.toISOString())
.lte("fecha_registro", hoyFin.toISOString())
.limit(1)

return data && data.length > 0
}

/* ========================= */
/* 📤 FINALIZAR */
/* ========================= */

async function guardar(){

if(!ambulancia || !responsable.trim()){
alert("⚠️ Debe seleccionar ambulancia y escribir responsable")
return
}

/* 🔥 VALIDAR DUPLICADO */
const existe = await yaExisteChecklistHoy()

if(existe){
alert("🚫 Esta ambulancia ya tiene checklist FINALIZADO hoy")
return
}

setGuardando(true)

try{

for(const itemId in datos){

const cantidad = Number(datos[itemId] || 0)

if(cantidad <= 0) continue

await supabase.from("inventario_checklist").insert({
ambulancia_id: ambulancia,
item_id: itemId,
cantidad,
estado: "FINALIZADO",
fecha_registro: new Date().toISOString(),
responsable: responsable.trim()
})

}

/* limpiar local */
localStorage.removeItem("checklist_simple")
localStorage.removeItem("checklist_simple_ambulancia")
localStorage.removeItem("checklist_simple_responsable")

setDatos({})
setAmbulancia("")
setResponsable("")

alert("✅ Checklist finalizado correctamente")

}catch(e){
console.error(e)
alert("Error")
}

setGuardando(false)
}

/* ========================= */
/* UI */
/* ========================= */

return(

<div style={container}>

<h1 style={{fontSize:22,marginBottom:10}}>🚑 Checklist Operativo</h1>

<div style={{display:"flex",gap:10,marginBottom:20,flexWrap:"wrap"}}>
<select value={ambulancia} onChange={e=>setAmbulancia(e.target.value)} style={input}>
<option value="">Ambulancia</option>
{ambulancias.map(a=>(
<option key={a.id} value={a.id}>{a.codigo_operativo}</option>
))}
</select>

<input
placeholder="Responsable"
value={responsable}
onChange={(e)=>setResponsable(e.target.value)}
style={input}
/>
</div>

<h2 style={{marginBottom:10}}>🧬 Kits Obstétricos</h2>

{["celeste","azul","amarillo","rojo"].map(color=>{

const grupo = kits.filter(k=>k.kit_color===color)
if(!grupo.length) return null

return(
<div key={color} style={{
background:"#111827",
borderRadius:10,
marginBottom:10,
borderLeft:`6px solid ${COLORES_KIT[color]}`
}}>

<div style={catHeader} onClick={()=>toggle(color)}>
KIT {color.toUpperCase()} ({grupo.length})
</div>

{expandido[color] && grupo.map(k=>(

<div key={k.id} style={item}>
<div style={{display:"flex",justifyContent:"space-between"}}>
<span>{k.nombre}</span>
<span style={badge}>Min {getMin(k)}</span>
</div>

<input
type="number"
placeholder="Cantidad"
value={datos[k.id] || ""}
onChange={e=>actualizarCantidad(k.id,e.target.value)}
style={{...input,marginTop:8}}
/>
</div>

))}

</div>
)

})}

<h2 style={{marginTop:20}}>📦 Checklist General</h2>

{ORDEN.map(cat=>{

const grupo = items.filter(i=>i.categoria===cat)

return(
<div key={cat} style={card}>

<div style={catHeader} onClick={()=>toggle(cat)}>
{cat.toUpperCase()} ({grupo.length})
</div>

{expandido[cat] && grupo.map(i=>(

<div key={i.id} style={item}>
<div style={{display:"flex",justifyContent:"space-between"}}>
<span>{i.nombre}</span>
<span style={badge}>Min {getMin(i)}</span>
</div>

<input
type="number"
placeholder="Cantidad"
value={datos[i.id] || ""}
onChange={e=>actualizarCantidad(i.id,e.target.value)}
style={{...input,marginTop:8}}
/>
</div>

))}

</div>
)

})}

<div style={{display:"flex",gap:10,marginTop:20,flexDirection:"column"}}>

<button onClick={guardarBorrador} style={{...btnGuardar,background:"#f59e0b"}}>
💾 Guardar borrador
</button>

<button onClick={guardar} style={btnGuardar}>
{guardando ? "Guardando..." : "📤 Finalizar"}
</button>

</div>

</div>
)
}

/* ========================= */

const container = {
background:"#020617",
color:"white",
minHeight:"100vh",
padding:"20px",
maxWidth:"900px",
margin:"0 auto"
}

const input = {
padding:"12px",
borderRadius:10,
background:"#1f2937",
color:"white",
border:"none",
width:"100%",
fontSize:"16px"
}

const card = {
background:"#111827",
borderRadius:10,
marginBottom:10
}

const catHeader = {
background:"#1f2937",
padding:12,
cursor:"pointer"
}

const item = {
padding:12,
borderBottom:"1px solid #1f2937"
}

const badge = {
background:"#16a34a",
padding:"2px 6px",
borderRadius:5,
fontSize:10
}

const btnGuardar = {
width:"100%",
background:"#22c55e",
color:"black",
padding:"18px",
border:"none",
borderRadius:"12px",
fontWeight:"bold",
fontSize:"16px"
}