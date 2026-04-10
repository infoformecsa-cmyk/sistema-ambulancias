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

async function cargarAlertas(){

const { data } = await supabase
.from("inventario_checklist")
.select(`ambulancia_id,fecha_caducidad,inventario_items (nombre)`)
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

setAlertas(procesado.filter(i=> i.estado !== "OK"))
}

/* ========================= */

async function calcularPrioridad(){

const { data: base } = await supabase
.from("inventario_base")
.select("item_id,nombre,cantidad_minima")

const { data: checklist } = await supabase
.from("inventario_checklist")
.select(`*,inventario_items (nombre)`)

const { data: ambulancias } = await supabase
.from("ambulancias")
.select("id,codigo_operativo")

if(!base || !checklist || !ambulancias) return

const resultado = ambulancias.map(a=>{

const items = checklist.filter(i=> String(i.ambulancia_id) === String(a.id))

const mapa:any = {}
items.forEach(i=>{
if(!mapa[i.item_id] || new Date(i.created_at) > new Date(mapa[i.item_id].created_at)){
mapa[i.item_id] = i
}
})

const ultimo:any[] = Object.values(mapa)

/* FALTANTES */
let faltantesDetalle:any[] = []

base.forEach(b=>{
const encontrado = ultimo.find((i:any)=> String(i.item_id) === String(b.item_id))
const actual = encontrado?.cantidad || 0

if(actual < b.cantidad_minima){
faltantesDetalle.push({
item_id:b.item_id,
nombre:b.nombre,
actual,
minimo:b.cantidad_minima,
ambulancia_id:a.id
})
}
})

/* VENCIDOS */
let vencidosDetalle:any[] = []

const hoy = new Date()

ultimo.forEach((i:any)=>{
if(!i.fecha_caducidad) return

const diff = (new Date(i.fecha_caducidad).getTime() - hoy.getTime()) / (1000*60*60*24)

if(diff <= 0){
vencidosDetalle.push({
...i,
nombre:getNombre(i.inventario_items)
})
}
})

return {
nombre:a.codigo_operativo,
faltantes:faltantesDetalle.length,
vencidos:vencidosDetalle.length,
prioridad:(vencidosDetalle.length>0 || faltantesDetalle.length>5) ? "ALTA" : "MEDIA",
faltantesDetalle,
vencidosDetalle
}
})

setResumen(resultado)
}

/* ========================= */

function abrirModal(item:any,tipo:"ABASTECER"|"CAMBIO"){
setItemSeleccionado(item)
setModo(tipo)
setModal(true)
}

async function retirarItem(item:any){
await supabase.from("inventario_checklist")
.update({ cantidad:0 })
.eq("id",item.id)

await init()
}

async function guardar(){

if(modo==="CAMBIO"){
await retirarItem(itemSeleccionado)
}

await supabase.from("inventario_checklist").insert({
ambulancia_id:itemSeleccionado.ambulancia_id,
item_id:itemSeleccionado.item_id,
cantidad:Number(cantidad),
lote,
fecha_caducidad:fechaCaducidad
})

setModal(false)
setCantidad("")
setLote("")
setFechaCaducidad("")
await init()
}

/* ========================= */

function toggle(nombre:string){
setExpandido(expandido===nombre?null:nombre)
}

/* ========================= */

function colorEstado(e:string){
if(e==="ALTA") return "#7f1d1d"
if(e==="MEDIA") return "#f59e0b"
return "#22c55e"
}

/* ========================= */

return(

<div style={container}>

<div style={header}>
<h1>🚑 CENTRO DE CONTROL EMS</h1>
</div>

{resumen.map((a,i)=>(

<div key={i} style={{
background:colorEstado(a.prioridad),
padding:15,
marginBottom:10,
borderRadius:10
}} onClick={()=>toggle(a.nombre)}>

<strong>{a.nombre}</strong>

{expandido===a.nombre && (

<div style={{marginTop:10}}>

{/* REABASTECER */}
<div style={{background:"#020617",padding:10,borderRadius:8,marginBottom:10}}>
<strong>📦 Reabastecer:</strong>

{a.faltantesDetalle.map((f:any,idx:number)=>(

<div key={idx} style={{display:"flex",justifyContent:"space-between"}}>

<span>- {f.nombre} → {f.actual}/{f.minimo}</span>

<button onClick={(e)=>{
e.stopPropagation()
abrirModal(f,"ABASTECER")
}} style={btn}>Abastecer</button>

</div>
))}

</div>

{/* VENCIDOS */}
<div style={{background:"#450a0a",padding:10,borderRadius:8}}>
<strong>🚨 Vencidos:</strong>

{a.vencidosDetalle.map((v:any,idx:number)=>(

<div key={idx} style={{display:"flex",justifyContent:"space-between"}}>

<span>- {v.nombre}</span>

<div style={{display:"flex",gap:5}}>

<button onClick={(e)=>{
e.stopPropagation()
retirarItem(v)
}} style={btnSmall}>Retirar</button>

<button onClick={(e)=>{
e.stopPropagation()
abrirModal(v,"CAMBIO")
}} style={btnSmall}>Cambio</button>

</div>

</div>
))}

</div>

</div>

)}

</div>

))}

{/* MODAL */}
{modal && (
<div style={modalBg}>
<div style={modalBox}>

<h3>{modo==="CAMBIO"?"Cambio":"Abastecer"}</h3>

<input placeholder="Cantidad" value={cantidad} onChange={e=>setCantidad(e.target.value)} />
<input placeholder="Lote" value={lote} onChange={e=>setLote(e.target.value)} />
<input type="date" value={fechaCaducidad} onChange={e=>setFechaCaducidad(e.target.value)} />

<button onClick={guardar} style={btn}>Guardar</button>
<button onClick={()=>setModal(false)} style={btn}>Cancelar</button>

</div>
</div>
)}

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

const btnSmall = {
...btn,
fontSize:12,
padding:"4px 8px"
}

const modalBg = {
position:"fixed" as const,
top:0,
left:0,
width:"100%",
height:"100%",
background:"rgba(0,0,0,0.6)",
display:"flex",
justifyContent:"center",
alignItems:"center"
}

const modalBox = {
background:"#111827",
padding:20,
borderRadius:10,
width:300
}