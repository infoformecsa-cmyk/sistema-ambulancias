"use client"

export const dynamic = "force-dynamic"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"

/* ========================= */

const COLORES_KIT:any = {
celeste:"#06b6d4",
azul:"#3b82f6",
rojo:"#ef4444",
amarillo:"#f59e0b"
}

const ORDEN = [
"lenceria","dispositivos","sondas","respiratorio",
"oxigeno","canalizacion","biomedicos","limpieza",
"medicamentos","trauma","proteccion"
]

/* ========================= */

export default function Checklist(){

const [items,setItems] = useState<any[]>([])
const [kits,setKits] = useState<any[]>([])
const [ambulancias,setAmbulancias] = useState<any[]>([])

const [ambulancia,setAmbulancia] = useState("")
const [responsable,setResponsable] = useState("")

const [expandido,setExpandido] = useState<any>({})
const [datos,setDatos] = useState<any>({})
const [guardando,setGuardando] = useState(false)

useEffect(()=>{cargar()},[])

async function cargar(){

const {data,error} = await supabase.from("inventario_items").select("*")
const {data:amb,error:errorAmb} = await supabase.from("ambulancias").select("*")

if(error) console.error("Error cargando inventario:", error)
if(errorAmb) console.error("Error cargando ambulancias:", errorAmb)

/* 🔥 NORMALIZACIÓN */
const limpio = (data || []).map(i => ({
...i,
categoria: (i.categoria || "").toLowerCase().trim()
}))

setItems(limpio.filter(i=>i.subcategoria!=="kit_parto"))
setKits(limpio.filter(i=>i.subcategoria==="kit_parto"))
setAmbulancias(amb||[])

}

/* ========================= */

function toggle(k:string){
setExpandido((p:any)=>({...p,[k]:!p[k]}))
}

function agregarLote(id:string){
const actual = datos[id] || []
setDatos({...datos,[id]:[...actual,{lote:"",cantidad:0,fecha:""}]})
}

function actualizar(id:string,i:number,campo:string,val:any){
const copia = [...(datos[id]||[])]
copia[i][campo]=val
setDatos({...datos,[id]:copia})
}

function getMin(i:any){
return i.cantidad_minima>0 ? i.cantidad_minima : "-"
}

/* ========================= */
/* 💾 GUARDAR */
/* ========================= */

async function guardar(){

if(!ambulancia){
alert("⚠️ Debe seleccionar una ambulancia")
return
}

if(!responsable){
alert("⚠️ Ingrese responsable")
return
}

setGuardando(true)

try{

for(const itemId in datos){

const lotes = datos[itemId]
if(!lotes || lotes.length === 0) continue

for(const l of lotes){

if(!l.lote && !l.cantidad && !l.fecha) continue

const { error } = await supabase
.from("inventario_checklist")
.insert({
ambulancia_id: String(ambulancia),
item_id: itemId,
lote: l.lote || null,
cantidad: Number(l.cantidad || 0),
fecha_caducidad: l.fecha || null,
fecha_registro: new Date().toISOString(),
responsable: responsable
})

if(error){
console.error("ERROR CHECKLIST:", error)
alert("❌ Error guardando checklist")
setGuardando(false)
return
}

await supabase.from("bitacora_items").insert({
ambulancia_id: String(ambulancia),
nombre: "Checklist actualizado",
tipo: "CHECKLIST",
cantidad: Number(l.cantidad || 0),
lote: l.lote || null
})

}

}

alert("✅ Checklist guardado correctamente")
setDatos({})

}catch(err){
console.error("ERROR GENERAL:", err)
alert("❌ Error general al guardar")
}

setGuardando(false)

}

/* ========================= */

return(

<div style={container}>

{/* HEADER */}
<div style={header}>

<div>
<h1 style={{margin:0}}>🚑 Checklist Clínico</h1>
<span style={{color:"#9ca3af"}}>Control operativo en tiempo real</span>
</div>

<div style={panel}>

<select
value={ambulancia}
onChange={(e)=>setAmbulancia(e.target.value)}
style={input}
>
<option value="">Seleccionar ambulancia</option>
{ambulancias.map(a=>(
<option key={a.id} value={a.id}>
{a.codigo_operativo}
</option>
))}
</select>

<input
placeholder="Responsable"
value={responsable}
onChange={(e)=>setResponsable(e.target.value)}
style={input}
/>

</div>

</div>

{/* ========================= */}
{/* 🧬 KITS */}
{/* ========================= */}

<h2 style={section}>🧬 Kits Obstétricos</h2>

<div style={grid}>

{["celeste","azul","amarillo","rojo"].map(color=>{

const grupo = kits.filter(k=>k.kit_color===color)
if(!grupo.length) return null

const total = grupo.length
const cargados = grupo.filter(k=>datos[k.id]?.length>0).length

return(

<div key={color} style={{
background:"#111827",
borderRadius:12,
borderLeft:`6px solid ${COLORES_KIT[color]}`
}}>

<div onClick={()=>toggle(color)} style={kitHeader}>
<span>Clave {color}</span>
<span>{cargados}/{total}</span>
</div>

{expandido[color] && grupo.map(k=>(

<div key={k.id} style={item}>

<div style={rowTop}>
<span>{k.nombre}</span>
<span style={badge}>Min {getMin(k)}</span>
</div>

<button style={btnAdd} onClick={()=>agregarLote(k.id)}>
+ Lote
</button>

{(datos[k.id]||[]).map((l:any,i:number)=>(

<div key={i} style={inputsRow}>

<input placeholder="Lote"
onChange={e=>actualizar(k.id,i,"lote",e.target.value)}/>

<input type="number"
onChange={e=>actualizar(k.id,i,"cantidad",e.target.value)}/>

<input type="date"
onChange={e=>actualizar(k.id,i,"fecha",e.target.value)}/>

</div>

))}

</div>

))}

</div>

)

})}

</div>

{/* ========================= */}
{/* 📦 GENERAL */}
{/* ========================= */}

<h2 style={section}>📦 Checklist General</h2>

{ORDEN.map(cat=>{

const grupo = items.filter(i => i.categoria === cat)

return(

<div key={cat} style={card}>

<div style={catHeader} onClick={()=>toggle(cat)}>
{cat.toUpperCase()} ({grupo.length})
</div>

{expandido[cat] && grupo.length === 0 && (
<div style={{padding:10, color:"#6b7280"}}>
Sin ítems
</div>
)}

{expandido[cat] && grupo.map(i=>(

<div key={i.id} style={item}>

<div style={rowTop}>
<span>{i.nombre}</span>
<span style={badge}>Min {getMin(i)}</span>
</div>

<button style={btnAdd} onClick={()=>agregarLote(i.id)}>
+ Lote
</button>

{(datos[i.id]||[]).map((l:any,index:number)=>(

<div key={index} style={inputsRow}>

<input placeholder="Lote"
onChange={e=>actualizar(i.id,index,"lote",e.target.value)}/>

<input type="number"
onChange={e=>actualizar(i.id,index,"cantidad",e.target.value)}/>

<input type="date"
onChange={e=>actualizar(i.id,index,"fecha",e.target.value)}/>

</div>

))}

</div>

))}

</div>

)

})}

<div style={{marginTop:30}}>

<button
onClick={guardar}
style={{
width:"100%",
background: guardando ? "#9ca3af" : "#22c55e",
color:"black",
padding:"18px",
border:"none",
borderRadius:"12px",
fontWeight:"bold",
fontSize:"16px",
cursor:"pointer"
}}
>
{guardando ? "Guardando..." : "💾 Guardar Checklist"}
</button>

</div>

</div>
)
}

