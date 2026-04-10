"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { useRouter } from "next/navigation"

export default function Dashboard(){

const router = useRouter()

const [alertas,setAlertas] = useState<any[]>([])
const [resumen,setResumen] = useState<any[]>([])
const [expandido,setExpandido] = useState<string | null>(null)

/* ========================= */

useEffect(()=>{
init()
},[])

async function init(){
await cargarAlertas()
await calcularPrioridad()
}

/* ========================= */
/* 🔥 ALERTAS */
/* ========================= */

async function cargarAlertas(){

const { data } = await supabase
.from("inventario_checklist")
.select(`
ambulancia_id,
fecha_caducidad,
inventario_items (nombre)
`)
.not("fecha_caducidad","is",null)

const hoy = new Date()

const procesado = (data || []).map(i=>{

const fecha = new Date(i.fecha_caducidad)
const diff = (fecha.getTime() - hoy.getTime()) / (1000*60*60*24)

let estado = "OK"

if(diff <= 0) estado = "VENCIDO"
else if(diff <= 30) estado = "CRITICO"
else if(diff <= 90) estado = "PREVENTIVO"

return {
ambulancia: i.ambulancia_id,
nombre: i.inventario_items?.[0]?.nombre || "Item",
estado,
dias: Math.round(diff)
}

})

const filtrado = procesado.filter(i=> i.estado !== "OK")

filtrado.sort((a,b)=>{

function prioridad(e:string){
if(e==="VENCIDO") return 1
if(e==="CRITICO") return 2
if(e==="PREVENTIVO") return 3
return 99
}

return prioridad(a.estado) - prioridad(b.estado)

})

setAlertas(filtrado)

}

/* ========================= */
/* 🔥 PRIORIDAD + BRECHA */
/* ========================= */

async function calcularPrioridad(){

const { data: base } = await supabase
.from("inventario_base")
.select("item_id,nombre,cantidad_minima")

const { data: checklist } = await supabase
.from("inventario_checklist")
.select("*")

const { data: ambulancias } = await supabase
.from("ambulancias")
.select("id,codigo_operativo")

if(!base || !checklist || !ambulancias) return

const resultado = ambulancias.map(a=>{

const items = checklist.filter(i=> String(i.ambulancia_id) === String(a.id))

const mapa:any = {}

items.forEach(i=>{
if(!mapa[i.item_id]){
mapa[i.item_id] = i
}
})

const ultimo:any[] = Object.values(mapa)

/* 🔥 BRECHA */
let faltantes = 0
let faltantesDetalle:any[] = []

base.forEach(b=>{

const encontrado = ultimo.find((i:any)=> String(i.item_id) === String(b.item_id))

const actual = encontrado?.cantidad || 0

if(actual < b.cantidad_minima){

faltantes++

faltantesDetalle.push({
nombre: b.nombre,
faltan: b.cantidad_minima - actual
})

}

})

/* 🔥 CADUCIDAD */
let criticos = 0
let vencidos = 0

const hoy = new Date()

ultimo.forEach((i:any)=>{
if(!i.fecha_caducidad) return

const diff = (new Date(i.fecha_caducidad).getTime() - hoy.getTime()) / (1000*60*60*24)

if(diff <= 0) vencidos++
else if(diff <= 30) criticos++
})

/* 🔥 PRIORIDAD */
let prioridad = "OK"

if(vencidos > 0 || faltantes > 5) prioridad = "ALTA"
else if(criticos > 0 || faltantes > 0) prioridad = "MEDIA"

return {
nombre: a.codigo_operativo,
faltantes,
criticos,
vencidos,
prioridad,
faltantesDetalle
}

})

resultado.sort((a,b)=>{

function orden(p:string){
if(p==="ALTA") return 1
if(p==="MEDIA") return 2
return 3
}

const diff = orden(a.prioridad) - orden(b.prioridad)
if(diff !== 0) return diff

return a.nombre.localeCompare(b.nombre, undefined, { numeric: true })

})

setResumen(resultado)

}

/* ========================= */

function toggle(nombre:string){
if(expandido === nombre){
setExpandido(null)
}else{
setExpandido(nombre)
}
}

/* ========================= */

function colorEstado(e:string){
if(e==="ALTA") return "#7f1d1d"
if(e==="MEDIA") return "#f59e0b"
return "#22c55e"
}

function color(e:string){
if(e==="VENCIDO") return "#7f1d1d"
if(e==="CRITICO") return "#ef4444"
if(e==="PREVENTIVO") return "#f59e0b"
return "#22c55e"
}

/* ========================= */

function cerrarSesion(){
localStorage.clear()
router.replace("/")
}

function irHistorial(){
router.push("/inventario/historial")
}

/* ========================= */

return(

<div style={container}>

<div style={header}>

<div>
<h1>🚑 CENTRO DE CONTROL EMS</h1>
<p style={{opacity:0.7}}>Prioridad + abastecimiento inteligente</p>
</div>

<div style={{display:"flex",gap:10}}>
<button onClick={irHistorial} style={btn}>📊 Historial</button>
<button onClick={cerrarSesion} style={btn}>Salir</button>
</div>

</div>

<h2>🚑 PRIORIDAD OPERATIVA</h2>

{resumen.map((a,i)=>(

<div key={i} style={{
background:colorEstado(a.prioridad),
padding:15,
marginBottom:10,
borderRadius:10,
cursor:"pointer"
}}
onClick={()=>toggle(a.nombre)}
>

<div style={{display:"flex",justifyContent:"space-between"}}>
<strong>{a.nombre}</strong>
<span>{expandido === a.nombre ? "▲" : "▼"}</span>
</div>

<div>❌ Faltantes: {a.faltantes}</div>
<div>💊 Críticos: {a.criticos}</div>
<div>🚨 Vencidos: {a.vencidos}</div>
<div>⚡ PRIORIDAD: {a.prioridad}</div>

{/* 🔥 SOLO SI ESTA ABIERTO */}
{expandido === a.nombre && a.faltantesDetalle.length > 0 && (
<div style={{
marginTop:10,
background:"#020617",
padding:10,
borderRadius:8
}}>

<strong>📦 Reabastecer:</strong>

{a.faltantesDetalle.map((f:any,idx:number)=>(
<div key={idx}>
- {f.nombre} → faltan {f.faltan}
</div>
))}

</div>
)}

</div>

))}

<h2>🚨 ALERTAS CLÍNICAS</h2>

{alertas.length === 0 && <div style={okBox}>✅ Todo en regla</div>}

{alertas.map((a,i)=>(

<div key={i} style={{
background:color(a.estado),
padding:15,
marginBottom:10,
borderRadius:10
}}>

<div>🚑 {a.ambulancia}</div>
<div>💊 {a.nombre}</div>
<div>⏳ {a.estado} ({a.dias} días)</div>

</div>

))}

</div>
)
}

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
alignItems:"center",
marginBottom:20
}

const btn = {
background:"#1f2937",
color:"white",
padding:"10px 15px",
borderRadius:8,
border:"none",
cursor:"pointer"
}

const okBox = {
background:"#22c55e",
padding:15,
borderRadius:10,
textAlign:"center" as const
}