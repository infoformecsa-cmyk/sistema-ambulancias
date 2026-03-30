"use client"

import { useEffect, useState } from "react"
import React from "react"
import { supabase } from "@/lib/supabaseClient"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"

export default function Dashboard(){

const [data,setData] = useState<any[]>([])
const [ambulancias,setAmbulancias] = useState<any[]>([])
const [filtro,setFiltro] = useState("todas")

const [editando,setEditando] = useState<any>(null)
const [form,setForm] = useState<any>({})

/* 🔥 NUEVO */
const [ambulanciaSeleccionada,setAmbulanciaSeleccionada] = useState<any>(null)
const [registros,setRegistros] = useState<any[]>([])

useEffect(()=>{
cargarAmbulancias()
cargar()
},[])

/* ========================= */
async function cargarAmbulancias(){
const { data } = await supabase.from("ambulancias").select("id,codigo_operativo")
setAmbulancias(data || [])
}

/* ========================= */
async function cargar(){

const { data } = await supabase.from("bitacora_items").select("*")

const hoy = new Date()

const procesado = (data || []).map(item=>{

const fecha = new Date(item.updated_at || item.created_at)
const diff = (hoy.getTime() - fecha.getTime()) / (1000*60*60*24)

let estado = "OK"
if(diff >= 15) estado = "CRITICO"
else if(diff >= 7) estado = "PREVENTIVO"

return {...item, estado}
})

setData(procesado)
}

/* ========================= */
/* 🔥 NUEVO CARGAR DETALLE */
async function cargarRegistros(id:string){

const { data } = await supabase
.from("bitacora_items")
.select("*")
.eq("ambulancia_id", id)

setRegistros(data || [])

}

/* ========================= */
/* EDIT */
function abrirEditar(item:any){
setEditando(item)
setForm({
nombre:item.nombre,
lote:item.lote,
cantidad:item.cantidad
})
}

async function guardarEdicion(){

await supabase
.from("bitacora_items")
.update({
nombre:form.nombre,
lote:form.lote,
cantidad:Number(form.cantidad)
})
.eq("id",editando.id)

setEditando(null)
cargar()

if(ambulanciaSeleccionada){
cargarRegistros(ambulanciaSeleccionada.id)
}

}

/* ========================= */
/* ELIMINAR */
async function eliminarRegistro(id:string){

const ok = confirm("¿Eliminar este registro?")
if(!ok) return

await supabase
.from("bitacora_items")
.delete()
.eq("id",id)

cargar()

if(ambulanciaSeleccionada){
cargarRegistros(ambulanciaSeleccionada.id)
}

}

/* ========================= */
/* IR A CHECKLIST */
function abrirChecklist(item:any){
window.location.href = `/inventario/checklist?ambulancia=${item.ambulancia_id}`
}

/* ========================= */
/* PDF */
function generarPDF(){

const doc = new jsPDF()

doc.text("REPORTE BITACORA AMBULANCIAS", 14, 15)

autoTable(doc,{
startY:20,
head:[["Ambulancia","Nombre","Tipo","Lote","Estado"]],
body:data.map(i=>[
mapaAmbulancias[i.ambulancia_id] || "-",
i.nombre,
i.tipo,
i.lote || "-",
i.estado
])
})

doc.save("reporte_bitacora.pdf")
}

/* ========================= */
/* SESION */
function cerrarSesion(){
localStorage.clear()
window.location.href = "/"
}

/* ========================= */
/* MAPA */
const mapaAmbulancias = Object.fromEntries(
ambulancias.map(a => [a.id, a.codigo_operativo])
)

/* ========================= */
/* CONSUMO */
const consumo = ambulancias.map(a=>{
const items = data.filter(i=>i.ambulancia_id === a.id)
const total = items.reduce((sum,i)=> sum + (i.cantidad || 0),0)
return {id:a.id,nombre:a.codigo_operativo,total}
})

/* ========================= */
/* RESUMEN */
const resumenAmbulancias = ambulancias.map(a=>{

const items = data.filter(i=>i.ambulancia_id === a.id)

let estado = "OK"

if(items.some(i=>i.estado==="CRITICO")) estado = "CRITICO"
else if(items.some(i=>i.estado==="PREVENTIVO")) estado = "PREVENTIVO"

const criticos = items.filter(i=>i.estado==="CRITICO").length

return {
id:a.id,
nombre:a.codigo_operativo,
estado,
criticos
}

})

/* ========================= */
/* FILTRO */
const filtrado = filtro === "todas"
? data
: data.filter(i=>String(i.ambulancia_id) === filtro)

/* ========================= */
/* KPI */
const total = filtrado.length
const criticos = filtrado.filter(i=>i.estado==="CRITICO").length
const preventivos = filtrado.filter(i=>i.estado==="PREVENTIVO").length
const ok = filtrado.filter(i=>i.estado==="OK").length

function colorEstado(e:string){
if(e==="CRITICO") return "#ef4444"
if(e==="PREVENTIVO") return "#f59e0b"
return "#22c55e"
}

/* ========================= */
/* UI */
/* ========================= */

return(
<div style={container}>

{/* HEADER */}
<div style={header}>
<h1>🚑 Centro de Control Médico</h1>

<div style={{display:"flex",gap:10}}>
<button onClick={generarPDF} style={btn}>📄 PDF</button>
<button onClick={cerrarSesion} style={btnSecondary}>Salir</button>
</div>
</div>

{/* KPI */}
<div style={kpiGrid}>
<div style={kpi("#ef4444")}>🔴 {criticos}</div>
<div style={kpi("#f59e0b")}>🟡 {preventivos}</div>
<div style={kpi("#22c55e")}>🟢 {ok}</div>
<div style={kpi("#374151")}>Total {total}</div>
</div>

{/* ALERTA */}
{criticos > 0 && (
<div style={alert}>
🚨 ALERTA: {criticos} ítems críticos detectados
</div>
)}

{/* AMBULANCIAS */}
<div style={grid}>
{resumenAmbulancias.map(a=>{

const cons = consumo.find(c=>c.id === a.id)

return(
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
color:"white",
cursor:"pointer",
boxShadow:"0 0 10px rgba(0,0,0,0.4)"
} as React.CSSProperties}
>

<div style={{fontWeight:"bold"}}>
🚑 {a.nombre}
</div>

<div style={{fontSize:12}}>
{a.estado}
</div>

<div style={badge}>
Consumo: {cons?.total || 0}
</div>

{a.criticos > 0 && (
<div style={critBadge}>
⚠ {a.criticos} críticos
</div>
)}

</div>
)
})}
</div>

