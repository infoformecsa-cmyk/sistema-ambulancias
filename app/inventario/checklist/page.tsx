"use client"

export const dynamic = "force-dynamic"

import { useEffect, useState, useRef } from "react"
import type { CSSProperties } from "react"
import { supabase } from "@/lib/supabaseClient"

/* 🔥 SOLO CAMBIO AQUÍ */
const COLORES_KIT:any = {
celeste:"#8b5cf6", // ← morado clínico
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

const refAmbulancia = useRef<any>(null)
const refResponsable = useRef<any>(null)

/* ========================= */

useEffect(()=>{ cargar() },[])

useEffect(()=>{
if(ambulancia){ cargarBorrador() }
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

function validarAntesFinalizar(){

if(!ambulancia){
alert("🚑 Debe seleccionar una ambulancia")
refAmbulancia.current?.focus()
return false
}

if(!responsable || responsable.trim() === ""){
alert("👤 Debe ingresar responsable")
refResponsable.current?.focus()
return false
}

return true
}

/* ========================= */

async function guardar(tipo:"BORRADOR"|"FINALIZADO"){

if(tipo === "FINALIZADO"){
if(!validarAntesFinalizar()) return
}

setGuardando(true)

try{

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

}

}

alert(tipo === "FINALIZADO" ? "✅ Checklist FINALIZADO" : "💾 Borrador guardado")

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

<h1 style={{fontSize:20}}>🚑 Checklist Clínico</h1>

<div style={panel}>

<select
ref={refAmbulancia}
value={ambulancia}
onChange={(e)=>setAmbulancia(e.target.value)}
style={input}
>
<option value="">Ambulancia</option>
{ambulancias.map(a=>(
<option key={a.id} value={a.id}>{a.codigo_operativo}</option>
))}
</select>

<input
ref={refResponsable}
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
<div key={color} style={cardKit(color)}>

<div onClick={()=>toggle(color)} style={catHeader}>
{color === "celeste" ? "DISPOSITIVO MÉDICO OBSTÉTRICO" : `KIT ${color.toUpperCase()}`}
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
<input style={inputFull} placeholder="Lote" value={l.lote || ""}
onChange={e=>actualizar(k.id,i,"lote",e.target.value)}/>

<input style={inputFull} type="number" placeholder="Cantidad" value={l.cantidad || ""}
onChange={e=>actualizar(k.id,i,"cantidad",e.target.value)}/>

<input style={inputFull} type="date"
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
{cat.toUpperCase()}
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
<input style={inputFull} placeholder="Lote" value={l.lote || ""}
onChange={e=>actualizar(i.id,index,"lote",e.target.value)}/>

<input style={inputFull} type="number" placeholder="Cantidad" value={l.cantidad || ""}
onChange={e=>actualizar(i.id,index,"cantidad",e.target.value)}/>

<input style={inputFull} type="date"
value={l.fecha || ""}
onChange={e=>actualizar(i.id,index,"fecha",e.target.value)}/>
</div>

))}

</div>

))}

</div>
)

})}

<div style={btnContainer}>
<button onClick={()=>guardar("BORRADOR")} style={btnWarning}>
💾 Borrador
</button>

<button onClick={()=>guardar("FINALIZADO")} style={btnPrimary}>
{guardando ? "Guardando..." : "Finalizar"}
</button>
</div>

</div>
)
}

/* ========================= */
/* ESTILOS (SIN CAMBIOS) */
/* ========================= */

const container: CSSProperties = {
background:"#020617",
color:"white",
minHeight:"100vh",
padding:"15px",
maxWidth:"900px",
margin:"0 auto"
}

const header: CSSProperties = {
display:"flex",
flexDirection:"column",
gap:10,
marginBottom:20
}

const panel: CSSProperties = {
display:"flex",
flexDirection:"column",
gap:10
}

const input: CSSProperties = {
padding:"12px",
borderRadius:10,
background:"#1f2937",
color:"white",
border:"none",
width:"100%"
}

const inputFull: CSSProperties = {
...input,
marginTop:6
}

const grid: CSSProperties = {
display:"grid",
gridTemplateColumns:"1fr",
gap:10
}

const card: CSSProperties = {
background:"#111827",
borderRadius:10,
marginBottom:10
}

const catHeader: CSSProperties = {
background:"#1f2937",
padding:12,
cursor:"pointer"
}

const item: CSSProperties = {
padding:10,
borderBottom:"1px solid #1f2937"
}

const rowTop: CSSProperties = {
display:"flex",
justifyContent:"space-between"
}

const inputsRow: CSSProperties = {
display:"flex",
flexDirection:"column",
gap:6
}

const btnAdd: CSSProperties = {
marginTop:6,
background:"#22c55e",
border:"none",
padding:"8px",
borderRadius:8
}

const badge: CSSProperties = {
background:"#16a34a",
padding:"2px 6px",
borderRadius:5,
fontSize:10
}

const btnContainer: CSSProperties = {
display:"flex",
flexDirection:"column",
gap:10,
marginTop:20
}

const btnPrimary: CSSProperties = {
background:"#22c55e",
padding:"18px",
borderRadius:12,
border:"none",
fontWeight:"bold"
}

const btnWarning: CSSProperties = {
background:"#f59e0b",
padding:"18px",
borderRadius:12,
border:"none",
fontWeight:"bold"
}

const section: CSSProperties = {
marginTop:20,
marginBottom:10
}

const cardKit = (color:any): CSSProperties => ({
background:"#111827",
borderRadius:10,
borderLeft:`5px solid ${COLORES_KIT[color]}`
})