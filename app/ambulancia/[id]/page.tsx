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

/* 🔥 NUEVO NIVEL 2 */
const [mostrarModal,setMostrarModal] = useState(false)
const [estadoPendiente,setEstadoPendiente] = useState("")
const [motivoCambio,setMotivoCambio] = useState("")
const [loading,setLoading] = useState(false)

/* 🔥 CARGA OPTIMIZADA */
useEffect(()=>{
if(!id) return

async function init(){
await Promise.all([
cargarAmbulancia(),
cargarFallas(),
cargarHistorial()
])
}

init()

},[id])

async function cargarAmbulancia(){
const {data} = await supabase
.from("ambulancias")
.select("*")
.eq("id",id)
.single()

if(data) setAmbulancia(data)
}

async function cargarFallas(){
const {data} = await supabase
.from("reportes_fallas")
.select("*")
.eq("ambulancia_id",id)
.order("created_at",{ascending:false})

setFallas(data || [])
}

async function cargarHistorial(){
const {data} = await supabase
.from("historial_operativo")
.select("*")
.eq("ambulancia_id",id)
.order("fecha_inicio",{ascending:false})

setHistorial(data || [])
}

/* 🔥 MODAL CONTROL */
function abrirCambioEstado(estado:string){
setEstadoPendiente(estado)
setMostrarModal(true)
}

/* 🔥 CONFIRMACIÓN SEGURA */
async function confirmarCambioEstado(){

if(loading) return

if(!motivoCambio){
alert("Debe ingresar un motivo")
return
}

if(!ambulancia) return

setLoading(true)

try{

const usuario = localStorage.getItem("nombre")

await supabase
.from("historial_operativo")
.update({ fecha_fin: new Date().toISOString() })
.eq("ambulancia_id",ambulancia.id)
.is("fecha_fin",null)

await supabase
.from("historial_operativo")
.insert({
ambulancia_id:ambulancia.id,
estado:estadoPendiente,
motivo:motivoCambio,
fecha_inicio:new Date().toISOString(),
usuario
})

await supabase
.from("ambulancias")
.update({
estado:estadoPendiente,
motivo_no_operativo:
estadoPendiente === "operativa"
? null
: motivoCambio
})
.eq("id",ambulancia.id)

alert("Estado actualizado correctamente")

setMostrarModal(false)
setMotivoCambio("")
setEstadoPendiente("")

await Promise.all([
cargarAmbulancia(),
cargarHistorial()
])

}catch(e){
console.log(e)
alert("Error cambiando estado")
}

setLoading(false)

}

/* RESTO FUNCIONES (sin cambios críticos) */

async function actualizarKilometraje(){
if(!nuevoKm) return

await supabase
.from("ambulancias")
.update({ kilometraje_actual: Number(nuevoKm) })
.eq("id",id)

alert("Kilometraje actualizado")
setNuevoKm("")
cargarAmbulancia()
}

async function guardarMttoPreventivo(){
if(!kmMtto) return

await supabase
.from("ambulancias")
.update({ kilometraje_mtto: Number(kmMtto) })
.eq("id",id)

alert("Mantenimiento registrado")
setKmMtto("")
cargarAmbulancia()
}

async function registrarFalla(){

if(!descripcion){
alert("Ingrese la descripción")
return
}

let rutaImagen = null

if(archivo){
const nombreArchivo = `reportes/${Date.now()}_${archivo.name}`

const {data,error} = await supabase.storage
.from("Fallas")
.upload(nombreArchivo,archivo)

if(error){
alert("Error subiendo imagen")
return
}

rutaImagen = data.path
}

await supabase
.from("reportes_fallas")
.insert({
ambulancia_id:id,
descripcion,
imagen_url:rutaImagen,
usuario:localStorage.getItem("nombre"),
criticidad,
estado:"abierta"
})

alert("Falla registrada")

setDescripcion("")
setArchivo(null)
setPreview(null)

cargarFallas()

}

function manejarArchivo(e:any){
const file = e.target.files?.[0]
if(!file) return
setArchivo(file)
setPreview(URL.createObjectURL(file))
}

function obtenerImagen(path:string){
if(!path) return null
const {data} = supabase.storage.from("Fallas").getPublicUrl(path)
return data.publicUrl
}

function calcularTiempo(inicio:string, fin:string | null){
const i = new Date(inicio)
const f = fin ? new Date(fin) : new Date()
const diff = f.getTime() - i.getTime()
const h = Math.floor(diff / (1000*60*60))
const m = Math.floor((diff % (1000*60*60)) / (1000*60))
return `${h} h ${m} min`
}

if(!ambulancia) return <div style={{padding:40}}>Cargando...</div>

return(

<div style={{padding:40,fontFamily:"Arial"}}>

<h1>Ficha Mecánica Ambulancia</h1>

<button onClick={()=>router.push("/dashboard")}>
← Volver
</button>

<hr/>

<h2>Estado</h2>

<p><b>Kilometraje actual:</b> {ambulancia.kilometraje_actual || 0}</p>
<p><b>Estado:</b> {ambulancia.estado}</p>

{/* 🔥 BOTONES */}
<div style={{marginTop:10, marginBottom:20}}>

<button onClick={()=>abrirCambioEstado("operativa")}>
🟢 Operativa
</button>

<button onClick={()=>abrirCambioEstado("mantenimiento")}>
🔧 Mantenimiento
</button>

<button onClick={()=>abrirCambioEstado("no operativa")}>
🔴 Fuera de servicio
</button>

</div>

{/* 🔥 MODAL */}
{mostrarModal && (

<div style={{
position:"fixed",
top:0,left:0,
width:"100%",height:"100%",
background:"rgba(0,0,0,0.5)",
display:"flex",
justifyContent:"center",
alignItems:"center"
}}>

<div style={{background:"white",padding:20,width:400,borderRadius:10}}>

<h3>Motivo del cambio</h3>

<p><b>{estadoPendiente}</b></p>

<textarea
value={motivoCambio}
onChange={(e)=>setMotivoCambio(e.target.value)}
style={{width:"100%",height:100}}
/>

<br/><br/>

<button onClick={confirmarCambioEstado} disabled={loading}>
{loading ? "Guardando..." : "Confirmar"}
</button>

<button onClick={()=>setMostrarModal(false)}>
Cancelar
</button>

</div>

</div>

)}

<hr/>

<h2>Historial Operativo</h2>

<table border={1} style={{width:"100%"}}>

<tbody>
{historial.map(h=>(
<tr key={h.id}>
<td>{h.estado}</td>
<td>{h.motivo}</td>
<td>{calcularTiempo(h.fecha_inicio,h.fecha_fin)}</td>
</tr>
))}
</tbody>

</table>

</div>

)

}