"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { useRouter } from "next/navigation"

export default function Kilometraje(){

const router = useRouter()

const [registros,setRegistros] = useState<any[]>([])
const [fecha,setFecha] = useState(() => {
const hoy = new Date()
return hoy.toISOString().split("T")[0]
})

useEffect(()=>{
cargar()
},[fecha])

/* ========================= */
/* CARGAR */
/* ========================= */

async function cargar(){

const inicio = new Date(fecha)
inicio.setHours(0,0,0,0)

const fin = new Date(fecha)
fin.setHours(23,59,59,999)

const { data } = await supabase
.from("registro_kilometraje")
.select(`
*,
ambulancias (
codigo_operativo
)
`)
.gte("created_at", inicio.toISOString())
.lte("created_at", fin.toISOString())
.order("created_at",{ascending:false})

setRegistros(data || [])
}

/* ========================= */
/* 🗑 ELIMINAR INDIVIDUAL */
/* ========================= */

async function eliminar(id:string){

if(!confirm("¿Eliminar registro?")) return

await supabase
.from("registro_kilometraje")
.delete()
.eq("id",id)

cargar()
}

/* ========================= */
/* 🧹 LIMPIAR DÍA */
/* ========================= */

async function limpiarDia(){

if(!confirm("⚠️ Eliminar TODOS los registros del día?")) return

const inicio = new Date(fecha + "T00:00:00")
const fin = new Date(fecha + "T23:59:59")

await supabase
.from("registro_kilometraje")
.delete()
.gte("created_at", inicio.toISOString())
.lte("created_at", fin.toISOString())

cargar()
}

/* ========================= */
/* UI */
/* ========================= */

return(

<div style={container}>

{/* HEADER */}
<div style={header}>

<div>
<h1 style={title}>📊 Kilometraje Diario</h1>
<p style={subtitle}>Monitoreo de registros por unidad</p>
</div>

</div>

{/* CONTROLES */}
<div style={controls}>

<input
type="date"
value={fecha}
onChange={(e)=>setFecha(e.target.value)}
style={input}
/>

<button
onClick={()=>setFecha(new Date().toISOString().split("T")[0])}
style={btn}
>
📅 Hoy
</button>

<button
onClick={()=>router.back()}
style={btnSecondary}
>
⬅ Volver
</button>

<button
onClick={limpiarDia}
style={btnDanger}
>
🗑 Limpiar día
</button>

</div>

{/* LISTADO */}

{registros.length === 0 ? (

<div style={empty}>
No hay registros para este día
</div>

) : (

<div style={list}>

{registros.map(r=>(
<div key={r.id} style={row}>

{/* IZQUIERDA */}
<div style={left}>
<div style={ambulancia}>
🚑 {r.ambulancias?.codigo_operativo || r.ambulancia_id}
</div>
</div>

{/* CENTRO */}
<div style={center}>
<div style={km}>
{r.kilometraje} km
</div>
</div>

{/* DERECHA */}
<div style={right}>

<div style={hora}>
🕒 {new Date(r.created_at).toLocaleTimeString("es-EC")}
</div>

<button
onClick={()=>eliminar(r.id)}
style={btnDelete}
>
🗑
</button>

</div>

</div>
))}

</div>

)}

</div>
)
}

/* ========================= */
/* ESTILOS */
/* ========================= */

const container = {
background:"linear-gradient(135deg,#020617,#0f172a)",
minHeight:"100vh",
padding:30,
color:"white",
fontFamily:"Arial"
}

const header = {
marginBottom:20
}

const title = {
fontSize:26,
color:"#22d3ee",
marginBottom:5
}

const subtitle = {
fontSize:13,
color:"#94a3b8"
}

const controls = {
display:"flex",
gap:10,
flexWrap:"wrap" as const,
marginBottom:20
}

const input = {
padding:10,
borderRadius:8,
border:"1px solid #1e293b",
background:"#020617",
color:"white"
}

const btn = {
background:"#06b6d4",
border:"none",
padding:"8px 12px",
borderRadius:8,
color:"#020617",
fontWeight:"bold",
cursor:"pointer"
}

const btnSecondary = {
background:"#1e293b",
border:"none",
padding:"8px 12px",
borderRadius:8,
color:"white",
cursor:"pointer"
}

const btnDanger = {
background:"#dc2626",
border:"none",
padding:"8px 12px",
borderRadius:8,
color:"white",
cursor:"pointer"
}

const list = {
display:"flex",
flexDirection:"column" as const,
gap:10
}

const row = {
display:"flex",
justifyContent:"space-between",
alignItems:"center",
background:"#020617",
padding:15,
borderRadius:12,
border:"1px solid rgba(0,255,255,0.08)",
boxShadow:"0 0 20px rgba(0,255,255,0.03)"
}

const left = {
width:"30%"
}

const center = {
width:"40%",
textAlign:"center" as const
}

const right = {
width:"30%",
display:"flex",
justifyContent:"flex-end",
alignItems:"center",
gap:10
}

const ambulancia = {
fontWeight:"bold",
fontSize:16
}

const km = {
fontSize:18,
fontWeight:"bold",
color:"#22c55e"
}

const hora = {
fontSize:12,
color:"#94a3b8"
}

const btnDelete = {
background:"#7f1d1d",
border:"none",
padding:"6px 10px",
borderRadius:6,
color:"white",
cursor:"pointer"
}

const empty = {
padding:20,
background:"#020617",
borderRadius:10,
border:"1px solid #1e293b"
}