"use client"

import { useEffect, useState } from "react"
import React from "react"
import { supabase } from "@/lib/supabaseClient"

/* ========================= */
/* 🔥 NORMALIZADOR CLÍNICO */
/* ========================= */

function normalizarCategoria(cat:string){

const c = (cat || "").toLowerCase().trim()

if(c.includes("lencer")) return "lenceria"
if(c.includes("esteril")) return "dispositivos"
if(c.includes("dispositivo")) return "dispositivos"
if(c.includes("respir")) return "respiratorio"
if(c.includes("oxigen")) return "oxigeno"
if(c.includes("canal")) return "canalizacion"
if(c.includes("medic")) return "medicamentos"
if(c.includes("trauma")) return "trauma"
if(c.includes("limpieza")) return "limpieza"
if(c.includes("desecho")) return "limpieza"
if(c.includes("proteccion")) return "proteccion"

return "otros"
}

/* ========================= */
/* TIPOS */
/* ========================= */

type LoteType = {
  lote?: string
  cantidad?: number
  fecha?: string
  nivel?: number
}

type DatosType = Record<string, {
  lotes?: LoteType[]
}>

/* ========================= */

export default function Checklist(){

const [ambulancias,setAmbulancias] = useState<any[]>([])
const [items,setItems] = useState<any[]>([])
const [busqueda,setBusqueda] = useState("")

const [expandido,setExpandido] = useState<Record<string,boolean>>({})

const [ambulancia,setAmbulancia] = useState("")
const [guardando,setGuardando] = useState(false)

const [responsable,setResponsable] = useState({
nombre:"",
apellido:""
})

const [datos,setDatos] = useState<DatosType>({})

useEffect(()=>{
cargar()
},[])

/* ========================= */
/* 🔥 CARGA INTELIGENTE */
/* ========================= */

async function cargar(){

const {data:amb} = await supabase.from("ambulancias").select("*")

const {data:inv} = await supabase
.from("inventario_items")
.select("*")
.order("categoria",{ascending:true})

setAmbulancias(amb || [])

const categoriasValidas = [
"lenceria",
"dispositivos",
"respiratorio",
"oxigeno",
"canalizacion",
"medicamentos",
"trauma",
"limpieza",
"proteccion"
]

const limpio = (inv || []).filter(i => {

const nombre = (i.nombre || "").toLowerCase().trim()
const categoriaOriginal = i.categoria || ""
const categoria = normalizarCategoria(categoriaOriginal)

/* ❌ inválidos */
if(!nombre || nombre.length < 3) return false

/* ❌ eliminar FARMA */
if(nombre.includes("farma")) return false
if(categoriaOriginal.toLowerCase().includes("farma")) return false

/* ❌ eliminar kits */
if(nombre.includes("kit")) return false

/* ❌ administrativos */
if(nombre.includes("responsable")) return false
if(nombre.includes("observacion")) return false
if(nombre.includes("firma")) return false
if(nombre.includes("registro")) return false
if(nombre.includes("reporte")) return false

/* ❌ basura */
if(nombre.includes("no ingresado")) return false

/* ✅ solo categorías válidas */
if(!categoriasValidas.includes(categoria)) return false

/* 🔥 normalizar categoría */
i.categoria = categoria

return true

})

setItems(limpio)

}

/* ========================= */
/* DETECTORES */
/* ========================= */

function esOxigeno(nombre:string){
return nombre.toLowerCase().includes("oxigeno")
}

/* ========================= */

function toggleCategoria(cat:string){
setExpandido(prev=>({
...prev,
[cat]: !prev[cat]
}))
}

function agregarLote(id:string){

const actual = datos[id]?.lotes || []

setDatos(prev=>({
...prev,
[id]:{
...prev[id],
lotes:[...actual,{lote:"",cantidad:0,fecha:"",nivel:0}]
}
}))
}

function actualizarLote(
id:string,
index:number,
campo:keyof LoteType,
valor:any
){

const copia = [...(datos[id]?.lotes || [])]

copia[index] = {
...copia[index],
[campo]: campo === "cantidad" || campo === "nivel"
? Number(valor)
: valor
}

setDatos(prev=>({
...prev,
[id]:{
...prev[id],
lotes:copia
}
}))
}

/* ========================= */
/* GUARDAR */
/* ========================= */

async function guardar(){

if(!ambulancia){
alert("Seleccione ambulancia")
return
}

if(!responsable.nombre){
alert("Ingrese responsable")
return
}

setGuardando(true)

let inserts:any[] = []

for(const item of items){

const d = datos[item.id]
if(!d?.lotes) continue

for(const l of d.lotes){

if(!l.lote && !l.fecha && !l.cantidad && !l.nivel) continue

inserts.push(
supabase.from("inventario_checklist").insert({
ambulancia_id:ambulancia,
item_id:item.id,
lote:l.lote,
cantidad:l.cantidad,
nivel:l.nivel,
fecha_caducidad:l.fecha,
fecha_registro:new Date(),
nombre_responsable:responsable.nombre
})
)

}

}

await Promise.all(inserts)

alert("✅ Checklist guardado correctamente")

setDatos({})
setGuardando(false)
}

/* ========================= */
/* FILTRO BUSQUEDA */
/* ========================= */

const filtrados = items.filter(i =>
i.nombre.toLowerCase().includes(busqueda.toLowerCase())
)

/* ========================= */
/* UI */
/* ========================= */

return(

<div style={container}>

<h1 style={titulo}>🚑 Checklist Clínico Operativo</h1>

<div style={panel}>

<select value={ambulancia} onChange={(e)=>setAmbulancia(e.target.value)} style={input}>
<option value="">Ambulancia</option>
{ambulancias.map(a=>(
<option key={a.id} value={a.id}>{a.codigo_operativo}</option>
))}
</select>

<input
placeholder="Responsable"
value={responsable.nombre}
onChange={(e)=>setResponsable({...responsable,nombre:e.target.value})}
style={input}
/>

<input
placeholder="Buscar..."
value={busqueda}
onChange={(e)=>setBusqueda(e.target.value)}
style={input}
/>

</div>

<div>

{Array.from(new Set(filtrados.map(i=>i.categoria))).map(cat => (

<div key={cat} style={card}>

<div style={categoriaHeader} onClick={()=>toggleCategoria(cat)}>
{cat.toUpperCase()}
</div>

{expandido[cat] && filtrados
.filter(i=>i.categoria===cat)
.map(i=>{

const d = datos[i.id]
const oxigeno = esOxigeno(i.nombre)

return(

<div key={i.id} style={itemRow}>

<div style={{fontWeight:"bold"}}>
{i.nombre}
</div>

<button style={btnAdd} onClick={()=>agregarLote(i.id)}>
+ Lote
</button>

{(d?.lotes || []).map((l,index)=>(

<div key={index} style={loteRow}>

<input placeholder="Lote"
onChange={(e)=>actualizarLote(i.id,index,"lote",e.target.value)}
style={inputSmall}
/>

<input type="date"
onChange={(e)=>actualizarLote(i.id,index,"fecha",e.target.value)}
style={inputSmall}
/>

<input type="number"
placeholder="Cant"
onChange={(e)=>actualizarLote(i.id,index,"cantidad",e.target.value)}
style={inputSmall}
/>

{oxigeno && (
<input
type="number"
placeholder="% Nivel"
onChange={(e)=>actualizarLote(i.id,index,"nivel",e.target.value)}
style={inputSmall}
/>
)}

</div>

))}

</div>

)

})}

</div>

))}

</div>

<button onClick={guardar} style={btnGuardar}>
{guardando ? "Guardando..." : "💾 Guardar Checklist"}
</button>

</div>
)
}

