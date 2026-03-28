"use client"

import { useEffect, useState, useRef } from "react"
import type { CSSProperties } from "react"
import { supabase } from "@/lib/supabaseClient"
import { useRouter, useParams } from "next/navigation"

export default function FichaAmbulancia(){

const router = useRouter()
const params = useParams()
const id = params?.id as string

const [ambulancia,setAmbulancia] = useState<any>(null)
const [historial,setHistorial] = useState<any[]>([])

const [nuevoKm,setNuevoKm] = useState("")
const [kmMtto,setKmMtto] = useState("")

const [mostrarModal,setMostrarModal] = useState(false)
const [estadoPendiente,setEstadoPendiente] = useState("")
const [motivoCambio,setMotivoCambio] = useState("")
const [loading,setLoading] = useState(false)

const [foto,setFoto] = useState<File | null>(null)
const [fotoVista,setFotoVista] = useState<string | null>(null)

const bloqueado = useRef(false)

const [esAdmin,setEsAdmin] = useState(false)
const [editando,setEditando] = useState<any>(null)

useEffect(()=>{
const correo =
localStorage.getItem("correo") ||
localStorage.getItem("email") ||
localStorage.getItem("user")

if(correo?.includes("admin@ambulancias.ec")){
setEsAdmin(true)
}
},[])

useEffect(()=>{
if(!id) return
cargarTodo()
},[id])

async function cargarTodo(){
await Promise.all([
cargarAmbulancia(),
cargarHistorial()
])
}

async function cargarAmbulancia(){
const {data} = await supabase
.from("ambulancias")
.select("*")
.eq("id",id)
.single()

if(data) setAmbulancia(data)
}

async function cargarHistorial(){
const {data} = await supabase
.from("historial_operativo")
.select("*")
.eq("ambulancia_id",id)
.order("fecha_inicio",{ascending:false})

setHistorial(data || [])
}

/* KM */
async function actualizarKilometraje(){
if(!nuevoKm) return
await supabase.from("ambulancias")
.update({ kilometraje_actual: Number(nuevoKm) })
.eq("id",id)
setNuevoKm("")
cargarAmbulancia()
}

async function guardarMtto(){
if(!kmMtto) return
await supabase.from("ambulancias")
.update({ kilometraje_mtto: Number(kmMtto) })
.eq("id",id)
setKmMtto("")
cargarAmbulancia()
}

/* FOTO */
async function subirFoto(): Promise<string | null>{
if(!foto) return null

const nombre = `ambulancia_${id}_${Date.now()}`
const { error } = await supabase.storage
.from("ambulancias")
.upload(nombre, foto, { upsert: true })

if(error){
alert("Error subiendo imagen")
return null
}

const { data } = supabase.storage
.from("ambulancias")
.getPublicUrl(nombre)

return data.publicUrl
}

/* CAMBIO ESTADO */
function abrirCambioEstado(estado:string){
setEstadoPendiente(estado)
setMostrarModal(true)
}

async function confirmarCambioEstado(){

if(loading || bloqueado.current) return

bloqueado.current = true
setLoading(true)

if(!motivoCambio){
alert("Ingrese motivo")
setLoading(false)
bloqueado.current = false
return
}

try{

const usuario = localStorage.getItem("nombre")

const {data:ultimo} = await supabase
.from("historial_operativo")
.select("*")
.eq("ambulancia_id",id)
.order("fecha_inicio",{ascending:false})
.limit(1)

const last = ultimo?.[0]

if(last && !last.fecha_fin){
await supabase
.from("historial_operativo")
.update({ fecha_fin: new Date().toISOString() })
.eq("id", last.id)
}

const foto_url = await subirFoto()

await supabase
.from("historial_operativo")
.insert({
ambulancia_id:id,
estado:estadoPendiente,
motivo:motivoCambio,
fecha_inicio:new Date().toISOString(),
usuario,
foto_url,
tipo_mantenimiento: "correctivo", // default
area: "mecanico" // default
})

await supabase
.from("ambulancias")
.update({
estado:estadoPendiente,
motivo_no_operativo:
estadoPendiente === "operativa" ? null : motivoCambio
})
.eq("id",id)

setMostrarModal(false)
setMotivoCambio("")
setFoto(null)

await cargarTodo()

}catch{
alert("Error en cambio de estado")
}

setLoading(false)
bloqueado.current = false
}

/* EDITAR */
async function guardarEdicion(){

await supabase
.from("historial_operativo")
.update({
estado:editando.estado,
motivo:editando.motivo,
fecha_inicio:new Date(editando.fecha_inicio).toISOString(),
tipo_mantenimiento: editando.tipo_mantenimiento,
area: editando.area
})
.eq("id",editando.id)

setEditando(null)
cargarHistorial()
}

/* UI */

function calcularTiempo(i:string,f:string|null){
const inicio = new Date(i)
const fin = f ? new Date(f) : new Date()
const diff = fin.getTime() - inicio.getTime()

const horas = Math.floor(diff / (1000*60*60))
const dias = Math.floor(horas / 24)
const horasRest = horas % 24

if(dias > 0) return `${dias}d ${horasRest}h`
return `${horas} h`
}

if(!ambulancia) return <div style={{padding:40}}>Cargando...</div>

return(
<div style={{padding:30,fontFamily:"Arial",maxWidth:900}}>

<h1>🚑 Ficha Mecánica</h1>

<h2>{ambulancia.codigo_operativo} | {ambulancia.placa}</h2>

<button onClick={()=>router.push("/dashboard")}>← Volver</button>

<hr/>

<h2>Historial Operativo</h2>

<table style={{width:"100%",borderCollapse:"collapse"}}>
<thead style={{background:"#f3f4f6"}}>
<tr>
<th>Fecha</th>
<th>Estado</th>
<th>Tipo</th>
<th>Área</th>
<th>Motivo</th>
<th>Tiempo</th>
<th></th>
</tr>
</thead>

<tbody>
{historial.map(h=>(
<tr key={h.id}>

<td>{new Date(h.fecha_inicio).toLocaleString()}</td>
<td>{h.estado}</td>
<td>{h.tipo_mantenimiento || "-"}</td>
<td>{h.area || "-"}</td>
<td>{h.motivo}</td>
<td>{calcularTiempo(h.fecha_inicio,h.fecha_fin)}</td>

<td>
{esAdmin && <button onClick={()=>setEditando({...h})}>✏️</button>}
</td>

</tr>
))}
</tbody>

</table>

{/* EDITAR */}
{editando && (
<div style={modalBg}>
<div style={modalBox}>

<h3>Editar registro</h3>

<select
value={editando.tipo_mantenimiento || ""}
onChange={(e)=>setEditando({...editando,tipo_mantenimiento:e.target.value})}
>
<option value="">Tipo</option>
<option value="correctivo">Correctivo</option>
<option value="preventivo">Preventivo</option>
</select>

<br/><br/>

<select
value={editando.area || ""}
onChange={(e)=>setEditando({...editando,area:e.target.value})}
>
<option value="">Área</option>
<option value="mecanico">Mecánico</option>
<option value="electrico">Eléctrico</option>
<option value="ac">A/C</option>
</select>

<br/><br/>

<button onClick={guardarEdicion}>Guardar</button>
<button onClick={()=>setEditando(null)}>Cancelar</button>

</div>
</div>
)}

</div>
)
}

/* estilos */
const modalBg: CSSProperties = {
position:"fixed",
top:0,left:0,width:"100%",height:"100%",
background:"rgba(0,0,0,0.5)",
display:"flex",justifyContent:"center",alignItems:"center"
}

const modalBox: CSSProperties = {
background:"white",padding:20,width:400,borderRadius:10
}