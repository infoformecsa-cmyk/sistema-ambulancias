"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { useRouter } from "next/navigation"

export default function NuevaAmbulancia(){

const router = useRouter()

const [codigo,setCodigo] = useState("")
const [placa,setPlaca] = useState("")
const [tipo,setTipo] = useState("ALFA")
const [loading,setLoading] = useState(false)

async function guardar(){

if(!codigo || !placa){
alert("Complete todos los campos")
return
}

setLoading(true)

try{

const {error} = await supabase
.from("ambulancias")
.insert({
codigo_operativo:codigo,
placa,
tipo,
estado:"operativa",
kilometraje_actual:0
})

if(error){
console.log(error)
alert("Error al guardar")
return
}

alert("Ambulancia creada correctamente")

router.push("/dashboard")

}catch(e){
console.log(e)
alert("Error inesperado")
}

setLoading(false)
}

return(

<div style={{padding:40,fontFamily:"Arial",maxWidth:500}}>

<h1>➕ Nueva Ambulancia</h1>

<input
placeholder="Código operativo (Ej: ALFA 1)"
value={codigo}
onChange={(e)=>setCodigo(e.target.value)}
style={{width:"100%",marginBottom:10,padding:8}}
/>

<input
placeholder="Placa (Ej: MEA-1234)"
value={placa}
onChange={(e)=>setPlaca(e.target.value)}
style={{width:"100%",marginBottom:10,padding:8}}
/>

<select 
value={tipo} 
onChange={(e)=>setTipo(e.target.value)}
style={{width:"100%",marginBottom:10,padding:8}}
>
<option value="ALFA">ALFA</option>
<option value="BRAVO">BRAVO</option>
</select>

<br/>

<button 
onClick={guardar}
style={{
background:"#16a34a",
color:"white",
padding:"10px 15px",
borderRadius:6
}}
disabled={loading}
>
{loading ? "Guardando..." : "Guardar"}
</button>

<button 
onClick={()=>router.push("/dashboard")}
style={{
marginLeft:10,
padding:"10px 15px"
}}
>
Cancelar
</button>

</div>

)

}