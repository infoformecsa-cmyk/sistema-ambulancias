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
const [fotoEdit,setFotoEdit] = useState<File | null>(null)

const bloqueado = useRef(false)

const [esAdmin,setEsAdmin] = useState(false)
const [editando,setEditando] = useState<any>(null)

/* ========================= */
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

/* ========================= */
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

/* ========================= */
/* KM */
/* ========================= */
async function actualizarKilometraje(){
if(!nuevoKm) return

await supabase
.from("ambulancias")
.update({ kilometraje_actual: Number(nuevoKm) })
.eq("id",id)

setNuevoKm("")
cargarAmbulancia()
}

async function guardarMtto(){
if(!kmMtto) return

await supabase
.from("ambulancias")
.update({ kilometraje_mtto: Number(kmMtto) })
.eq("id",id)

setKmMtto("")
cargarAmbulancia()
}

/* ========================= */
/* FOTO */
/* ========================= */
async function subirFoto(file:File | null){
if(!file) return null

const nombre = `ambulancia_${id}_${Date.now()}`

const { error } = await supabase.storage
.from("ambulancias")
.upload(nombre, file, { upsert:true })

if(error){
alert("Error subiendo imagen")
return null
}

const { data } = supabase.storage
.from("ambulancias")
.getPublicUrl(nombre)

return data.publicUrl
}

/* ========================= */
/* CAMBIO ESTADO */
/* ========================= */
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
.update({ fecha_fin:new Date().toISOString() })
.eq("id",last.id)
}

const foto_url = await subirFoto(foto)

