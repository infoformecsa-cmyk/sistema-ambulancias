"use client"

import { useEffect, useState } from "react"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
process.env.NEXT_PUBLIC_SUPABASE_URL!,
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function Mecanica(){

const [ambulancias,setAmbulancias] = useState<any[]>([])
const [historial,setHistorial] = useState<any[]>([])
const [ambulancia,setAmbulancia] = useState("")
const [descripcion,setDescripcion] = useState("")
const [kilometraje,setKilometraje] = useState("")
const [tipo,setTipo] = useState("Preventivo")
const [cargando,setCargando] = useState(false)

/* ================================
CARGAR AMBULANCIAS
================================ */

useEffect(()=>{
cargarAmbulancias()
},[])

const cargarAmbulancias = async () => {

console.log("Cargando ambulancias...")

const { data, error } = await supabase
.from("ambulancias")
.select("*")
.order("codigo_operativo",{ascending:true})

if(error){
console.error("Error cargando ambulancias:",error)
return
}

if(data){
setAmbulancias(data)
}

}

/* ================================
CARGAR HISTORIAL
================================ */

const cargarHistorial = async (id:string)=>{

const {data,error} = await supabase
.from("mantenimientos")
.select("*")
.eq("ambulancia_id",id)
.order("fecha",{ascending:false})

if(error){
console.error("Error cargando historial:",error)
return
}

if(data){
setHistorial(data)
}

}

/* ================================
CAMBIO DE AMBULANCIA
================================ */

const seleccionarAmbulancia = (id:string)=>{

setAmbulancia(id)

if(id){
cargarHistorial(id)
}

}

/* ================================
REGISTRAR MANTENIMIENTO
================================ */

const registrarMantenimiento = async ()=>{

if(!ambulancia){
alert("Seleccione una ambulancia")
return
}

if(!descripcion){
alert("Ingrese una descripción")
return
}

setCargando(true)

const {error} = await supabase
.from("mantenimientos")
.insert([
{
ambulancia_id:ambulancia,
tipo:tipo,
descripcion:descripcion,
kilometraje:kilometraje ? Number(kilometraje) : null,
fecha:new Date()
}
])

setCargando(false)

if(error){
console.error(error)
alert("Error registrando mantenimiento")
return
}

setDescripcion("")
setKilometraje("")

alert("Mantenimiento registrado")

cargarHistorial(ambulancia)

}

/* ================================
INTERFAZ
================================ */

return(

<div style={{padding:"40px"}}>

<h1>SSM Guayas – APH</h1>

<h2>Módulo Mecánico</h2>

<hr style={{margin:"20px 0"}}/>

<h3>Registrar mantenimiento</h3>

{/* SELECT AMBULANCIA */}

<div style={{marginBottom:"20px"}}>

<select
value={ambulancia}
onChange={(e)=>seleccionarAmbulancia(e.target.value)}
>

<option value="">Seleccionar ambulancia</option>

{ambulancias?.length > 0 && ambulancias.map((a:any)=>(
<option key={a.id} value={a.id}>
{a.codigo_operativo}
</option>
))}

</select>

</div>

{/* TIPO */}

<div style={{marginBottom:"20px"}}>

<select
value={tipo}
onChange={(e)=>setTipo(e.target.value)}
>

<option value="Preventivo">Preventivo</option>
<option value="Correctivo">Correctivo</option>

</select>

</div>

{/* KILOMETRAJE */}

<div style={{marginBottom:"20px"}}>

<input
type="number"
placeholder="Kilometraje actual"
value={kilometraje}
onChange={(e)=>setKilometraje(e.target.value)}
/>

</div>

{/* DESCRIPCIÓN */}

<div style={{marginBottom:"20px"}}>

<textarea
placeholder="Descripción del mantenimiento"
value={descripcion}
onChange={(e)=>setDescripcion(e.target.value)}
style={{width:"400px",height:"120px"}}
/>

</div>

<button
onClick={registrarMantenimiento}
disabled={cargando}
>
{cargando ? "Registrando..." : "Registrar mantenimiento"}
</button>

{/* ================================
HISTORIAL MECÁNICO
================================ */}

{ambulancia && (

<div style={{marginTop:"50px"}}>

<h3>Historial mecánico</h3>

<table border={1} cellPadding={10} style={{marginTop:"20px"}}>

<thead>

<tr>
<th>Fecha</th>
<th>Tipo</th>
<th>Kilometraje</th>
<th>Descripción</th>
</tr>

</thead>

<tbody>

{historial?.length > 0 ? historial.map((m:any)=>(
<tr key={m.id}>

<td>
{new Date(m.fecha).toLocaleDateString()}
</td>

<td>{m.tipo}</td>

<td>{m.kilometraje ?? "-"}</td>

<td>{m.descripcion}</td>

</tr>
))
:
<tr>
<td colSpan={4}>Sin registros</td>
</tr>
}

</tbody>

</table>

</div>

)}

</div>

)

}