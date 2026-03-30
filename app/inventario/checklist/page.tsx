"use client"

import { useEffect, useState } from "react"
import React from "react"
import { supabase } from "@/lib/supabaseClient"

/* 🔥 NUEVO: SOPORTE MULTI-LOTE */
type LoteType = {
  lote?: string
  cantidad?: number
  fecha?: string
}

type DatosType = Record<string, {
  tiene?: boolean
  cantidad?: number
  fecha?: string
  lotes?: LoteType[]
}>

export default function Checklist(){

const [ambulancias,setAmbulancias] = useState<any[]>([])
const [items,setItems] = useState<any[]>([])

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

async function cargar(){

const {data:amb} = await supabase.from("ambulancias").select("*")

const {data:inv} = await supabase
.from("inventario_items")
.select("*")
.order("categoria",{ascending:true})

setAmbulancias(amb || [])

setItems(
  (inv || []).filter(i =>
    i.nombre &&
    i.nombre.length > 3 &&
    !i.nombre.toLowerCase().includes("farma") &&
    !i.nombre.toLowerCase().includes("no ingresado")
  )
)

}

/* ========================= */
/* 🔥 MULTI LOTE */
/* ========================= */

function agregarLote(id:string){

const actual = datos[id]?.lotes || []

setDatos(prev=>({
...prev,
[id]:{
...prev[id],
lotes:[...actual,{lote:"",cantidad:0,fecha:""}]
}
}))
}

/* ✅ FIX TYPESCRIPT + REACT */
function actualizarLote(
  id: string,
  index: number,
  campo: keyof LoteType,
  valor: any
){

const copia = [...(datos[id]?.lotes || [])]

copia[index] = {
  ...copia[index],
  [campo]: valor
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
/* 🔥 SEMÁFORO */
/* ========================= */
function getSemaforo(fecha?: string){

if(!fecha) return {color:"#6b7280",label:"SIN FECHA"}

const hoy = new Date()
const cad = new Date(fecha)

const diff = cad.getTime() - hoy.getTime()
const dias = diff / (1000*60*60*24)

if(dias <= 0) return {color:"#ef4444",label:"CADUCADO"}
if(dias <= 30) return {color:"#f59e0b",label:"PRÓXIMO"}
return {color:"#22c55e",label:"OK"}
}

/* ========================= */
function actualizar(id:string, campo:string, valor:any){

setDatos((prev)=>({
...prev,
[id]:{
...prev[id],
[campo]:valor
}
}))
}

/* ========================= */
/* 🔥 GUARDAR (MULTI LOTE) */
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

try{

let inserts:any[] = []

for(const item of items){

const d = datos[item.id]
if(!d) continue

if(d.lotes && d.lotes.length > 0){

for(const l of d.lotes){

if(!l.lote && !l.fecha && !l.cantidad) continue

inserts.push(
supabase.from("inventario_checklist").insert({
ambulancia_id:ambulancia,
item_id:item.id,
lote:l.lote,
cantidad:Number(l.cantidad || 0),
fecha_caducidad:l.fecha || null,
nombre_responsable:responsable.nombre,
apellido_responsable:responsable.apellido
})
)

}

}else{

inserts.push(
supabase.from("inventario_checklist").insert({
ambulancia_id:ambulancia,
item_id:item.id,
tiene:d.tiene || false,
cantidad:Number(d.cantidad || 0),
fecha_caducidad:d.fecha || null,
nombre_responsable:responsable.nombre,
apellido_responsable:responsable.apellido
})
)

}

}

await Promise.all(inserts)

alert("✅ Checklist guardado")

setDatos({})
setResponsable({nombre:"",apellido:""})
setAmbulancia("")

}catch(e){
console.error(e)
alert("Error guardando")
}

setGuardando(false)
}

/* ========================= */
function colorCategoria(cat:string){

if(cat==="medicamentos") return "#7c2d12"
if(cat==="respiratorio") return "#1e40af"
if(cat==="trauma") return "#92400e"
if(cat==="lenceria") return "#6d28d9"
if(cat==="canalizacion") return "#065f46"
return "#111827"

}

/* ========================= */
/* UI */
/* ========================= */

return(

<div style={container}>

<div style={header}>
<h1>🚑 Checklist Ambulancia</h1>
</div>

<div style={panel}>

<select value={ambulancia} onChange={(e)=>setAmbulancia(e.target.value)} style={input}>
<option value="">Seleccione ambulancia</option>
{ambulancias.map(a=>(
<option key={a.id} value={a.id}>{a.codigo_operativo}</option>
))}
</select>

<input placeholder="Nombre" value={responsable.nombre}
onChange={(e)=>setResponsable({...responsable,nombre:e.target.value})} style={input}/>

<input placeholder="Apellido" value={responsable.apellido}
onChange={(e)=>setResponsable({...responsable,apellido:e.target.value})} style={input}/>

</div>

<div style={tableContainer}>

<table style={{width:"100%"}}>

<tbody>

{Array.from(new Set(items.map(i=>i.categoria))).map(cat => (

<React.Fragment key={cat}>

<tr>
<td colSpan={5} style={{background:colorCategoria(cat),color:"white",padding:10}}>
{cat.toUpperCase()}
</td>
</tr>

{items.filter(i=>i.categoria===cat).map(i=>{

const d = datos[i.id]

return(
<tr key={i.id}>

<td>{i.nombre}</td>

<td>
<button onClick={()=>agregarLote(i.id)}>➕ Lote</button>

{(d?.lotes || []).map((l,index)=>(
<div key={`${i.id}-${index}`}>

<input placeholder="Lote"
onChange={(e)=>actualizarLote(i.id,index,"lote",e.target.value)}/>

<input type="date"
onChange={(e)=>actualizarLote(i.id,index,"fecha",e.target.value)}/>

<input type="number"
placeholder="Cant"
onChange={(e)=>actualizarLote(i.id,index,"cantidad",e.target.value)}/>

</div>
))}

</td>

</tr>
)

})}

</React.Fragment>
))}

</tbody>
</table>

</div>

<button onClick={guardar} style={btn}>
{guardando ? "Guardando..." : "Guardar"}
</button>

</div>
)
}

/* estilos */
const container: React.CSSProperties = {padding:20}
const header: React.CSSProperties = {}
const panel: React.CSSProperties = {display:"flex",gap:10,flexWrap:"wrap"}
const tableContainer: React.CSSProperties = {}
const input: React.CSSProperties = {padding:8}
const btn: React.CSSProperties = {padding:10}