await supabase
.from("historial_operativo")
.insert({
ambulancia_id:id,
estado:estadoPendiente,
motivo:motivoCambio,
fecha_inicio:new Date().toISOString(),
usuario,
foto_url,
tipo_mantenimiento:null,
area:[] // 🔥 CAMBIO
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

/* ========================= */
/* EDITAR */
/* ========================= */
async function guardarEdicion(){

let nuevaFoto = editando.foto_url

if(fotoEdit){
const url = await subirFoto(fotoEdit)
if(url) nuevaFoto = url
}

await supabase
.from("historial_operativo")
.update({
estado:editando.estado,
motivo:editando.motivo,
fecha_inicio:new Date(editando.fecha_inicio).toISOString(),
tipo_mantenimiento: editando.tipo_mantenimiento,
area: editando.area,
foto_url: nuevaFoto
})
.eq("id",editando.id)

setEditando(null)
setFotoEdit(null)
cargarHistorial()
}

/* ========================= */
/* VISUAL */
/* ========================= */
function estadoColor(){
if(ambulancia.estado === "operativa") return "#16a34a"
if(ambulancia.estado === "mantenimiento") return "#f59e0b"
return "#dc2626"
}

function renderAlerta(){
if(ambulancia.estado === "no operativa"){
return <div style={alertRed}>🚨 FUERA DE SERVICIO</div>
}
if(ambulancia.estado === "mantenimiento"){
return <div style={alertYellow}>🔧 EN MANTENIMIENTO</div>
}
return <div style={alertGreen}>✅ OPERATIVA</div>
}

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

async function eliminarEvento(idEvento:string){
if(!confirm("Eliminar registro?")) return
await supabase.from("historial_operativo").delete().eq("id",idEvento)
cargarHistorial()
}

if(!ambulancia) return <div style={{padding:40}}>Cargando...</div>

return(
<div style={{padding:30,fontFamily:"Arial",maxWidth:900}}>

<h1>🚑 Ficha Mecánica</h1>

<div style={{background:"#e5f3ff",padding:15,borderRadius:10}}>
<h2>{ambulancia.codigo_operativo} | {ambulancia.placa}</h2>
</div>

<button onClick={()=>router.push("/dashboard")}>← Volver</button>

<hr/>

<h2>Estado Operativo</h2>

<div style={{background:"#f3f4f6",padding:15,borderRadius:8}}>
<p><b>KM:</b> {ambulancia.kilometraje_actual}</p>
<p><b>Estado:</b> <span style={{color:estadoColor()}}>{ambulancia.estado}</span></p>
{renderAlerta()}
</div>

<div style={{marginTop:10,display:"flex",gap:10}}>
<button onClick={()=>abrirCambioEstado("operativa")} style={btnGreen}>Operativa</button>
<button onClick={()=>abrirCambioEstado("mantenimiento")} style={btnYellow}>Mantenimiento</button>
<button onClick={()=>abrirCambioEstado("no operativa")} style={btnRed}>Fuera servicio</button>
</div>

<hr/>

<h2>Registro Diario</h2>
<input type="number" value={nuevoKm} onChange={(e)=>setNuevoKm(e.target.value)} />
<button onClick={actualizarKilometraje}>Actualizar</button>

<hr/>

<h2>Mantenimiento Preventivo</h2>
<p>Próximo: {ambulancia.kilometraje_mtto || "-"}</p>
<input type="number" value={kmMtto} onChange={(e)=>setKmMtto(e.target.value)} />
<button onClick={guardarMtto}>Guardar</button>

<hr/>

<h2>Historial Operativo</h2>

<table style={{width:"100%"}}>
<thead>
<tr>
<th>Fecha</th>
<th>Estado</th>
<th>Tipo</th>
<th>Área</th>
<th>Motivo</th>
<th>Tiempo</th>
<th>Foto</th>
<th></th>
</tr>
</thead>

<tbody>
{historial.map(h=>(
<tr key={h.id}>
<td>{new Date(h.fecha_inicio).toLocaleString()}</td>
<td>{h.estado}</td>
<td>{h.tipo_mantenimiento || "-"}</td>
<td>{Array.isArray(h.area) ? h.area.join(", ") : "-"}</td>
<td>{h.motivo}</td>
<td>{calcularTiempo(h.fecha_inicio,h.fecha_fin)}</td>

<td>
{h.foto_url && (
<img src={h.foto_url} style={{width:60}} onClick={()=>setFotoVista(h.foto_url)} />
)}
</td>

<td>
<button onClick={()=>setEditando({...h, area:h.area || []})}>✏️</button>
<button onClick={()=>eliminarEvento(h.id)}>🗑</button>
</td>

</tr>
))}
</tbody>
</table>

{/* MODAL EDITAR */}
{editando && (
<div style={modalBg}>
<div style={modalBox}>

<h3>Editar registro</h3>

<input type="datetime-local"
value={new Date(editando.fecha_inicio).toISOString().slice(0,16)}
onChange={(e)=>setEditando({...editando,fecha_inicio:e.target.value})}
/>

<select value={editando.estado}
onChange={(e)=>setEditando({...editando,estado:e.target.value})}>
<option value="operativa">Operativa</option>
<option value="mantenimiento">Mantenimiento</option>
<option value="no operativa">No operativa</option>
</select>

<select value={editando.tipo_mantenimiento || ""}
onChange={(e)=>setEditando({...editando,tipo_mantenimiento:e.target.value})}>
<option value="">Tipo</option>
<option value="correctivo">Correctivo</option>
<option value="preventivo">Preventivo</option>
</select>

{/* 🔥 MULTI ÁREA */}
<div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
{["mecanico","electrico","ac"].map(a=>(
<label key={a}>
<input
type="checkbox"
checked={editando.area?.includes(a)}
onChange={(e)=>{
let nuevas = editando.area || []
if(e.target.checked){
nuevas = [...nuevas, a]
}else{
nuevas = nuevas.filter((x:string)=>x !== a)
}
setEditando({...editando, area:nuevas})
}}
/>
{a}
</label>
))}
</div>

<textarea value={editando.motivo}
onChange={(e)=>setEditando({...editando,motivo:e.target.value})}/>

<input type="file" onChange={(e)=>setFotoEdit(e.target.files?.[0] || null)} />

<button onClick={guardarEdicion}>Guardar</button>
<button onClick={()=>setEditando(null)}>Cancelar</button>

</div>
</div>
)}

</div>
)
}

/* estilos */
const btnGreen: CSSProperties = {background:"#16a34a",color:"white",padding:10}
const btnYellow: CSSProperties = {background:"#f59e0b",color:"white",padding:10}
const btnRed: CSSProperties = {background:"#dc2626",color:"white",padding:10}

const alertGreen: CSSProperties = {background:"#dcfce7",padding:10}
const alertYellow: CSSProperties = {background:"#fef9c3",padding:10}
const alertRed: CSSProperties = {background:"#fee2e2",padding:10}

const modalBg: CSSProperties = {
position:"fixed",
top:0,left:0,width:"100%",height:"100%",
background:"rgba(0,0,0,0.5)",
display:"flex",justifyContent:"center",alignItems:"center"
}

const modalBox: CSSProperties = {
background:"white",padding:20,borderRadius:10
}