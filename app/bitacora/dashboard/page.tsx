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
nombre: getNombre(i.inventario_items),
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

async function calcularPrioridad(){

const { data: base } = await supabase
.from("inventario_base")
.select("item_id,nombre,cantidad_minima,categoria")

const { data: checklist } = await supabase
.from("inventario_checklist")
.select(`*,inventario_items (nombre,categoria)`)

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
}else{
const actual = new Date(mapa[i.item_id].created_at)
const nuevo = new Date(i.created_at)
if(nuevo > actual){
mapa[i.item_id] = i
}
}
})

const ultimo:any[] = Object.values(mapa)

let faltantes = 0
let faltantesDetalle:any[] = []

let totalItems = base.length
let itemsOK = 0

/* 🔥 NUEVO */
let totalMed = 0, okMed = 0
let totalOtros = 0, okOtros = 0

base.forEach(b=>{
const encontrado = ultimo.find((i:any)=> String(i.item_id) === String(b.item_id))
const actual = encontrado?.cantidad || 0

const categoria = (b.categoria || "").toLowerCase()
const esMedicamento = categoria === "medicamentos"

if(esMedicamento){
totalMed++
if(actual >= b.cantidad_minima) okMed++
}else{
totalOtros++
if(actual >= b.cantidad_minima) okOtros++
}

if(actual >= b.cantidad_minima){
itemsOK++
}

if(actual < b.cantidad_minima){
faltantes++
faltantesDetalle.push({
item_id: b.item_id,
nombre: b.nombre,
categoria: b.categoria || "otros",
actual,
minimo: b.cantidad_minima,
estado: actual === 0 ? "SIN STOCK" : "INCOMPLETO",
ambulancia_id: a.id
})
}
})

const porcentaje = totalItems > 0 ? Math.round((itemsOK / totalItems) * 100) : 0

/* 🔥 NUEVOS */
const porcMed = totalMed > 0 ? Math.round((okMed / totalMed) * 100) : 0
const porcOtros = totalOtros > 0 ? Math.round((okOtros / totalOtros) * 100) : 0

return {
nombre: a.codigo_operativo,
faltantes,
criticos:0,
vencidos:0,
prioridad:"OK",
faltantesDetalle,
vencidosDetalle:[],
porcentaje,
porcMed,
porcOtros
}

})

setResumen(resultado)
}

/* ========================= */

function agruparFaltantes(lista:any[]){
const grupos:any = {}
lista.forEach(i=>{
const cat = (i.categoria || "OTROS").toUpperCase()
if(!grupos[cat]) grupos[cat] = []
grupos[cat].push(i)
})
return grupos
}

/* ========================= */

function abrirModal(item:any, tipo:"ABASTECER"|"CAMBIO"="ABASTECER"){
setItemSeleccionado(item)
setModo(tipo)
setCantidad("")
setLote("")
setFechaCaducidad("")
setModal(true)
}

/* ========================= */

async function guardar(){

if(!itemSeleccionado) return

await supabase.from("inventario_checklist").insert({
ambulancia_id: itemSeleccionado.ambulancia_id,
item_id: itemSeleccionado.item_id,
cantidad: Number(cantidad || 0),
lote: lote?.trim() ? lote : null,
fecha_caducidad: fechaCaducidad?.trim() ? fechaCaducidad : null,
fecha_registro: new Date().toISOString(),
estado: "ABASTECIMIENTO"
})

setModal(false)
await init()
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
<h1>🚑 BITACORA SANITARIA - SALUD MOVIL</h1>
<p style={{opacity:0.7}}>DIRECCION PROVINCIAL DE SALUD DEL GUAYAS</p>
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
</div>

<div>📊 Abastecimiento total: {a.porcentaje}%</div>
<div>💊 Medicamentos: {a.porcMed}%</div>
<div>🧰 Insumos/equipos: {a.porcOtros}%</div>

{expandido === a.nombre && (

<div style={{marginTop:10}}>

<div style={{background:"#020617",padding:10,borderRadius:8}}>

<strong>📦 Reabastecer:</strong>

{Object.entries(agruparFaltantes(a.faltantesDetalle)).map(([cat,items]:any)=>(
<div key={cat}>
<strong>{cat}</strong>

{items.map((f:any,idx:number)=>(

<div key={idx} style={{display:"flex",justifyContent:"space-between"}}>

<div>- {f.nombre} → {f.actual}/{f.minimo}</div>

<button onClick={(e)=>{
e.stopPropagation()
abrirModal(f)
}} style={btn}>
➕ Abastecer
</button>

</div>

))}

</div>
))}

</div>

</div>

)}

</div>
))}

{modal && (
<div style={modalBg}>
<div style={modalBox}>
<input value={cantidad} onChange={e=>setCantidad(e.target.value)} style={inputModal}/>
<button onClick={guardar} style={btn}>Guardar</button>
</div>
</div>
)}

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
border:"none"
}

const modalBg: CSSProperties = {
position:"fixed",
top:0,left:0,width:"100%",height:"100%",
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
background:"#1f2937",
color:"white"
}