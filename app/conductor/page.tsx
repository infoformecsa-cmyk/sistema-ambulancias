"use client"

import { useEffect,useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { useRouter } from "next/navigation"

export default function Conductor(){

const router = useRouter()

const [nombre,setNombre] = useState("")
const [ambulancias,setAmbulancias] = useState<any[]>([])
const [ambulanciaId,setAmbulanciaId] = useState("")

const [km,setKm] = useState("")
const [mtto,setMtto] = useState("")
const [descripcion,setDescripcion] = useState("")
const [criticidad,setCriticidad] = useState("media")

useEffect(()=>{

const r = localStorage.getItem("rol")
const n = localStorage.getItem("nombre")

if(!r){
router.push("/")
return
}

if(r!=="conductor"){
router.push("/dashboard")
return
}

setNombre(n || "")

cargarAmbulancias()

},[])

async function cargarAmbulancias(){

const {data,error} = await supabase
.from("ambulancias")
.select("id,codigo_operativo")
.order("codigo_operativo")

if(error){
console.log(error)
return
}

if(data) setAmbulancias(data)

}

function cerrarSesion(){

localStorage.clear()
router.push("/")

}

async function registrarKM(){

if(!ambulanciaId || !km){
alert("Seleccione ambulancia y kilometraje")
return
}

const {error} = await supabase
.from("ambulancias")
.update({
kilometraje_actual: parseInt(km)
})
.eq("id",ambulanciaId)

if(error){
alert("Error registrando kilometraje")
return
}

alert("Kilometraje registrado")

setKm("")

}

async function guardarMtto(){

if(!ambulanciaId || !mtto){
alert("Ingrese kilometraje de mantenimiento")
return
}

const {error} = await supabase
.from("ambulancias")
.update({
kilometraje_mtto: parseInt(mtto)
})
.eq("id",ambulanciaId)

if(error){
alert("Error guardando mantenimiento")
return
}

alert("Mantenimiento guardado")

setMtto("")

}

async function registrarFalla(){

if(!ambulanciaId || !descripcion){
alert("Ingrese descripción de la falla")
return
}

const {error} = await supabase
.from("reportes_fallas")
.insert({
ambulancia_id:ambulanciaId,
descripcion:descripcion,
criticidad:criticidad,
usuario:nombre,
estado:"abierta"
})

if(error){
alert("Error registrando falla")
return
}

alert("Falla registrada")

setDescripcion("")
setCriticidad("media")

}

return(

<div style={{padding:40,fontFamily:"Arial"}}>

<h1>Registro de Ambulancias</h1>

<p>
Usuario: {nombre}
</p>

<button onClick={cerrarSesion}>
Cerrar sesión
</button>

<hr/>

<h2>Seleccionar Ambulancia</h2>

<select
value={ambulanciaId}
onChange={(e)=>setAmbulanciaId(e.target.value)}
>

<option value="">
Seleccione ambulancia
</option>

{ambulancias.map(a=>(

<option key={a.id} value={a.id}>
{a.codigo_operativo}
</option>

))}

</select>

<hr/>

<h2>Registrar Kilometraje</h2>

<input
type="number"
placeholder="Kilometraje actual"
value={km}
onChange={(e)=>setKm(e.target.value)}
/>

<button onClick={registrarKM}>
Registrar
</button>

<hr/>

<h2>Próximo mantenimiento preventivo</h2>

<input
type="number"
placeholder="Kilometraje mantenimiento"
value={mtto}
onChange={(e)=>setMtto(e.target.value)}
/>

<button onClick={guardarMtto}>
Guardar
</button>

<hr/>

<h2>Reportar falla</h2>

<textarea
placeholder="Descripción de la falla"
value={descripcion}
onChange={(e)=>setDescripcion(e.target.value)}
style={{width:"100%",height:120}}
/>

<br/><br/>

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

<button onClick={registrarFalla}>
Registrar falla
</button>

</div>

)

}