{/* 🔥 PANEL DINÁMICO */}
{ambulanciaSeleccionada && (
<div style={panelDetalle}>

<h2>🚑 {ambulanciaSeleccionada.nombre}</h2>

{registros.map((item)=>(
<div key={item.id} style={rowDetalle}>

<div style={{flex:2}}>{item.nombre}</div>
<div style={{flex:1}}>{item.tipo}</div>
<div style={{flex:1}}>{item.lote || "-"}</div>

<div style={{
flex:1,
background:colorEstado(item.estado),
color:"white",
textAlign:"center"
}}>
{item.estado}
</div>

<div style={{display:"flex",gap:5}}>

<button onClick={()=>abrirEditar(item)}>✏️</button>

<button onClick={()=>eliminarRegistro(item.id)}>🗑️</button>

<button onClick={()=>abrirChecklist(item)}>📋</button>

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
padding:30,
fontFamily:"system-ui"
}

const header: React.CSSProperties = {
display:"flex",
justifyContent:"space-between",
alignItems:"center",
marginBottom:20
}

const btn: React.CSSProperties = {
background:"#22c55e",
border:"none",
padding:"10px 15px",
borderRadius:8
}

const btnSecondary: React.CSSProperties = {
background:"#1f2937",
color:"white",
border:"none",
padding:"10px 15px",
borderRadius:8
}

const kpiGrid: React.CSSProperties = {
display:"grid",
gridTemplateColumns:"repeat(auto-fit,minmax(120px,1fr))",
gap:10,
marginBottom:20
}

const kpi = (color:string): React.CSSProperties => ({
background:color,
padding:15,
borderRadius:10,
textAlign:"center",
fontWeight:"bold"
})

const alert: React.CSSProperties = {
background:"#ef4444",
padding:15,
borderRadius:10,
marginBottom:20
}

const grid: React.CSSProperties = {
display:"grid",
gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",
gap:10,
marginBottom:20
}

const badge: React.CSSProperties = {
marginTop:5,
fontSize:11,
background:"rgba(255,255,255,0.2)",
padding:"3px 6px",
borderRadius:6
}

const critBadge: React.CSSProperties = {
marginTop:5,
fontSize:10,
background:"#7f1d1d",
padding:"2px 6px",
borderRadius:5
}

const panelDetalle: React.CSSProperties = {
background:"#020617",
padding:15,
borderRadius:10
}

const rowDetalle: React.CSSProperties = {
display:"flex",
gap:10,
padding:10,
borderBottom:"1px solid #1f2937",
alignItems:"center"
}

const modalBg: React.CSSProperties = {
position:"fixed",
top:0,left:0,width:"100%",height:"100%",
background:"rgba(0,0,0,0.7)",
display:"flex",
justifyContent:"center",
alignItems:"center"
}

const modal: React.CSSProperties = {
background:"white",
color:"black",
padding:20,
borderRadius:10,
display:"flex",
flexDirection:"column",
gap:10
}