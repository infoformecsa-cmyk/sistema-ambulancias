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
const [areas,setAreas] = useState<string[]>([])
const [foto,setFoto] = useState<File | null>(null)

const [loading,setLoading] = useState(false)

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

function toggleArea(a:string){
if(areas.includes(a)){
setAreas(areas.filter(x=>x!==a))
}else{
setAreas([...areas,a])
}
}

/* ========================= */

async function confirmarCambioEstado(){

setLoading(true)

let fotoUrl = null

/* 🔥 SUBIDA IMAGEN */
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

await supabase.from("ambulancias")
.update({ estado: estadoPendiente })
.eq("id",id)

await supabase.from("historial_operativo").insert({
ambulancia_id: id,
estado: estadoPendiente,
motivo: motivoCambio,
tipo_mantenimiento: tipoMtto,
area: areas.join(", "),
foto_url: fotoUrl,
fecha_inicio: new Date().toISOString()
})

setMostrarModal(false)
setMotivoCambio("")
setTipoMtto("")
setAreas([])
setFoto(null)

cargarTodo()
setLoading(false)
}

/* ========================= */

async function eliminarRegistro(idRegistro:string){
if(!confirm("¿Eliminar?")) return
await supabase.from("historial_operativo").delete().eq("id",idRegistro)
cargarHistorial()
}

/* ========================= */

function estadoColor(){
if(ambulancia.estado==="operativa") return "#22c55e"
if(ambulancia.estado==="mantenimiento") return "#f59e0b"
return "#ef4444"
}

/* ========================= */

if(!ambulancia) return <div style={loadingStyle}>Cargando...</div>

return(
<div style={container}>

<h1>🚑 {ambulancia.codigo_operativo}</h1>

{/* BOTONES */}
<div style={acciones}>

<button
onClick={()=>{
setEstadoPendiente("operativa")
setMostrarModal(true)
}}
style={btn("#22c55e")}
>
Operativa
</button>

<button
onClick={()=>{
setEstadoPendiente("mantenimiento")
setMostrarModal(true)
}}
style={btn("#f59e0b")}
>
Mtto
</button>

<button
onClick={()=>{
setEstadoPendiente("no operativa")
setMostrarModal(true)
}}
style={btn("#ef4444")}
>
Fuera
</button>

</div>

{/* ================= HISTORIAL ================= */}

<div style={section}>
<h3>📋 Historial Operativo</h3>

{/* HEADER TABLA */}
<div style={rowHeader}>
<div>Fecha</div>
<div>Estado</div>
<div>Tipo</div>
<div>Área</div>
<div>Motivo</div>
<div>Foto</div>
<div></div>
</div>

{historial.map(h=>(
<div key={h.id} style={row}>

<div>{new Date(h.fecha_inicio).toLocaleString()}</div>

<div style={{color:estadoColor()}}>{h.estado}</div>

<div>{h.tipo_mantenimiento || "-"}</div>

<div>{h.area || "-"}</div>

<div>{h.motivo}</div>

<div>
{h.foto_url && (
<a href={h.foto_url} target="_blank">📷</a>
)}
</div>

<div style={{display:"flex",gap:5}}>
<button>✏️</button>
<button onClick={()=>eliminarRegistro(h.id)}>🗑</button>
</div>

</div>
))}

</div>

{/* ================= MODAL ================= */}

{mostrarModal && (
<div style={modalBg}>
<div style={modal}>

<h3>Cambiar estado</h3>

<textarea
placeholder="Motivo"
value={motivoCambio}
onChange={e=>setMotivoCambio(e.target.value)}
style={textarea}
/>

<select value={tipoMtto} onChange={e=>setTipoMtto(e.target.value)} style={input}>
<option value="">Tipo</option>
<option value="mecanico">Mecánico</option>
<option value="electrico">Eléctrico</option>
<option value="aire">Aire</option>
</select>

<div>
<label><input type="checkbox" onChange={()=>toggleArea("motor")} /> Motor</label>
<label><input type="checkbox" onChange={()=>toggleArea("luces")} /> Luces</label>
<label><input type="checkbox" onChange={()=>toggleArea("aire")} /> Aire</label>
</div>

<input type="file" onChange={e=>setFoto(e.target.files?.[0] || null)} />

<div style={{marginTop:10}}>
<button onClick={confirmarCambioEstado}>
{loading ? "Guardando..." : "Guardar"}
</button>

<button onClick={()=>setMostrarModal(false)}>
Cancelar
</button>
</div>

</div>
</div>
)}

</div>
)
}

/* ================= ESTILOS ================= */

const container:CSSProperties={padding:20,color:"white",background:"#020617",minHeight:"100vh"}

const acciones={display:"flex",gap:10,marginBottom:20}

const btn=(c:string)=>({background:c,padding:10,borderRadius:6})

const section={background:"#111827",padding:15,borderRadius:10}

const rowHeader={
display:"grid",
gridTemplateColumns:"1fr 1fr 1fr 1fr 2fr 1fr auto",
fontWeight:"bold",
marginBottom:10
}

const row={
display:"grid",
gridTemplateColumns:"1fr 1fr 1fr 1fr 2fr 1fr auto",
padding:10,
borderBottom:"1px solid #1f2937"
}

const modalBg:CSSProperties={
position:"fixed",
top:0,left:0,right:0,bottom:0,
background:"rgba(0,0,0,0.7)",
display:"flex",
justifyContent:"center",
alignItems:"center"
}

const modal:CSSProperties={
background:"#111827",
padding:20,
borderRadius:10,
width:400
}

const textarea={width:"100%",marginBottom:10}
const input={width:"100%",marginBottom:10}
const loadingStyle={color:"white",padding:50}