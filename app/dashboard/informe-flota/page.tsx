"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"

export default function InformeFlota(){

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

return(

<div style={{padding:40,fontFamily:"Arial",background:"white"}}>

{/* HEADER MSP */}
<div style={{textAlign:"center",marginBottom:30}}>
<h1>MINISTERIO DE SALUD PÚBLICA</h1>
<h2>Informe de Estado Operativo de Ambulancias</h2>
<p>Fecha: {new Date().toLocaleDateString()}</p>
</div>

{/* BOTÓN */}
<div style={{marginBottom:20}}>
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
<tr><td>Operativas</td><td>{operativas}</td></tr>
<tr><td>Mantenimiento</td><td>{mantenimiento}</td></tr>
<tr><td>No operativas</td><td>{noOperativas}</td></tr>
<tr><td>Disponibilidad</td><td>{disponibilidad}%</td></tr>
</tbody>
</table>

<hr/>

{/* DETALLE */}
<h3>Detalle de Flota</h3>

<table style={tabla}>
<thead>
<tr>
<th>Código</th>
<th>Placa</th>
<th>Tipo</th>
<th>Estado</th>
<th>Kilometraje</th>
</tr>
</thead>

<tbody>

{ambulancias.map(a=>(
<tr key={a.id}>
<td>{a.codigo_operativo}</td>
<td>{a.placa}</td>
<td>{a.tipo}</td>
<td>{a.estado}</td>
<td>{a.kilometraje_actual || 0}</td>
</tr>
))}

</tbody>
</table>

<hr/>

{/* FIRMA */}
<div style={{marginTop:60}}>
<p>______________________________</p>
<p>Responsable del Sistema</p>
</div>

</div>
)
}

/* ESTILOS (TIPADOS CORRECTAMENTE) */
const tabla: React.CSSProperties = {
width:"100%",
borderCollapse:"collapse",
marginTop:10
}

const btnPrint: React.CSSProperties = {
background:"#0f766e",
color:"white",
padding:10,
borderRadius:6
}