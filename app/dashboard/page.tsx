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

cargarAmbulancias()
cargarAlertas()

const intervalo=setInterval(()=>{
cargarAmbulancias()
cargarAlertas()
},30000)

return ()=>clearInterval(intervalo)

},[])

async function cargarAmbulancias(){

try{

const {data,error} = await supabase
.from("ambulancias")
.select("*")
.order("codigo_operativo")

if(error){
console.log("Error ambulancias:",error)
return
}

if(data) setAmbulancias(data)

}catch(e){

console.log("Error carga ambulancias",e)

}

}

async function cargarAlertas(){

try{

const {data,error}=await supabase
.from("reportes_fallas")
.select("*")
.eq("estado","abierta")
.eq("criticidad","critica")

if(error){
console.log("Error alertas:",error)
return
}

if(data) setAlertas(data)

}catch(e){

console.log("Error alertas",e)

}

}

function cerrarSesion(){

localStorage.clear()
router.push("/")

}

function colorEstado(e:string){

if(e==="operativa") return "green"
if(e==="mantenimiento") return "orange"
return "red"

}

/* ESTADISTICAS GENERALES */

const operativas = ambulancias.filter(a=>a.estado==="operativa").length
const mantenimiento = ambulancias.filter(a=>a.estado==="mantenimiento").length
const fuera = ambulancias.filter(a=>a.estado==="no operativa").length

const total = ambulancias.length

const operatividad =
total>0 ? Math.round((operativas/total)*100) : 0

const disponibilidadReal =
total>0 ? ((operativas/total)*100).toFixed(1) : 0

/* ALERTAS DE MANTENIMIENTO */

const mantenimientoProximo = ambulancias.filter(a=>{

if(!a.kilometraje_mtto || !a.kilometraje_actual) return false

const faltan = a.kilometraje_mtto - a.kilometraje_actual

return faltan <= 1000 && faltan > 0

})

const mantenimientoVencido = ambulancias.filter(a=>{

if(!a.kilometraje_mtto || !a.kilometraje_actual) return false

return a.kilometraje_actual >= a.kilometraje_mtto

})

/* ESTADISTICAS POR TIPO */

const alfa = ambulancias.filter(a=>a.tipo==="ALFA")
const bravo = ambulancias.filter(a=>a.tipo==="BRAVO")

const alfaOperativas = alfa.filter(a=>a.estado==="operativa").length
const alfaNoOperativas = alfa.length - alfaOperativas

const bravoOperativas = bravo.filter(a=>a.estado==="operativa").length
const bravoNoOperativas = bravo.length - bravoOperativas

const alfaPorcentajeOperativas =
alfa.length ? Math.round((alfaOperativas/alfa.length)*100) : 0

const alfaPorcentajeNoOperativas =
alfa.length ? Math.round((alfaNoOperativas/alfa.length)*100) : 0

const bravoPorcentajeOperativas =
bravo.length ? Math.round((bravoOperativas/bravo.length)*100) : 0

const bravoPorcentajeNoOperativas =
bravo.length ? Math.round((bravoNoOperativas/bravo.length)*100) : 0

