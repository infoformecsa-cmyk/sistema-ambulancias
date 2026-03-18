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

setAmbulancias(data || [])

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

setAlertas(data || [])

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

/* ESTADISTICAS */

const operativas = ambulancias.filter(a=>a.estado==="operativa").length
const mantenimiento = ambulancias.filter(a=>a.estado==="mantenimiento").length
const fuera = ambulancias.filter(a=>a.estado==="no operativa").length

const total = ambulancias.length

const operatividad = total>0 ? Math.round((operativas/total)*100) : 0
const disponibilidadReal = total>0 ? ((operativas/total)*100).toFixed(1) : 0

/* ALERTAS */

const mantenimientoProximo = ambulancias.filter(a=>{
if(!a.kilometraje_mtto || !a.kilometraje_actual) return false
const faltan = a.kilometraje_mtto - a.kilometraje_actual
return faltan <= 1000 && faltan > 0
})

const mantenimientoVencido = ambulancias.filter(a=>{
if(!a.kilometraje_mtto || !a.kilometraje_actual) return false
return a.kilometraje_actual >= a.kilometraje_mtto
})

/* TIPOS */

const alfa = ambulancias.filter(a=>a.tipo==="ALFA")
const bravo = ambulancias.filter(a=>a.tipo==="BRAVO")

const alfaOperativas = alfa.filter(a=>a.estado==="operativa").length
const alfaNoOperativas = alfa.length - alfaOperativas

const bravoOperativas = bravo.filter(a=>a.estado==="operativa").length
const bravoNoOperativas = bravo.length - bravoOperativas

return(

<div style={{padding:40,fontFamily:"Arial"}}>

<h1>Sistema de Control de Ambulancias</h1>

<p>Usuario: {nombre} | Rol: {rol}</p>

<button onClick={cerrarSesion}>Cerrar sesión</button>

<hr/>

{/* ALERTAS */}

{alertas.length>0 && (
<div style={{background:"#ffdddd",padding:20,border:"2px solid red"}}>
<h2>🚨 ALERTAS CRÍTICAS</h2>
{alertas.map(a=>(
<div key={a.id}>
<b>ID:</b> {a.ambulancia_id}<br/>
{a.descripcion}
</div>
))}
</div>
)}

<hr/>

<h2>Panel de Flota</h2>

<p>Operativas: {operativas} | Mantenimiento: {mantenimiento} | No operativas: {fuera}</p>
<p>Disponibilidad: {disponibilidadReal}%</p>

<hr/>

<h2>Flota registrada</h2>

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

<td style={{color:colorEstado(a.estado)}}>{a.estado}</td>

<td>{a.codigo_operativo}</td>
<td>{a.placa}</td>
<td>{a.tipo}</td>
<td>{a.kilometraje_actual || 0}</td>

<td>
{a.kilometraje_mtto ? (
<>
{a.kilometraje_mtto}
<br/>
<span style={{fontSize:12,color:"gray"}}>
faltan {Math.max(a.kilometraje_mtto - (a.kilometraje_actual || 0),0)} km
</span>
</>
) : "-"}
</td>

<td>{a.motivo_no_operativo || "-"}</td>

<td>

{rol==="admin" && (
<>

<button onClick={()=>router.push(`/ambulancia/${a.id}`)}>
Ficha
</button>

<button onClick={()=>router.push(`/ambulancia/editar/${a.id}`)}>
Editar
</button>

{/* 🔥 NUEVO BOTÓN HISTORIAL */}
<button onClick={()=>router.push(`/dashboard/historial?ambulancia=${a.id}`)}>
Historial
</button>

</>
)}

{rol==="supervisor" && (
<button onClick={()=>router.push(`/ambulancia/${a.id}`)}>
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