"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { useRouter } from "next/navigation"
import type { CSSProperties } from "react"

export default function Dashboard(){

const router = useRouter()

const [alertas,setAlertas] = useState<any[]>([])
const [resumen,setResumen] = useState<any[]>([])
const [expandido,setExpandido] = useState<string | null>(null)

/* 🔥 MODAL */
const [modal,setModal] = useState(false)
const [itemSeleccionado,setItemSeleccionado] = useState<any>(null)
const [cantidad,setCantidad] = useState("")
const [lote,setLote] = useState("")
const [fechaCaducidad,setFechaCaducidad] = useState("")
const [modo,setModo] = useState<"ABASTECER" | "CAMBIO">("ABASTECER")

/* ========================= */

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
/* 🔥 PRIORIDAD */
/* ========================= */

async function calcularPrioridad(){

const { data: base } = await supabase.from("inventario_base").select("*")
const { data: checklist } = await supabase.from("inventario_checklist").select(`*,inventario_items(nombre)`)
const { data: ambulancias } = await supabase.from("ambulancias").select("id,codigo_operativo")

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
let faltantes = 0
let faltantesDetalle:any[] = []

base.forEach(b=>{
const encontrado = ultimo.find((i:any)=> String(i.item_id) === String(b.item_id))
const actual = encontrado?.cantidad || 0

if(actual < b.cantidad_minima){
faltantes++
faltantesDetalle.push({
...b,
actual,
ambulancia_id:a.id
})
}
})

/* VENCIDOS */
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
nombre:getNombre(i.inventario_items)
})
}
})

let prioridad = "OK"
if(vencidos > 0 || faltantes > 5) prioridad = "ALTA"
else if(faltantes > 0) prioridad = "MEDIA"

return {
nombre:a.codigo_operativo,
faltantes,
vencidos,
prioridad,
faltantesDetalle,
vencidosDetalle
}

})

setResumen(resultado)
}

/* ========================= */
/* 🔥 ACCIONES */
/* ========================= */

function abrirModal(item:any, tipo:"ABASTECER"|"CAMBIO"){
setItemSeleccionado(item)
setModo(tipo)
setModal(true)
}

async function retirarItem(item:any){
await supabase
.from("inventario_checklist")
.update({ estado:"RETIRADO" })
.eq("id", item.id)

await init()
}

async function guardar(){

if(!cantidad || !fechaCaducidad){
alert("Cantidad y fecha son obligatorias")
return
}

if(modo==="CAMBIO" && itemSeleccionado?.id){
await retirarItem(itemSeleccionado)
}

await supabase.from("inventario_checklist").insert({
ambulancia_id: itemSeleccionado.ambulancia_id,
item_id: itemSeleccionado.item_id,
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

return(

<div style={container}>

<h1>🚑 CENTRO DE CONTROL EMS</h1>

{resumen.map((a,i)=>(

<div key={i} style={{background:"#7f1d1d",padding:15,marginBottom:10}}>

<strong>{a.nombre}</strong>

{a.faltantesDetalle.map((f:any,idx:number)=>(

<div key={idx} style={{display:"flex",justifyContent:"space-between"}}>

<span>{f.nombre} {f.actual}/{f.cantidad_minima}</span>

<button onClick={(e)=>{
e.stopPropagation()
abrirModal(f,"ABASTECER")
}}>➕ Abastecer</button>

</div>

))}

{a.vencidosDetalle.map((v:any,idx:number)=>(

<div key={idx} style={{display:"flex",justifyContent:"space-between"}}>

<span>{v.nombre}</span>

<div style={{display:"flex",gap:5}}>
<button onClick={()=>retirarItem(v)}>❌ Retirar</button>
<button onClick={()=>abrirModal(v,"CAMBIO")}>🔄 Cambio</button>
</div>

</div>

))}

</div>

))}

{/* MODAL */}

{modal && (
<div style={modalStyle}>

<div style={modalBox}>

<h3>{modo==="CAMBIO"?"🔄 Cambio":"📦 Abastecer"}</h3>

<p>{itemSeleccionado?.nombre}</p>

<input placeholder="Cantidad" value={cantidad} onChange={e=>setCantidad(e.target.value)} />
<input placeholder="Lote" value={lote} onChange={e=>setLote(e.target.value)} />
<input type="date" value={fechaCaducidad} onChange={e=>setFechaCaducidad(e.target.value)} />

<button onClick={guardar}>Guardar</button>
<button onClick={()=>setModal(false)}>Cancelar</button>

</div>

</div>
)}

</div>
)
}

/* ========================= */
/* 🔥 FIX TYPESCRIPT */
/* ========================= */

const container: CSSProperties = {
padding:20,
color:"white",
background:"#020617"
}

const modalStyle: CSSProperties = {
position:"fixed",
top:0,
left:0,
width:"100%",
height:"100%",
background:"rgba(0,0,0,0.7)",
display:"flex",
justifyContent:"center",
alignItems:"center"
}

const modalBox: CSSProperties = {
background:"#111827",
padding:20,
borderRadius:10
}