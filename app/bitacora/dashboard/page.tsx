"use client"

import { useEffect, useState } from "react"
import type { CSSProperties } from "react"
import { supabase } from "@/lib/supabaseClient"
import { useRouter } from "next/navigation"

export default function Dashboard(){

const router = useRouter()

const [resumen,setResumen] = useState<any[]>([])
const [expandido,setExpandido] = useState<string | null>(null)
const [loading,setLoading] = useState(true)

useEffect(()=>{ init() },[])

async function init(){
setLoading(true)
await calcularPrioridad()
setLoading(false)
}

/* ========================= */
/* 🔥 DASHBOARD REAL */
/* ========================= */

async function calcularPrioridad(){

const { data: base } = await supabase
.from("inventario_base")
.select("*")

const { data: checklist } = await supabase
.from("inventario_checklist")
.select("*")
.eq("estado","FINALIZADO")

const { data: mov } = await supabase
.from("inventario_movimientos")
.select("*")

const { data: ambulancias } = await supabase
.from("ambulancias")
.select("*")

if(!base || !checklist || !mov || !ambulancias) return

const resultado = ambulancias.map(a=>{

/* ========================= */
/* STOCK REAL */
/* ========================= */

const stockMap: Record<string, number> = {}

checklist
.filter(c => String(c.ambulancia_id) === String(a.id))
.forEach(c=>{
const id = String(c.item_id)
stockMap[id] = (stockMap[id] || 0) + Number(c.cantidad || 0)
})

mov
.filter(m => String(m.ambulancia_id) === String(a.id))
.forEach(m=>{
const id = String(m.item_id)
stockMap[id] = (stockMap[id] || 0)

if(m.tipo === "CONSUMO") stockMap[id] -= Number(m.cantidad || 0)
if(m.tipo === "INGRESO") stockMap[id] += Number(m.cantidad || 0)
})

/* ========================= */
/* ANALISIS */
/* ========================= */

let faltantes = 0
let itemsOK = 0

let totalMed = 0
let okMed = 0
let totalOtros = 0
let okOtros = 0

const faltantesDetalle:any = {
medicamentos: [],
otros: []
}

const vencidosDetalle:any[] = []
const criticosDetalle:any[] = []

const hoy = new Date()

base.forEach(b=>{

const id = String(b.item_id)
const actual = Number(stockMap[id] || 0)
const minimo = Number(b.cantidad_minima || 0)

const esMed = (b.categoria || "").toLowerCase() === "medicamentos"

/* FALTANTES */
if(actual < minimo){

faltantes++

const item = {
nombre: b.nombre,
actual,
minimo
}

if(esMed){
faltantesDetalle.medicamentos.push(item)
}else{
faltantesDetalle.otros.push(item)
}

}else{
itemsOK++
}

/* CATEGORIAS */
if(esMed){
totalMed++
if(actual >= minimo) okMed++
}else{
totalOtros++
if(actual >= minimo) okOtros++
}

})

/* ========================= */
/* CADUCIDAD */
/* ========================= */

checklist
.filter(c => String(c.ambulancia_id) === String(a.id))
.forEach(c=>{

if(!c.fecha_caducidad) return

const diff = (new Date(c.fecha_caducidad).getTime() - hoy.getTime()) / (1000*60*60*24)

const itemBase = base.find(b => String(b.item_id) === String(c.item_id))

if(diff <= 0){
vencidosDetalle.push(itemBase?.nombre || "Item")
}else if(diff <= 30){
criticosDetalle.push(itemBase?.nombre || "Item")
}

})

/* ========================= */

let prioridad = "OK"
if(vencidosDetalle.length > 0 || faltantes > 20) prioridad = "ALTA"
else if(criticosDetalle.length > 0 || faltantes > 0) prioridad = "MEDIA"

return {
nombre: a.codigo_operativo,
faltantes,
criticos: criticosDetalle.length,
vencidos: vencidosDetalle.length,
prioridad,
porcentaje: Math.round((itemsOK / base.length) * 100),
porcMed: totalMed ? Math.round((okMed / totalMed)*100) : 0,
porcOtros: totalOtros ? Math.round((okOtros / totalOtros)*100) : 0,
faltantesDetalle,
vencidosDetalle,
criticosDetalle
}

})

setResumen(resultado)
}

/* ========================= */

function toggle(nombre:string){
setExpandido(expandido === nombre ? null : nombre)
}

function colorEstado(e:string){
if(e==="ALTA") return "#7f1d1d"
if(e==="MEDIA") return "#f59e0b"
return "#22c55e"
}

function cerrarSesion(){
localStorage.clear()
router.replace("/")
}

function irHistorial(){
router.push("/inventario/historial")
}

/* ========================= */
/* UI */
/* ========================= */

return(

<div style={container}>

<div style={header}>
<h1>🚑 CENTRO DE CONTROL EMS</h1>

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

<strong>{a.nombre}</strong>

<div>❌ Faltantes: {a.faltantes}</div>
<div>💊 Críticos: {a.criticos}</div>
<div>🚨 Vencidos: {a.vencidos}</div>
<div>⚡ PRIORIDAD: {a.prioridad}</div>

<div>📊 {a.porcentaje}%</div>
<div>💊 Medicamentos: {a.porcMed}%</div>
<div>🧰 Otros: {a.porcOtros}%</div>

{/* ========================= */
/* 🔥 DETALLE EXPANDIDO */
/* ========================= */}

{expandido === a.nombre && (

<div style={{marginTop:15}}>

<h4>❌ FALTANTES</h4>

<b>💊 Medicamentos</b>
{a.faltantesDetalle.medicamentos.map((i:any,idx:number)=>(
<div key={idx}>- {i.nombre} ({i.actual}/{i.minimo})</div>
))}

<b>🧰 Insumos/Equipos</b>
{a.faltantesDetalle.otros.map((i:any,idx:number)=>(
<div key={idx}>- {i.nombre} ({i.actual}/{i.minimo})</div>
))}

<h4>🚨 VENCIDOS</h4>
{a.vencidosDetalle.map((v:any,idx:number)=>(
<div key={idx}>- {v}</div>
))}

<h4>⚠️ POR VENCER</h4>
{a.criticosDetalle.map((v:any,idx:number)=>(
<div key={idx}>- {v}</div>
))}

</div>
)}

</div>
))}

</div>
)
}

/* ========================= */

const container: CSSProperties = {
background:"#020617",
color:"white",
minHeight:"100vh",
padding:30
}

const header: CSSProperties = {
display:"flex",
justifyContent:"space-between",
marginBottom:20
}

const btn: CSSProperties = {
background:"#1f2937",
color:"white",
padding:"6px 10px",
borderRadius:6,
border:"none",
cursor:"pointer"
}