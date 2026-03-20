"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { useRouter } from "next/navigation"

export default function InformeFlota(){

const router = useRouter()

const [ambulancias,setAmbulancias] = useState<any[]>([])

useEffect(()=>{
cargar()
},[])

async function cargar(){
const {data} = await supabase
.from("ambulancias")
.select("*")
.order("codigo_operativo")

setAmbulancias(data || [])
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

return(

<div style={{padding:40,fontFamily:"Arial",background:"white",maxWidth:1000,margin:"auto"}}>

{/* HEADER MSP */}
<div style={{textAlign:"center",marginBottom:30}}>
<h1 style={{margin:0}}>MINISTERIO DE SALUD PÚBLICA</h1>
<h2 style={{margin:0}}>Informe de Estado Operativo de Ambulancias</h2>
<p style={{marginTop:5,color:"#555"}}>
Fecha: {new Date().toLocaleDateString()}
</p>
</div>

{/* BOTONES */}
<div style={{marginBottom:20, display:"flex", gap:10}}>

<button 
onClick={()=>router.push("/dashboard")}
style={btnBack}
>
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

{ambulancias.map(a=>(
<tr key={a.id} style={{borderBottom:"1px solid #ddd"}}>
<td style={td}>{a.codigo_operativo}</td>
<td style={td}>{a.placa}</td>
<td style={td}>{a.tipo}</td>
<td style={{...td,color:colorEstado(a.estado)}}>{a.estado}</td>
<td style={td}>{a.kilometraje_actual || 0}</td>
</tr>
))}

</tbody>
</table>

<hr/>

{/* FIRMA */}
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