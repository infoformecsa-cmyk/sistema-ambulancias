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

const [modal,setModal] = useState(false)
const [itemSeleccionado,setItemSeleccionado] = useState<any>(null)
const [cantidad,setCantidad] = useState("")
const [lote,setLote] = useState("")
const [fechaCaducidad,setFechaCaducidad] = useState("")
const [modo,setModo] = useState<"ABASTECER" | "CAMBIO">("ABASTECER")

const [loading,setLoading] = useState(true)

useEffect(()=>{ init() },[])

async function init(){
setLoading(true)
await cargarAlertas()
await calcularPrioridad()
setLoading(false)
}

/* ========================= */

function getNombre(item:any){
if(Array.isArray(item)) return item[0]?.nombre || "Item"
if(item) return item.nombre || "Item"
return "Item"
}

function agruparPorCategoria(lista:any[]){
const grupos:any = {}

lista.forEach(i=>{
const cat = (i.categoria || "OTROS").toUpperCase()
if(!grupos[cat]) grupos[cat] = []
grupos[cat].push(i)
})

return grupos
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
nombre: getNombre(i.inventario_items),
estado,
dias: Math.round(diff)
}
})

const filtrado = procesado.filter(i=> i.estado !== "OK")

filtrado.sort((a,b)=>{
const prioridad = (e:string)=>{
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
/* PRIORIDAD */
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

/* 🔥 FIX AQUÍ */
const movimientos = mov.filter(
m => String(m.ambulancia_id) === String(a.id)
)

/* STOCK */
const stockMap:any = {}

movimientos.forEach(m=>{
if(!stockMap[m.item_id]) stockMap[m.item_id] = 0

/* 🔥 FIX AQUÍ */
const cantidad = Number(m.cantidad || 0)

if(m.tipo === "INGRESO"){
stockMap[m.item_id] += cantidad
}

if(m.tipo === "CONSUMO"){
stockMap[m.item_id] -= cantidad
}
})

let faltantes = 0
let faltantesDetalle:any[] = []

let totalItems = base.length
let itemsOK = 0

let totalMed = 0
let okMed = 0
let totalOtros = 0
let okOtros = 0

base.forEach(b=>{

const actual = stockMap[b.item_id] || 0

const esMed = (b.categoria || "").toLowerCase() === "medicamentos"

if(esMed){
totalMed++
if(actual >= b.cantidad_minima) okMed++
}else{
totalOtros++
if(actual >= b.cantidad_minima) okOtros++
}

if(actual >= b.cantidad_minima){
itemsOK++
}else{
faltantes++
faltantesDetalle.push({
item_id: b.item_id,
nombre: b.nombre,
categoria: b.categoria,
actual,
minimo: b.cantidad_minima,
ambulancia_id: a.id
})
}

})

let vencidos = 0
let criticos = 0
let vencidosDetalle:any[] = []

const hoy = new Date()

movimientos
.filter(m=> m.tipo === "INGRESO" && m.fecha_caducidad)
.forEach(m=>{

const diff = (new Date(m.fecha_caducidad).getTime() - hoy.getTime()) / (1000*60*60*24)

if(diff <= 0){
vencidos++
vencidosDetalle.push(m)
}
else if(diff <= 30){
criticos++
}
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
faltantesDetalle,
vencidosDetalle,
porcentaje: Math.round((itemsOK / totalItems) * 100),
porcMed: Math.round((okMed / totalMed) * 100),
porcOtros: Math.round((okOtros / totalOtros) * 100)
}

})

resultado.sort((a,b)=>
a.nombre.localeCompare(b.nombre, undefined, { numeric:true })
)

setResumen(resultado)
}

/* ========================= */
/* RESTO SIN CAMBIOS */
/* ========================= */

function abrirModal(item:any, tipo:"ABASTECER"|"CAMBIO"="ABASTECER"){
setItemSeleccionado(item)
setModo(tipo)
setCantidad("")
setLote("")
setFechaCaducidad("")
setModal(true)
}

async function retirarItem(item:any){

await supabase.from("inventario_movimientos").insert({
ambulancia_id: item.ambulancia_id,
item_id: item.item_id,
cantidad: item.cantidad || 1,
tipo:"CONSUMO",
usuario:"sistema",
fecha: new Date().toISOString()
})

await init()
}

async function guardar(){

if(!itemSeleccionado) return

if(modo === "CAMBIO"){
await supabase.from("inventario_movimientos").insert({
ambulancia_id: itemSeleccionado.ambulancia_id,
item_id: itemSeleccionado.item_id,
cantidad: Number(cantidad || 0),
tipo:"CONSUMO",
usuario:"sistema",
fecha: new Date().toISOString()
})
}

await supabase.from("inventario_movimientos").insert({
ambulancia_id: itemSeleccionado.ambulancia_id,
item_id: itemSeleccionado.item_id,
cantidad: Number(cantidad || 0),
lote: lote || null,
fecha_caducidad: fechaCaducidad || null,
tipo:"INGRESO",
usuario:"sistema",
fecha: new Date().toISOString()
})

setModal(false)
setCantidad("")
setLote("")
setFechaCaducidad("")

await init()
}

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
/* UI SIN CAMBIOS */
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

<div>📊 Abastecimiento: {a.porcentaje}% / 100%</div>
<div>💊 Medicamentos: {a.porcMed}% / 100%</div>
<div>🧰 Insumos/Equipos: {a.porcOtros}% / 100%</div>

</div>
))}

</div>
)
}
/* ========================= */
/* ESTILOS (RESTAURADOS) */
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

const modalBg: CSSProperties = {
position:"fixed",
top:0,
left:0,
width:"100%",
height:"100%",
background:"rgba(0,0,0,0.6)",
display:"flex",
justifyContent:"center",
alignItems:"center"
}

const modalBox: CSSProperties = {
background:"#111827",
padding:20,
borderRadius:10,
width:300
}

const inputModal: CSSProperties = {
width:"100%",
marginBottom:10,
padding:"10px",
borderRadius:6,
border:"none",
background:"#1f2937",
color:"white"
}