"use client"

import { useEffect,useState } from "react"
import { supabase } from "@/lib/supabaseClient"

type Falla={
id:number
descripcion:string
criticidad:string
fecha:string
foto:string
}

export default function AmbulanciaPage({params}:{params:{id:string}}){

const [fallas,setFallas]=useState<Falla[]>([])
const [descripcion,setDescripcion]=useState("")
const [criticidad,setCriticidad]=useState("Media")
const [foto,setFoto]=useState<File|null>(null)

const [kilometraje,setKilometraje]=useState("")
const [ambulancia,setAmbulancia]=useState<any>(null)

const [alerta,setAlerta]=useState("")

useEffect(()=>{

cargarAmbulancia()
cargarFallas()

},[])

async function cargarAmbulancia(){

const {data}=await supabase
.from("ambulancias")
.select("*")
.eq("id",params.id)
.single()

if(data){

setAmbulancia(data)

const proximo=data.kilometraje_mtto+5000
const restante=proximo-data.kilometraje_actual

if(restante<=400){

setAlerta(`⚠ mantenimiento en ${restante} km`)

}

}

}

async function cargarFallas(){

const {data,error}=await supabase
.from("fallas")
.select("*")
.eq("ambulancia_id",params.id)
.order("fecha",{ascending:false})

if(data){
setFallas(data)
}

}

async function subirFoto(){

if(!foto) return ""

const nombre=Date.now()+"_"+foto.name

const {data,error}=await supabase.storage
.from("Fallas")
.upload(nombre,foto)

if(error) return ""

const url=supabase
.storage
.from("fallas")
.getPublicUrl(nombre)

return url.data.publicUrl

}

async function registrarFalla(){

const url=await subirFoto()

const {error}=await supabase
.from("fallas")
.insert([{

ambulancia_id:params.id,
descripcion,
criticidad,
foto:url

}])

if(error){

alert("Error registrando falla")
return

}

setDescripcion("")
setFoto(null)

cargarFallas()

}

async function registrarKilometraje(){

const km=parseInt(kilometraje)

await supabase
.from("ambulancias")
.update({

kilometraje_actual:km

})
.eq("id",params.id)

setKilometraje("")

cargarAmbulancia()

}

async function registrarMantenimiento(){

await supabase
.from("ambulancias")
.update({

kilometraje_mtto:ambulancia.kilometraje_actual

})
.eq("id",params.id)

alert("Mantenimiento registrado")

cargarAmbulancia()

}

return(

<div style={{padding:40}}>

<h1>Ficha Ambulancia {ambulancia?.codigo_operativo}</h1>

<hr/>

<h2>Estado</h2>

<p>Kilometraje actual: {ambulancia?.kilometraje_actual}</p>

<p>Último mantenimiento: {ambulancia?.kilometraje_mtto}</p>

{alerta && (

<div style={{
background:"orange",
padding:10,
marginTop:10
}}>

{alerta}

</div>

)}

<hr/>

<h2>Registrar Kilometraje</h2>

<input
placeholder="Nuevo kilometraje"
value={kilometraje}
onChange={(e)=>setKilometraje(e.target.value)}
/>

<button onClick={registrarKilometraje}>
Actualizar
</button>

<hr/>

<h2>Registrar mantenimiento</h2>

<button onClick={registrarMantenimiento}>
Marcar mantenimiento realizado
</button>

<hr/>

<h2>Reportar falla</h2>

<textarea
placeholder="Descripción de la falla"
value={descripcion}
onChange={(e)=>setDescripcion(e.target.value)}
style={{width:"100%",height:100}}
/>

<br/><br/>

<select
value={criticidad}
onChange={(e)=>setCriticidad(e.target.value)}
>

<option>Alta</option>
<option>Media</option>
<option>Baja</option>

</select>

<br/><br/>

<input
type="file"
onChange={(e)=>{

if(e.target.files){
setFoto(e.target.files[0])
}

}}
/>

<br/><br/>

<button onClick={registrarFalla}>
Registrar falla
</button>

<hr/>

<h2>Historial de fallas</h2>

<table border={1} cellPadding={10}>

<thead>

<tr>

<th>Fecha</th>
<th>Descripción</th>
<th>Criticidad</th>
<th>Foto</th>

</tr>

</thead>

<tbody>

{fallas.map((f)=>(

<tr key={f.id}>

<td>{f.fecha}</td>
<td>{f.descripcion}</td>
<td>{f.criticidad}</td>

<td>

{f.foto && (

<a href={f.foto} target="_blank">
Ver foto
</a>

)}

</td>

</tr>

))}

</tbody>

</table>

</div>

)

}