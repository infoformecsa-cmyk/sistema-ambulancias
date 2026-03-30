"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"

export default function Dashboard(){

const [data,setData] = useState<any[]>([])
const [ambulancias,setAmbulancias] = useState<any[]>([])
const [filtro,setFiltro] = useState("todas")

/* 🔥 EDIT */
const [editando,setEditando] = useState<any>(null)
const [form,setForm] = useState<any>({})

useEffect(()=>{
cargarAmbulancias()
cargar()
},[])

async function cargarAmbulancias(){
const { data } = await supabase
.from("ambulancias")
.select("id,codigo_operativo")

setAmbulancias(data || [])
}

async function cargar(){

const { data } = await supabase
.from("bitacora_items")
.select("*")

const hoy = new Date()

const procesado = (data || []).map(item=>{

const fecha = new Date(item.updated_at || item.created_at)
const diff = (hoy.getTime() - fecha.getTime()) / (1000*60*60*24)

let estado = "OK"
if(diff >= 15) estado = "CRITICO"
else if(diff >= 7) estado = "PREVENTIVO"

return {...item, estado}
})

setData(procesado)
}

/* 🔥 EDITAR */
function abrirEditar(item:any){
setEditando(item)
setForm({
nombre:item.nombre,
lote:item.lote,
cantidad:item.cantidad
})
}

async function guardarEdicion(){

await supabase
.from("bitacora_items")
.update({
nombre:form.nombre,
lote:form.lote,
cantidad:Number(form.cantidad)
})
.eq("id",editando.id)

setEditando(null)
cargar()
}

/* 🔥 PDF */
function generarPDF(){

const doc = new jsPDF()

doc.text("REPORTE BITACORA AMBULANCIAS", 14, 15)

autoTable(doc,{
startY:20,
head:[["Ambulancia","Nombre","Tipo","Lote","Estado"]],
body:filtrado.map(i=>[
mapaAmbulancias[i.ambulancia_id] || "-",
i.nombre,
i.tipo,
i.lote || "-",
i.estado
])
})

doc.save("reporte_bitacora.pdf")
}

/* 🔥 CERRAR SESIÓN */
function cerrarSesion(){
localStorage.clear()
window.location.href = "/"
}

/* 🔥 MAPA AMBULANCIAS */
const mapaAmbulancias = Object.fromEntries(
ambulancias.map(a => [a.id, a.codigo_operativo])
)

/* 🔥 CONSUMO */
const consumo = ambulancias.map(a=>{

const items = data.filter(i=>i.ambulancia_id === a.id)

const total = items.reduce((sum,i)=> sum + (i.cantidad || 0),0)

return {
nombre:a.codigo_operativo,
total
}

}).sort((a,b)=> b.total - a.total)

/* 🔥 AGRUPAR POR AMBULANCIA */
const resumenAmbulancias = ambulancias.map(a=>{

const items = data.filter(i=>i.ambulancia_id === a.id)

let estado = "OK"

if(items.some(i=>i.estado==="CRITICO")){
estado = "CRITICO"
}else if(items.some(i=>i.estado==="PREVENTIVO")){
estado = "PREVENTIVO"
}

return {
id:a.id,
nombre:a.codigo_operativo,
estado
}

})

/* 🔥 FILTRO */
const filtrado = filtro === "todas"
? data
: data.filter(i=>String(i.ambulancia_id) === filtro)

/* KPIs */
const total = filtrado.length
const criticos = filtrado.filter(i=>i.estado==="CRITICO").length
const preventivos = filtrado.filter(i=>i.estado==="PREVENTIVO").length
const ok = filtrado.filter(i=>i.estado==="OK").length

function colorEstado(e:string){
if(e==="CRITICO") return "#dc2626"
if(e==="PREVENTIVO") return "#f59e0b"
return "#16a34a"
}

return(
<div style={{padding:40,fontFamily:"Arial"}}>

<h1>🚑 Dashboard Bitácora</h1>

{/* 🔥 BOTONES */}
<div style={{marginBottom:20,display:"flex",gap:10}}>
<button onClick={generarPDF}>📄 PDF</button>
<button onClick={cerrarSesion}>Cerrar sesión</button>
</div>

{/* 🔴 RESUMEN */}
<h2>Estado por Ambulancia</h2>

<div style={{display:"flex",gap:15,flexWrap:"wrap",marginBottom:30}}>
{resumenAmbulancias.map(a=>(
<div key={a.id} style={{
background:colorEstado(a.estado),
color:"white",
padding:15,
borderRadius:10,
minWidth:120,
textAlign:"center",
fontWeight:"bold"
}}>
🚑 {a.nombre}<br/>
{a.estado}
</div>
))}
</div>

{/* 📉 CONSUMO */}
<h2>📉 Consumo por Ambulancia</h2>

<div style={{marginBottom:30}}>
{consumo.map((c,i)=>(
<div key={i} style={{
padding:10,
borderBottom:"1px solid #ddd"
}}>
🚑 {c.nombre}: <b>{c.total}</b>
</div>
))}
</div>

{/* SELECT */}
<select
value={filtro}
onChange={(e)=>setFiltro(e.target.value)}
style={{padding:10,marginBottom:20}}
>
<option value="todas">Todas</option>
{ambulancias.map(a=>(
<option key={a.id} value={a.id}>
{a.codigo_operativo}
</option>
))}
</select>

{/* KPIs */}
<div style={{display:"flex",gap:20,marginBottom:30}}>
<div style={card("#dc2626")}>🔴 {criticos}</div>
<div style={card("#f59e0b")}>🟡 {preventivos}</div>
<div style={card("#16a34a")}>🟢 {ok}</div>
<div style={card("#374151")}>Total {total}</div>
</div>

<table style={{width:"100%"}}>
<thead>
<tr>
<th>Ambulancia</th>
<th>Nombre</th>
<th>Tipo</th>
<th>Lote</th>
<th>Estado</th>
<th></th>
</tr>
</thead>

<tbody>
{filtrado.map((item,i)=>(
<tr key={i}>
<td>{mapaAmbulancias[item.ambulancia_id] || "-"}</td>
<td>{item.nombre}</td>
<td>{item.tipo}</td>
<td>{item.lote}</td>

<td style={{
background:colorEstado(item.estado),
color:"white",
textAlign:"center"
}}>
{item.estado}
</td>

<td>
<button onClick={()=>abrirEditar(item)}>✏️</button>
</td>

</tr>
))}
</tbody>
</table>

{/* 🔥 MODAL EDITAR */}
{editando && (
<div style={{
position:"fixed",
top:0,left:0,width:"100%",height:"100%",
background:"rgba(0,0,0,0.5)",
display:"flex",
justifyContent:"center",
alignItems:"center"
}}>

<div style={{
background:"white",
padding:20,
borderRadius:10,
width:300
}}>

<h3>Editar Registro</h3>

<input
value={form.nombre}
onChange={(e)=>setForm({...form,nombre:e.target.value})}
/>

<br/><br/>

<input
value={form.lote}
onChange={(e)=>setForm({...form,lote:e.target.value})}
/>

<br/><br/>

<input
type="number"
value={form.cantidad}
onChange={(e)=>setForm({...form,cantidad:e.target.value})}
/>

<br/><br/>

<button onClick={guardarEdicion}>Guardar</button>
<button onClick={()=>setEditando(null)} style={{marginLeft:10}}>
Cancelar
</button>

</div>
</div>
)}

</div>
)
}

const card = (color:string)=>({
background:color,
color:"white",
padding:15,
borderRadius:10
})