"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabase"

export default function NuevaAmbulancia(){

const [codigo,setCodigo] = useState("")
const [marca,setMarca] = useState("")
const [modelo,setModelo] = useState("")
const [tipo,setTipo] = useState("APH")

async function guardar(){

const {error} = await supabase
.from("ambulancias")
.insert({
codigo_operativo:codigo,
marca:marca,
modelo:modelo,
tipo_servicio:tipo,
estado_operativo:true
})

if(error){
alert("Error al guardar")
}else{
alert("Ambulancia agregada")
window.location.href="/ambulancia"
}

}

return(

<div style={{padding:40}}>

<h1>Nueva Ambulancia</h1>

<input placeholder="Código (ALFA-25)"
value={codigo}
onChange={(e)=>setCodigo(e.target.value)}
/>

<br/><br/>

<input placeholder="Marca"
value={marca}
onChange={(e)=>setMarca(e.target.value)}
/>

<br/><br/>

<input placeholder="Modelo"
value={modelo}
onChange={(e)=>setModelo(e.target.value)}
/>

<br/><br/>

<select onChange={(e)=>setTipo(e.target.value)}>

<option value="APH">APH</option>
<option value="TRASLADO">Traslado secundario</option>

</select>

<br/><br/>

<button onClick={guardar}>
Guardar Ambulancia
</button>

</div>

)

}
