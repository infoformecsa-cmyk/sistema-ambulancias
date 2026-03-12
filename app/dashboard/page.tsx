"use client"

import { useEffect,useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { useRouter } from "next/navigation"

export default function Dashboard(){

const router = useRouter()

const [rol,setRol] = useState("")
const [nombre,setNombre] = useState("")
const [ambulancias,setAmbulancias] = useState<any[]>([])

const [editandoId,setEditandoId] = useState<string | null>(null)
const [editKm,setEditKm] = useState("")
const [editMotivo,setEditMotivo] = useState("")

/* cargar datos */

async function cargarAmbulancias(){

const {data,error} = await supabase
.from("ambulancias")
.select("*")
.order("codigo_operativo")

if(error){
console.log(error)
return
}

if(data){
setAmbulancias(data)
}

}

/* verificar sesión */

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

/* cerrar sesión */

function cerrarSesion(){

localStorage.clear()
router.push("/")

}

/* colores de estado */

function colorEstado(e:string){

if(e==="operativa") return "green"
if(e==="mantenimiento") return "orange"
return "red"

}

/* cambiar estado */

async function cambiarEstado(id:string,estado:string){

await supabase
.from("ambulancias")
.update({estado})
.eq("id",id)

cargarAmbulancias()

}

/* guardar edición */

async function guardarCambios(id:string){

const usuario = localStorage.getItem("nombre") || "sistema"

const updateData:any = {}

if(editKm !== "" && !isNaN(parseInt(editKm))){
updateData.kilometraje_actual = parseInt(editKm)
}

if(editMotivo !== ""){
updateData.motivo_no_operativo = editMotivo
}

updateData.actualizado_por = usuario
updateData.fecha_actualizacion = new Date().toISOString()

const {error} = await supabase
.from("ambulancias")
.update(updateData)
.eq("id",id)

if(error){
console.log(error)
alert("Error al guardar cambios")
return
}

alert("Cambios guardados")

setEditandoId(null)
setEditKm("")
setEditMotivo("")

cargarAmbulancias()

}

/* =====================
   ESTADÍSTICAS
===================== */

const operativas = ambulancias.filter(a=>a.estado==="operativa").length
const mantenimiento = ambulancias.filter(a=>a.estado==="mantenimiento").length
const fuera = ambulancias.filter(a=>a.estado==="no operativa").length

const total = ambulancias.length

const porcentajeOperativas =
total > 0 ? Math.round((operativas / total) * 100) : 0

/* ALFA */

const alfa = ambulancias.filter(a=>a.tipo==="ALFA")
const alfaOperativas = alfa.filter(a=>a.estado==="operativa").length
const alfaPorcentaje =
alfa.length > 0 ? Math.round((alfaOperativas / alfa.length)*100) : 0

/* BRAVO */

const bravo = ambulancias.filter(a=>a.tipo==="BRAVO")
const bravoOperativas = bravo.filter(a=>a.estado==="operativa").length
const bravoPorcentaje =
bravo.length > 0 ? Math.round((bravoOperativas / bravo.length)*100) : 0

return(

<div style={{padding:40,fontFamily:"Arial"}}>

<h1>Sistema de Control de Ambulancias</h1>

<p>
Usuario: {nombre} | Rol: {rol}
</p>

<button
onClick={cerrarSesion}
style={{background:"red",color:"white",border:"none",padding:"8px"}}
>
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
🚑 ALFA operativas
<h2>{alfaPorcentaje}%</h2>
</div>

<div style={{border:"1px solid black",padding:20}}>
🚑 BRAVO operativas
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
<th>KM Actual</th>
<th>Motivo No Operativa</th>
<th>Acciones</th>
</tr>

</thead>

<tbody>

{ambulancias.map((a:any)=>(

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

a.kilometraje_actual || 0

}

</td>

<td>

{editandoId===a.id ?

<input
value={editMotivo}
onChange={(e)=>setEditMotivo(e.target.value)}
/>

:

a.motivo_no_operativo || "-"

}

</td>

<td>

<button onClick={()=>router.push("/ambulancia/"+a.id)}>
Ficha
</button>

{editandoId!==a.id && (

<>

<button onClick={()=>{

setEditandoId(a.id)
setEditKm(a.kilometraje_actual ? String(a.kilometraje_actual) : "")
setEditMotivo(a.motivo_no_operativo || "")

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

</td>

</tr>

))}

</tbody>

</table>

</div>

)

}