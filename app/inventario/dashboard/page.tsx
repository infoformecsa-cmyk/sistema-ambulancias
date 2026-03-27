"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"

export default function DashboardInventario(){

const [data,setData] = useState<any[]>([])
const [loading,setLoading] = useState(true)

/* ========================= */
useEffect(()=>{
cargar()
},[])

/* ========================= */
async function cargar(){

const { data, error } = await supabase
.from("inventario_checklist")
.select(`
cantidad,
tiene,
fecha_caducidad,
inventario_items(nombre,cantidad_base),
ambulancias(codigo_operativo)
`)

if(error){
console.error(error)
setLoading(false)
return
}

setData(data || [])
setLoading(false)
}

/* ========================= */
/* PROCESAMIENTO */
/* ========================= */

const hoy = new Date()

let vencidos = 0
let proximos = 0
let faltantes = 0

const porAmbulancia: Record<string, number> = {}

data.forEach((r:any)=>{

const base = r.inventario_items?.cantidad_base || 0
const amb = r.ambulancias?.codigo_operativo || "Sin código"

/* faltantes */
if(!r.tiene || r.cantidad < base){
faltantes++
porAmbulancia[amb] = (porAmbulancia[amb] || 0) + 1
}

/* fechas */
if(r.fecha_caducidad){
const diff = (new Date(r.fecha_caducidad).getTime() - hoy.getTime())/(1000*60*60*24)

if(diff <= 0){
vencidos++
porAmbulancia[amb] = (porAmbulancia[amb] || 0) + 1
}
else if(diff <= 30){
proximos++
}
}

})

/* ranking */
const ranking = Object.entries(porAmbulancia)
.sort((a,b)=>b[1]-a[1])
.slice(0,5)

/* KPI */
const total = data.length || 1
const salud = Math.max(0, 100 - Math.round((faltantes + vencidos)/total*100))

/* ========================= */
/* UI */
/* ========================= */

return(

<div style={{padding:30,fontFamily:"Arial"}}>

<h1>📊 Dashboard Gerencial de Inventario</h1>

<p style={{color:"#6b7280"}}>
Control estratégico de abastecimiento por ambulancia
</p>

<hr/>

{loading && <p>Cargando...</p>}

/* 🔥 SIN DATOS */
{!loading && data.length === 0 && (
<div style={{
padding:20,
background:"#ecfdf5",
borderRadius:8
}}>
✅ No existen registros de checklist aún

<p style={{color:"#6b7280"}}>
Realice un checklist para comenzar a visualizar indicadores.
</p>
</div>
)}

{/* KPI */}
{data.length > 0 && (
<>
<div style={{display:"flex",gap:20,flexWrap:"wrap"}}>

<div style={card}>
<h3>Estado general</h3>
<h1 style={{
color:salud>80?"#16a34a":salud>50?"#f59e0b":"#dc2626"
}}>
{salud}%
</h1>
</div>

<div style={card}>
<h3>🔴 Vencidos</h3>
<h2 style={{color:"#dc2626"}}>{vencidos}</h2>
</div>

<div style={card}>
<h3>🟡 Próximos</h3>
<h2 style={{color:"#f59e0b"}}>{proximos}</h2>
</div>

<div style={card}>
<h3>⚠️ Faltantes</h3>
<h2 style={{color:"#b91c1c"}}>{faltantes}</h2>
</div>

</div>

<hr/>

{/* RANKING */}
<h2>🚨 Ambulancias con más problemas</h2>

{ranking.length === 0 ? (
<p style={{color:"#6b7280"}}>Sin incidencias registradas</p>
) : (

<table style={{width:"100%",borderCollapse:"collapse"}}>

<thead style={{background:"#111827",color:"white"}}>
<tr>
<th style={th}>Ambulancia</th>
<th style={th}>Incidencias</th>
<th style={th}>Nivel</th>
</tr>
</thead>

<tbody>

{ranking.map(([amb,cant])=>{

let color = "#16a34a"
let label = "Bajo"

if(cant >= 10){
color = "#dc2626"
label = "Crítico"
}else if(cant >= 5){
color = "#f59e0b"
label = "Medio"
}

return(
<tr key={amb} style={{borderBottom:"1px solid #eee"}}>
<td style={td}>{amb}</td>
<td style={td}>{cant}</td>
<td style={td}>
<span style={{
background:color,
color:"white",
padding:"4px 10px",
borderRadius:6
}}>
{label}
</span>
</td>
</tr>
)
})}

</tbody>

</table>

)}

</>
)}

</div>
)
}

/* ========================= */
const card = {
padding:20,
border:"1px solid #ddd",
borderRadius:10,
minWidth:180
}

const th = {
padding:10,
textAlign:"left" as const
}

const td = {
padding:10
}