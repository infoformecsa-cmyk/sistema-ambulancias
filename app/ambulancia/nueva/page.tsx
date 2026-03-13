"use client"

import {useState} from "react"
import {supabase} from "@/lib/supabaseClient"
import {useRouter} from "next/navigation"

export default function NuevaAmbulancia(){

const router = useRouter()

const [codigo,setCodigo] = useState("")
const [placa,setPlaca] = useState("")
const [tipo,setTipo] = useState("ALFA")

async function guardar(){

const {error} = await supabase
.from("ambulancias")
.insert({
codigo_operativo:codigo,
placa:placa,
tipo:tipo,
estado:"operativa"
})

if(error){

alert("Error creando ambulancia")
return

}

alert("Ambulancia creada")

router.push("/dashboard")

}

return(

<div style={{padding:40,fontFamily:"Arial"}}>

<h1>Nueva Ambulancia</h1>

<p>Código operativo</p>

<input
value={codigo}
onChange={(e)=>setCodigo(e.target.value)}
/>

<p>Placa</p>

<input
value={placa}
onChange={(e)=>setPlaca(e.target.value)}
/>

<p>Tipo</p>

<select
value={tipo}
onChange={(e)=>setTipo(e.target.value)}
>

<option value="ALFA">ALFA</option>
<option value="BRAVO">BRAVO</option>

</select>

<br/><br/>

<button onClick={guardar}>
Crear ambulancia
</button>

<button
onClick={()=>router.push("/dashboard")}
style={{marginLeft:10}}
>
Cancelar
</button>

</div>

)

}