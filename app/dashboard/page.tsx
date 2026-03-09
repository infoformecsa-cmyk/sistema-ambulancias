"use client"

import { useEffect,useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { useRouter } from "next/navigation"

export default function Dashboard(){

const router=useRouter()

const [ambulancias,setAmbulancias]=useState<any[]>([])
const [rol,setRol]=useState("")

useEffect(()=>{

const r=localStorage.getItem("rol")

if(!r){
router.push("/")
return
}

setRol(r)

cargarAmbulancias()

},[])

async function cargarAmbulancias(){

const {data}=await supabase
.from("ambulancias")
.select("*")
.order("codigo_operativo")

if(data) setAmbulancias(data)

}

function colorEstado(e:string){

if(e==="operativa") return "green"
if(e==="mantenimiento") return "orange"
return "red"

}

const operativas=ambulancias.filter(a=>a.estado==="operativa").length
const mantenimiento=ambulancias.filter(a=>a.estado==="mantenimiento").length
const fuera=ambulancias.filter(a=>a.estado==="no operativa").length

return(

<div style={{padding:"40px"}}>

<h1>Sistema de Control de Ambulancias</h1>

<h3>Rol: {rol}</h3>

<hr/>

<h2>Panel de Control de Flota</h2>

<div style={{display:"flex",gap:"20px"}}>

<div style={{border:"1px solid black",padding:"20px"}}>
🚑 Operativas
<h2>{operativas}</h2>
</div>

<div style={{border:"1px solid black",padding:"20px"}}>
🔧 Mantenimiento
<h2>{mantenimiento}</h2>
</div>

<div style={{border:"1px solid black",padding:"20px"}}>
⛔ Fuera de servicio
<h2>{fuera}</h2>
</div>

</div>

<hr/>

<h2>Flota registrada</h2>

<table border={1} cellPadding={8}>

<thead>

<tr>
<th>Código</th>
<th>Estado</th>
<th>Acceso</th>
</tr>

</thead>

<tbody>

{ambulancias.map(a=>(

<tr key={a.id}>

<td>{a.codigo_operativo}</td>

<td style={{color:colorEstado(a.estado)}}>
{a.estado}
</td>

<td>

<button
onClick={()=>router.push(`/ambulancia/${a.id}`)}
>

Abrir ficha

</button>

</td>

</tr>

))}

</tbody>

</table>

</div>

)

}