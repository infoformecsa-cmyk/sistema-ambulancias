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
const [historial,setHistorial] = useState<any[]>([]) // 🔥 NUEVO

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

setAmbulancias(amb || [])
setAlertas(alert || [])
setHistorial(hist || [])

}

/* ===================== */
/* 🧠 HORAS FUERA SERVICIO */
/* ===================== */

function calcularHorasFuera(id:string){

const eventos = historial.filter(h=>String(h.ambulancia_id) === String(id))

let total = 0

eventos.forEach(e=>{

if(e.estado === "operativa") return

const inicio = new Date(e.fecha_inicio)
const fin = e.fecha_fin ? new Date(e.fecha_fin) : new Date()

if(fin < inicio) return

total += (fin.getTime() - inicio.getTime())

})

return Math.floor(total / (1000*60*60))
}

/* ===================== */
/* 🏆 RANKING */
/* ===================== */

const ranking = ambulancias.map(a=>({
...a,
horasFuera: calcularHorasFuera(a.id)
}))
.sort((a,b)=>b.horasFuera - a.horasFuera)
.slice(0,5)

/* ===================== */
/* 📊 KPI NUEVOS */
/* ===================== */

const totalHorasFuera = ambulancias.reduce((acc,a)=>{
return acc + calcularHorasFuera(a.id)
},0)

const promedioHoras = ambulancias.length
? Math.round(totalHorasFuera / ambulancias.length)
: 0

/* ===================== */
/* 📊 GENERALES */
/* ===================== */

const total = ambulancias.length

const operativas = ambulancias.filter(a=>a.estado==="operativa").length
const mantenimiento = ambulancias.filter(a=>a.estado==="mantenimiento").length
const fuera = ambulancias.filter(a=>a.estado==="no operativa").length

const disponibilidad =
total>0 ? Math.round((operativas/total)*100) : 0

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

<button onClick={cerrarSesion}>
Cerrar sesión
</button>

<hr/>

{/* ===================== */
/* 🚨 ALERTAS */
/* ===================== */}

{alertas.length>0 && (
<div style={{background:"#fee2e2",padding:20,borderRadius:8,marginBottom:20}}>
<h3>🚨 Fallas críticas</h3>
{alertas.map(a=>(
<div key={a.id}>
<b>ID {a.ambulancia_id}:</b> {a.descripcion}
</div>
))}
</div>
)}

{mttoVencido.length>0 && (
<div style={{background:"#fecaca",padding:20,borderRadius:8,marginBottom:20}}>
<h3>🚨 Mantenimiento vencido</h3>
{mttoVencido.map(a=>(
<div key={a.id}>{a.codigo_operativo}</div>
))}
</div>
)}

{mttoProximo.length>0 && (
<div style={{background:"#fef9c3",padding:20,borderRadius:8,marginBottom:20}}>
<h3>⚠️ Mantenimiento próximo</h3>
{mttoProximo.map(a=>{
const faltan = a.kilometraje_mtto - a.kilometraje_actual
return <div key={a.id}>{a.codigo_operativo} → {faltan} km</div>
})}
</div>
)}

{/* ===================== */
/* 📊 KPI */
/* ===================== */}

<h2>📊 Estado General</h2>

<div style={{display:"flex",gap:20,flexWrap:"wrap"}}>

<div style={{padding:20,border:"1px solid #ddd",borderRadius:10}}>
<h3>Operativas</h3>
<h2 style={{color:"#16a34a"}}>{operativas}</h2>
</div>

<div style={{padding:20,border:"1px solid #ddd",borderRadius:10}}>
<h3>Mantenimiento</h3>
<h2 style={{color:"#f59e0b"}}>{mantenimiento}</h2>
</div>

<div style={{padding:20,border:"1px solid #ddd",borderRadius:10}}>
<h3>No operativas</h3>
<h2 style={{color:"#dc2626"}}>{fuera}</h2>
</div>

<div style={{padding:20,border:"1px solid #ddd",borderRadius:10}}>
<h3>Disponibilidad</h3>
<h2>{disponibilidad}%</h2>
</div>

{/* 🔥 NUEVOS KPI */}

<div style={{padding:20,border:"1px solid #ddd",borderRadius:10}}>
<h3>Horas fuera servicio</h3>
<h2>{totalHorasFuera} h</h2>
</div>

<div style={{padding:20,border:"1px solid #ddd",borderRadius:10}}>
<h3>Promedio por ambulancia</h3>
<h2>{promedioHoras} h</h2>
</div>

</div>

<hr/>

{/* ===================== */
/* 🏆 RANKING */
/* ===================== */}

<h2>🏆 Ambulancias más críticas</h2>

<table style={{width:"100%",marginBottom:20}}>
<thead>
<tr>
<th>Unidad</th>
<th>Horas fuera</th>
</tr>
</thead>

<tbody>

{ranking.map(a=>(
<tr key={a.id}>
<td>{a.codigo_operativo}</td>
<td>{a.horasFuera} h</td>
</tr>
))}

</tbody>
</table>

<hr/>

{/* ===================== */
/* 🚑 ALFA / BRAVO */
/* ===================== */}

<h2>🚑 Distribución por tipo</h2>

<div style={{display:"flex",gap:30}}>

<div style={{flex:1}}>
<h3>ALFA</h3>
<p>Operativas: {alfaOp} ({alfaPct}%)</p>
<p>No operativas: {alfaNoOp}</p>
</div>

<div style={{flex:1}}>
<h3>BRAVO</h3>
<p>Operativas: {bravoOp} ({bravoPct}%)</p>
<p>No operativas: {bravoNoOp}</p>
</div>

</div>

<hr/>

{/* ===================== */
/* 📋 TABLA */
/* ===================== */}

<h2>📋 Flota</h2>

<table style={{width:"100%",borderCollapse:"collapse"}}>

<thead>
<tr style={{background:"#f3f4f6"}}>
<th>Estado</th>
<th>Código</th>
<th>Placa</th>
<th>Tipo</th>
<th>KM</th>
<th>Horas fuera</th>
<th>Acciones</th>
</tr>
</thead>

<tbody>

{ambulancias.map(a=>(

<tr key={a.id} style={{borderBottom:"1px solid #ddd"}}>

<td style={{color:colorEstado(a.estado)}}>
{a.estado}
</td>

<td>{a.codigo_operativo}</td>
<td>{a.placa}</td>
<td>{a.tipo}</td>
<td>{a.kilometraje_actual || 0}</td>
<td>{calcularHorasFuera(a.id)} h</td>

<td>

<button onClick={()=>router.push(`/ambulancia/${a.id}`)}>
Ficha
</button>

{rol==="admin" && (
<>
<button onClick={()=>router.push(`/ambulancia/editar/${a.id}`)}>
Editar
</button>

<button onClick={()=>router.push(`/dashboard/historial?ambulancia=${a.id}`)}>
Historial
</button>
</>
)}

</td>

</tr>

))}

</tbody>

</table>

</div>

)

}