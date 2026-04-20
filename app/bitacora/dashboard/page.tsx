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
await calcular()
setLoading(false)
}

/* ========================= */
/* 🔥 SOLUCIÓN REAL */
/* ========================= */

async function calcular(){

/* 🔥 TRAER BASE */
const { data: base } = await supabase
.from("inventario_base")
.select("item_id,cantidad_minima,categoria")

/* 🔥 TRAER AMBULANCIAS */
const { data: ambulancias } = await supabase
.from("ambulancias")
.select("id,codigo_operativo")

if(!base || !ambulancias) return

/* 🔥 TRAER SOLO EL ÚLTIMO CHECKLIST POR AMBULANCIA */
const { data: ultimos } = await supabase.rpc("get_ultimo_checklist_por_ambulancia")

/*
⚠️ ESTA FUNCIÓN SQL DEBE EXISTIR (TE LA DEJO ABAJO)
*/

if(!ultimos) return

const resultado = ambulancias.map(a=>{

const items = ultimos.filter(
(i:any)=> String(i.ambulancia_id) === String(a.id)
)

/* ========================= */
/* 🔥 CALCULO REAL */
/* ========================= */

let faltantes = 0
let total = 0
let ok = 0

let totalMed = 0
let okMed = 0
let totalOtros = 0
let okOtros = 0

items.forEach((i:any)=>{

const baseItem = base.find(b => String(b.item_id) === String(i.item_id))
if(!baseItem) return

const actual = Number(i.cantidad || 0)
const minimo = Number(baseItem.cantidad_minima || 0)

if(minimo <= 0) return

const esMed = (baseItem.categoria || "").toLowerCase() === "medicamentos"

if(esMed){
totalMed++
if(actual >= minimo) okMed++
}else{
totalOtros++
if(actual >= minimo) okOtros++
}

if(actual >= minimo){
ok++
}else{
faltantes++
}

total++

})

/* ========================= */
/* 🔥 CADUCIDAD */
/* ========================= */

let vencidos = 0
let criticos = 0

const hoy = new Date()

items.forEach((i:any)=>{
if(!i.fecha_caducidad) return

const diff = (new Date(i.fecha_caducidad).getTime() - hoy.getTime()) / (1000*60*60*24)

if(diff <= 0) vencidos++
else if(diff <= 30) criticos++
})

/* ========================= */

let prioridad = "OK"
if(vencidos > 0 || faltantes > 5) prioridad = "ALTA"
else if(criticos > 0 || faltantes > 0) prioridad = "MEDIA"

return {
nombre: String(a.codigo_operativo),
faltantes,
criticos,
vencidos,
prioridad,
porcentaje: total > 0 ? Math.round((ok / total) * 100) : 0,
porcMed: totalMed > 0 ? Math.round((okMed / totalMed) * 100) : 0,
porcOtros: totalOtros > 0 ? Math.round((okOtros / totalOtros) * 100) : 0
}

})

/* 🔥 ORDEN */
resultado.sort((a,b)=>{
const parse = (txt:string): [string, number] => {
const m = txt.match(/^([A-Z]+)-(\d+)/)
if(!m) return [txt,0]
return [m[1], Number(m[2])]
}
const [pA,nA] = parse(a.nombre)
const [pB,nB] = parse(b.nombre)
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
borderRadius:10
}}>

<strong>{a.nombre}</strong>

<div>❌ Faltantes: {a.faltantes}</div>
<div>💊 Críticos: {a.criticos}</div>
<div>🚨 Vencidos: {a.vencidos}</div>
<div>⚡ PRIORIDAD: {a.prioridad}</div>

<div>📊 Abastecimiento: {a.porcentaje}%</div>
<div>💊 Medicamentos: {a.porcMed}%</div>
<div>🧰 Insumos/Equipos: {a.porcOtros}%</div>

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