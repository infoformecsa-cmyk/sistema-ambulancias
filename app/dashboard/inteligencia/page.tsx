"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"

export default function Inteligencia(){

const router = useRouter()

const [loading,setLoading] = useState(true)
const [alertas,setAlertas] = useState<any[]>([])
const [ranking,setRanking] = useState<any[]>([])
const [recurrentes,setRecurrentes] = useState<any[]>([])

/* ========================= */

useEffect(()=>{
cargar()
},[])

async function cargar(){

const { data } = await supabase
.from("historial_operativo")
.select(`
*,
ambulancias (codigo_operativo)
`)
.order("fecha_inicio",{ascending:false})

procesar(data || [])
setLoading(false)
}

/* ========================= */

function procesar(lista:any[]){

const hoy = new Date()
const hace30 = new Date()
hace30.setDate(hoy.getDate() - 30)

const recientes = lista.filter(i=>{
const f = new Date(i.fecha_inicio)
return f >= hace30
})

let registros:any[] = []

recientes.forEach(r=>{
if(Array.isArray(r.area)){
r.area.forEach((a:string)=>{
if(!a) return
registros.push({...r, area_individual:a})
})
}else if(r.area){
registros.push({...r, area_individual:r.area})
}
})

/* ================= ALERTAS ================= */

const mapaAlertas:any = {}

registros.forEach(r=>{
const key = `${r.ambulancia_id}-${r.area_individual}`

if(!mapaAlertas[key]){
mapaAlertas[key] = {
codigo:r.ambulancias?.codigo_operativo || r.ambulancia_id,
area:r.area_individual,
count:0
}
}

mapaAlertas[key].count++
})

setAlertas(
Object.values(mapaAlertas)
.filter((a:any)=>a.count >= 3)
.sort((a:any,b:any)=>b.count - a.count)
)

/* ================= RANKING ================= */

const mapaRanking:any = {}

registros.forEach(r=>{
if(!r.area_individual) return
mapaRanking[r.area_individual] = (mapaRanking[r.area_individual] || 0) + 1
})

const total = registros.length || 1

setRanking(
Object.keys(mapaRanking).map(area=>({
area,
valor: mapaRanking[area],
porcentaje: Math.round((mapaRanking[area]/total)*100)
}))
.sort((a,b)=>b.valor - a.valor)
)

/* ================= RECURRENTES ================= */

const mapaRec:any = {}

registros.forEach(r=>{
const key = r.ambulancias?.codigo_operativo || r.ambulancia_id

if(!mapaRec[key]){
mapaRec[key] = { codigo:key, total:0 }
}

mapaRec[key].total++
})

setRecurrentes(
Object.values(mapaRec).sort((a:any,b:any)=>b.total - a.total)
)

}

/* ================= UI ================= */

if(loading){
return <div style={container}>Cargando...</div>
}

return(

<div style={container}>

<h1 style={title}>🧠 Inteligencia Operativa</h1>

{/* ALERTAS */}
<div style={cardRed}>
<h3>🚨 Alertas críticas</h3>

{alertas.length === 0
? <p>Sin alertas</p>
: alertas.slice(0,5).map((a,i)=>(
<div key={i} style={alertItem}>
🚑 {a.codigo} — {a.area} ({a.count})
</div>
))
}

</div>

{/* TOP AMBULANCIAS */}
<div style={card}>
<h3>🚑 Unidades con más fallas</h3>

{recurrentes.slice(0,8).map((r:any,i)=>(
<div key={i} style={row}>
<span>{r.codigo}</span>
<span>{r.total}</span>
</div>
))}

</div>

{/* RANKING VISUAL */}
<div style={card}>
<h3>📊 Distribución de fallas</h3>

{ranking.map((r,i)=>(
<div key={i} style={{marginBottom:10}}>

<div style={row}>
<span>{r.area}</span>
<span>{r.porcentaje}%</span>
</div>

<div style={barBg}>
<div style={{...barFill,width:`${r.porcentaje}%`}}/>
</div>

</div>
))}

</div>

<button onClick={()=>router.push("/dashboard")} style={btnBack}>
⬅ Volver
</button>

</div>
)
}

/* ================= ESTILOS ================= */

const container = {
background:"#020617",
color:"white",
minHeight:"100vh",
padding:30
}

const title = {
fontSize:28,
marginBottom:20
}

const card = {
background:"#0f172a",
padding:20,
borderRadius:12,
marginBottom:20
}

const cardRed = {
background:"#7f1d1d",
padding:20,
borderRadius:12,
marginBottom:20
}

const row = {
display:"flex",
justifyContent:"space-between",
marginBottom:5
}

const alertItem = {
padding:8,
background:"#991b1b",
borderRadius:6,
marginTop:5
}

const barBg = {
height:8,
background:"#1e293b",
borderRadius:10
}

const barFill = {
height:8,
background:"#22c55e",
borderRadius:10
}

const btnBack = {
marginTop:20,
background:"#1e293b",
padding:"10px 15px",
borderRadius:8,
color:"white"
}