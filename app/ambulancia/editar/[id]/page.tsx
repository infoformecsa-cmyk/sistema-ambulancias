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
const [loading,setLoading] = useState(false)

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
setMotivo(data.motivo_no_operativo || "")
}

}

async function guardar(){

if(loading) return
setLoading(true)

if(!codigo){
alert("Debe ingresar el código operativo")
setLoading(false)
return
}

if(!placa){
alert("Debe ingresar la placa")
setLoading(false)
return
}

/* 🔥 VALIDACIÓN CLAVE */
if(estado !== "operativa" && !motivo){
alert("Debe ingresar el motivo si no está operativa")
setLoading(false)
return
}

let motivoFinal = estado === "operativa" ? "" : motivo

try{

/* ✅ SOLO ACTUALIZA AMBULANCIA */

const { error } = await supabase
.from("ambulancias")
.update({
codigo_operativo: codigo,
placa: placa,
tipo: tipo,
estado: estado,
motivo_no_operativo: motivoFinal
})
.eq("id", id)

if(error){
console.log("ERROR UPDATE:",error)
alert("Error actualizando: "+error.message)
setLoading(false)
return
}

alert("Ambulancia actualizada correctamente")

router.push("/dashboard")

}catch(e){

console.log("ERROR GENERAL:",e)
alert("Error guardando cambios")

}

setLoading(false)

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

<br/><br/>

<button
onClick={guardar}
disabled={loading}
style={{
padding:"10px 16px",
background: loading ? "gray" : "#0070f3",
color:"white",
border:"none",
borderRadius:6
}}
>
{loading ? "Guardando..." : "Guardar cambios"}
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