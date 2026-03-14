"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { useRouter, useParams } from "next/navigation"

export default function FichaAmbulancia(){

const router = useRouter()
const params = useParams()

const id = params?.id as string

const [ambulancia,setAmbulancia] = useState<any>(null)

const [nuevoKm,setNuevoKm] = useState("")
const [kmMtto,setKmMtto] = useState("")

const [descripcion,setDescripcion] = useState("")
const [archivo,setArchivo] = useState<File | null>(null)
const [preview,setPreview] = useState<string | null>(null)

const [criticidad,setCriticidad] = useState("media")

const [fallas,setFallas] = useState<any[]>([])
const [historial,setHistorial] = useState<any[]>([])

useEffect(()=>{

if(!id) return

cargarAmbulancia()
cargarFallas()
cargarHistorial()

},[id])

async function cargarAmbulancia(){

const {data,error} = await supabase
.from("ambulancias")
.select("*")
.eq("id",id)
.single()

if(error){
console.log(error)
return
}

setAmbulancia(data)

}

async function cargarFallas(){

const {data,error} = await supabase
.from("reportes_fallas")
.select("*")
.eq("ambulancia_id",id)
.order("created_at",{ascending:false})

if(error){
console.log(error)
return
}

setFallas(data || [])

}

async function cargarHistorial(){

const {data,error} = await supabase
.from("historial_operativo")
.select("*")
.eq("ambulancia_id",id)
.order("fecha_inicio",{ascending:false})

if(error){
console.log(error)
return
}

setHistorial(data || [])

}

async function actualizarKilometraje(){

if(!nuevoKm) return

const {error} = await supabase
.from("ambulancias")
.update({
kilometraje_actual: Number(nuevoKm)
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
kilometraje_mtto: Number(kmMtto)
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

let rutaImagen = null

if(archivo){

const nombreArchivo = `reportes/${Date.now()}_${archivo.name}`

const {data,error} = await supabase.storage
.from("Fallas")
.upload(nombreArchivo,archivo)

if(error){
console.log(error)
alert("Error subiendo imagen")
return
}

rutaImagen = data.path

}

const {error} = await supabase
.from("reportes_fallas")
.insert({
ambulancia_id:id,
descripcion:descripcion,
imagen_url:rutaImagen,
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
setPreview(null)
setCriticidad("media")

cargarFallas()

}

function manejarArchivo(e:any){

const file = e.target.files?.[0]

if(!file) return

setArchivo(file)
setPreview(URL.createObjectURL(file))

}

if(!ambulancia) return <div style={{padding:40}}>Cargando...</div>

return(

<div style={{padding:40,fontFamily:"Arial"}}>

<h1>Ficha Mecánica Ambulancia</h1>

<button onClick={()=>router.push("/dashboard")}>
← Volver
</button>

<button onClick={()=>window.print()} style={{marginLeft:10}}>
Imprimir Informe
</button>

<hr/>

<h2>Estado</h2>

<p>Kilometraje actual: {ambulancia.kilometraje_actual || 0}</p>
<p>Estado: {ambulancia.estado}</p>

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

<p>Próximo mantenimiento actual: {ambulancia.kilometraje_mtto || "-"}</p>

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
onChange={manejarArchivo}
/>

{preview && (

<img
src={preview}
style={{width:200,marginTop:10,borderRadius:8}}
/>

)}

<br/><br/>

<button onClick={registrarFalla}>
Registrar falla
</button>

</div>

)

}