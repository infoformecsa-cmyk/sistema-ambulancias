"use client"

import { useEffect, useState } from "react"
import React from "react"
import { supabase } from "@/lib/supabaseClient"
import { useRouter } from "next/navigation"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"

export default function Dashboard(){

const router = useRouter()

const [data,setData] = useState<any[]>([])
const [ambulancias,setAmbulancias] = useState<any[]>([])
const [items,setItems] = useState<any[]>([])

const [ambulanciaSeleccionada,setAmbulanciaSeleccionada] = useState<any>(null)
const [registros,setRegistros] = useState<any[]>([])

/* ========================= */
/* CARGA */
/* ========================= */

useEffect(()=>{
cargarAmbulancias()
cargarItems()
cargar()
},[])

async function cargarAmbulancias(){
const { data } = await supabase.from("ambulancias").select("id,codigo_operativo")
setAmbulancias(data || [])
}

async function cargarItems(){
const { data } = await supabase.from("inventario_items").select("id,nombre")
setItems(data || [])
}

/* ========================= */
/* 🔥 CARGAR CHECKLIST REAL */
/* ========================= */

async function cargar(){

const { data } = await supabase
.from("inventario_checklist")
.select("*")
.order("fecha_registro",{ascending:false})

/* 🔥 AGRUPAR ÚLTIMO REGISTRO */
const mapa:any = {}

;(data || []).forEach((d:any)=>{
const key = `${d.ambulancia_id}-${d.item_id}`

if(!mapa[key]){
mapa[key] = d
}
})

const lista = Object.values(mapa)

/* 🔥 PROCESAR ESTADO */
const procesado = lista.map((item:any)=>{

let estado = "OK"

if(item.cantidad === 0){
estado = "FALTANTE"
}
else if(item.cantidad < 2){
estado = "CRITICO"
}

return {...item, estado}
})

setData(procesado)
}

/* ========================= */
/* DETALLE */
/* ========================= */

async function cargarRegistros(id:string){

const { data } = await supabase
.from("inventario_checklist")
.select("*")
.eq("ambulancia_id", id)
.order("fecha_registro",{ascending:false})

setRegistros(data || [])

}

/* ========================= */
/* HELPERS */
/* ========================= */

function getNombreItem(id:string){
const i = items.find(x=>String(x.id)===String(id))
return i?.nombre || id
}

/* ========================= */
/* ACCIONES */
/* ========================= */

function cerrarSesion(){
localStorage.clear()
router.replace("/")
}

async function eliminarRegistro(id:string){

if(!confirm("¿Eliminar registro?")) return

await supabase.from("inventario_checklist").delete().eq("id",id)

cargar()
if(ambulanciaSeleccionada){
cargarRegistros(ambulanciaSeleccionada.id)
}
}

function irChecklist(ambulanciaId:string){
router.push(`/inventario/checklist?ambulancia=${ambulanciaId}`)
}

/* ========================= */
/* PDF */
/* ========================= */

function generarPDF(){

const doc = new jsPDF()

doc.text("REPORTE CHECKLIST AMBULANCIAS", 14, 15)

autoTable(doc,{
startY:20,
head:[["Ambulancia","Item","Cantidad","Lote","Estado"]],
body:data.map(i=>[
mapaAmbulancias[i.ambulancia_id] || "-",
getNombreItem(i.item_id),
i.cantidad,
i.lote || "-",
i.estado
])
})

doc.save("reporte_checklist.pdf")
}

/* ========================= */
/* MAPA */
/* ========================= */

const mapaAmbulancias = Object.fromEntries(
ambulancias.map(a => [a.id, a.codigo_operativo])
)

/* ========================= */
/* INTELIGENCIA */
/* ========================= */

const resumenAmbulancias = ambulancias.map(a=>{

const itemsAmb = data.filter(i=>i.ambulancia_id === a.id)

const faltantes = itemsAmb.filter(i=>i.cantidad === 0).length
const criticos = itemsAmb.filter(i=>i.estado==="CRITICO").length

let estado = "OK"

if(faltantes > 0) estado = "FALTANTE"
else if(criticos > 0) estado = "CRITICO"

return {
id:a.id,
nombre:a.codigo_operativo,
estado,
faltantes,
criticos,
preventivos:0
}

})

function colorEstado(e:string){
if(e==="FALTANTE") return "#7f1d1d"
if(e==="CRITICO") return "#ef4444"
return "#22c55e"
}

/* ========================= */
/* UI */
/* ========================= */

return(
<div style={container}>

<div style={header}>
<h1>🚑 Centro de Control Médico</h1>

<div style={{display:"flex",gap:10}}>
<button onClick={generarPDF} style={btn}>📄 PDF</button>
<button onClick={cerrarSesion} style={btnSecondary}>Salir</button>
</div>
</div>

<div style={grid}>

{resumenAmbulancias.map(a=>(
<div
key={a.id}
onClick={()=>{
setAmbulanciaSeleccionada(a)
cargarRegistros(a.id)
}}
style={{
background:colorEstado(a.estado),
padding:12,
borderRadius:12,
cursor:"pointer"
}}
>

<div style={{fontWeight:"bold"}}>🚑 {a.nombre}</div>
<div style={{fontSize:12}}>{a.estado}</div>

{a.faltantes > 0 && <div>❌ {a.faltantes}</div>}
{a.criticos > 0 && <div>⚠ {a.criticos}</div>}

</div>
))}

</div>

{ambulanciaSeleccionada && (
<div style={panel}>

<h2>🚑 {ambulanciaSeleccionada.nombre}</h2>

{registros.map(r=>(
<div key={r.id} style={row}>

<div style={{flex:2}}>{getNombreItem(r.item_id)}</div>
<div style={{flex:1}}>{r.cantidad}</div>
<div style={{flex:1}}>{r.lote || "-"}</div>

<div style={{
flex:1,
background:colorEstado(r.estado),
textAlign:"center" as const
}}>
{r.estado || "-"}
</div>

<div style={{display:"flex",gap:5}}>

<button onClick={()=>eliminarRegistro(r.id)}>🗑</button>

<button onClick={()=>irChecklist(r.ambulancia_id)}>
📋
</button>

</div>

</div>
))}

</div>
)}

</div>
)
}

/* ========================= */
/* ESTILOS */
/* ========================= */

const container: React.CSSProperties = {
background:"#020617",
color:"white",
minHeight:"100vh",
padding:30
}

const header: React.CSSProperties = {
display:"flex",
justifyContent:"space-between",
alignItems:"center",
marginBottom:20
}

const btn: React.CSSProperties = {
background:"#22c55e",
padding:"10px 15px",
borderRadius:8,
border:"none"
}

const btnSecondary: React.CSSProperties = {
background:"#1f2937",
color:"white",
padding:"10px 15px",
borderRadius:8,
border:"none"
}

const grid: React.CSSProperties = {
display:"grid",
gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",
gap:10,
marginBottom:20
}

const panel: React.CSSProperties = {
background:"#111827",
padding:15,
borderRadius:10
}

const row: React.CSSProperties = {
display:"flex",
gap:10,
padding:10,
borderBottom:"1px solid #1f2937"
}