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

async function cargarAlertas(){

const { data } = await supabase
.from("inventario_checklist")
.select(`ambulancia_id,fecha_caducidad,inventario_items (nombre)`)
.not("fecha_caducidad","is",null)

const hoy = new Date()

const procesado = (data || []).map(i=>{
const diff = (new Date(i.fecha_caducidad).getTime() - hoy.getTime()) / (1000*60*60*24)

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
/* 🔥 FIX REAL */
/* ========================= */

async function calcularPrioridad(){

const { data: base } = await supabase.from("inventario_base").select("*")

const { data: checklist } = await supabase
.from("inventario_checklist")
.select(`*,inventario_items (nombre,categoria)`)
.eq("estado","FINALIZADO")

const { data: ambulancias } = await supabase
.from("ambulancias")
.select("id,codigo_operativo")

if(!base || !checklist || !ambulancias) return

const resultado = ambulancias.map(a=>{

const itemsAmb = checklist.filter(i=> String(i.ambulancia_id) === String(a.id))

/* 🔥 ÚLTIMO POR ITEM */
const mapa:any = {}
itemsAmb.forEach(i=>{
const id = String(i.item_id)

if(!mapa[id]){
mapa[id] = i
}else{
const f1 = new Date(mapa[id].fecha_registro || mapa[id].created_at || 0)
const f2 = new Date(i.fecha_registro || i.created_at || 0)
if(f2 > f1) mapa[id] = i
}
})

const ultimo:any[] = Object.values(mapa)

/* 🔥 STOCK REAL */
const stockMap:any = {}
ultimo.forEach((i:any)=>{
stockMap[i.item_id] = Number(i.cantidad || 0)
})

/* 🔥 BASE SIN DUPLICADOS */
const baseUnica = Array.from(new Map(base.map(i=>[i.item_id,i])).values())

let faltantes = 0
let faltantesDetalle:any[] = []
let itemsOK = 0

let totalItems = 0
let totalMed = 0
let okMed = 0
let totalOtros = 0
let okOtros = 0

baseUnica.forEach(b=>{
const minimo = Number(b.cantidad_minima || 0)
if(minimo <= 0) return

totalItems++

const actual = Number(stockMap[b.item_id] || 0)

const esMed = (b.categoria || "").toLowerCase() === "medicamentos"

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
faltantesDetalle.push({
...b,
actual,
ambulancia_id: a.id
})
}
})

/* 🔥 CADUCIDAD */
let criticos = 0
let vencidos = 0
let vencidosDetalle:any[] = []

const hoy = new Date()

ultimo.forEach((i:any)=>{
if(!i.fecha_caducidad) return
const diff = (new Date(i.fecha_caducidad).getTime() - hoy.getTime())/(1000*60*60*24)

if(diff <= 0){
vencidos++
vencidosDetalle.push(i)
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
porcentaje: totalItems ? Math.round((itemsOK/totalItems)*100) : 0,
porcMed: totalMed ? Math.round((okMed/totalMed)*100) : 0,
porcOtros: totalOtros ? Math.round((okOtros/totalOtros)*100) : 0
}

})

setResumen(resultado)
}

/* ========================= */

function abrirModal(item:any, tipo:any){
setItemSeleccionado(item)
setModo(tipo)
setModal(true)
}

function toggle(nombre:string){
setExpandido(expandido === nombre ? null : nombre)
}

function colorEstado(e:string){
if(e==="ALTA") return "#7f1d1d"
if(e==="MEDIA") return "#f59e0b"
return "#22c55e"
}

/* ========================= */
/* UI COMPLETA RESTAURADA */
/* ========================= */

return(

<div style={container}>

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
<div>🧰 Insumos: {a.porcOtros}%</div>

{expandido === a.nombre && (

<div>

<strong>📦 Reabastecer</strong>

{Object.entries(agruparPorCategoria(a.faltantesDetalle)).map(([cat,items]:any)=>(
<div key={cat}>
<b>{cat}</b>
{items.map((f:any,i:number)=>(
<div key={i}>
- {f.nombre} ({f.actual}/{f.cantidad_minima})
<button onClick={(e)=>{e.stopPropagation(); abrirModal(f,"ABASTECER")}}>➕</button>
</div>
))}
</div>
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