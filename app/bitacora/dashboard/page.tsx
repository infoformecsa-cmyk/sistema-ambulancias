"use client"

import { useEffect, useState } from "react"
import React from "react"
import { supabase } from "@/lib/supabaseClient"
import { useRouter } from "next/navigation"

export default function Dashboard(){

const router = useRouter()

const [data,setData] = useState<any[]>([])
const [ambulancias,setAmbulancias] = useState<any[]>([])
const [ambulanciaSeleccionada,setAmbulanciaSeleccionada] = useState<any>(null)
const [registros,setRegistros] = useState<any[]>([])

/* ========================= */
/* CARGA */
/* ========================= */

useEffect(()=>{
cargarAmbulancias()
cargar()
},[])

async function cargarAmbulancias(){

const { data } = await supabase
.from("ambulancias")
.select("id,codigo_operativo")

const ordenadas = (data || []).sort((a,b)=>{
return a.codigo_operativo.localeCompare(b.codigo_operativo, undefined, {numeric:true})
})

setAmbulancias(ordenadas)
}

/* ========================= */
/* 🔥 FIX AQUÍ */
/* ========================= */

async function cargar(){

const { data } = await supabase
.from("inventario_checklist")
.select(`
*,
inventario_items (nombre)
`)
.order("fecha_registro",{ascending:false})

const hoy = new Date()

const procesado = (data || []).map(item=>{

const fecha = new Date(item.fecha_registro)

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

return {
id: item.id,
nombre: item.inventario_items?.nombre || "item",
tipo: "CHECKLIST",
lote: item.lote,
cantidad: item.cantidad,
estado,
ambulancia_id: String(item.ambulancia_id)
}
})

setData(procesado)
}

/* ========================= */
/* 🔥 FIX AQUÍ */
/* ========================= */

async function cargarRegistros(id:any){

const { data } = await supabase
.from("inventario_checklist")
.select(`
*,
inventario_items (nombre)
`)
.eq("ambulancia_id", String(id))
.order("fecha_registro",{ascending:false})

const hoy = new Date()

const procesado = (data || []).map(item=>{

const fecha = new Date(item.fecha_registro)

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

return {
id: item.id,
nombre: item.inventario_items?.nombre || "item",
tipo: "CHECKLIST",
lote: item.lote,
cantidad: item.cantidad,
estado,
ambulancia_id: String(item.ambulancia_id)
}
})

setRegistros(procesado || [])
}

/* ========================= */

const resumenAmbulancias = ambulancias.map(a=>{

const items = data.filter(
i => i.ambulancia_id === String(a.id)
)

if(items.length === 0){
return {
id:a.id,
nombre:a.codigo_operativo,
estado:"SIN_DATOS",
faltantes:0,
criticos:0,
preventivos:0
}
}

const faltantes = items.filter(i=>i.cantidad === 0).length
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
criticos,
preventivos
}

})

/* ========================= */

const total = resumenAmbulancias.length
const ok = resumenAmbulancias.filter(a=>a.estado==="OK").length
const critico = resumenAmbulancias.filter(a=>a.estado==="CRITICO").length
const faltante = resumenAmbulancias.filter(a=>a.estado==="FALTANTE").length
const preventivo = resumenAmbulancias.filter(a=>a.estado==="PREVENTIVO").length

/* ========================= */

function colorEstado(e:string){
if(e==="FALTANTE") return "#7f1d1d"
if(e==="CRITICO") return "#ef4444"
if(e==="PREVENTIVO") return "#f59e0b"
if(e==="SIN_DATOS") return "#374151"
return "#22c55e"
}

/* ========================= */
/* ACCIONES */
/* ========================= */

function cerrarSesion(){
localStorage.clear()
router.replace("/")
}

function irHistorial(){
router.push("/inventario/historial")
}

async function eliminarRegistro(id:string){

if(!confirm("¿Eliminar registro?")) return

/* 🔥 IMPORTANTE: eliminar de la tabla correcta */
await supabase.from("inventario_checklist").delete().eq("id",id)

cargar()
if(ambulanciaSeleccionada){
cargarRegistros(ambulanciaSeleccionada.id)
}
}

function irChecklist(ambulanciaId:any){
router.push(`/inventario/checklist?ambulancia=${String(ambulanciaId)}`)
}

/* ========================= */
/* UI */
/* ========================= */

return(
<div style={container}>

<div style={header}>

<div>
<h1>🚑 Centro de Control Médico</h1>

<div style={metricas}>
<span>🚑 {total}</span>
<span style={{color:"#22c55e"}}>OK {ok}</span>
<span style={{color:"#f59e0b"}}>Prev {preventivo}</span>
<span style={{color:"#ef4444"}}>Crit {critico}</span>
<span style={{color:"#7f1d1d"}}>Falt {faltante}</span>
</div>
</div>

<div style={{display:"flex",gap:10}}>
<button onClick={irHistorial} style={btnSalir}>
📊 Historial
</button>

<button onClick={cerrarSesion} style={btnSalir}>
Salir
</button>
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
cursor:"pointer",
transition:"0.2s"
}}
>

<div style={{fontWeight:"bold"}}>🚑 {a.nombre}</div>
<div style={{fontSize:12}}>{a.estado}</div>

{a.faltantes > 0 && <div>❌ {a.faltantes}</div>}
{a.criticos > 0 && <div>🚨 {a.criticos}</div>}
{a.preventivos > 0 && <div>⚠ {a.preventivos}</div>}

</div>
))}

</div>

{ambulanciaSeleccionada && (
<div style={panel}>

<h2>🚑 {ambulanciaSeleccionada.nombre}</h2>

{registros.map(r=>(
<div key={r.id} style={row}>

<div style={{flex:2}}>{r.nombre}</div>
<div style={{flex:1}}>{r.tipo}</div>
<div style={{flex:1}}>{r.lote || "-"}</div>

<div style={{
flex:1,
background:colorEstado(r.estado),
textAlign:"center"
}}>
{r.estado}
</div>

<div style={{display:"flex",gap:5}}>
<button onClick={()=>eliminarRegistro(r.id)}>🗑</button>
<button onClick={()=>irChecklist(r.ambulancia_id)}>📋</button>
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

const container = {background:"#020617",color:"white",minHeight:"100vh",padding:30}
const header = {display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}
const metricas = {display:"flex",gap:15,marginTop:5,fontSize:14}
const btnSalir = {background:"#1f2937",color:"white",padding:"10px 15px",borderRadius:8}
const grid = {display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:10}
const panel = {background:"#111827",padding:15,borderRadius:10}
const row = {display:"flex",gap:10,padding:10,borderBottom:"1px solid #1f2937"}