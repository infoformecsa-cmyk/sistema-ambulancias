"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"

export default function Inteligencia(){

const router = useRouter()

const [data,setData] = useState<any[]>([])
const [loading,setLoading] = useState(true)

/* ========================= */
/* CARGA */
/* ========================= */

useEffect(()=>{
cargar()
},[])

async function cargar(){

const { data } = await supabase
.from("historial_operativo")
.select(`
*,
ambulancias (
  codigo_operativo
)
`)
.order("fecha_inicio",{ascending:false})

procesar(data || [])
setLoading(false)
}

/* ========================= */
/* PROCESAMIENTO */
/* ========================= */

const [alertas,setAlertas] = useState<any[]>([])
const [ranking,setRanking] = useState<any[]>([])
const [recurrentes,setRecurrentes] = useState<any[]>([])

function procesar(lista:any[]){

const hoy = new Date()
const hace30 = new Date()
hace30.setDate(hoy.getDate() - 30)

/* SOLO ÚLTIMOS 30 DÍAS */
const recientes = lista.filter(i=>{
const f = new Date(i.fecha_inicio)
return f >= hace30
})

/* ========================= */
/* 🔥 NORMALIZAR AREAS */
/* ========================= */

let registros:any[] = []

recientes.forEach(r=>{
if(Array.isArray(r.area)){
r.area.forEach((a:string)=>{
if(!a) return
registros.push({
...r,
area_individual:a,
ambulancias:r.ambulancias
})
})
}else if(r.area){
registros.push({
...r,
area_individual:r.area,
ambulancias:r.ambulancias
})
}
})

/* ========================= */
/* 🚨 ALERTAS */
/* ========================= */

const mapaAlertas:any = {}

registros.forEach(r=>{
const key = `${r.ambulancia_id}-${r.area_individual}`

if(!mapaAlertas[key]){
mapaAlertas[key] = {
ambulancia_id:r.ambulancia_id,
ambulancias:r.ambulancias,
area:r.area_individual,
count:0
}
}

mapaAlertas[key].count++
})

const alertasFinal = Object.values(mapaAlertas)
.filter((a:any)=>a.count >= 3)

setAlertas(alertasFinal)

/* ========================= */
/* 📊 RANKING */
/* ========================= */

const mapaRanking:any = {}

registros.forEach(r=>{
if(!r.area_individual) return

if(!mapaRanking[r.area_individual]){
mapaRanking[r.area_individual] = 0
}
mapaRanking[r.area_individual]++
})

const total = registros.length || 1

const rankingFinal = Object.keys(mapaRanking).map(area=>({
area,
porcentaje: Math.round((mapaRanking[area]/total)*100)
}))
.sort((a,b)=>b.porcentaje - a.porcentaje)

setRanking(rankingFinal)

/* ========================= */
/* 🔁 RECURRENTES */
/* ========================= */

const mapaRec:any = {}

registros.forEach(r=>{
const key = r.ambulancia_id

if(!mapaRec[key]){
mapaRec[key] = {
ambulancia_id:r.ambulancia_id,
ambulancias:r.ambulancias,
areas:{}
}
}

if(!mapaRec[key].areas[r.area_individual]){
mapaRec[key].areas[r.area_individual] = 0
}

mapaRec[key].areas[r.area_individual]++
})

setRecurrentes(Object.values(mapaRec))

}

/* ========================= */
/* UI */
/* ========================= */

if(loading){
return <div style={container}>Cargando...</div>
}

return(

<div style={container}>

<h1>🧠 Inteligencia de mantenimiento</h1>

<p style={{opacity:0.7,marginBottom:20}}>
Análisis automático de fallas en los últimos 30 días
</p>

{/* 🚨 ALERTAS */}
<div style={card}>
<h3>🚨 Alertas</h3>

{alertas.length === 0 && <p>Sin alertas</p>}

{alertas.map((a,i)=>(
<div key={i}>
🚑 {a.ambulancias?.codigo_operativo || a.ambulancia_id} → {a.area} ({a.count} fallas)
</div>
))}

</div>

{/* 📊 RANKING */}
<div style={card}>
<h3>📊 Ranking de problemas</h3>

{ranking.map((r,i)=>(
<div key={i}>
{r.area} → {r.porcentaje}%
</div>
))}

</div>

{/* 🔁 RECURRENTES */}
<div style={card}>
<h3>🔁 Fallas por ambulancia</h3>

{recurrentes.map((r:any,i)=>(
<div key={i} style={{marginBottom:10}}>
<b>🚑 {r.ambulancias?.codigo_operativo || r.ambulancia_id}</b>

{Object.entries(r.areas).map(([area,count]:any)=>(
<div key={area}>
- {area} → {count}
</div>
))}

</div>
))}

</div>

<button
onClick={()=>router.push("/dashboard")}
style={btnBack}
>
⬅ Volver
</button>

</div>
)
}

/* ========================= */
/* ESTILOS */
/* ========================= */

const container = {
background:"#020617",
color:"white",
minHeight:"100vh",
padding:30
}

const card = {
background:"#0f172a",
padding:15,
borderRadius:10,
marginBottom:20
}

const btnBack = {
marginTop:20,
background:"#1e293b",
padding:"10px 15px",
borderRadius:8,
color:"white"
}