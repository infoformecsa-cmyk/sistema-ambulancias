"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { useRouter } from "next/navigation"

export default function Dashboard(){

const router = useRouter()

const [alertas,setAlertas] = useState<any[]>([])
const [resumen,setResumen] = useState<any[]>([])
const [expandido,setExpandido] = useState<string | null>(null)

/* 🔥 NUEVO */
const [modal,setModal] = useState(false)
const [itemSeleccionado,setItemSeleccionado] = useState<any>(null)
const [cantidad,setCantidad] = useState("")
const [lote,setLote] = useState("")
const [fechaCaducidad,setFechaCaducidad] = useState("")
const [modo,setModo] = useState<"ABASTECER" | "CAMBIO">("ABASTECER")

useEffect(()=>{ init() },[])

async function init(){
await cargarAlertas()
await calcularPrioridad()
}

/* ========================= */

function getNombre(item:any){
if(Array.isArray(item)) return item[0]?.nombre || "Item"
if(item) return item.nombre || "Item"
return "Item"
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
/* 🔥 PRIORIDAD */
/* ========================= */

async function calcularPrioridad(){

const { data: base } = await supabase
.from("inventario_base")
.select("item_id,nombre,cantidad_minima")

const { data: checklist } = await supabase
.from("inventario_checklist")
.select(`
*,
inventario_items (nombre)
`)

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

/* FALTANTES */
let faltantes = 0
let faltantesDetalle:any[] = []

base.forEach(b=>{
const encontrado = ultimo.find((i:any)=> String(i.item_id) === String(b.item_id))
const actual = encontrado?.cantidad || 0

if(actual < b.cantidad_minima){
faltantes++
faltantesDetalle.push({
item_id: b.item_id,
nombre: b.nombre,
actual,
minimo: b.cantidad_minima,
estado: actual === 0 ? "SIN STOCK" : "INCOMPLETO",
ambulancia_id: a.id
})
}
})

/* VENCIDOS */
let criticos = 0
let vencidos = 0
let vencidosDetalle:any[] = []

const hoy = new Date()

ultimo.forEach((i:any)=>{
if(!i.fecha_caducidad) return

const diff = (new Date(i.fecha_caducidad).getTime() - hoy.getTime()) / (1000*60*60*24)

if(diff <= 0){
vencidos++
vencidosDetalle.push({
...i,
nombre: getNombre(i.inventario_items)
})
}
else if(diff <= 30){
criticos++
}
})

let prioridad = "OK"

if(vencidos > 0 || faltantes > 5) prioridad = "ALTA"
else if(criticos > 0 || faltantes > 0) prioridad = "MEDIA"

return {
nombre:a.codigo_operativo,
faltantes,
criticos,
vencidos,
prioridad,
faltantesDetalle,
vencidosDetalle
}
})

setResumen(resultado)
}

/* ========================= */
/* 🔥 ACCIONES NUEVAS */
/* ========================= */

function abrirModal(item:any, tipo:"ABASTECER"|"CAMBIO"){
setItemSeleccionado(item)
setModo(tipo)
setModal(true)
}

async function retirarItem(item:any){
await supabase
.from("inventario_checklist")
.update({ cantidad: 0 })
.eq("id", item.id)

await init()
}

async function guardar(){

if(!itemSeleccionado) return

if(modo==="CAMBIO"){
await retirarItem(itemSeleccionado)
}

await supabase.from("inventario_checklist").insert({
ambulancia_id: itemSeleccionado.ambulancia_id,
item_id: itemSeleccionado.item_id,
cantidad: Number(cantidad),
lote,
fecha_caducidad: fechaCaducidad
})

setModal(false)
setCantidad("")
setLote("")
setFechaCaducidad("")
await init()
}

/* ========================= */

function toggle(nombre:string){
setExpandido(expandido === nombre ? null : nombre)
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

{expandido === a.nombre && (

<div style={{marginTop:10}}>

{/* FALTANTES */}
{a.faltantesDetalle.map((f:any,idx:number)=>(

<div key={idx} style={{display:"flex",justifyContent:"space-between"}}>

<div>
- {f.nombre} → {f.actual}/{f.minimo}
</div>

<button onClick={(e)=>{
e.stopPropagation()
abrirModal(f,"ABASTECER")
}} style={btn}>
➕ Abastecer
</button>

</div>
))}

{/* VENCIDOS */}
{a.vencidosDetalle.map((v:any,idx:number)=>(

<div key={idx} style={{display:"flex",justifyContent:"space-between"}}>

<div>- {v.nombre}</div>

<div style={{display:"flex",gap:5}}>

<button
onClick={(e)=>{
e.stopPropagation()
retirarItem(v)
}}
style={btn}
>
❌ Retirar
</button>

<button
onClick={(e)=>{
e.stopPropagation()
abrirModal(v,"CAMBIO")
}}
style={btn}
>
🔄 Cambio
</button>

</div>

</div>
))}

</div>

)}

</div>

))}

{/* MODAL */}
{modal && (
<div style={{
position:"fixed" as const,
top:0,left:0,
width:"100%",height:"100%",
background:"rgba(0,0,0,0.6)",
display:"flex",
justifyContent:"center",
alignItems:"center"
}}>

<div style={{background:"#111827",padding:20,borderRadius:10,width:300}}>

<h3>{modo==="CAMBIO" ? "🔄 Cambio" : "📦 Abastecer"}</h3>

<p>{itemSeleccionado?.nombre}</p>

<input placeholder="Cantidad" value={cantidad} onChange={e=>setCantidad(e.target.value)} style={{width:"100%",marginBottom:10}} />
<input placeholder="Lote" value={lote} onChange={e=>setLote(e.target.value)} style={{width:"100%",marginBottom:10}} />
<input type="date" value={fechaCaducidad} onChange={e=>setFechaCaducidad(e.target.value)} style={{width:"100%",marginBottom:10}} />

<button onClick={guardar} style={btn}>Guardar</button>
<button onClick={()=>setModal(false)} style={btn}>Cancelar</button>

</div>
</div>
)}

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
padding:"6px 10px",
borderRadius:6,
border:"none",
cursor:"pointer"
}

const okBox = {
background:"#22c55e",
padding:15,
borderRadius:10,
textAlign:"center" as const
}