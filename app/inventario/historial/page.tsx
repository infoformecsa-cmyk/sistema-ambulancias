"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"

export default function HistorialChecklist(){

const [ambulancias,setAmbulancias] = useState<any[]>([])
const [ambulancia,setAmbulancia] = useState("")
const [datos,setDatos] = useState<any[]>([])

useEffect(()=>{
cargarAmbulancias()
},[])

async function cargarAmbulancias(){
const { data } = await supabase.from("ambulancias").select("id,codigo_operativo")
setAmbulancias(data || [])
}

async function cargarHistorial(id:string){

const { data } = await supabase
.from("inventario_checklist")
.select("*")
.eq("ambulancia_id", id)
.order("fecha_registro",{ascending:false})

procesar(data || [])
}

function procesar(data:any[]){

const hoy = new Date()

const procesado = data.map(i=>{

let estado = "OK"

if(i.fecha_caducidad){
const fecha = new Date(i.fecha_caducidad)
const diff = (fecha.getTime() - hoy.getTime()) / (1000*60*60*24)

if(diff <= 0) estado = "VENCIDO"
else if(diff <= 30) estado = "POR_VENCER"
}

return {...i, estado}
})

setDatos(procesado)
}

function colorEstado(e:string){
if(e==="VENCIDO") return "#7f1d1d"
if(e==="POR_VENCER") return "#f59e0b"
return "#22c55e"
}

return(

<div style={container}>

<h1>📊 Historial Checklist</h1>

<select
value={ambulancia}
onChange={(e)=>{
setAmbulancia(e.target.value)
cargarHistorial(e.target.value)
}}
style={input}
>
<option value="">Seleccionar ambulancia</option>
{ambulancias.map(a=>(
<option key={a.id} value={a.id}>{a.codigo_operativo}</option>
))}
</select>

<div style={tabla}>

<div style={headerRow}>
<div>Fecha Registro</div>
<div>Item</div>
<div>Lote</div>
<div>Cantidad</div>
<div>Caducidad</div>
<div>Estado</div>
</div>

{datos.map(d=>(

<div key={d.id} style={row}>

<div>{new Date(d.fecha_registro).toLocaleString()}</div>
<div>{d.item_id}</div>
<div>{d.lote || "-"}</div>
<div>{d.cantidad}</div>
<div>{d.fecha_caducidad || "-"}</div>

<div style={{
background:colorEstado(d.estado),
padding:"5px",
borderRadius:6,
textAlign:"center"
}}>
{d.estado}
</div>

</div>

))}

</div>

</div>
)
}

/* ESTILOS */

const container = {
background:"#020617",
color:"white",
minHeight:"100vh",
padding:30
}

const input = {
padding:10,
marginBottom:20,
borderRadius:8,
background:"#1f2937",
color:"white",
border:"none"
}

const tabla = {
background:"#111827",
borderRadius:10,
padding:10
}

const headerRow = {
display:"grid",
gridTemplateColumns:"1fr 1fr 1fr 1fr 1fr 1fr",
fontWeight:"bold",
padding:10,
borderBottom:"1px solid #1f2937"
}

const row = {
display:"grid",
gridTemplateColumns:"1fr 1fr 1fr 1fr 1fr 1fr",
padding:10,
borderBottom:"1px solid #1f2937"
}