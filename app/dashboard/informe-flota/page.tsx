"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { useRouter } from "next/navigation"

export default function InformeFlota(){

const router = useRouter()

const [ambulancias,setAmbulancias] = useState<any[]>([])
const [historial,setHistorial] = useState<any[]>([])

useEffect(()=>{
cargar()
},[])

async function cargar(){

const {data:amb} = await supabase
.from("ambulancias")
.select("*")
.order("codigo_operativo")

const {data:hist} = await supabase
.from("historial_operativo")
.select("*")
.order("fecha_inicio",{ascending:false})

setAmbulancias(amb || [])
setHistorial(hist || [])
}

/* KPI */
const total = ambulancias.length
const operativas = ambulancias.filter(a=>a.estado==="operativa").length
const noOperativas = ambulancias.filter(a=>a.estado==="no operativa").length
const mantenimiento = ambulancias.filter(a=>a.estado==="mantenimiento").length

const disponibilidad = total
? Math.round((operativas/total)*100)
: 0

function imprimir(){
window.print()
}

/* COLOR ESTADO */
function colorEstado(e:string){
if(e==="operativa") return "#16a34a"
if(e==="mantenimiento") return "#f59e0b"
return "#dc2626"
}

/* TIEMPO */
function calcularTiempo(inicio:string, fin:string|null){

const i = new Date(inicio)
const f = fin ? new Date(fin) : new Date()

if(f < i) return "0 h"

const diff = f.getTime() - i.getTime()

const horas = Math.floor(diff / (1000*60*60))
const minutos = Math.floor((diff % (1000*60*60)) / (1000*60))

if(horas > 0) return `${horas}h ${minutos}m`
return `${minutos} min`
}

/* FORMATEO ÁREA */
function formatearArea(area:any){

if(!area) return "-"

if(Array.isArray(area)){
return area.map(a=>{
if(a==="mecanico") return "Mecánico"
if(a==="electrico") return "Eléctrico"
if(a==="ac") return "A/C"
return a
}).join(", ")
}

return area
}

/* ========================= */
/* INDICADORES MSP */
/* ========================= */

let tiempoFueraServicioHoras = 0

const statsPorAmbulancia: Record<string, any> = {}

historial.forEach((h:any)=>{

const amb = h.ambulancia_id

if(!statsPorAmbulancia[amb]){
statsPorAmbulancia[amb] = {
total:0,
correctivo:0,
preventivo:0
}
}

statsPorAmbulancia[amb].total++

if(h.tipo_mantenimiento === "correctivo"){
statsPorAmbulancia[amb].correctivo++
}

if(h.tipo_mantenimiento === "preventivo"){
statsPorAmbulancia[amb].preventivo++
}

if(h.estado !== "operativa"){
const inicio = new Date(h.fecha_inicio)
const fin = h.fecha_fin ? new Date(h.fecha_fin) : new Date()

const horas = (fin.getTime() - inicio.getTime()) / (1000*60*60)

if(horas > 0) tiempoFueraServicioHoras += horas
}

})

function formatearTiempo(horas:number){
const dias = Math.floor(horas / 24)
const horasRest = Math.floor(horas % 24)
return `${dias} días ${horasRest} horas`
}

return(

<div style={{padding:40,fontFamily:"Arial",background:"white",maxWidth:1000,margin:"auto"}}>

{/* HEADER */}
<div style={{textAlign:"center",marginBottom:30}}>
<h1 style={{margin:0}}>DIRECCION PROVINCIAL DE SALUD DEL GUAYAS</h1>
<h2 style={{margin:0}}>Informe de Estado Operativo de Ambulancias SSM</h2>
<p style={{marginTop:5,color:"#555"}}>
Fecha: {new Date().toLocaleDateString("es-EC")}
</p>
</div>

{/* BOTONES */}
<div style={{marginBottom:20, display:"flex", gap:10}}>
<button onClick={()=>router.push("/dashboard")} style={btnBack}>
← Volver
</button>

<button onClick={imprimir} style={btnPrint}>
🖨 Imprimir / Exportar PDF
</button>
</div>

<hr/>

{/* RESUMEN */}
<h3>Resumen General</h3>

<table style={tabla}>
<tbody>
<tr><td>Total ambulancias</td><td>{total}</td></tr>
<tr><td>Operativas</td><td style={{color:"#16a34a"}}>{operativas}</td></tr>
<tr><td>Mantenimiento</td><td style={{color:"#f59e0b"}}>{mantenimiento}</td></tr>
<tr><td>No operativas</td><td style={{color:"#dc2626"}}>{noOperativas}</td></tr>
<tr><td>Disponibilidad</td><td>{disponibilidad}%</td></tr>
</tbody>
</table>

<hr/>

{/* MSP */}
<h3>Indicadores Técnicos MSP</h3>

<div style={{display:"flex",flexWrap:"wrap",gap:20}}>

<div style={card}>
<h4>Tiempo fuera de servicio</h4>
<p>{formatearTiempo(tiempoFueraServicioHoras)}</p>
</div>

<div style={card}>
<h4>Mantenimiento por ambulancia</h4>

<div style={{
display:"grid",
gridTemplateColumns:"repeat(auto-fill, minmax(200px,1fr))",
gap:10,
marginTop:10
}}>

{Object.entries(statsPorAmbulancia).map(([id,stat]:any)=>{

const amb = ambulancias.find(a=>String(a.id)===String(id))

const total = stat.total || 1
const pCorrectivo = Math.round((stat.correctivo / total) * 100)
const pPreventivo = Math.round((stat.preventivo / total) * 100)

return(
<div key={id} style={{
border:"1px solid #e5e7eb",
borderRadius:8,
padding:10,
background:"#fff"
}}>

<p style={{margin:0,fontWeight:"bold"}}>
{amb?.codigo_operativo || id}
</p>

<p style={{margin:0,fontSize:12,color:"#555"}}>
{stat.total} intervenciones
</p>

<p style={{margin:0,fontSize:12}}>
🔧 {stat.correctivo} ({pCorrectivo}%)
</p>

<p style={{margin:0,fontSize:12}}>
🛠 {stat.preventivo} ({pPreventivo}%)
</p>

</div>
)
})}

</div>

</div>

</div>

<hr/>

{/* DETALLE */}
<h3>Detalle de Flota</h3>

<table style={tabla}>
<thead>
<tr style={{background:"#f3f4f6"}}>
<th style={th}>Código</th>
<th style={th}>Placa</th>
<th style={th}>Tipo</th>
<th style={th}>Estado</th>
<th style={th}>Kilometraje</th>
</tr>
</thead>

<tbody>

{ambulancias.map(a=>{

const eventos = historial.filter(h=>String(h.ambulancia_id) === String(a.id))

return(
<>
<tr key={a.id} style={{borderBottom:"1px solid #ddd"}}>
<td style={td}>{a.codigo_operativo}</td>
<td style={td}>{a.placa}</td>
<td style={td}>{a.tipo}</td>
<td style={{...td,color:colorEstado(a.estado)}}>{a.estado}</td>
<td style={td}>{a.kilometraje_actual || 0}</td>
</tr>

<tr>
<td colSpan={5} style={{background:"#f9fafb",padding:10}}>

<table style={{width:"100%"}}>
<thead>
<tr style={{fontSize:12,color:"#555"}}>
<th>Fecha</th>
<th>Estado</th>
<th>Tipo</th>
<th>Área</th>
<th>Motivo</th>
<th>Tiempo</th>
<th>Foto</th>
</tr>
</thead>

<tbody>

{eventos.map(h=>(
<tr key={h.id}>
<td style={{fontSize:12}}>{new Date(h.fecha_inicio).toLocaleString("es-EC")}</td>
<td style={{color:colorEstado(h.estado),fontSize:12}}>{h.estado}</td>
<td style={{fontSize:12}}>{h.tipo_mantenimiento || "-"}</td>
<td style={{fontSize:12}}>{formatearArea(h.area)}</td>
<td style={{fontSize:12}}>{h.motivo || "-"}</td>
<td style={{fontSize:12}}>{calcularTiempo(h.fecha_inicio,h.fecha_fin)}</td>

<td>
{h.foto_url ? (
<img src={h.foto_url} style={{width:50,height:50,objectFit:"cover",borderRadius:6,border:"1px solid #ddd"}}/>
) : (
<span style={{fontSize:12,color:"#999"}}>-</span>
)}
</td>

</tr>
))}

</tbody>
</table>

</td>
</tr>
</>
)
})}

</tbody>
</table>

<hr/>

<div style={{marginTop:60,textAlign:"center"}}>
<p>_____________________________________</p>
<p style={{margin:0}}>Responsable del Sistema</p>
<p style={{fontSize:12,color:"#666"}}>Sistema de Control de Ambulancias</p>
</div>

</div>
)
}

/* ESTILOS */
const tabla: React.CSSProperties = {
width:"100%",
borderCollapse:"collapse",
marginTop:10
}

const th: React.CSSProperties = {
padding:10,
border:"1px solid #ddd",
textAlign:"left"
}

const td: React.CSSProperties = {
padding:10,
border:"1px solid #ddd"
}

const btnPrint: React.CSSProperties = {
background:"#0f766e",
color:"white",
padding:10,
borderRadius:6
}

const btnBack: React.CSSProperties = {
background:"#374151",
color:"white",
padding:10,
borderRadius:6
}

const card: React.CSSProperties = {
border:"1px solid #ddd",
borderRadius:10,
padding:15,
minWidth:250,
background:"#f9fafb"
}