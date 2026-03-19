"use client"

import { useEffect,useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { useRouter } from "next/navigation"

export default function Dashboard(){

const router = useRouter()

const [rol,setRol] = useState("")
const [nombre,setNombre] = useState("")
const [ambulancias,setAmbulancias] = useState<any[]>([])
const [alertas,setAlertas] = useState<any[]>([])
const [historial,setHistorial] = useState<any[]>([])

/* ✅ TIPADO CORRECTO */
const [horasMap,setHorasMap] = useState<Record<string, number>>({})

useEffect(()=>{

const r = localStorage.getItem("rol")
const n = localStorage.getItem("nombre")

if(!r){
router.push("/")
return
}

if(r==="conductor"){
router.push("/conductor")
return
}

setRol(r)
setNombre(n || "")

cargar()

const intervalo=setInterval(()=>{
cargar()
},30000)

return ()=>clearInterval(intervalo)

},[])

/* 🔥 CARGA CENTRALIZADA */
async function cargar(){

const {data:amb} = await supabase
.from("ambulancias")
.select("*")
.order("codigo_operativo")

const {data:alert} = await supabase
.from("reportes_fallas")
.select("*")
.eq("estado","abierta")
.eq("criticidad","critica")

const {data:hist} = await supabase
.from("historial_operativo")
.select("*")

const ambs = amb || []
const histo = hist || []

setAmbulancias(ambs)
setAlertas(alert || [])
setHistorial(histo)

/* 🔥 CALCULO SEGURO */
const mapa: Record<string, number> = {}

ambs.forEach(a=>{

const eventos = histo.filter(h=>String(h.ambulancia_id) === String(a.id))

let total = 0

eventos.forEach(e=>{

if(e.estado === "operativa") return

const inicio = new Date(e.fecha_inicio)
const fin = e.fecha_fin ? new Date(e.fecha_fin) : new Date()

if(isNaN(inicio.getTime())) return
if(isNaN(fin.getTime())) return
if(fin < inicio) return

total += (fin.getTime() - inicio.getTime())

})

mapa[String(a.id)] = Math.floor(total / (1000*60*60))

})

setHorasMap(mapa)

}

/* ===================== */
/* 📊 KPI */
/* ===================== */

const total = ambulancias.length

const operativas = ambulancias.filter(a=>a.estado==="operativa").length
const mantenimiento = ambulancias.filter(a=>a.estado==="mantenimiento").length
const fuera = ambulancias.filter(a=>a.estado==="no operativa").length

const disponibilidad =
total>0 ? Math.round((operativas/total)*100) : 0

/* ✅ TIPADO SEGURO */
const totalHorasFuera = Object.values(horasMap)
.reduce((a, b) => a + (b || 0), 0)

const promedioHoras = total
? Math.round(totalHorasFuera / total)
: 0

/* ===================== */
/* 🏆 RANKING */
/* ===================== */

const ranking = [...ambulancias]
.map(a=>({
...a,
horasFuera: horasMap[String(a.id)] || 0
}))
.sort((a,b)=>b.horasFuera - a.horasFuera)
.slice(0,5)

/* ===================== */
/* 🚑 TIPOS */
/* ===================== */

const alfa = ambulancias.filter(a=>a.tipo==="ALFA")
const bravo = ambulancias.filter(a=>a.tipo==="BRAVO")

const alfaOp = alfa.filter(a=>a.estado==="operativa").length
const alfaNoOp = alfa.length - alfaOp

const bravoOp = bravo.filter(a=>a.estado==="operativa").length
const bravoNoOp = bravo.length - bravoOp

const alfaPct = alfa.length ? Math.round((alfaOp/alfa.length)*100) : 0
const bravoPct = bravo.length ? Math.round((bravoOp/bravo.length)*100) : 0

/* ===================== */
/* 🚨 ALERTAS MTTO */
/* ===================== */

const mttoVencido = ambulancias.filter(a=>{
if(!a.kilometraje_mtto || !a.kilometraje_actual) return false
return a.kilometraje_actual >= a.kilometraje_mtto
})

const mttoProximo = ambulancias.filter(a=>{
if(!a.kilometraje_mtto || !a.kilometraje_actual) return false
const faltan = a.kilometraje_mtto - a.kilometraje_actual
return faltan <= 400 && faltan > 0
})

function cerrarSesion(){
localStorage.clear()
router.push("/")
}

function colorEstado(e:string){
if(e==="operativa") return "#16a34a"
if(e==="mantenimiento") return "#f59e0b"
return "#dc2626"
}

return(

<div style={{padding:30,fontFamily:"Arial"}}>

<h1>🚑 Sistema de Control de Ambulancias</h1>

<p><b>{nombre}</b> | {rol}</p>

<button onClick={cerrarSesion}>Cerrar sesión</button>

<hr/>

{/* ALERTAS */}
{alertas.length>0 && (
<div style={{background:"#fee2e2",padding:20,borderRadius:8}}>
<h3>🚨 Fallas críticas</h3>
{alertas.map(a=>(
<div key={a.id}>{a.descripcion}</div>
))}
</div>
)}

<hr/>

{/* KPI */}
<h2>📊 Estado General</h2>

<div style={{display:"flex",gap:20,flexWrap:"wrap"}}>

<div style={card}><h3>Operativas</h3><h2 style={{color:"#16a34a"}}>{operativas}</h2></div>
<div style={card}><h3>Mantenimiento</h3><h2 style={{color:"#f59e0b"}}>{mantenimiento}</h2></div>
<div style={card}><h3>No operativas</h3><h2 style={{color:"#dc2626"}}>{fuera}</h2></div>
<div style={card}><h3>Disponibilidad</h3><h2>{disponibilidad}%</h2></div>

<div style={card}><h3>Horas fuera</h3><h2>{totalHorasFuera} h</h2></div>
<div style={card}><h3>Promedio</h3><h2>{promedioHoras} h</h2></div>

</div>

<hr/>

{/* RANKING */}
<h2>🏆 Ambulancias más críticas</h2>

<table style={{width:"100%"}}>
<tbody>
{ranking.map(a=>(
<tr key={a.id}>
<td>{a.codigo_operativo}</td>
<td>{horasMap[String(a.id)] || 0} h</td>
</tr>
))}
</tbody>
</table>

<hr/>

{/* TABLA */}
<h2>📋 Flota</h2>

<table style={{width:"100%"}}>

<tbody>
{ambulancias.map(a=>(

<tr key={a.id}>
<td style={{color:colorEstado(a.estado)}}>{a.estado}</td>
<td>{a.codigo_operativo}</td>
<td>{a.placa}</td>
<td>{a.tipo}</td>
<td>{a.kilometraje_actual || 0}</td>
<td>{horasMap[String(a.id)] || 0} h</td>

<td>
<button onClick={()=>router.push(`/ambulancia/${a.id}`)}>Ficha</button>
</td>

</tr>

))}
</tbody>

</table>

</div>

)

}

const card = {
padding:20,
border:"1px solid #ddd",
borderRadius:10,
minWidth:140
}