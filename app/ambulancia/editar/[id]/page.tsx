"use client"

import { useEffect,useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { useRouter,useParams } from "next/navigation"

export default function EditarAmbulancia(){

const router = useRouter()
const params = useParams()

const id = params?.id as string

const [codigo,setCodigo] = useState("")
const [placa,setPlaca] = useState("")
const [tipo,setTipo] = useState("ALFA")
const [estado,setEstado] = useState("operativa")
const [motivo,setMotivo] = useState("")
const [tipoFalla,setTipoFalla] = useState("")
const [estadoAnterior,setEstadoAnterior] = useState("operativa")

useEffect(()=>{
if(id){
cargar()
}
},[id])

async function cargar(){

const {data,error} = await supabase
.from("ambulancias")
.select("*")
.eq("id",id)
.single()

if(error){
console.log("ERROR CARGANDO:",error)
alert("Error cargando ambulancia")
return
}

if(data){
setCodigo(data.codigo_operativo || "")
setPlaca(data.placa || "")
setTipo(data.tipo || "ALFA")
setEstado(data.estado || "operativa")
setEstadoAnterior(data.estado || "operativa")
setMotivo(data.motivo_no_operativo || "")
}

}

async function guardar(){

if(!codigo){
alert("Debe ingresar el código operativo")
return
}

if(!placa){
alert("Debe ingresar la placa")
return
}

let motivoFinal = motivo

if(estado==="operativa"){
motivoFinal=""
}

try{

/* ========================= */
/* ACTUALIZAR AMBULANCIA */
/* ========================= */

const { error: updateError } = await supabase
.from("ambulancias")
.update({
codigo_operativo: codigo,
placa: placa,
tipo: tipo,
estado: estado,
motivo_no_operativo: motivoFinal // ✅ CORRECCIÓN CLAVE
})
.eq("id", id)

if(updateError){
console.log("ERROR UPDATE:",updateError)
alert("Error actualizando ambulancia: "+updateError.message)
return
}

/* ========================= */
/* HISTORIAL OPERATIVO */
/* ========================= */

/* 🔥 SIEMPRE cerramos historial abierto */
await supabase
.from("historial_operativo")
.update({
fecha_fin:new Date().toISOString()
})
.eq("ambulancia_id",id)
.is("fecha_fin",null)

/* 🔥 SIEMPRE creamos nuevo historial */
const {error:histError} = await supabase
.from("historial_operativo")
.insert({
ambulancia_id:id,
estado:estado,
motivo:motivoFinal || "Actualización",
tipo_falla:tipoFalla || null,
fecha_inicio:new Date().toISOString(),
fecha_fin:null,
usuario:localStorage.getItem("nombre")
})

if(histError){
console.log("ERROR INSERT HISTORIAL:",histError)
alert("Error guardando historial: "+histError.message)
return
}

alert("Ambulancia actualizada correctamente")

router.push("/dashboard")

}catch(e){

console.log("ERROR GENERAL:",e)
alert("Error guardando cambios")

}

}

return(

<div style={{padding:40,fontFamily:"Arial",maxWidth:500}}>

<h1>Editar Ambulancia</h1>

<hr/>

<p><b>Código operativo</b></p>

<input
value={codigo}
onChange={(e)=>setCodigo(e.target.value)}
style={{width:"100%",padding:6}}
/>

<p><b>Placa</b></p>

<input
value={placa}
onChange={(e)=>setPlaca(e.target.value)}
style={{width:"100%",padding:6}}
/>

<p><b>Tipo</b></p>

<select
value={tipo}
onChange={(e)=>setTipo(e.target.value)}
style={{width:"100%",padding:6}}
>
<option value="ALFA">ALFA</option>
<option value="BRAVO">BRAVO</option>
</select>

<p><b>Estado</b></p>

<select
value={estado}
onChange={(e)=>setEstado(e.target.value)}
style={{width:"100%",padding:6}}
>
<option value="operativa">Operativa</option>
<option value="mantenimiento">Mantenimiento</option>
<option value="no operativa">No Operativa</option>
</select>

<p><b>Motivo</b></p>

<textarea
value={motivo}
onChange={(e)=>setMotivo(e.target.value)}
placeholder="Motivo si la ambulancia no está operativa"
style={{width:"100%",height:80,padding:6}}
/>

<p><b>Tipo de falla o mantenimiento</b></p>

<select
value={tipoFalla}
onChange={(e)=>setTipoFalla(e.target.value)}
style={{width:"100%",padding:6}}
>
<option value="">Seleccione</option>
<option value="preventivo">Mantenimiento preventivo</option>
<option value="correctivo">Mantenimiento correctivo</option>
<option value="mecanico">Falla mecánica</option>
<option value="electrico">Falla eléctrica</option>
<option value="logistico">Logístico / administrativo</option>
<option value="accidente">Accidente</option>
</select>

<br/><br/>

<button
onClick={guardar}
style={{
padding:"10px 16px",
background:"#0070f3",
color:"white",
border:"none",
borderRadius:6
}}
>
Guardar cambios
</button>

<button
onClick={()=>router.push("/dashboard")}
style={{marginLeft:10,padding:"10px 16px"}}
>
Cancelar
</button>

</div>

)

}