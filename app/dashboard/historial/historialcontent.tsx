"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { useRouter } from "next/navigation"

export default function HistorialContent(){

const router = useRouter()

const [ambulancias,setAmbulancias] = useState<any[]>([])
const [ambulancia,setAmbulancia] = useState<string>("")
const [estado,setEstado] = useState("operativa")
const [motivo,setMotivo] = useState("")
const [tipoFalla,setTipoFalla] = useState("")
const [fechaInicio,setFechaInicio] = useState("")
const [fechaFin,setFechaFin] = useState("")

const [modo,setModo] = useState("nuevo")
const [eventos,setEventos] = useState<any[]>([])
const [eventoSeleccionado,setEventoSeleccionado] = useState<string>("")

const [loading,setLoading] = useState(false)

/* INIT */
useEffect(()=>{
const params = new URLSearchParams(window.location.search)
const amb = params.get("ambulancia")
if(amb) setAmbulancia(amb)
cargar()
},[])

/* cargar ambulancias */
async function cargar(){
const {data} = await supabase
.from("ambulancias")
.select("*")
.order("codigo_operativo")

setAmbulancias(data || [])
}

/* cargar eventos */
useEffect(()=>{
if(ambulancia){
cargarEventos()
}
},[ambulancia])

async function cargarEventos(){
const {data} = await supabase
.from("historial_operativo")
.select("*")
.eq("ambulancia_id",ambulancia)
.order("fecha_inicio",{ascending:false})

setEventos(data || [])
}

/* GUARDAR */
async function guardar(){

if(loading) return
setLoading(true)

if(!ambulancia){
alert("Seleccione ambulancia")
setLoading(false)
return
}

if(!fechaInicio){
alert("Seleccione fecha inicio")
setLoading(false)
return
}

if(estado !== "operativa" && !motivo){
alert("Debe ingresar motivo")
setLoading(false)
return
}

/* EDITAR */
if(modo === "editar"){

if(!eventoSeleccionado){
alert("Seleccione evento")
setLoading(false)
return
}

const {error} = await supabase
.from("historial_operativo")
.update({
estado,
motivo,
tipo_falla:tipoFalla || null,
fecha_inicio:new Date(fechaInicio).toISOString(),
fecha_fin: fechaFin ? new Date(fechaFin).toISOString() : null
})
.eq("id", String(eventoSeleccionado))

if(error){
alert("Error actualizando")
}else{
alert("Evento actualizado")
cargarEventos()
}

setLoading(false)
return
}

/* NUEVO */
const hoy = new Date().toISOString().split("T")[0]

if(!fechaFin && fechaInicio === hoy){
await supabase
.from("historial_operativo")
.update({ fecha_fin: new Date().toISOString() })
.eq("ambulancia_id",ambulancia)
.is("fecha_fin",null)
}

const {error} = await supabase
.from("historial_operativo")
.insert({
ambulancia_id:ambulancia,
estado,
motivo,
tipo_falla:tipoFalla || null,
fecha_inicio:new Date(fechaInicio).toISOString(),
fecha_fin: fechaFin ? new Date(fechaFin).toISOString() : null,
usuario: localStorage.getItem("nombre")
})

if(error){
alert("Error guardando historial")
}else{
alert("Evento registrado")
}

setMotivo("")
setTipoFalla("")
setFechaInicio("")
setFechaFin("")

cargarEventos()
setLoading(false)
}

return(

<div style={container}>

<div style={card}>

{/* HEADER */}
<div style={header}>
<h1 style={title}>📋 Historial Operativo</h1>

<button onClick={()=>router.push("/dashboard")} style={btnBack}>
← Volver
</button>
</div>

{/* MODO */}
<div style={section}>
<label>Modo</label>
<select value={modo} onChange={(e)=>setModo(e.target.value)} style={input}>
<option value="nuevo">Nuevo evento</option>
<option value="editar">Editar evento</option>
</select>
</div>

{/* AMBULANCIA */}
<div style={section}>
<label>Ambulancia</label>
<select
value={ambulancia}
onChange={(e)=>setAmbulancia(e.target.value)}
style={input}
>
<option value="">Seleccione ambulancia</option>
{ambulancias.map(a=>(
<option key={a.id} value={a.id}>
{a.codigo_operativo} - {a.placa}
</option>
))}
</select>
</div>

{/* EVENTOS */}
{modo==="editar" && (
<div style={section}>
<label>Evento</label>
<select
value={eventoSeleccionado}
onChange={(e)=>{
const id = e.target.value
setEventoSeleccionado(id)

const ev = eventos.find(x=>String(x.id) === String(id))

if(ev){
setEstado(ev.estado)
setMotivo(ev.motivo || "")
setTipoFalla(ev.tipo_falla || "")
setFechaInicio(ev.fecha_inicio?.split("T")[0] || "")
setFechaFin(ev.fecha_fin?.split("T")[0] || "")
}
}}
style={input}
>
<option value="">Seleccione evento</option>

{eventos.map(ev=>(
<option key={ev.id} value={ev.id}>
{new Date(ev.fecha_inicio).toLocaleDateString()} - {ev.estado}
</option>
))}
</select>
</div>
)}

{/* ESTADO */}
<div style={section}>
<label>Estado</label>
<select value={estado} onChange={(e)=>setEstado(e.target.value)} style={input}>
<option value="operativa">Operativa</option>
<option value="mantenimiento">Mantenimiento</option>
<option value="no operativa">No operativa</option>
</select>
</div>

{/* MOTIVO */}
<div style={section}>
<label>Motivo</label>
<textarea
value={motivo}
onChange={(e)=>setMotivo(e.target.value)}
placeholder="Detalle del evento"
style={textarea}
/>
</div>

{/* TIPO FALLA */}
<div style={section}>
<label>Tipo de falla</label>
<select value={tipoFalla} onChange={(e)=>setTipoFalla(e.target.value)} style={input}>
<option value="">Seleccione tipo</option>
<option value="preventivo">Preventivo</option>
<option value="correctivo">Correctivo</option>
<option value="mecanico">Mecánico</option>
<option value="electrico">Eléctrico</option>
<option value="accidente">Accidente</option>
</select>
</div>

{/* FECHAS */}
<div style={{display:"flex",gap:10}}>
<input type="date" value={fechaInicio} onChange={(e)=>setFechaInicio(e.target.value)} style={input}/>
<input type="date" value={fechaFin} onChange={(e)=>setFechaFin(e.target.value)} style={input}/>
</div>

{/* BOTÓN */}
<button onClick={guardar} disabled={loading} style={btnGuardar}>
{loading ? "Guardando..." : "💾 Guardar evento"}
</button>

</div>

</div>

)

}

/* ESTILOS */

const container = {
minHeight:"100vh",
display:"flex",
justifyContent:"center",
alignItems:"center",
background:"linear-gradient(135deg,#020617,#0f172a)",
padding:20
}

const card = {
background:"#020617",
padding:30,
borderRadius:16,
width:500,
boxShadow:"0 0 40px rgba(0,255,255,0.08)",
border:"1px solid rgba(0,255,255,0.1)"
}

const header = {
display:"flex",
justifyContent:"space-between",
alignItems:"center",
marginBottom:20
}

const title = {
color:"#22d3ee",
fontSize:22
}

const section = {
marginBottom:15,
display:"flex",
flexDirection:"column" as const,
gap:5
}

const input = {
padding:10,
borderRadius:8,
border:"1px solid #1e293b",
background:"#020617",
color:"white"
}

const textarea = {
...input,
height:80
}

const btnBack = {
background:"#1e293b",
color:"white",
padding:"6px 10px",
borderRadius:6,
border:"none",
cursor:"pointer"
}

const btnGuardar = {
marginTop:20,
width:"100%",
padding:12,
background:"#06b6d4",
border:"none",
borderRadius:8,
color:"#020617",
fontWeight:"bold",
cursor:"pointer"
}