return(

<div style={{padding:40,fontFamily:"Arial"}}>

<h1>Sistema de Control de Ambulancias</h1>

<p>
Usuario: {nombre} | Rol: {rol}
</p>

<button onClick={cerrarSesion}>
Cerrar sesión
</button>

<hr/>

{/* ALERTAS MECANICAS CRITICAS */}

{alertas.length>0 && (

<div style={{background:"#ffdddd",padding:20,border:"2px solid red",borderRadius:6}}>

<h2>🚨 ALERTAS MECÁNICAS CRÍTICAS</h2>

{alertas.map(a=>(

<div key={a.id} style={{marginBottom:8}}>

<b>Ambulancia ID:</b> {a.ambulancia_id}

<br/>

<b>Problema:</b> {a.descripcion}

</div>

))}

</div>

)}

{/* ALERTAS MANTENIMIENTO */}

{mantenimientoVencido.length>0 && (

<div style={{background:"#ffe0e0",padding:20,border:"2px solid red",borderRadius:6,marginTop:20}}>

<h2>🚨 MANTENIMIENTO VENCIDO</h2>

{mantenimientoVencido.map(a=>(

<div key={a.id}>

<b>{a.codigo_operativo}</b> – Km actual: {a.kilometraje_actual} / Mtto: {a.kilometraje_mtto}

</div>

))}

</div>

)}

{mantenimientoProximo.length>0 && (

<div style={{background:"#fff3cd",padding:20,border:"2px solid orange",borderRadius:6,marginTop:20}}>

<h2>⚠️ MANTENIMIENTO PRÓXIMO</h2>

{mantenimientoProximo.map(a=>{

const faltan = a.kilometraje_mtto - a.kilometraje_actual

return(

<div key={a.id}>

<b>{a.codigo_operativo}</b> – faltan {faltan} km para mantenimiento

</div>

)

})}

</div>

)}

<hr/>

<h2>Panel de Flota</h2>

<div style={{display:"flex",gap:20,flexWrap:"wrap"}}>

<div style={{border:"1px solid black",padding:20}}>
🚑 Operativas
<h2>{operativas}</h2>
</div>

<div style={{border:"1px solid black",padding:20}}>
🔧 Mantenimiento
<h2>{mantenimiento}</h2>
</div>

<div style={{border:"1px solid black",padding:20}}>
⛔ No operativas
<h2>{fuera}</h2>
</div>

<div style={{border:"1px solid black",padding:20}}>
📊 Operatividad
<h2>{operatividad}%</h2>
</div>

<div style={{border:"1px solid black",padding:20}}>
📈 Disponibilidad real
<h2>{disponibilidadReal}%</h2>
</div>

<div style={{border:"1px solid black",padding:20}}>
⚠️ Mtto próximo
<h2>{mantenimientoProximo.length}</h2>
</div>

</div>

<br/>

<h2>Disponibilidad por Tipo</h2>

<div style={{display:"flex",gap:20,flexWrap:"wrap"}}>

<div style={{border:"1px solid black",padding:20}}>
🚑 ALFA Operativas
<h2>{alfaOperativas} - {alfaPorcentajeOperativas}%</h2>
</div>

<div style={{border:"1px solid black",padding:20}}>
⛔ ALFA No Operativas
<h2>{alfaNoOperativas} - {alfaPorcentajeNoOperativas}%</h2>
</div>

<div style={{border:"1px solid black",padding:20}}>
🚑 BRAVO Operativas
<h2>{bravoOperativas} - {bravoPorcentajeOperativas}%</h2>
</div>

<div style={{border:"1px solid black",padding:20}}>
⛔ BRAVO No Operativas
<h2>{bravoNoOperativas} - {bravoPorcentajeNoOperativas}%</h2>
</div>

</div>

<hr/>

<h2>Flota registrada</h2>

{rol==="admin" && (

<div style={{marginBottom:20}}>

<button
onClick={()=>router.push("/dashboard/informe-flota")}
style={{
marginRight:10,
padding:"10px 16px",
background:"#2563eb",
color:"white",
border:"none",
borderRadius:6
}}
>
📄 Informe General Flota
</button>

<button
onClick={()=>router.push("/ambulancia/nueva")}
style={{
padding:"10px 16px",
background:"#0070f3",
color:"white",
border:"none",
borderRadius:6
}}
>
➕ Nueva ambulancia
</button>

</div>

)}

<table border={1} cellPadding={8} style={{width:"100%",borderCollapse:"collapse"}}>

<thead>

<tr>
<th>Estado</th>
<th>Codigo</th>
<th>Placa</th>
<th>Tipo</th>
<th>KM</th>
<th>Próx Mtto</th>
<th>Motivo</th>
<th>Acciones</th>
</tr>

</thead>

<tbody>

{ambulancias.map(a=>(

<tr key={a.id}>

<td style={{color:colorEstado(a.estado)}}>
{a.estado}
</td>

<td>{a.codigo_operativo}</td>
<td>{a.placa}</td>
<td>{a.tipo}</td>
<td>{a.kilometraje_actual || 0}</td>

<td>

{a.kilometraje_mtto ?

<>
{a.kilometraje_mtto}
<br/>
<span style={{fontSize:12,color:"gray"}}>
faltan {Math.max(a.kilometraje_mtto - (a.kilometraje_actual || 0),0)} km
</span>
</>

:

"-"

}

</td>

<td>{a.motivo_no_operativo || "-"}</td>

<td>

{rol==="admin" && (

<>

<button onClick={()=>router.push("/ambulancia/"+a.id)}>
Ficha
</button>

<button onClick={()=>router.push("/ambulancia/editar/"+a.id)}>
Editar
</button>

</>

)}

{rol==="supervisor" && (

<button onClick={()=>router.push("/ambulancia/"+a.id)}>
Ficha
</button>

)}

</td>

</tr>

))}

</tbody>

</table>

</div>

)

}