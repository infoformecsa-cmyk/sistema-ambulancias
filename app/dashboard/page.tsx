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

setAmbulancias(amb || [])
setAlertas(alert || [])

}

function cerrarSesion(){
localStorage.clear()
router.push("/")
}

function colorEstado(e:string){
if(e==="operativa") return "#16a34a"
if(e==="mantenimiento") return "#f59e0b"
return "#dc2626"
}

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

</div>

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