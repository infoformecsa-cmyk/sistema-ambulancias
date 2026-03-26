"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"

type Alerta = {
  id: string
  cantidad: number
  estado: string
  item: string
  ambulancia: string
}

export default function Page(){

const [alertas,setAlertas] = useState<Alerta[]>([])
const [cargando,setCargando] = useState(true)

/* ========================= */
useEffect(()=>{
cargarAlertas()
},[])

/* ========================= */
async function cargarAlertas(){

try{

const { data, error } = await supabase
.from("inventario_checklist")
.select(`
id,
cantidad,
tiene,
fecha_caducidad,
inventario_items(nombre,cantidad_base),
ambulancias(codigo_operativo)
`)
.order("created_at",{ascending:false})

if(error){
console.error(error)
setCargando(false)
return
}

if(!data){
setCargando(false)
return
}

/* 🔥 PROCESAR ALERTAS */
const hoy = new Date()

const resultado: Alerta[] = data.map((r:any)=>{

const fecha = r.fecha_caducidad ? new Date(r.fecha_caducidad) : null
const diff = fecha ? (fecha.getTime() - hoy.getTime())/(1000*60*60*24) : null

let estado = "ok"

if(!r.tiene || r.cantidad < (r.inventario_items?.cantidad_base || 0)){
estado = "faltante"
}

if(diff !== null){
if(diff <= 0) estado = "vencido"
else if(diff <= 30) estado = "proximo"
}

return {
id: r.id,
cantidad: r.cantidad || 0,
estado,
item: r.inventario_items?.nombre || "-",
ambulancia: r.ambulancias?.codigo_operativo || "-"
}

})

setAlertas(resultado)

}catch(e){
console.error("Error cargando alertas:", e)
}

setCargando(false)
}

/* ========================= */
/* COLOR ALERTA */
/* ========================= */
function colorEstado(e:string){

if(e==="vencido") return "#dc2626"
if(e==="proximo") return "#f59e0b"
if(e==="faltante") return "#b91c1c"
return "#16a34a"

}

/* ========================= */
/* UI */
/* ========================= */

return(

<div style={{padding:30,fontFamily:"Arial"}}>

<h1>🚨 Panel de Alertas de Inventario</h1>

<p style={{color:"#6b7280"}}>
Control de medicamentos, insumos y equipos por ambulancia
</p>

<hr/>

{cargando && <p>Cargando...</p>}

{!cargando && alertas.length === 0 && (
<p>No hay alertas registradas</p>
)}

{!cargando && alertas.length > 0 && (

<table style={{width:"100%",borderCollapse:"collapse",marginTop:20}}>

<thead style={{background:"#111827",color:"white"}}>
<tr>
<th style={th}>Ambulancia</th>
<th style={th}>Item</th>
<th style={th}>Cantidad</th>
<th style={th}>Estado</th>
</tr>
</thead>

<tbody>

{alertas.map((a)=>(
<tr key={a.id} style={{borderBottom:"1px solid #ddd"}}>

<td style={td}>{a.ambulancia}</td>
<td style={td}>{a.item}</td>
<td style={td}>{a.cantidad}</td>

<td style={td}>
<span style={{
background:colorEstado(a.estado),
color:"white",
padding:"5px 10px",
borderRadius:6
}}>
{a.estado}
</span>
</td>

</tr>
))}

</tbody>

</table>

)}

</div>
)
}

/* ========================= */
/* ESTILOS */
/* ========================= */

const th: React.CSSProperties = {
padding:10,
textAlign:"left"
}

const td: React.CSSProperties = {
padding:10
}