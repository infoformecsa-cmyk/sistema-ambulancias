"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { useRouter } from "next/navigation"

export default function InformeFlota() {

const router = useRouter()

const [ambulancias,setAmbulancias] = useState<any[]>([])
const [fallas,setFallas] = useState<any[]>([])
const [historial,setHistorial] = useState<any[]>([])

useEffect(()=>{
cargarDatos()
},[])

async function cargarDatos(){

const {data:amb} = await supabase
.from("ambulancias")
.select("")
.order("codigo_operativo")

const {data:f} = await supabase
.from("reportes_fallas")
.select("")

const {data:h} = await supabase
.from("historial_operativo")
.select("")
.order("fecha_inicio",{ascending:true})

setAmbulancias(amb || [])
setFallas(f || [])
setHistorial(h || [])

}

function calcularDias(inicio:string, fin:string | null){

const fechaInicio = new Date(inicio)

const fechaFin = fin ? new Date(fin) : new Date()

const diff = fechaFin.getTime() - fechaInicio.getTime()

return Math.floor(diff / (1000606024))

}

/* RESUMEN FLOTA /

const operativas = ambulancias.filter(a=>a.estado==="operativa").length
const mantenimiento = ambulancias.filter(a=>a.estado==="mantenimiento").length
const fuera = ambulancias.filter(a=>a.estado==="no operativa").length

const total = ambulancias.length

const disponibilidad =
total>0 ? ((operativas/total)100).toFixed(1) : 0

return(

<div style={{padding:40,fontFamily:"Arial"}}>

<h1>Informe General de Flota</h1>

<button onClick={()=>router.push("/dashboard")}>
← Volver
</button>

<button onClick={()=>window.print()} style={{marginLeft:10}}>
Imprimir Informe
</button>

<hr/>

<h2>Resumen Operativo</h2>

<p>Total ambulancias: {total}</p>
<p>Operativas: {operativas}</p>
<p>Mantenimiento: {mantenimiento}</p>
<p>No operativas: {fuera}</p>

<p><b>Disponibilidad de flota: {disponibilidad}%</b></p>

<hr/>

<h2>Detalle de Flota</h2>

{ambulancias.map(a=>{

/ FALLAS /

const fallasAmb =
fallas.filter(f => String(f.ambulancia_id) === String(a.id))

/ HISTORIAL /

const historialAmb =
historial.filter(h => String(h.ambulancia_id) === String(a.id))

/ DIAS FUERA /

let diasFuera = 0

historialAmb.forEach(h => {

if(h.fecha_inicio){
diasFuera += calcularDias(h.fecha_inicio,h.fecha_fin)
}

})

/ INDICADORES /

const hoy = new Date()

let primerRegistro = hoy

if(historialAmb.length > 0 && historialAmb[0].fecha_inicio){

primerRegistro = new Date(historialAmb[0].fecha_inicio)

}

const diasTotales =
Math.floor((hoy.getTime() - primerRegistro.getTime())/(10006060*24))

const diasOperativos =
diasTotales - diasFuera

const disponibilidadUnidad =
diasTotales > 0
? Math.round((diasOperativos/diasTotales)*100)
: 100

return(

<div key={a.id} style={{marginBottom:50}}>

<h3>{a.codigo_operativo} | {a.placa}</h3>

<table border={1} cellPadding={8} style={{borderCollapse:"collapse",width:"100%"}}>

<thead>
<tr>
<th>Estado</th>
<th>Tipo</th>
<th>KM</th>
<th>Próx Mtto</th>
</tr>
</thead>

<tbody>

<tr>
<td>{a.estado}</td>
<td>{a.tipo}</td>
<td>{a.kilometraje_actual || "-"}</td>
<td>{a.kilometraje_mtto || "-"}</td>
</tr>

</tbody>

</table>

<br/>

<h4>Indicadores de Operatividad</h4>

<table border={1} cellPadding={6} style={{borderCollapse:"collapse",width:"100%"}}>

<thead>

<tr>
<th>Disponibilidad</th>
<th>Días operativos</th>
<th>Días fuera de servicio</th>
<th>Fallas registradas</th>
</tr>

</thead>

<tbody>

<tr>

<td>{disponibilidadUnidad}%</td>
<td>{diasOperativos < 0 ? 0 : diasOperativos}</td>
<td>{diasFuera}</td>
<td>{fallasAmb.length}</td>

</tr>

</tbody>

</table>

<br/>

<h4>Historial de fallas</h4>

<table border={1} cellPadding={6} style={{borderCollapse:"collapse",width:"100%"}}>

<thead>

<tr>
<th>Fecha</th>
<th>Descripción</th>
<th>Criticidad</th>
<th>Estado</th>
</tr>

</thead>

<tbody>

{fallasAmb.length===0 && (
<tr><td colSpan={4}>Sin registros</td></tr>
)}

{fallasAmb.map(f => (

<tr key={f.id}>

<td>{new Date(f.created_at).toLocaleDateString()}</td>
<td>{f.descripcion}</td>
<td>{f.criticidad}</td>
<td>{f.estado}</td>

</tr>

))}

</tbody>

</table>

<br/>

<h4>Historial Operativo</h4>

<table border={1} cellPadding={6} style={{borderCollapse:"collapse",width:"100%"}}>

<thead>

<tr>
<th>Inicio</th>
<th>Fin</th>
<th>Estado</th>
<th>Motivo</th>
<th>Días fuera de servicio</th>
</tr>

</thead>

<tbody>

{historialAmb.length===0 && (
<tr><td colSpan={5}>Sin registros</td></tr>
)}

{historialAmb.map(h => (

<tr key={h.id}>

<td>{h.fecha_inicio ? new Date(h.fecha_inicio).toLocaleDateString() : "-"}</td>

<td>
{h.fecha_fin
? new Date(h.fecha_fin).toLocaleDateString()
: "En curso"}
</td>

<td>{h.estado}</td>

<td>{h.motivo}</td>

<td>{h.fecha_inicio ? calcularDias(h.fecha_inicio,h.fecha_fin) : "-"}</td>

</tr>

))}

</tbody>

</table>

<hr/>

</div>

)

})}

</div>

)

}