"use client"

import { useEffect,useState } from "react"
import { supabase } from "@/lib/supabaseClient"

export default function PanelConductor(){

const [ambulancias,setAmbulancias] = useState<any[]>([])
const [ambulanciaId,setAmbulanciaId] = useState("")
const [ambulancia,setAmbulancia] = useState<any>(null)

const [nuevoKm,setNuevoKm] = useState("")
const [kmMtto,setKmMtto] = useState("")
const [descripcion,setDescripcion] = useState("")
const [criticidad,setCriticidad] = useState("media")
const [archivo,setArchivo] = useState<File | null>(null)

useEffect(()=>{

cargarAmbulancias()

},[])

async function cargarAmbulancias(){

const {data} = await supabase
.from("ambulancias")
.select("*")
.order("codigo_operativo")

if(data) setAmbulancias(data)

}

async function seleccionarAmbulancia(id:string){

setAmbulanciaId(id)

const {data} = await supabase
.from("ambulancias")
.select("*")
.eq("id",id)
.single()

if(data) setAmbulancia(data)

}

async function actualizarKilometraje(){

if(!nuevoKm || !ambulanciaId) return

const {error} = await supabase
.from("ambulancias")
.update({
kilometraje_actual:parseInt(nuevoKm)
})
.eq("id",ambulanciaId)

if(error){

alert("Error registrando kilometraje")
return

}

alert("Kilometraje registrado")

setNuevoKm("")

}

async function guardarMttoPreventivo(){

if(!kmMtto || !ambulanciaId) return

const {error} = await supabase
.from("ambulancias")
.update({
kilometraje_mtto:parseInt(kmMtto)
})
.eq("id",ambulanciaId)

if(error){

alert("Error guardando mantenimiento")
return

}

alert("Mantenimiento preventivo actualizado")

setKmMtto("")

}

async function registrarFalla(){

if(!descripcion || !ambulanciaId) return

let url=null

if(archivo){

const nombre=Date.now()+"_"+archivo.name

const {data,error}=await supabase.storage
.from("fallas")
.upload(nombre,archivo)

if(!error) url=data?.path

}

const {error}=await supabase
.from("reportes_fallas")
.insert({

ambulancia_id:ambulanciaId,
descripcion:descripcion,
imagen_url:url,
usuario:"conductor",
criticidad:criticidad,
estado:"abierta"

})

if(error){

alert("Error registrando falla")
return

}

alert("Falla registrada")

setDescripcion("")
setArchivo(null)

}

return(

<div style={{padding:40,fontFamily:"Arial"}}>

<h1>Registro de Ambulancias</h1>

<hr/>

<h2>Seleccionar Ambulancia</h2>

<select
value={ambulanciaId}
onChange={(e)=>seleccionarAmbulancia(e.target.value)}
>

<option value="">Seleccione ambulancia</option>

{ambulancias.map(a=>(

<option key={a.id} value={a.id}>
{a.codigo_operativo} - {a.placa}
</option>

))}

</select>

<hr/>

{ambulancia && (

<>

<h2>Registrar Kilometraje</h2>

<input
type="number"
placeholder="Nuevo kilometraje"
value={nuevoKm}
onChange={(e)=>setNuevoKm(e.target.value)}
/>

<button onClick={actualizarKilometraje}>
Registrar KM
</button>

<hr/>

<h2>Mantenimiento Preventivo</h2>

<p>
Próximo mantenimiento actual: {ambulancia.kilometraje_mtto || "-"}
</p>

<input
type="number"
placeholder="Nuevo kilometraje mantenimiento"
value={kmMtto}
onChange={(e)=>setKmMtto(e.target.value)}
/>

<button onClick={guardarMttoPreventivo}>
Guardar mantenimiento
</button>

<hr/>

<h2>Reportar Falla</h2>

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
onChange={(e)=>setArchivo(e.target.files?.[0] || null)}
/>

<br/><br/>

<button onClick={registrarFalla}>
Registrar falla
</button>

</>

)}

</div>

)

}