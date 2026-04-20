"use client"

import { useEffect, useState } from "react"
import type { CSSProperties } from "react"
import { supabase } from "@/lib/supabaseClient"
import { useRouter } from "next/navigation"

export default function Dashboard(){

const router = useRouter()

const [alertas,setAlertas] = useState<any[]>([])
const [resumen,setResumen] = useState<any[]>([])
const [expandido,setExpandido] = useState<string | null>(null)

const [loading,setLoading] = useState(true)

useEffect(()=>{ init() },[])

async function init(){
setLoading(true)
await cargarAlertas()
await calcularPrioridad()
setLoading(false)
}

/* ========================= */
/* ALERTAS */
/* ========================= */

async function cargarAlertas(){

const { data } = await supabase
.from("inventario_movimientos")
.select(`
ambulancia_id,
fecha_caducidad,
item_id,
inventario_items (nombre)
`)
.eq("tipo","INGRESO")
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
estado
}
})

setAlertas(procesado.filter(i=> i.estado !== "OK"))
}

/* ========================= */
/* 🔥 FIX REAL DEFINITIVO */
/* ========================= */

async function calcularPrioridad(){

const { data: base } = await supabase
.from("inventario_base")
.select("item_id,nombre,cantidad_minima,categoria")

const { data: mov } = await supabase
.from("inventario_movimientos")
.select("*")

const { data: ambulancias } = await supabase
.from("ambulancias")
.select("id,codigo_operativo")

if(!base || !mov || !ambulancias) return

const resultado = ambulancias.map(a=>{

/* 🔥 movimientos SOLO de esa ambulancia */
const movimientos = mov.filter(
m => String(m.ambulancia_id) === String(a.id)
)

/* 🔥 agrupar stock REAL */
const stockMap:any = {}

movimientos.forEach(m=>{
const id = String(m.item_id)
if(!stockMap[id]) stockMap[id] = 0

const cantidad = Number(m.cantidad || 0)

if(m.tipo === "INGRESO") stockMap[id] += cantidad
if(m.tipo === "CONSUMO") stockMap[id] -= cantidad
})

/* 🔥 SOLO items que existen en esa ambulancia */
const itemsEnAmbulancia = Object.keys(stockMap)

let faltantes = 0
let totalItems = 0
let itemsOK = 0

let totalMed = 0
let okMed = 0
let totalOtros = 0
let okOtros = 0

itemsEnAmbulancia.forEach(id=>{

const itemBase = base.find(b => String(b.item_id) === id)
if(!itemBase) return

const actual = Number(stockMap[id] || 0)
const minimo = Number(itemBase.cantidad_minima || 0)

const esMed = (itemBase.categoria || "").toLowerCase() === "medicamentos"

if(esMed){
totalMed++
if(actual >= minimo) okMed++
}else{
totalOtros++
if(actual >= minimo) okOtros++
}

if(actual >= minimo){
itemsOK++
}else{
faltantes++
}

totalItems++

})

/* CADUCIDAD */
let vencidos = 0
let criticos = 0

const hoy = new Date()

movimientos
.filter(m=> m.tipo === "INGRESO" && m.fecha_caducidad)
.forEach(m=>{

const diff = (new Date(m.fecha_caducidad).getTime() - hoy.getTime()) / (1000*60*60*24)

if(diff <= 0) vencidos++
else if(diff <= 30) criticos++
})

let prioridad = "OK"
if(vencidos > 0 || faltantes > 5) prioridad = "ALTA"
else if(criticos > 0 || faltantes > 0) prioridad = "MEDIA"

return {
nombre: a.codigo_operativo,
faltantes,
criticos,
vencidos,
prioridad,
porcentaje: totalItems > 0 ? Math.round((itemsOK / totalItems) * 100) : 0,
porcMed: totalMed > 0 ? Math.round((okMed / totalMed) * 100) : 0,
porcOtros: totalOtros > 0 ? Math.round((okOtros / totalOtros) * 100) : 0
}

})

/* 🔥 ORDEN CORRECTO */
resultado.sort((a,b)=>{

const parse = (txt:string)=>{
const m = txt.match(/^([A-Z]+)-(\d+)/)
if(!m) return [txt,0]
return [m[1], parseInt(m[2])]
}

const [pA,nA] = parse(a.nombre)
const [pB,nB] = parse(b.nombre)

if(pA !== pB) return pA.localeCompare(pB)
return nA - nB
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
/* UI ORIGINAL */
/* ========================= */

return(

<div style={container}>

<div style={{marginBottom:10}}>
<h1 style={{fontSize:22,fontWeight:"bold"}}>
🚑 BITACORA SANITARIA - SALUD MOVIL
</h1>
<p style={{opacity:0.7}}>
DIRECCION PROVINCIAL DE SALUD DEL GUAYAS
</p>
</div>

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
borderRadius:10
}}>

<strong>{a.nombre}</strong>

<div>❌ Faltantes: {a.faltantes}</div>
<div>💊 Críticos: {a.criticos}</div>
<div>🚨 Vencidos: {a.vencidos}</div>
<div>⚡ PRIORIDAD: {a.prioridad}</div>

<div>📊 Abastecimiento: {a.porcentaje}% / 100%</div>
<div>💊 Medicamentos: {a.porcMed}% / 100%</div>
<div>🧰 Insumos/Equipos: {a.porcOtros}% / 100%</div>

</div>
))}

</div>
)
}

/* ========================= */
/* ESTILOS */
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
alignItems:"center",
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