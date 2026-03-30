"use client"

import { useEffect, useState } from "react"
import React from "react"
import { supabase } from "@/lib/supabaseClient"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"

export default function Dashboard(){

const [data,setData] = useState<any[]>([])
const [ambulancias,setAmbulancias] = useState<any[]>([])

const [ambulanciaSeleccionada,setAmbulanciaSeleccionada] = useState<any>(null)
const [registros,setRegistros] = useState<any[]>([])

useEffect(()=>{
cargarAmbulancias()
cargar()
},[])

/* ========================= */
/* DATA */
/* ========================= */

async function cargarAmbulancias(){
const { data } = await supabase.from("ambulancias").select("id,codigo_operativo")
setAmbulancias(data || [])
}

async function cargar(){

const { data } = await supabase.from("bitacora_items").select("*")

const hoy = new Date()

const procesado = (data || []).map(item=>{

const fecha = new Date(item.updated_at || item.created_at)
const diff = (hoy.getTime() - fecha.getTime()) / (1000*60*60*24)

let estado = "OK"

if(item.cantidad === 0){
estado = "FALTANTE"
}
else if(diff >= 15){
estado = "CRITICO"
}
else if(diff >= 7){
estado = "PREVENTIVO"
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
.from("bitacora_items")
.select("*")
.eq("ambulancia_id", id)

setRegistros(data || [])

}

/* ========================= */
/* ACCIONES */
/* ========================= */

async function eliminarRegistro(id:string){

if(!confirm("¿Eliminar registro?")) return

await supabase.from("bitacora_items").delete().eq("id",id)

cargar()
if(ambulanciaSeleccionada){
cargarRegistros(ambulanciaSeleccionada.id)
}

}

function abrirChecklist(item:any){
window.location.href = `/inventario/checklist?ambulancia=${item.ambulancia_id}`
}

/* ========================= */
/* MAPA */
/* ========================= */

const mapaAmbulancias = Object.fromEntries(
ambulancias.map(a => [a.id, a.codigo_operativo])
)

/* ========================= */
/* 🚑 INTELIGENCIA CENTRAL */
/* ========================= */

const resumenAmbulancias = ambulancias.map(a=>{

const items = data.filter(i=>i.ambulancia_id === a.id)

const faltantes = items.filter(i=>i.cantidad === 0).length
const bajos = items.filter(i=>i.cantidad > 0 && i.cantidad <= 2).length
const criticos = items.filter(i=>i.estado==="CRITICO").length
const preventivos = items.filter(i=>i.estado==="PREVENTIVO").length

let estado = "OK"

if(faltantes > 0) estado = "FALTANTE"
else if(criticos > 0) estado = "CRITICO"
else if(preventivos > 0) estado = "PREVENTIVO"

return {
id:a.id,
nombre:a.codigo_operativo,
estado,
faltantes,
bajos,
criticos,
preventivos
}

})

/* ========================= */
/* 🔥 LISTA GLOBAL */
/* ========================= */

const faltantesGlobal = data.filter(i =>
i.cantidad === 0 || i.estado === "CRITICO"
)

/* ========================= */

function colorEstado(e:string){
if(e==="FALTANTE") return "#7f1d1d"
if(e==="CRITICO") return "#ef4444"
if(e==="PREVENTIVO") return "#f59e0b"
return "#22c55e"
}

/* ========================= */
/* UI */
/* ========================= */

return(
<div style={container}>

<h1>🚑 Centro de Control Médico Inteligente</h1>

{/* 🚑 GRID */}
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
color:"white",
cursor:"pointer"
}}
>

<div style={{fontWeight:"bold"}}>🚑 {a.nombre}</div>

<div style={{fontSize:12}}>{a.estado}</div>

{a.faltantes > 0 && <div style={badgeRojo}>❌ {a.faltantes}</div>}
{a.bajos > 0 && <div style={badgeAzul}>🔽 {a.bajos}</div>}
{a.criticos > 0 && <div style={badgeCritico}>⚠ {a.criticos}</div>}
{a.preventivos > 0 && <div style={badgeAmarillo}>⏳ {a.preventivos}</div>}

</div>
))}

</div>

{/* 📋 DETALLE */}
{ambulanciaSeleccionada && (
<div style={panel}>

<h2>🚑 {ambulanciaSeleccionada.nombre}</h2>

{registros.map((item)=>(
<div key={item.id} style={row}>

<div style={{flex:2}}>{item.nombre}</div>
<div style={{flex:1}}>{item.tipo}</div>
<div style={{flex:1}}>{item.lote || "-"}</div>

<div style={{
flex:1,
background:colorEstado(item.estado),
textAlign:"center"
}}>
{item.estado}
</div>

<div style={{display:"flex",gap:5}}>

<button onClick={()=>eliminarRegistro(item.id)}>🗑</button>
<button onClick={()=>abrirChecklist(item)}>📋</button>

</div>

</div>
))}

</div>
)}

{/* 🧾 ABASTECIMIENTO */}
<div style={panel}>

<h2>🧾 Abastecimiento requerido</h2>

{faltantesGlobal.map((i,index)=>(
<div key={index}>
🚑 {mapaAmbulancias[i.ambulancia_id]} - {i.nombre}
</div>
))}

</div>

</div>
)
}

/* ========================= */
/* 🎨 ESTILOS */
/* ========================= */

const container:React.CSSProperties = {
background:"#020617",
color:"white",
minHeight:"100vh",
padding:30
}

const grid:React.CSSProperties = {
display:"grid",
gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",
gap:10,
marginBottom:20
}

const panel:React.CSSProperties = {
background:"#111827",
padding:15,
borderRadius:10,
marginTop:20
}

const row:React.CSSProperties = {
display:"flex",
gap:10,
padding:10,
borderBottom:"1px solid #1f2937"
}

const badgeRojo:React.CSSProperties = {
background:"#7f1d1d",
padding:"2px 6px",
borderRadius:5,
marginTop:5
}

const badgeAzul:React.CSSProperties = {
background:"#1e3a8a",
padding:"2px 6px",
borderRadius:5,
marginTop:5
}

const badgeCritico:React.CSSProperties = {
background:"#dc2626",
padding:"2px 6px",
borderRadius:5,
marginTop:5
}

const badgeAmarillo:React.CSSProperties = {
background:"#92400e",
padding:"2px 6px",
borderRadius:5,
marginTop:5
}