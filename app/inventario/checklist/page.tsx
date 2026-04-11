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

export default function Checklist(){

const [items,setItems] = useState<any[]>([])
const [kits,setKits] = useState<any[]>([])
const [ambulancias,setAmbulancias] = useState<any[]>([])

const [ambulancia,setAmbulancia] = useState("")
const [responsable,setResponsable] = useState("")

const [expandido,setExpandido] = useState<any>({})
const [datos,setDatos] = useState<any>({})
const [guardando,setGuardando] = useState(false)

/* ========================= */
/* INIT */
/* ========================= */

useEffect(()=>{
cargar()
},[])

/* 🔁 AUTO CARGAR BORRADOR */
useEffect(()=>{
if(ambulancia){
cargarBorrador()
}
},[ambulancia])

async function cargar(){

const {data} = await supabase.from("inventario_items").select("*")
const {data:amb} = await supabase.from("ambulancias").select("*")

const limpio = (data || []).map(i => ({
...i,
categoria: (i.categoria || "").toLowerCase().trim()
}))

setItems(limpio.filter(i=>i.subcategoria!=="kit_parto"))
setKits(limpio.filter(i=>i.subcategoria==="kit_parto"))

const ordenadas = (amb || []).sort((a,b)=>
a.codigo_operativo.localeCompare(b.codigo_operativo,undefined,{numeric:true})
)

setAmbulancias(ordenadas)
}

/* ========================= */
/* 🔁 CONTINUAR BORRADOR */
/* ========================= */

async function cargarBorrador(){

const { data } = await supabase
.from("inventario_checklist")
.select("*")
.eq("ambulancia_id", ambulancia)
.eq("estado","BORRADOR")

if(!data || data.length === 0) return

const reconstruido:any = {}

data.forEach((d:any)=>{
if(!reconstruido[d.item_id]){
reconstruido[d.item_id] = []
}

reconstruido[d.item_id].push({
lote: d.lote,
cantidad: d.cantidad,
fecha: d.fecha_caducidad
})
})

setDatos(reconstruido)

alert("🔁 Se cargó un borrador existente")
}

/* ========================= */

function toggle(k:string){
setExpandido((p:any)=>({...p,[k]:!p[k]}))
}

function agregarLote(id:string){
const actual = datos[id] || []
setDatos({...datos,[id]:[...actual,{lote:"",cantidad:"",fecha:""}]})
}

function actualizar(id:string,i:number,campo:string,val:any){
const copia = [...(datos[id]||[])]
if(!copia[i]) copia[i] = {}
copia[i][campo]=val
setDatos({...datos,[id]:copia})
}

function getMin(i:any){
return i.cantidad_minima>0 ? i.cantidad_minima : "-"
}

/* ========================= */
/* 🚫 VALIDAR DUPLICADO */
/* ========================= */

async function yaExisteFinalizado(){

const inicio = new Date()
inicio.setHours(0,0,0,0)

const fin = new Date()
fin.setHours(23,59,59,999)

const { data } = await supabase
.from("inventario_checklist")
.select("id")
.eq("ambulancia_id", ambulancia)
.eq("estado","FINALIZADO")
.gte("fecha_registro", inicio.toISOString())
.lte("fecha_registro", fin.toISOString())
.limit(1)

return data && data.length > 0
}

/* ========================= */
/* 💾 GUARDAR (GENÉRICO) */
/* ========================= */

async function guardar(tipo:"BORRADOR"|"FINALIZADO"){

if(!ambulancia || !responsable){
alert("⚠️ Complete datos")
return
}

if(tipo === "FINALIZADO"){
const existe = await yaExisteFinalizado()
if(existe){
alert("🚫 Ya existe checklist FINALIZADO hoy")
return
}
}

setGuardando(true)

try{

/* 🔥 BORRAR BORRADOR ANTERIOR */
await supabase
.from("inventario_checklist")
.delete()
.eq("ambulancia_id", ambulancia)
.eq("estado","BORRADOR")

for(const itemId in datos){

const item = items.find(i=>i.id === itemId) || kits.find(k=>k.id === itemId)
const lotes = datos[itemId]

for(const l of lotes){

if(!l) continue

const cantidadNum = Number(l.cantidad || 0)

if(cantidadNum <= 0) continue

await supabase.from("inventario_checklist").insert({
ambulancia_id: ambulancia,
item_id: itemId,
nombre: item?.nombre,
lote: l.lote || null,
cantidad: cantidadNum,
fecha_caducidad: l.fecha || null,
fecha_registro: new Date().toISOString(),
responsable,
estado: tipo
})

/* SOLO SI FINALIZA → BITÁCORA */
if(tipo === "FINALIZADO"){
await supabase.from("bitacora_items").insert({
ambulancia_id: ambulancia,
nombre: item?.nombre,
tipo: "CHECKLIST",
cantidad: cantidadNum,
lote: l.lote || null,
fecha_registro: new Date().toISOString()
})
}

}

}

if(tipo === "FINALIZADO"){
setDatos({})
setAmbulancia("")
setResponsable("")
alert("✅ Checklist FINALIZADO")
}else{
alert("💾 Borrador guardado")
}

}catch(e){
console.error(e)
alert("❌ Error")
}

setGuardando(false)
}

/* ========================= */
/* UI */
/* ========================= */

return(

<div style={container}>

<div style={header}>
<div>
<h1>🚑 Checklist Clínico</h1>
<span style={{color:"#9ca3af"}}>Control operativo en tiempo real</span>
</div>

<div style={panel}>
<select value={ambulancia} onChange={(e)=>setAmbulancia(e.target.value)} style={input}>
<option value="">Seleccionar ambulancia</option>
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
</div>

<h2 style={section}>🧬 Kits Obstétricos</h2>

<div style={grid}>
{["celeste","azul","amarillo","rojo"].map(color=>{
const grupo = kits.filter(k=>k.kit_color===color)
if(!grupo.length) return null

return(
<div key={color} style={{background:"#111827",borderRadius:12,borderLeft:`6px solid ${COLORES_KIT[color]}`}}>

<div onClick={()=>toggle(color)} style={kitHeader}>
<span>Clave {color}</span>
</div>

{expandido[color] && grupo.map(k=>(

<div key={k.id} style={item}>
<div style={rowTop}>
<span>{k.nombre}</span>
<span style={badge}>Min {getMin(k)}</span>
</div>

<button style={btnAdd} onClick={()=>agregarLote(k.id)}>+ Lote</button>

{(datos[k.id]||[]).map((l:any,i:number)=>(

<div key={i} style={inputsRow}>
<input style={input} value={l.lote || ""} placeholder="Lote"
onChange={e=>actualizar(k.id,i,"lote",e.target.value)}/>

<input style={input} type="number" value={l.cantidad || ""} placeholder="Cantidad"
onChange={e=>actualizar(k.id,i,"cantidad",e.target.value)}/>

<input style={input} type="date"
value={l.fecha || ""}
onChange={e=>actualizar(k.id,i,"fecha",e.target.value)}/>
</div>

))}

</div>

))}

</div>
)
})}
</div>

<h2 style={section}>📦 Checklist General</h2>

{ORDEN.map(cat=>{
const grupo = items.filter(i => i.categoria === cat)

return(
<div key={cat} style={card}>
<div style={catHeader} onClick={()=>toggle(cat)}>
{cat.toUpperCase()} ({grupo.length})
</div>

{expandido[cat] && grupo.map(i=>(
<div key={i.id} style={item}>
<div style={rowTop}>
<span>{i.nombre}</span>
<span style={badge}>Min {getMin(i)}</span>
</div>

<button style={btnAdd} onClick={()=>agregarLote(i.id)}>+ Lote</button>

{(datos[i.id]||[]).map((l:any,index:number)=>(

<div key={index} style={inputsRow}>
<input style={input} value={l.lote || ""} placeholder="Lote"
onChange={e=>actualizar(i.id,index,"lote",e.target.value)}/>

<input style={input} type="number" value={l.cantidad || ""} placeholder="Cantidad"
onChange={e=>actualizar(i.id,index,"cantidad",e.target.value)}/>

<input style={input} type="date"
value={l.fecha || ""}
onChange={e=>actualizar(i.id,index,"fecha",e.target.value)}/>
</div>

))}

</div>
))}

</div>
)
})}

/* 🔥 BOTONES */

<div style={{display:"flex",gap:10,marginTop:30}}>

<button onClick={()=>guardar("BORRADOR")} style={{
...btnGuardar,
background:"#f59e0b"
}}>
💾 Guardar borrador
</button>

<button onClick={()=>guardar("FINALIZADO")} style={btnGuardar}>
{guardando ? "Guardando..." : "📤 Finalizar"}
</button>

</div>

</div>
)
}

/* ========================= */

const container = {background:"#020617",color:"white",minHeight:"100vh",padding:30}
const header = {display:"flex",justifyContent:"space-between",marginBottom:25}
const panel = {display:"flex",gap:10}
const input = {padding:10,borderRadius:8,background:"#1f2937",color:"white",border:"none"}
const section = {marginTop:20,marginBottom:10}
const grid = {display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",gap:15}
const kitHeader = {padding:12,cursor:"pointer"}
const card = {background:"#111827",borderRadius:10,marginBottom:10}
const catHeader = {background:"#1f2937",padding:10,cursor:"pointer"}
const item = {padding:10,borderBottom:"1px solid #1f2937"}
const rowTop = {display:"flex",justifyContent:"space-between"}
const inputsRow = {display:"flex",gap:5,marginTop:6}
const btnAdd = {marginTop:6,background:"#22c55e",border:"none",padding:"5px 10px",borderRadius:6,color:"black"}
const badge = {background:"#16a34a",padding:"2px 6px",borderRadius:5,fontSize:10}
const btnGuardar = {flex:1,background:"#22c55e",color:"black",padding:"18px",border:"none",borderRadius:"12px",fontWeight:"bold"}