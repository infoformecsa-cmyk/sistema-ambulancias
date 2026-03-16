"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { useRouter } from "next/navigation"

export default function InformeFlota(){

const router = useRouter()

const [ambulancias,setAmbulancias] = useState<any[]>([])
const [fallas,setFallas] = useState<any[]>([])
const [historial,setHistorial] = useState<any[]>([])
const [loading,setLoading] = useState(true)

useEffect(()=>{
cargarDatos()
},[])

async function cargarDatos(){

const {data:amb} = await supabase
.from("ambulancias")
.select("*")
.order("codigo_operativo")

const {data:f} = await supabase
.from("reportes_fallas")
.select("*")
.order("created_at",{ascending:false})

const {data:h} = await supabase
.from("historial_operativo")
.select("*")
.order("fecha_inicio",{ascending:false})

setAmbulancias(amb || [])
setFallas(f || [])
setHistorial(h || [])

setLoading(false)

}

/* CALCULAR DIAS */

function calcularDias(inicio:string, fin:string | null){

if(!inicio) return 0

const inicioDate = new Date(inicio)
const finDate = fin ? new Date(fin) : new Date()

const diff = finDate.getTime() - inicioDate.getTime()

return Math.floor(diff / (1000*60*60*24))

}

/* RESUMEN FLOTA */

const operativas = ambulancias.filter(a=>a.estado==="operativa").length
const mantenimiento = ambulancias.filter(a=>a.estado==="mantenimiento").length
const fuera = ambulancias.filter(a=>a.estado==="no operativa").length

const total = ambulancias.length

const disponibilidad =
total>0 ? ((operativas/total)*100).toFixed(1) : "0"

if(loading){
return <div style={{padding:40}}>Cargando informe...</div>
}

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

/* FALLAS */

const fallasAmb =
fallas.filter(f => String(f.ambulancia_id) === String(a.id))

/* HISTORIAL DE ESA AMBULANCIA */

const historialAmb =
historial
.filter(h => String(h.ambulancia_id) === String(a.id))
.sort((a,b)=>{

const fa = a.fecha_inicio ? new Date(a.fecha_inicio).getTime() : 0
const fb = b.fecha_inicio ? new Date(b.fecha_inicio).getTime() : 0

return fb-fa

})

/* CALCULAR DIAS FUERA */

let diasFuera = 0

historialAmb.forEach(h=>{

if(h.estado === "mantenimiento" || h.estado === "no operativa"){

diasFuera += calcularDias(h.fecha_inicio,h.fecha_fin)

}

})

/* CALCULAR TIEMPO TOTAL DESDE PRIMER REGISTRO */

let primerRegistro = null

historialAmb.forEach(h=>{

if(h.fecha_inicio){

const fecha = new Date(h.fecha_inicio)

if(!primerRegistro || fecha < primerRegistro){
primerRegistro = fecha
}

}

})

let diasTotales = 0

if(primerRegistro){

const hoy = new Date()

diasTotales = Math.floor(
(hoy.getTime() - primerRegistro.getTime())/(1000*60*60*24)
)

}

/* DIAS OPERATIVOS */

let diasOperativos = diasTotales - diasFuera

if(diasOperativos < 0) diasOperativos = 0

/* DISPONIBILIDAD */

let disponibilidadUnidad = 100

if(diasTotales > 0){

disponibilidadUnidad = Math.round((diasOperativos/diasTotales)*100)

}

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
<td>{diasOperativos}</td>
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

{fallasAmb.length===0 ? (

<tr>
<td colSpan={4}>Sin registros</td>
</tr>

) : (

fallasAmb.map(f => (

<tr key={f.id}>

<td>{f.created_at ? new Date(f.created_at).toLocaleDateString() : "-"}</td>
<td>{f.descripcion}</td>
<td>{f.criticidad}</td>
<td>{f.estado}</td>

</tr>

))

)}

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

{historialAmb.length===0 ? (

<tr>
<td colSpan={5}>Sin registros</td>
</tr>

) : (

historialAmb.map(h => (

<tr key={h.id}>

<td>{h.fecha_inicio ? new Date(h.fecha_inicio).toLocaleDateString() : "-"}</td>

<td>
{h.fecha_fin
? new Date(h.fecha_fin).toLocaleDateString()
: "En curso"}
</td>

<td>{h.estado || "-"}</td>

<td>{h.motivo || "-"}</td>

<td>{calcularDias(h.fecha_inicio,h.fecha_fin)}</td>

</tr>

))

)}

</tbody>

</table>

<hr/>

</div>

)

})}

</div>

)

}