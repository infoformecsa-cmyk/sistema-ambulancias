"use client"

export const dynamic = "force-dynamic"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { useSearchParams } from "next/navigation"

export default function Historial(){

const searchParams = useSearchParams()

const [ambulancias,setAmbulancias] = useState<any[]>([])
const [ambulancia,setAmbulancia] = useState("")
const [estado,setEstado] = useState("operativa")
const [motivo,setMotivo] = useState("")
const [tipoFalla,setTipoFalla] = useState("")
const [fechaInicio,setFechaInicio] = useState("")
const [fechaFin,setFechaFin] = useState("")

const [modo,setModo] = useState("nuevo")
const [eventos,setEventos] = useState<any[]>([])
const [eventoSeleccionado,setEventoSeleccionado] = useState("")

const [loading,setLoading] = useState(false)

/* 🔥 CARGA INICIAL SEGURA */
useEffect(()=>{

const amb = searchParams.get("ambulancia")

if(amb){
setAmbulancia(amb)
}

cargar()

},[searchParams])

/* cargar ambulancias */
async function cargar(){

const {data,error} = await supabase
.from("ambulancias")
.select("*")
.order("codigo_operativo")

if(error){
console.log(error)
return
}

setAmbulancias(data || [])

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

if(error){
console.log(error)
return
}

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

/* VALIDACIÓN */
if(estado !== "operativa" && !motivo){
alert("Debe ingresar motivo")
setLoading(false)
return
}

/* ========================= */
/* 🟡 EDITAR */
/* ========================= */

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
.eq("id",eventoSeleccionado)

if(error){
alert("Error actualizando")
setLoading(false)
return
}

alert("Evento actualizado")
cargarEventos()
setLoading(false)
return

}

/* ========================= */
/* 🟢 NUEVO */
/* ========================= */

const hoy = new Date().toISOString().split("T")[0]

/* cerrar solo si es evento actual */
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
usuario: typeof window !== "undefined"
? localStorage.getItem("nombre")
: null
})

if(error){
alert("Error guardando historial")
setLoading(false)
return
}

alert("Evento registrado")

/* limpiar */
setMotivo("")
setTipoFalla("")
setFechaInicio("")
setFechaFin("")

cargarEventos()
setLoading(false)

}

return(

<div style={{padding:40,fontFamily:"Arial",maxWidth:600}}>

<h1>Registro de Historial Operativo</h1>

<hr/>

<p><b>Modo</b></p>
<select value={modo} onChange={(e)=>setModo(e.target.value)}>
<option value="nuevo">Nuevo evento</option>
<option value="editar">Editar evento</option>
</select>

<br/><br/>

<p><b>Ambulancia</b></p>

<select
value={ambulancia}
onChange={(e)=>setAmbulancia(e.target.value)}
style={{width:"100%",padding:6}}
>
<option value="">Seleccione</option>
{ambulancias.map(a=>(
<option key={a.id} value={a.id}>
{a.codigo_operativo} - {a.placa}
</option>
))}
</select>

{/* EDITAR */}
{modo==="editar" && (

<>

<p><b>Seleccione evento</b></p>

<select
value={eventoSeleccionado}
onChange={(e)=>{

setEventoSeleccionado(e.target.value)

const ev = eventos.find(x=>x.id===e.target.value)

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

<option value="">Seleccione</option>

{eventos.map(ev=>(
<option key={ev.id} value={ev.id}>
{new Date(ev.fecha_inicio).toLocaleDateString()} - {ev.estado}
</option>
))}

</select>

</>

)}

<p><b>Estado</b></p>

<select value={estado} onChange={(e)=>setEstado(e.target.value)}>
<option value="operativa">Operativa</option>
<option value="mantenimiento">Mantenimiento</option>
<option value="no operativa">No operativa</option>
</select>

<p><b>Motivo</b></p>

<textarea
value={motivo}
onChange={(e)=>setMotivo(e.target.value)}
style={{width:"100%",height:80}}
/>

<p><b>Tipo de falla</b></p>

<select value={tipoFalla} onChange={(e)=>setTipoFalla(e.target.value)}>
<option value="">Seleccione</option>
<option value="preventivo">Preventivo</option>
<option value="correctivo">Correctivo</option>
<option value="mecanico">Mecánico</option>
<option value="electrico">Eléctrico</option>
<option value="accidente">Accidente</option>
</select>

<p><b>Fecha inicio</b></p>

<input
type="date"
value={fechaInicio}
onChange={(e)=>setFechaInicio(e.target.value)}
/>

<p><b>Fecha fin (opcional)</b></p>

<input
type="date"
value={fechaFin}
onChange={(e)=>setFechaFin(e.target.value)}
/>

<br/><br/>

<button onClick={guardar} disabled={loading}>
{loading ? "Guardando..." : "Guardar evento"}
</button>

</div>

)

}