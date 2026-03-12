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

async function guardarCambios(id:string){

const updateData:any = {}

const usuario = localStorage.getItem("nombre") || "sistema"

/* kilometraje actual */

if(editKm !== "" && !isNaN(parseInt(editKm))){
updateData.kilometraje_actual = parseInt(editKm)
}

/* proximo mantenimiento */

if(editKmMtto !== "" && !isNaN(parseInt(editKmMtto))){
updateData.observaciones = "Próximo mantenimiento en " + editKmMtto + " km"
}

/* motivo no operativa */

if(editMotivo !== ""){
updateData.motivo_no_operativo = editMotivo
updateData.motivo_fuera_servicio = editMotivo
}

/* auditoria */

updateData.actualizado_por = usuario
updateData.fecha_actualizacion = new Date()

try{

const {error} = await supabase
.from("ambulancias")
.update(updateData)
.eq("id",id)

if(error){

console.log("Error Supabase:",error)

alert("Error al guardar cambios")

return

}

alert("Cambios guardados correctamente")

setEditandoId(null)
setEditKm("")
setEditKmMtto("")
setEditMotivo("")

await cargarAmbulancias()

}catch(e){

console.log("Error:",e)

alert("Error inesperado")

}

}
async function cambiarEstado(id:string,estado:string){

await supabase
.from("ambulancias")
.update({estado})
.eq("id",id)

cargarAmbulancias()

}

/* PERMISOS */

const esAdmin=rol==="admin"
const esSupervisor=rol==="supervisor"
const esConductor=rol==="conductor"

/* ===== ESTADISTICAS GENERALES ===== */

const operativas=ambulancias.filter(a=>a.estado==="operativa").length
const mantenimiento=ambulancias.filter(a=>a.estado==="mantenimiento").length
const fuera=ambulancias.filter(a=>a.estado==="no operativa").length

/* ===== SEPARAR TIPOS ===== */

const alfas=ambulancias.filter(a=>a.tipo==="ALFA")
const bravos=ambulancias.filter(a=>a.tipo==="BRAVO")

/* ===== CALCULO ALFA ===== */

const alfaOperativas=alfas.filter(a=>a.estado==="operativa").length

const alfaNoOperativas=alfas.filter(
a=>a.estado==="mantenimiento" || a.estado==="no operativa"
).length

const porcentajeAlfaOperativas=
alfas.length ? Math.round((alfaOperativas/alfas.length)*100) : 0

const porcentajeAlfaNoOperativas=
alfas.length ? Math.round((alfaNoOperativas/alfas.length)*100) : 0

/* ===== CALCULO BRAVO ===== */

const bravoOperativas=bravos.filter(a=>a.estado==="operativa").length

const bravoNoOperativas=bravos.filter(
a=>a.estado==="mantenimiento" || a.estado==="no operativa"
).length

const porcentajeBravoOperativas=
bravos.length ? Math.round((bravoOperativas/bravos.length)*100) : 0

const porcentajeBravoNoOperativas=
bravos.length ? Math.round((bravoNoOperativas/bravos.length)*100) : 0

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

<h2>Estado por tipo</h2>

<h3>ALFA</h3>

<p>
Operativas: {alfaOperativas}/{alfas.length} ({porcentajeAlfaOperativas}%)
</p>

<p>
No operativas (incluye mantenimiento): {alfaNoOperativas}/{alfas.length} ({porcentajeAlfaNoOperativas}%)
</p>

<h3>BRAVO</h3>

<p>
Operativas: {bravoOperativas}/{bravos.length} ({porcentajeBravoOperativas}%)
</p>

<p>
No operativas (incluye mantenimiento): {bravoNoOperativas}/{bravos.length} ({porcentajeBravoNoOperativas}%)
</p>

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
<th>KM Próx Mtto</th>
<th>KM Restantes</th>
<th>Motivo No Operativa</th>
<th>Acciones</th>
</tr>

</thead>

<tbody>

{ambulancias.map(a=>{

const kmActual = a.kilometraje_actual || 0
const kmMtto = a.kilometraje_mtto || 0

const kmRestantes = kmMtto>0 ? kmMtto - kmActual : null

let colorAlerta="black"

if(kmRestantes!==null){

if(kmRestantes<=0) colorAlerta="red"
else if(kmRestantes<=500) colorAlerta="orange"
else colorAlerta="green"

}

return(

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

kmActual

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

kmMtto

}

</td>

<td style={{fontWeight:"bold",color:colorAlerta}}>

{kmRestantes!==null ? `${kmRestantes} km` : "-"}

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

</td>

</tr>

)

})}

</tbody>

</table>

</div>

)

}