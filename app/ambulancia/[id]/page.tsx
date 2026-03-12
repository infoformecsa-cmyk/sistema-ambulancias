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

useEffect(()=>{

cargarAmbulancia()

},[])

async function cargarAmbulancia(){

const {data,error} = await supabase
.from("ambulancias")
.select("*")
.eq("id",id)
.single()

if(data) setAmbulancia(data)

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

if(!descripcion) return

let url = null

if(archivo){

const nombre = Date.now()+"_"+archivo.name

const {data,error} = await supabase.storage
.from("fallas")
.upload(nombre,archivo)

if(!error){

url = data?.path

}

}

const {error} = await supabase
.from("reportes_fallas")
.insert({

ambulancia_id:id,
descripcion:descripcion,
imagen_url:url,
usuario:localStorage.getItem("nombre")

})

if(error){

alert("Error registrando falla")
return

}

alert("Falla registrada")

setDescripcion("")
setArchivo(null)

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

<select>
<option>Media</option>
<option>Alta</option>
<option>Crítica</option>
</select>

<br/><br/>

<input
type="file"
onChange={(e)=>setArchivo(e.target.files?.[0] || null)}
/>

<br/><br/>

<button onClick={registrarFalla}>
Registrar falla
</button>

</div>

)

}