/* ========================= */
/* ESTILOS */
/* ========================= */

const container = {
background:"#020617",
color:"white",
minHeight:"100vh",
padding:30
}

const header = {
display:"flex",
justifyContent:"space-between",
marginBottom:25
}

const panel = {
display:"flex",
gap:10
}

const input = {
padding:10,
borderRadius:8,
background:"#1f2937",
color:"white",
border:"none"
}

const section = {
marginTop:20,
marginBottom:10
}

const grid = {
display:"grid",
gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",
gap:15
}

const kitHeader = {
padding:12,
cursor:"pointer",
display:"flex",
justifyContent:"space-between"
}

const card = {
background:"#111827",
borderRadius:10,
marginBottom:10
}

const catHeader = {
background:"#1f2937",
padding:10,
cursor:"pointer"
}

const item = {
padding:10,
borderBottom:"1px solid #1f2937"
}

const rowTop = {
display:"flex",
justifyContent:"space-between"
}

const inputsRow = {
display:"flex",
gap:5,
marginTop:6
}

const btnAdd = {
marginTop:6,
background:"#22c55e",
border:"none",
padding:"5px 10px",
borderRadius:6,
color:"black",
cursor:"pointer"
}

const badge = {
background:"#16a34a",
padding:"2px 6px",
borderRadius:5,
fontSize:10
}