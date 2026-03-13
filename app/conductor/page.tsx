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

const [mensaje,setMensaje] = useState("")
const [tipoMensaje,setTipoMensaje] = useState("ok")

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

function mostrarMensaje(texto:string,tipo="ok"){

setMensaje(texto)
setTipoMensaje(tipo)

setTimeout(()=>{
setMensaje("")
},3000)

}

function cerrarSesion(){

localStorage.clear()
router.push("/")

}

async function registrarKM(){

if(!ambulanciaId || !km){
mostrarMensaje("Seleccione ambulancia y kilometraje","error")
return
}

const valor = parseInt(km)

if(valor<=0){
mostrarMensaje("Kilometraje inválido","error")
return
}

const {error} = await supabase
.from("ambulancias")
.update({
kilometraje_actual: valor
})
.eq("id",ambulanciaId)

if(error){
mostrarMensaje("Error registrando kilometraje","error")
return
}

mostrarMensaje("Kilometraje registrado correctamente")

setKm("")

}

async function guardarMtto(){

if(!ambulanciaId || !mtto){
mostrarMensaje("Ingrese kilometraje de mantenimiento","error")
return
}

const valor = parseInt(mtto)

const {error} = await supabase
.from("ambulancias")
.update({
kilometraje_mtto: valor
})
.eq("id",ambulanciaId)

if(error){
mostrarMensaje("Error guardando mantenimiento","error")
return
}

mostrarMensaje("Mantenimiento preventivo registrado")

setMtto("")

}

async function registrarFalla(){

if(!ambulanciaId || !descripcion){
mostrarMensaje("Ingrese descripción de la falla","error")
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
mostrarMensaje("Error registrando falla","error")
return
}

mostrarMensaje("Falla registrada correctamente")

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

{mensaje && (

<div style={{
marginTop:15,
padding:12,
border:"1px solid",
background: tipoMensaje==="error" ? "#f8d7da" : "#d4edda",
borderColor: tipoMensaje==="error" ? "#dc3545" : "#28a745",
color: tipoMensaje==="error" ? "#721c24" : "#155724"
}}>
{mensaje}
</div>

)}

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