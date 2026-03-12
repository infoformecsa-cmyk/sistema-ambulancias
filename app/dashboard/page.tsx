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

/* estadisticas */

const operativas = ambulancias.filter(a=>a.estado==="operativa").length
const mantenimiento = ambulancias.filter(a=>a.estado==="mantenimiento").length
const fuera = ambulancias.filter(a=>a.estado==="no operativa").length

const total = ambulancias.length
const operatividad = total>0 ? Math.round((operativas/total)*100) : 0

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

<div style={{display:"flex",gap:20}}>

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

</div>

<hr/>

<h2>Flota registrada</h2>

<table border={1} cellPadding={8} style={{width:"100%"}}>

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
faltan {a.kilometraje_mtto - (a.kilometraje_actual || 0)} km
</span>
</>

:

"-"

}

</td>

<td>{a.motivo_no_operativo || "-"}</td>

<td>

{/* ADMINISTRADOR */}

{rol==="admin" && (

<>

<button onClick={()=>router.push("/ambulancia/"+a.id)}>
Ficha
</button>

<button onClick={()=>router.push("/ambulancia/"+a.id)}>
Editar
</button>

</>

)}

{/* SUPERVISOR */}

{rol==="supervisor" && (

<button onClick={()=>router.push("/ambulancia/"+a.id)}>
Ficha
</button>

)}

{/* CONDUCTOR */}

{rol==="conductor" && (

<button onClick={()=>router.push("/ambulancia/"+a.id)}>
Registrar KM
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