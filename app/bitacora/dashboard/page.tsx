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
/* 🔥 LÓGICA CORREGIDA REAL */
/* ========================= */

async function calcularPrioridad(){

const { data: base } = await supabase
.from("inventario_base")
.select("item_id,nombre,cantidad_minima,categoria")

const { data: checklist } = await supabase
.from("inventario_checklist")
.select("*")
.eq("estado","FINALIZADO")

const { data: mov } = await supabase
.from("inventario_movimientos")
.select("*")

const { data: ambulancias } = await supabase
.from("ambulancias")
.select("id,codigo_operativo")

if(!base || !checklist || !mov || !ambulancias) return

const resultado = ambulancias.map(a=>{

/* ========================= */
/* 🔥 CHECKLIST DE ESA AMBULANCIA */
/* ========================= */

const checklistAmb = checklist.filter(
c => String(c.ambulancia_id) === String(a.id)
)

/* 🔥 AGRUPAR POR CHECKLIST_ID */
const grupos: Record<string, any[]> = {}

checklistAmb.forEach(c=>{
if(!grupos[c.checklist_id]){
grupos[c.checklist_id] = []
}
grupos[c.checklist_id].push(c)
})

/* 🔥 OBTENER ÚLTIMO CHECKLIST REAL */
const listas = Object.values(grupos) as any[][]

const ultimoChecklist = listas.length > 0
? listas.sort((a,b)=>{
const fA = new Date(a[0]?.fecha_registro || 0).getTime()
const fB = new Date(b[0]?.fecha_registro || 0).getTime()
return fB - fA
})[0]
: []

/* ========================= */
/* 🔥 STOCK REAL */
/* ========================= */

const stockMap: Record<string, number> = {}

ultimoChecklist.forEach((c:any)=>{
const id = String(c.item_id)
stockMap[id] = (stockMap[id] || 0) + Number(c.cantidad || 0)
})

/* 🔥 AJUSTE CON MOVIMIENTOS */
mov
.filter(m => String(m.ambulancia_id) === String(a.id))
.forEach(m=>{
const id = String(m.item_id)
stockMap[id] = (stockMap[id] || 0)

const cantidad = Number(m.cantidad || 0)

if(m.tipo === "CONSUMO") stockMap[id] -= cantidad
if(m.tipo === "INGRESO") stockMap[id] += cantidad
})

/* ========================= */
/* 🔥 CÁLCULO REAL */
/* ========================= */

let faltantes = 0
let totalItems = 0
let itemsOK = 0

let totalMed = 0
let okMed = 0
let totalOtros = 0
let okOtros = 0

/* 🔥 SOLO LO QUE EXISTE EN CHECKLIST */
ultimoChecklist.forEach((c:any)=>{

const baseItem = base.find(b => String(b.item_id) === String(c.item_id))
if(!baseItem) return

const id = String(c.item_id)
const actual = Number(stockMap[id] || 0)
const minimo = Number(baseItem.cantidad_minima || 0)

/* 🔥 IGNORAR ITEMS SIN MINIMO */
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
itemsOK++
}else{
faltantes++
}

totalItems++

})

/* ========================= */
/* 🔥 CADUCIDAD */
/* ========================= */

let vencidos = 0
let criticos = 0

const hoy = new Date()

ultimoChecklist.forEach((c:any)=>{
if(!c.fecha_caducidad) return

const diff = (new Date(c.fecha_caducidad).getTime() - hoy.getTime()) / (1000*60*60*24)

if(diff <= 0) vencidos++
else if(diff <= 30) criticos++
})

/* ========================= */
/* PRIORIDAD */
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
porcentaje: totalItems > 0 ? Math.round((itemsOK / totalItems) * 100) : 0,
porcMed: totalMed > 0 ? Math.round((okMed / totalMed) * 100) : 0,
porcOtros: totalOtros > 0 ? Math.round((okOtros / totalOtros) * 100) : 0
}

})

/* ========================= */
/* 🔥 ORDEN CORRECTO */
/* ========================= */

resultado.sort((a,b)=>{

const parse = (txt:string): [string, number] => {
const m = txt.match(/^([A-Z]+)-(\d+)/)
if(!m) return [String(txt), 0]
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