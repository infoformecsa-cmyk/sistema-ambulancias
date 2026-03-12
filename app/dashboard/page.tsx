"use client"

import { useEffect,useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { useRouter } from "next/navigation"

export default function Dashboard(){

const router = useRouter()

const [rol,setRol] = useState("")
const [nombre,setNombre] = useState("")
const [ambulancias,setAmbulancias] = useState<any[]>([])

useEffect(()=>{

const r = localStorage.getItem("rol")
const n = localStorage.getItem("nombre")

if(!r){
router.push("/")
return
}

setRol(r)
setNombre(n || "")

cargarAmbulancias()

},[])

async function cargarAmbulancias(){

const {data,error} = await supabase
.from("ambulancias")
.select("*")
.order("codigo_operativo")

if(error){
console.log(error)
return
}

if(data) setAmbulancias(data)

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
const porcentajeOperativas = total>0 ? Math.round((operativas/total)*100) : 0

const alfa = ambulancias.filter(a=>a.tipo==="ALFA")
const alfaOperativas = alfa.filter(a=>a.estado==="operativa").length
const alfaPorcentaje = alfa.length>0 ? Math.round((alfaOperativas/alfa.length)*100) : 0

const bravo = ambulancias.filter(a=>a.tipo==="BRAVO")
const bravoOperativas = bravo.filter(a=>a.estado==="operativa").length
const bravoPorcentaje = bravo.length>0 ? Math.round((bravoOperativas/bravo.length)*100) : 0

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
<h2>{porcentajeOperativas}%</h2>
</div>

<div style={{border:"1px solid black",padding:20}}>
ALFA Operativas
<h2>{alfaPorcentaje}%</h2>
</div>

<div style={{border:"1px solid black",padding:20}}>
BRAVO Operativas
<h2>{bravoPorcentaje}%</h2>
</div>

</div>

<hr/>

<h2>Flota registrada</h2>

<table border={1} cellPadding={8} style={{borderCollapse:"collapse",width:"100%"}}>

<thead>

<tr>
<th>Estado</th>
<th>Codigo</th>
<th>Placa</th>
<th>Tipo</th>
<th>KM</th>
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

<td>{a.motivo_no_operativo || "-"}</td>

<td>

<button
onClick={()=>router.push("/ambulancia/"+a.id)}
>
Ficha
</button>

</td>

</tr>

))}

</tbody>

</table>

</div>

)

}