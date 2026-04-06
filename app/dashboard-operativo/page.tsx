"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"

export default function DashboardOperativo(){

const [data,setData] = useState<any[]>([])
const [alertas,setAlertas] = useState<any[]>([])
const [archivos,setArchivos] = useState<any[]>([])

useEffect(()=>{
cargar()
},[])

async function cargar(){

const { data:personal } = await supabase
.from("dashboard_total")
.select("*")

const { data:alert } = await supabase
.from("alertas_operativas")
.select("*")

const { data:docs } = await supabase
.from("dashboard_archivos")
.select("*")
.limit(20)

setData(personal || [])
setAlertas(alert || [])
setArchivos(docs || [])

}

return(

<div style={container}>

<h1>🚑 Centro de Control Operativo</h1>

{/* KPIs */}
<div style={kpis}>
<div style={card}>👨‍⚕️ {data.length} Personal</div>
<div style={card}>🚨 {alertas.length} Alertas</div>
<div style={card}>📂 {archivos.length} Archivos</div>
</div>

{/* TABLA PERSONAL */}
<div style={panel}>
<h2>Personal en Operación</h2>

{data.map(p=>(
<div key={p.id} style={fila}>

<span>{p.nombre}</span>
<span>{p.guardia}</span>
<span>{p.alfa_codigo || "SIN UNIDAD"}</span>

<span style={{
color: p.estado_personal === "ACTIVO" ? "#22c55e" : "#ef4444"
}}>
{p.estado_personal}
</span>

</div>
))}

</div>

{/* ALERTAS */}
<div style={panelAlertas}>
<h2>🚨 Alertas</h2>

{alertas.map(a=>(
<div key={a.id} style={alerta}>
{a.nombre} - {a.estado_personal}
</div>
))}

</div>

{/* DOCUMENTOS */}
<div style={panel}>
<h2>📂 Documentos</h2>

{archivos.map(a=>(
<div key={a.nombre_archivo} style={fila}>
<span>{a.nombre_archivo}</span>
<span>{a.tipo}</span>
<span>{a.fecha}</span>
</div>
))}

</div>

</div>
)
}

/* 🎨 ESTILOS */

const container = {
background:"#020617",
color:"white",
minHeight:"100vh",
padding:20
}

const kpis = {
display:"flex",
gap:10,
marginBottom:20
}

const card = {
background:"#111827",
padding:15,
borderRadius:10
}

const panel = {
background:"#111827",
padding:15,
borderRadius:10,
marginBottom:20
}

const panelAlertas = {
background:"#7f1d1d",
padding:15,
borderRadius:10,
marginBottom:20
}

const fila = {
display:"flex",
justifyContent:"space-between",
padding:10,
borderBottom:"1px solid #1f2937"
}

const alerta = {
padding:10,
borderBottom:"1px solid #991b1b"
}