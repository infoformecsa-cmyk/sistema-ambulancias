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

/* 🔥 INIT */
useEffect(()=>{

const params = new URLSearchParams(window.location.search)
const amb = params.get("ambulancia")

if(amb){
setAmbulancia(amb)
}

cargar()

},[])

/* cargar ambulancias */
async function cargar(){

const {data,error} = await supabase
.from("ambulancias")
.select("*")
.order("codigo_operativo")

if(!error){
setAmbulancias(data || [])
}

}

/* cargar eventos */
useEffect(()=>{
if(ambulancia){
cargarEventos()
}
},[ambulancia])

async function cargarEventos(){

const {data,error} = await supabase
.from("historial_operativo")
.select("*")
.eq("ambulancia_id",ambulancia)
.order("fecha_inicio",{ascending:false})

if(!error){
setEventos(data || [])
}

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

<div style={{padding:40,fontFamily:"Arial",maxWidth:600}}>

{/* 🔥 BOTÓN NUEVO */}
<button 
onClick={()=>router.push("/dashboard")}
style={{
marginBottom:20,
padding:"8px 12px",
background:"#0070f3",
color:"white",
border:"none",
borderRadius:5,
cursor:"pointer"
}}
>
← Volver al dashboard
</button>

<h1>Registro de Historial Operativo</h1>

<hr/>

<select value={modo} onChange={(e)=>setModo(e.target.value)}>
<option value="nuevo">Nuevo evento</option>
<option value="editar">Editar evento</option>
</select>

<br/><br/>

<select
value={ambulancia}
onChange={(e)=>setAmbulancia(e.target.value)}
style={{width:"100%",padding:6}}
>
<option value="">Seleccione ambulancia</option>
{ambulancias.map(a=>(
<option key={a.id} value={a.id}>
{a.codigo_operativo} - {a.placa}
</option>
))}
</select>

{modo==="editar" && (

<>
<br/><br/>

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
style={{width:"100%",padding:6}}
>
<option value="">Seleccione evento</option>

{eventos.map(ev=>(
<option key={ev.id} value={ev.id}>
{new Date(ev.fecha_inicio).toLocaleDateString()} - {ev.estado}
</option>
))}

</select>
</>
)}

<br/><br/>

<select value={estado} onChange={(e)=>setEstado(e.target.value)}>
<option value="operativa">Operativa</option>
<option value="mantenimiento">Mantenimiento</option>
<option value="no operativa">No operativa</option>
</select>

<br/><br/>

<textarea
value={motivo}
onChange={(e)=>setMotivo(e.target.value)}
placeholder="Motivo"
style={{width:"100%",height:80}}
/>

<br/><br/>

<select value={tipoFalla} onChange={(e)=>setTipoFalla(e.target.value)}>
<option value="">Tipo de falla</option>
<option value="preventivo">Preventivo</option>
<option value="correctivo">Correctivo</option>
<option value="mecanico">Mecánico</option>
<option value="electrico">Eléctrico</option>
<option value="accidente">Accidente</option>
</select>

<br/><br/>

<input type="date" value={fechaInicio} onChange={(e)=>setFechaInicio(e.target.value)} />

<br/><br/>

<input type="date" value={fechaFin} onChange={(e)=>setFechaFin(e.target.value)} />

<br/><br/>

<button onClick={guardar} disabled={loading}>
{loading ? "Guardando..." : "Guardar evento"}
</button>

</div>

)

}