/* ========================= */
/* ESTILO */
/* ========================= */

const container:React.CSSProperties = {
background:"#020617",
color:"white",
minHeight:"100vh",
padding:20,
fontFamily:"system-ui"
}

const titulo:React.CSSProperties = {
marginBottom:20
}

const panel:React.CSSProperties = {
display:"flex",
gap:10,
flexWrap:"wrap",
marginBottom:20
}

const input:React.CSSProperties = {
padding:10,
borderRadius:8,
border:"none",
background:"#1f2937",
color:"white"
}

const inputSmall:React.CSSProperties = {
padding:6,
borderRadius:6,
border:"none",
background:"#1f2937",
color:"white",
width:90
}

const card:React.CSSProperties = {
background:"#111827",
borderRadius:10,
marginBottom:10
}

const categoriaHeader:React.CSSProperties = {
background:"#374151",
padding:10,
cursor:"pointer",
fontWeight:"bold"
}

const itemRow:React.CSSProperties = {
padding:10,
borderBottom:"1px solid #1f2937"
}

const loteRow:React.CSSProperties = {
display:"flex",
gap:5,
marginTop:5,
flexWrap:"wrap"
}

const btnAdd:React.CSSProperties = {
background:"#2563eb",
color:"white",
border:"none",
padding:"5px 10px",
borderRadius:6,
marginTop:5
}

const btnGuardar:React.CSSProperties = {
marginTop:20,
background:"#22c55e",
color:"black",
padding:14,
borderRadius:10,
border:"none",
width:"100%",
fontWeight:"bold"
}