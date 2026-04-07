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

/* 🔥 NUEVO */
const [tipoMtto,setTipoMtto] = useState("")
const [area,setArea] = useState("")
const [foto,setFoto] = useState<File | null>(null)

const [loading,setLoading] = useState(false)

const bloqueado = useRef(false)

/* ========================= */

useEffect(()=>{
if(!id) return
cargarTodo()
},[id])

async function cargarTodo(){
await Promise.all([cargarAmbulancia(),cargarHistorial()])
}

async function cargarAmbulancia(){
const {data} = await supabase.from("ambulancias").select("*").eq("id",id).single()
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

function abrirCambioEstado(estado:string){
setEstadoPendiente(estado)
setMostrarModal(true)
}

/* ========================= */

async function confirmarCambioEstado(){

if(!estadoPendiente) return

setLoading(true)

let fotoUrl = null

/* 🔥 SUBIR IMAGEN */
if(foto){
const nombre = `${Date.now()}_${foto.name}`

const {data,error} = await supabase.storage
.from("imagenes")
.upload(nombre,foto)

if(data){
const {data:url} = supabase.storage
.from("imagenes")
.getPublicUrl(nombre)

fotoUrl = url.publicUrl
}
}

try{

await supabase
.from("ambulancias")
.update({ estado: estadoPendiente })
.eq("id",id)

await supabase.from("historial_operativo").insert({
ambulancia_id: id,
estado: estadoPendiente,
motivo: motivoCambio,
tipo_mantenimiento: tipoMtto,
area: area,
foto_url: fotoUrl,
fecha_inicio: new Date().toISOString()
})

setMostrarModal(false)
setMotivoCambio("")
setTipoMtto("")
setArea("")
setFoto(null)

cargarTodo()

}catch(err){
console.error(err)
alert("❌ Error al guardar")
}

setLoading(false)
}

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

async function eliminarRegistro(idRegistro:string){
if(!confirm("¿Eliminar registro?")) return
await supabase.from("historial_operativo").delete().eq("id",idRegistro)
cargarHistorial()
}

/* ========================= */

function estadoColor(){
if(ambulancia.estado === "operativa") return "#22c55e"
if(ambulancia.estado === "mantenimiento") return "#f59e0b"
return "#ef4444"
}

/* ========================= */

if(!ambulancia) return <div style={loadingStyle}>🚑 Cargando...</div>

return(
<div style={container}>

{/* HEADER */}
<div style={header}>
<div>
<h1 style={title}>🚑 {ambulancia.codigo_operativo}</h1>
<p style={sub}>Placa: {ambulancia.placa}</p>
</div>

<button onClick={()=>router.push("/dashboard")} style={btnBack}>
⬅ Volver
</button>
</div>

{/* KPI */}
<div style={grid}>

<div style={card}>
<p>KM Actual</p>
<h2>{ambulancia.kilometraje_actual}</h2>
</div>

<div style={card}>
<p>Estado</p>
<h2 style={{color:estadoColor()}}>
{ambulancia.estado}
</h2>
</div>

<div style={card}>
<p>Próx. Mtto</p>
<h2>{ambulancia.kilometraje_mtto || "-"}</h2>
</div>

</div>

{/* ESTADO */}
<div style={{
...estadoBox,
borderColor:estadoColor()
}}>
Estado: {ambulancia.estado.toUpperCase()}
</div>

{/* BOTONES */}
<div style={acciones}>
<button onClick={()=>abrirCambioEstado("operativa")} style={btn("#22c55e")}>Operativa</button>
<button onClick={()=>abrirCambioEstado("mantenimiento")} style={btn("#f59e0b")}>Mtto</button>
<button onClick={()=>abrirCambioEstado("no operativa")} style={btn("#ef4444")}>Fuera</button>
</div>

{/* KM */}
<div style={section}>
<h3>📏 Registro KM</h3>
<input style={input} type="number" value={nuevoKm} onChange={(e)=>setNuevoKm(e.target.value)} />
<button style={btnPrimary} onClick={actualizarKilometraje}>Actualizar</button>
</div>

{/* MTTO */}
<div style={section}>
<h3>🛠 Mantenimiento</h3>
<p>Próximo: {ambulancia.kilometraje_mtto || "-"}</p>
<input style={input} type="number" value={kmMtto} onChange={(e)=>setKmMtto(e.target.value)} />
<button style={btnPrimary} onClick={guardarMtto}>Guardar</button>
</div>

{/* HISTORIAL */}
<div style={section}>
<h3>📋 Historial</h3>

<div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr 2fr 1fr auto",fontWeight:"bold"}}>
<div>Fecha</div>
<div>Estado</div>
<div>Tipo</div>
<div>Área</div>
<div>Motivo</div>
<div>Foto</div>
<div></div>
</div>

{historial.map(h=>(
<div key={h.id} style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr 2fr 1fr auto",gap:10,padding:10}}>

<div>{new Date(h.fecha_inicio).toLocaleString()}</div>
<div style={{color:estadoColor()}}>{h.estado}</div>
<div>{h.tipo_mantenimiento || "-"}</div>
<div>{h.area || "-"}</div>
<div>{h.motivo}</div>

<div>
{h.foto_url && <a href={h.foto_url} target="_blank">📷</a>}
</div>

<div>
<button onClick={()=>eliminarRegistro(h.id)}>🗑️</button>
</div>

</div>
))}

</div>

{/* MODAL */}
{mostrarModal && (
<div style={modalBg}>
<div style={modal}>

<h3>Cambiar estado</h3>

<p>Nuevo estado: <b>{estadoPendiente}</b></p>

<textarea
placeholder="Motivo del cambio"
value={motivoCambio}
onChange={(e)=>setMotivoCambio(e.target.value)}
style={textarea}
/>

<select value={tipoMtto} onChange={(e)=>setTipoMtto(e.target.value)} style={input}>
<option value="">Tipo de mantenimiento</option>
<option value="preventivo">Preventivo</option>
<option value="correctivo">Correctivo</option>
</select>

<select value={area} onChange={(e)=>setArea(e.target.value)} style={input}>
<option value="">Área</option>
<option value="mecanico">Mecánico</option>
<option value="electrico">Eléctrico</option>
<option value="aire">Aire acondicionado</option>
</select>

<input type="file" onChange={(e)=>setFoto(e.target.files?.[0] || null)} />

<div style={{display:"flex",gap:10,marginTop:10}}>
<button onClick={confirmarCambioEstado} style={btnPrimary}>
{loading ? "Guardando..." : "Confirmar"}
</button>

<button onClick={()=>setMostrarModal(false)} style={btnBack}>
Cancelar
</button>
</div>

</div>
</div>
)}

</div>
)
}

