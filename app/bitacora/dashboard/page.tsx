"use client"

import { useEffect, useState } from "react"
import type { CSSProperties } from "react"
import { supabase } from "@/lib/supabaseClient"
import { useRouter } from "next/navigation"

export default function Dashboard(){

const router = useRouter()

const [resumen,setResumen] = useState<any[]>([])
const [loading,setLoading] = useState(true)

useEffect(()=>{ init() },[])

async function init(){
setLoading(true)
await calcularPrioridad()
setLoading(false)
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

const movimientos = mov.filter(
m => String(m.ambulancia_id) === String(a.id)
)

/* 🔥 STOCK REAL */
const stockMap:any = {}

movimientos.forEach(m=>{
const id = String(m.item_id)

if(!stockMap[id]) stockMap[id] = 0

const cantidad = Number(m.cantidad || 0)

if(m.tipo === "INGRESO") stockMap[id] += cantidad
if(m.tipo === "CONSUMO") stockMap[id] -= cantidad
})

/* 🔥 CLAVE: SOLO ITEMS QUE EXISTEN */
const itemsReales = Object.keys(stockMap)

let faltantes = 0
let totalItems = 0
let itemsOK = 0

let totalMed = 0
let okMed = 0
let totalOtros = 0
let okOtros = 0

itemsReales.forEach(id=>{

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
nombre: String(a.codigo_operativo),
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

const parse = (txt:string): [string, number] => {
const m = txt.match(/^([A-Z]+)-(\d+)/)
if(!m) return [String(txt), 0]
return [m[1], Number(m[2])]
}

const [pA,nA] = parse(String(a.nombre))
const [pB,nB] = parse(String(b.nombre))

if(pA !== pB) return pA.localeCompare(pB)
return nA - nB
})

setResumen(resultado)
}

/* ========================= */

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