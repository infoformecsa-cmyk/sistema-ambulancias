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
const [bloqueado,setBloqueado] = useState(false)

/* ========================= */

useEffect(()=>{
cargar()
},[])

/* ========================= */
/* 🔥 CARGAR DATA */
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
{ numeric: true }
)
})

setAmbulancias(ordenadas)
}

/* ========================= */
/* 🔥 CONTINUAR CHECKLIST */
/* ========================= */

async function verificarChecklistExistente(idAmbulancia:string){

if(!idAmbulancia) return

const hoyInicio = new Date()
hoyInicio.setHours(0,0,0,0)

const hoyFin = new Date()
hoyFin.setHours(23,59,59,999)

/* 🔍 buscar FINALIZADO */
const { data:finalizado } = await supabase
.from("inventario_checklist")
.select("*")
.eq("ambulancia_id", idAmbulancia)
.eq("estado","FINALIZADO")
.gte("fecha_registro", hoyInicio.toISOString())
.lte("fecha_registro", hoyFin.toISOString())
.limit(1)

if(finalizado && finalizado.length > 0){
alert("🚫 Esta ambulancia ya tiene checklist FINALIZADO hoy")
setBloqueado(true)
setDatos({})
return
}

/* 🔍 buscar BORRADOR */
const { data:borrador } = await supabase
.from("inventario_checklist")
.select("*")
.eq("ambulancia_id", idAmbulancia)
.eq("estado","BORRADOR")
.gte("fecha_registro", hoyInicio.toISOString())
.lte("fecha_registro", hoyFin.toISOString())

if(borrador && borrador.length > 0){

const reconstruido:any = {}

borrador.forEach((i:any)=>{
reconstruido[i.item_id] = i.cantidad
})

setDatos(reconstruido)

alert("📝 Continuando checklist en borrador")
}

}

/* ========================= */

function toggle(k:string){
setExpandido((p:any)=>({...p,[k]:!p[k]}))
}

function actualizarCantidad(id:string,val:any){
if(bloqueado) return
setDatos({...datos,[id]:val})
}

function getMin(i:any){
return i.cantidad_minima>0 ? i.cantidad_minima : "-"
}

/* ========================= */
/* 💾 BORRADOR */
/* ========================= */

async function guardarBorrador(){

if(!ambulancia || !responsable.trim()){
alert("⚠️ Complete ambulancia y responsable")
return
}

await supabase
.from("inventario_checklist")
.delete()
.eq("ambulancia_id", ambulancia)
.eq("estado","BORRADOR")

for(const itemId in datos){

await supabase.from("inventario_checklist").insert({
ambulancia_id: ambulancia,
item_id: itemId,
cantidad: Number(datos[itemId] || 0),
estado: "BORRADOR",
fecha_registro: new Date().toISOString(),
responsable: responsable.trim()
})

}

alert("💾 Borrador actualizado")
}

/* ========================= */
/* 📤 FINALIZAR */
/* ========================= */

async function guardar(){

if(!ambulancia || !responsable.trim()){
alert("⚠️ Complete ambulancia y responsable")
return
}

if(bloqueado){
alert("🚫 No se puede modificar")
return
}

setGuardando(true)

try{

await supabase
.from("inventario_checklist")
.delete()
.eq("ambulancia_id", ambulancia)
.eq("estado","BORRADOR")

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

setDatos({})
setAmbulancia("")
setResponsable("")
setBloqueado(false)

alert("✅ Checklist finalizado")

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

<h1 style={{fontSize:22}}>🚑 Checklist Operativo</h1>

<select
value={ambulancia}
onChange={(e)=>{
setAmbulancia(e.target.value)
verificarChecklistExistente(e.target.value)
}}
style={input}
>
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

<h2>🧬 Kits Obstétricos</h2>

{["celeste","azul","amarillo","rojo"].map(color=>{

const grupo = kits.filter(k=>k.kit_color===color)
if(!grupo.length) return null

return(
<div key={color} style={card}>
<div style={catHeader} onClick={()=>toggle(color)}>
KIT {color.toUpperCase()}
</div>

{expandido[color] && grupo.map(k=>(

<div key={k.id} style={item}>
<span>{k.nombre}</span>

<input
type="number"
value={datos[k.id] || ""}
onChange={e=>actualizarCantidad(k.id,e.target.value)}
style={input}
/>

</div>

))}

</div>
)

})}

<h2>📦 Checklist General</h2>

{ORDEN.map(cat=>{

const grupo = items.filter(i=>i.categoria===cat)

return(
<div key={cat} style={card}>

<div style={catHeader} onClick={()=>toggle(cat)}>
{cat.toUpperCase()}
</div>

{expandido[cat] && grupo.map(i=>(

<div key={i.id} style={item}>
<span>{i.nombre}</span>

<input
type="number"
value={datos[i.id] || ""}
onChange={e=>actualizarCantidad(i.id,e.target.value)}
style={input}
/>

</div>

))}

</div>
)

})}

<button onClick={guardarBorrador} style={{...btnGuardar,background:"#f59e0b"}}>
💾 Guardar borrador
</button>

<button onClick={guardar} style={btnGuardar}>
{guardando ? "Guardando..." : "📤 Finalizar"}
</button>

</div>
)
}

/* ========================= */

const container = {
background:"#020617",
color:"white",
minHeight:"100vh",
padding:"20px"
}

const input = {
width:"100%",
marginTop:10,
padding:10,
background:"#1f2937",
color:"white",
border:"none"
}

const card = {marginTop:10,background:"#111827"}
const catHeader = {padding:10,background:"#1f2937"}
const item = {padding:10}

const btnGuardar = {
width:"100%",
marginTop:10,
padding:15,
background:"#22c55e",
border:"none",
color:"black"
}