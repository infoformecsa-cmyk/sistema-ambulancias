"use client"

import { useEffect,useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { useRouter,useParams } from "next/navigation"

export default function FichaAmbulancia(){

const router = useRouter()
const params = useParams()

const id = params?.id

const [ambulancia,setAmbulancia] = useState<any>(null)

const [kilometraje,setKilometraje] = useState("")
const [descripcion,setDescripcion] = useState("")
const [criticidad,setCriticidad] = useState("media")

const [archivo,setArchivo] = useState<File | null>(null)

const [fallas,setFallas] = useState<any[]>([])

/* =======================
CARGAR DATOS
======================= */

useEffect(()=>{

if(id){

cargarAmbulancia()
cargarFallas()

}

},[id])

async function cargarAmbulancia(){

const {data} = await supabase
.from("ambulancias")
.select("*")
.eq("id",id)
.single()

setAmbulancia(data)

}

async function cargarFallas(){

const {data} = await supabase
.from("reportes_fallas")
.select("*")
.eq("ambulancia_id",id)
.order("created_at",{ascending:false})

if(data) setFallas(data)

}

/* =======================
ACTUALIZAR KM
======================= */

async function actualizarKm(){

const km = parseInt(kilometraje)

if(isNaN(km)){

alert("Kilometraje inválido")
return

}

if(km < ambulancia.kilometraje_actual){

alert("El kilometraje no puede ser menor al actual")
return

}

await supabase
.from("ambulancias")
.update({
kilometraje_actual: km
})
.eq("id",id)

alert("Kilometraje actualizado")

setKilometraje("")

cargarAmbulancia()

}

/* =======================
REGISTRAR FALLA
======================= */

async function registrarFalla(){

if(!descripcion){

alert("Debe escribir la falla")

return

}

let url = ""

if(archivo){

const nombre = Date.now()+"_"+archivo.name

const {error:uploadError} = await supabase.storage
.from("fallas")
.upload(nombre,archivo)

if(uploadError){

console.log(uploadError)

alert("Error subiendo imagen")

return

}

url = nombre

}

/* insert correcto según tu tabla */

const {error} = await supabase
.from("reportes_fallas")
.insert({

ambulancia_id: id,

descripcion: descripcion + " | criticidad: "+criticidad,

imagen_url: url,

usuario: localStorage.getItem("nombre") || "usuario"

})

if(error){

console.log(error)

alert("Error registrando falla")

return

}

alert("Falla registrada")

setDescripcion("")
setArchivo(null)

cargarFallas()

}

/* =======================
MARCAR MTTO
======================= */

async function marcarMtto(){

await supabase
.from("ambulancias")
.update({

estado:"mantenimiento"

})
.eq("id",id)

alert("Mantenimiento registrado")

cargarAmbulancia()

}

/* =======================
UI
======================= */

if(!ambulancia){

return <div style={{padding:40}}>Cargando...</div>

}

return(

<div style={{padding:40,fontFamily:"Arial"}}>

<h1>Ficha Mecánica Ambulancia</h1>

<button onClick={()=>router.push("/dashboard")}>
← Volver
</button>

<hr/>

<h2>Estado</h2>

<p>Kilometraje actual: {ambulancia.kilometraje_actual}</p>

<p>Estado: {ambulancia.estado}</p>

<hr/>

<h2>Registrar Kilometraje</h2>

<input
placeholder="Nuevo kilometraje"
value={kilometraje}
onChange={(e)=>setKilometraje(e.target.value)}
/>

<button onClick={actualizarKm}>
Actualizar
</button>

<hr/>

<h2>Registrar mantenimiento</h2>

<button onClick={marcarMtto}>
Marcar mantenimiento realizado
</button>

<hr/>

<h2>Reportar falla</h2>

<textarea
rows={4}
style={{width:"100%"}}
value={descripcion}
onChange={(e)=>setDescripcion(e.target.value)}
/>

<br/>

<select
value={criticidad}
onChange={(e)=>setCriticidad(e.target.value)}
>

<option value="baja">Baja</option>
<option value="media">Media</option>
<option value="alta">Alta</option>

</select>

<br/><br/>

<input
type="file"
onChange={(e)=>{

if(e.target.files){

setArchivo(e.target.files[0])

}

}}
/>

<br/><br/>

<button onClick={registrarFalla}>
Registrar falla
</button>

<hr/>

<h2>Historial de fallas</h2>

<table border={1} cellPadding={8}>

<thead>

<tr>

<th>Fecha</th>
<th>Descripción</th>
<th>Foto</th>

</tr>

</thead>

<tbody>

{fallas.map(f=>(

<tr key={f.id}>

<td>
{new Date(f.created_at).toLocaleDateString()}
</td>

<td>
{f.descripcion}
</td>

<td>

{f.imagen_url ?

<a
href={`https://YOUR_PROJECT.supabase.co/storage/v1/object/public/fallas/${f.imagen_url}`}
target="_blank"
>

Ver foto

</a>

:

"-"

}

</td>

</tr>

))}

</tbody>

</table>

</div>

)

}