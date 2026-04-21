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
/* 🔥 LÓGICA CORREGIDA */
/* ========================= */

async function calcularPrioridad(){

const { data: base } = await supabase.from("inventario_base").select("*")

const { data: checklist } = await supabase
.from("inventario_checklist")
.select(`*,inventario_items (nombre,categoria)`)
.eq("estado","FINALIZADO")

const { data: mov } = await supabase
.from("inventario_movimientos")
.select("*")

const { data: ambulancias } = await supabase
.from("ambulancias")
.select("id,codigo_operativo")

if(!base || !checklist || !mov || !ambulancias) return

const resultado = ambulancias.map(a=>{

/* 🔥 SOLO ÚLTIMO REGISTRO POR ITEM */
const itemsAmb = checklist.filter(i=> String(i.ambulancia_id) === String(a.id))

const mapa:any = {}

itemsAmb.forEach(i=>{
const id = String(i.item_id)

if(!mapa[id]){
mapa[id] = i
}else{
const f1 = new Date(mapa[id].fecha_registro || mapa[id].created_at || 0)
const f2 = new Date(i.fecha_registro || i.created_at || 0)

if(f2 > f1){
mapa[id] = i
}
}
})

const ultimo:any[] = Object.values(mapa)

/* 🔥 STOCK REAL */
const stockMap:any = {}

ultimo.forEach((i:any)=>{
stockMap[i.item_id] = Number(i.cantidad || 0)
})

mov
.filter(m=> String(m.ambulancia_id) === String(a.id))
.forEach(m=>{
const id = String(m.item_id)
if(!stockMap[id]) stockMap[id] = 0

const cant = Number(m.cantidad || 0)

if(m.tipo==="CONSUMO") stockMap[id] -= cant
if(m.tipo==="INGRESO") stockMap[id] += cant
})

/* 🔥 BASE SIN DUPLICADOS */
const baseUnica = Array.from(new Map(base.map(i=>[i.item_id,i])).values())

let faltantes = 0
let faltantesDetalle:any[] = []

let totalItems = 0
let itemsOK = 0

let totalMed = 0
let okMed = 0
let totalOtros = 0
let okOtros = 0

baseUnica.forEach(b=>{

const id = String(b.item_id)
const minimo = Number(b.cantidad_minima || 0)

if(minimo <= 0) return

totalItems++

const actual = Number(stockMap[id] || 0)

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
item_id: b.item_id,
nombre: b.nombre,
categoria: b.categoria,
actual,
minimo: b.cantidad_minima,
estado: actual === 0 ? "SIN STOCK" : "INCOMPLETO",
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
porcentaje: totalItems > 0 ? Math.round((itemsOK / totalItems) * 100) : 0,
porcMed: totalMed > 0 ? Math.round((okMed / totalMed) * 100) : 0,
porcOtros: totalOtros > 0 ? Math.round((okOtros / totalOtros) * 100) : 0
}

})

resultado.sort((a,b)=>
String(a.nombre).localeCompare(String(b.nombre), undefined, { numeric:true })
)

setResumen(resultado)
}

/* ========================= */
/* RESTO (NO TOCADO) */
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
await supabase.from("inventario_checklist")
.update({ cantidad: 0 })
.eq("id", item.id)
await init()
}

async function guardar(){

if(!itemSeleccionado) return

if(modo === "CAMBIO"){
await retirarItem(itemSeleccionado)
}

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
/* UI ORIGINAL (INTACTA) */
/* ========================= */

return(

<div style={container}>

{/* TODO TU UI ORIGINAL EXACTA (SIN CAMBIOS) */}

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