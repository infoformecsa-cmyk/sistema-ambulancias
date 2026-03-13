"use client"

import { useEffect,useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { useRouter,useParams } from "next/navigation"

export default function FichaAmbulancia(){

const router = useRouter()
const params = useParams()
const id = params?.id

const [ambulancia,setAmbulancia] = useState<any>(null)

const [nuevoKm,setNuevoKm] = useState("")
const [kmMtto,setKmMtto] = useState("")

const [descripcion,setDescripcion] = useState("")
const [archivo,setArchivo] = useState<File | null>(null)
const [criticidad,setCriticidad] = useState("media")

const [fallas,setFallas] = useState<any[]>([])

useEffect(()=>{
cargarAmbulancia()
cargarFallas()
},[])

async function cargarAmbulancia(){

const {data,error} = await supabase
.from("ambulancias")
.select("*")
.eq("id",id)
.single()

if(data) setAmbulancia(data)

}

async function cargarFallas(){

const {data,error} = await supabase
.from("reportes_fallas")
.select("*")
.eq("ambulancia_id",id)
.order("created_at",{ascending:false})

if(data) setFallas(data)

}

async function actualizarKilometraje(){

if(!nuevoKm) return

const {error} = await supabase
.from("ambulancias")
.update({
kilometraje_actual: parseInt(nuevoKm)
})
.eq("id",id)

if(error){
alert("Error actualizando kilometraje")
return
}

alert("Kilometraje actualizado")

setNuevoKm("")
cargarAmbulancia()

}

async function guardarMttoPreventivo(){

if(!kmMtto) return

const {error} = await supabase
.from("ambulancias")
.update({
kilometraje_mtto: parseInt(kmMtto)
})
.eq("id",id)

if(error){
alert("Error guardando mantenimiento")
return
}

alert("Mantenimiento preventivo registrado")

setKmMtto("")
cargarAmbulancia()

}

async function registrarFalla(){

if(!descripcion){
alert("Ingrese la descripción de la falla")
return
}

let urlImagen = null

if(archivo){

const nombreArchivo = `reportes/${Date.now()}_${archivo.name}`

const {data,error:uploadError} = await supabase.storage
.from("Fallas")
.upload(nombreArchivo,archivo)

if(uploadError){
console.log(uploadError)
alert("Error subiendo imagen")
return
}

urlImagen = data?.path

}

const {error} = await supabase
.from("reportes_fallas")
.insert({

ambulancia_id:id,
descripcion:descripcion,
imagen_url:urlImagen,
usuario:localStorage.getItem("nombre"),
criticidad:criticidad,
estado:"abierta"

})

if(error){
console.log(error)
alert("Error registrando falla")
return
}

alert("Falla registrada correctamente")

setDescripcion("")
setArchivo(null)
setCriticidad("media")

cargarFallas()

}

async function eliminarFalla(fallaId:string){

const confirmar = confirm("¿Eliminar este reporte?")

if(!confirmar) return

const {error} = await supabase
.from("reportes_fallas")
.delete()
.eq("id",fallaId)

if(error){
alert("Error eliminando reporte")
return
}

alert("Reporte eliminado")

cargarFallas()

}

function obtenerImagen(url:string){

const {data} = supabase
.storage
.from("Fallas")
.getPublicUrl(url)

return data.publicUrl

}

if(!ambulancia) return <div style={{padding:40}}>Cargando...</div>

return(

<div style={{padding:40,fontFamily:"Arial"}}>

<h1>Ficha Mecánica Ambulancia</h1>

<button onClick={()=>router.push("/dashboard")}>
← Volver
</button>

<button
onClick={()=>window.print()}
style={{marginLeft:10}}
>
Imprimir Informe
</button>

<hr/>

<h2>Estado</h2>

<p>
Kilometraje actual: {ambulancia.kilometraje_actual || 0}
</p>

<p>
Estado: {ambulancia.estado}
</p>

<hr/>

<h2>Registrar Kilometraje</h2>

<input
type="number"
placeholder="Nuevo kilometraje"
value={nuevoKm}
onChange={(e)=>setNuevoKm(e.target.value)}
/>

<button onClick={actualizarKilometraje}>
Actualizar
</button>

<hr/>

<h2>Mantenimiento Preventivo</h2>

<p>
Próximo mantenimiento actual: {ambulancia.kilometraje_mtto || "-"}
</p>

<input
type="number"
placeholder="Kilometraje próximo mantenimiento"
value={kmMtto}
onChange={(e)=>setKmMtto(e.target.value)}
/>

<button onClick={guardarMttoPreventivo}>
Guardar mantenimiento preventivo
</button>

<hr/>

<h2>Reportar falla</h2>

<textarea
value={descripcion}
onChange={(e)=>setDescripcion(e.target.value)}
style={{width:"100%",height:100}}
/>

<br/>

<select
value={criticidad}
onChange={(e)=>setCriticidad(e.target.value)}
>

<option value="baja">Baja</option>
<option value="media">Media</option>
<option value="alta">Alta</option>
<option value="critica">Crítica</option>

</select>

<br/><br/>

<input
type="file"
accept="image/*"
onChange={(e)=>setArchivo(e.target.files?.[0] || null)}
/>

<br/><br/>

<button onClick={registrarFalla}>
Registrar falla
</button>

<hr/>

<h2>Historial de fallas</h2>

<table border={1} cellPadding={8} style={{borderCollapse:"collapse",width:"100%"}}>

<thead>

<tr>
<th>Fecha</th>
<th>Descripción</th>
<th>Criticidad</th>
<th>Estado</th>
<th>Foto</th>
<th>Acciones</th>
</tr>

</thead>

<tbody>

{fallas.map(f=>{

let imagen = null

if(f.imagen_url){
imagen = obtenerImagen(f.imagen_url)
}

return(

<tr key={f.id}>

<td>{new Date(f.created_at).toLocaleDateString()}</td>

<td>{f.descripcion}</td>

<td>{f.criticidad}</td>

<td>{f.estado}</td>

<td>

{imagen && (

<a href={imagen} target="_blank">

<img
src={imagen}
style={{
width:80,
borderRadius:6
}}
/>

</a>

)}

</td>

<td>

<button
onClick={()=>eliminarFalla(f.id)}
style={{background:"red",color:"white"}}
>
Eliminar
</button>

</td>

</tr>

)

})}

</tbody>

</table>

</div>

)

}