/* ========================= */
/* ESTILOS */
/* ========================= */

const container: CSSProperties = {background:"#020617",color:"white",minHeight:"100vh",padding:30}
const header: CSSProperties = {display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}
const title = {fontSize:30,fontWeight:"bold"}
const sub = {opacity:0.6}
const btnBack: CSSProperties = {background:"#1e293b",padding:"10px 15px",borderRadius:8,color:"white"}
const grid: CSSProperties = {display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:20,marginBottom:20}
const card: CSSProperties = {background:"#0f172a",padding:20,borderRadius:12}
const estadoBox: CSSProperties = {border:"2px solid",padding:10,borderRadius:10,marginBottom:20}
const acciones: CSSProperties = {display:"flex",gap:10,marginBottom:20}
const btn = (c:string): CSSProperties => ({background:c,padding:"10px 15px",borderRadius:8,color:"white"})
const section: CSSProperties = {background:"#0f172a",padding:20,borderRadius:12,marginBottom:20}
const input: CSSProperties = {padding:10,marginTop:5,borderRadius:6,background:"#020617",color:"white"}
const btnPrimary: CSSProperties = {background:"#2563eb",color:"white",padding:"10px 15px",borderRadius:6}
const textarea: CSSProperties = {width:"100%",padding:10,marginTop:10,background:"#020617",color:"white"}
const modalBg: CSSProperties = {position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(0,0,0,0.7)",display:"flex",justifyContent:"center",alignItems:"center"}
const modal: CSSProperties = {background:"#0f172a",padding:20,borderRadius:12,width:400}
const loadingStyle: CSSProperties = {height:"100vh",display:"flex",justifyContent:"center",alignItems:"center",background:"black",color:"white"}