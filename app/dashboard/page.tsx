"use client"

import { useEffect,useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { useRouter } from "next/navigation"

export default function Dashboard(){

const router=useRouter()

const [rol,setRol]=useState("")
const [nombre,setNombre]=useState("")
const [ambulancias,setAmbulancias]=useState<any[]>([])

const [editandoId,setEditandoId]=useState<string | null>(null)
const [editKm,setEditKm]=useState("")
const [editKmMtto,setEditKmMtto]=useState("")
const [editMotivo,setEditMotivo]=useState("")

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

async function cargarAmbulancias(){

const {data}=await supabase
.from("ambulancias")
.select("*")
.order("codigo_operativo")

if(data) setAmbulancias(data)

}

function cerrarSesion(){

localStorage.clear()
router.push("/")

}

async function guardarCambios(id:string){

await supabase
.from("ambulancias")
.update({

kilometraje_actual: parseInt(editKm),
kilometraje_mtto: parseInt(editKmMtto),
motivo_no_operativa: editMotivo

})
.eq("id",id)

setEditandoId(null)

cargarAmbulancias()

}

async function cambiarEstado(id:string,estado:string){

await supabase
.from("ambulancias")
.update({estado})
.eq("id",id)

cargarAmbulancias()

}

async function registrarFalla(id:string){

const descripcion=prompt("Describa la falla")

if(!descripcion) return

await supabase
.from("reportes_fallas")
.insert([{

ambulancia_id:id,
descripcion,
usuario:nombre

}])

alert("Reporte registrado")

}

/* PERMISOS */

const esAdmin=rol==="admin"
const esSupervisor=rol==="supervisor"
const esConductor=rol==="conductor"

/* ESTADISTICAS */

const operativas=ambulancias.filter(a=>a.estado==="operativa").length
const mantenimiento=ambulancias.filter(a=>a.estado==="mantenimiento").length
const fuera=ambulancias.filter(a=>a.estado==="no operativa").length

function colorEstado(e:string){

if(e==="operativa") return "green"
if(e==="mantenimiento") return "orange"
return "red"

}

return(

<div style={{padding:40,fontFamily:"Arial"}}>

<h1>Sistema de Control de Ambulancias</h1>

<p>
Usuario: {nombre} | Rol: {rol}
</p>

<button
onClick={cerrarSesion}
style={{
background:"red",
color:"white",
border:"none",
padding:"6px 12px"
}}
>
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

</div>

<hr/>

<h2>Flota registrada</h2>

<table border={1} cellPadding={8}>

<thead>

<tr>
<th>Estado</th>
<th>Codigo</th>
<th>Placa</th>
<th>Tipo</th>
<th>KM Actual</th>
<th>KM Mtto</th>
<th>Motivo No Operativa</th>
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

<td>

{editandoId===a.id ?

<input
type="number"
value={editKm}
onChange={(e)=>setEditKm(e.target.value)}
style={{width:80}}
/>

:

a.kilometraje_actual

}

</td>

<td>

{editandoId===a.id ?

<input
type="number"
value={editKmMtto}
onChange={(e)=>setEditKmMtto(e.target.value)}
style={{width:80}}
/>

:

a.kilometraje_mtto

}

</td>

<td>

{editandoId===a.id ?

<input
value={editMotivo}
onChange={(e)=>setEditMotivo(e.target.value)}
/>

:

a.motivo_no_operativa

}

</td>

<td>

{esAdmin && editandoId!==a.id && (

<>

<button onClick={()=>{

setEditandoId(a.id)
setEditKm(a.kilometraje_actual || "")
setEditKmMtto(a.kilometraje_mtto || "")
setEditMotivo(a.motivo_no_operativa || "")

}}>
Editar
</button>

<button onClick={()=>cambiarEstado(a.id,"operativa")}>
Operativa
</button>

<button onClick={()=>cambiarEstado(a.id,"mantenimiento")}>
Mtto
</button>

<button onClick={()=>cambiarEstado(a.id,"no operativa")}>
No Operativa
</button>

</>

)}

{editandoId===a.id && (

<button onClick={()=>guardarCambios(a.id)}>
Guardar
</button>

)}

{(esSupervisor || esConductor) && (

<button onClick={()=>registrarFalla(a.id)}>
Reportar
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