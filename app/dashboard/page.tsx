"use client"

import { useEffect,useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { useRouter } from "next/navigation"

export default function Dashboard(){

const router=useRouter()

const [rol,setRol]=useState("")
const [nombre,setNombre]=useState("")
const [ambulancias,setAmbulancias]=useState<any[]>([])

/* leer sesión */

useEffect(()=>{

const r=localStorage.getItem("rol")
const n=localStorage.getItem("nombre")

if(!r){

router.push("/")
return

}

setRol(r)
setNombre(n || "")

cargarAmbulancias()

},[])

/* cargar ambulancias */

async function cargarAmbulancias(){

const {data}=await supabase
.from("ambulancias")
.select("*")
.order("codigo_operativo")

if(data) setAmbulancias(data)

}

/* cerrar sesión */

function cerrarSesion(){

localStorage.clear()
router.push("/")

}

/* registrar km */

async function registrarKm(id:string,km:number){

await supabase
.from("ambulancias")
.update({kilometraje_actual:km})
.eq("id",id)

cargarAmbulancias()

}

/* cambiar estado */

async function cambiarEstado(id:string,estado:string){

await supabase
.from("ambulancias")
.update({estado})
.eq("id",id)

cargarAmbulancias()

}

function colorEstado(e:string){

if(e==="operativa") return "green"
if(e==="mantenimiento") return "orange"
return "red"

}

return(

<div style={{padding:40,fontFamily:"Arial"}}>

<h1>Sistema de Control de Ambulancias</h1>

<div style={{marginBottom:20}}>

Usuario: {nombre} | Rol: {rol}

<button
onClick={cerrarSesion}
style={{
marginLeft:20,
background:"red",
color:"white",
border:"none",
padding:"6px 12px"
}}
>

Cerrar sesión

</button>

</div>

<hr/>

<h2>Flota registrada</h2>

<table border={1} cellPadding={8}>

<thead>

<tr>

<th>Estado</th>
<th>Código</th>
<th>Placa</th>
<th>Marca</th>
<th>Tipo</th>
<th>KM</th>
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
<td>{a.marca}</td>
<td>{a.tipo}</td>
<td>{a.kilometraje_actual}</td>

<td>

{/* ADMIN */}

{rol==="admin" && (

<>

<button onClick={()=>cambiarEstado(a.id,"operativa")}>

Operativa

</button>

<button onClick={()=>cambiarEstado(a.id,"mantenimiento")}>

Mtto

</button>

<button onClick={()=>cambiarEstado(a.id,"no operativa")}>

Fuera

</button>

</>

)}

{/* SUPERVISOR */}

{rol==="supervisor" && (

<button
onClick={()=>{

const km=prompt("Ingrese kilometraje")

if(!km) return

registrarKm(a.id,parseInt(km))

}}
>

Registrar KM

</button>

)}

{/* CONDUCTOR */}

{rol==="conductor" && (

<button
onClick={()=>{

const km=prompt("Ingrese kilometraje")

if(!km) return

registrarKm(a.id,parseInt(km))

}}
>

Reportar KM

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