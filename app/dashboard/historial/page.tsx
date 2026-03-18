"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"

export default function Historial(){

const [ambulancias,setAmbulancias] = useState<any[]>([])
const [ambulancia,setAmbulancia] = useState("")
const [estado,setEstado] = useState("operativa")
const [motivo,setMotivo] = useState("")
const [tipoFalla,setTipoFalla] = useState("")
const [fechaInicio,setFechaInicio] = useState("")
const [fechaFin,setFechaFin] = useState("")

useEffect(()=>{
cargar()
},[])

async function cargar(){

const {data} = await supabase
.from("ambulancias")
.select("*")
.order("codigo_operativo")

setAmbulancias(data || [])

}

async function guardar(){

if(!ambulancia){
alert("Seleccione ambulancia")
return
}

if(!fechaInicio){
alert("Seleccione fecha inicio")
return
}

/* cerrar historial activo SOLO si es evento actual */

if(!fechaFin){

await supabase
.from("historial_operativo")
.update({ fecha_fin: new Date().toISOString() })
.eq("ambulancia_id",ambulancia)
.is("fecha_fin",null)

}

/* insertar nuevo evento */

const {error} = await supabase
.from("historial_operativo")
.insert({
ambulancia_id:ambulancia,
estado:estado,
motivo:motivo,
tipo_falla:tipoFalla,
fecha_inicio:new Date(fechaInicio).toISOString(),
fecha_fin: fechaFin ? new Date(fechaFin).toISOString() : null,
usuario:localStorage.getItem("nombre")
})

if(error){
alert("Error guardando historial")
return
}

alert("Evento registrado correctamente")

setMotivo("")
setTipoFalla("")
setFechaInicio("")
setFechaFin("")

}

return(

<div style={{padding:40,fontFamily:"Arial",maxWidth:600}}>

<h1>Registro de Historial Operativo</h1>

<hr/>

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

<button onClick={guardar}>
Guardar evento
</button>

</div>

)

}