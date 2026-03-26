"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { useRouter } from "next/navigation"

export default function NuevaAmbulancia(){

const router = useRouter()

const [codigo,setCodigo] = useState("")
const [placa,setPlaca] = useState("")
const [marca,setMarca] = useState("") // 👈 NUEVO
const [tipo,setTipo] = useState("ALFA")

const [loading,setLoading] = useState(false)

/* ========================= */
/* GUARDAR */
/* ========================= */

async function guardar(){

if(!codigo || !placa){
alert("Complete los campos obligatorios")
return
}

setLoading(true)

const { error } = await supabase
.from("ambulancias")
.insert({
codigo_operativo: codigo,
placa: placa,
marca: marca, // 👈 NUEVO
tipo: tipo,
estado: "operativa"
})

setLoading(false)

if(error){
alert("Error al guardar")
return
}

alert("✅ Ambulancia creada correctamente")
router.push("/dashboard")
}

/* ========================= */
/* UI */
/* ========================= */

return(

<div style={{padding:30,fontFamily:"Arial"}}>

<h1>➕ Nueva Ambulancia</h1>

<br/>

<input
placeholder="Código operativo (Ej: ALFA 1)"
value={codigo}
onChange={(e)=>setCodigo(e.target.value)}
style={input}
/>

<br/>

<input
placeholder="Placa (Ej: MEA-1234)"
value={placa}
onChange={(e)=>setPlaca(e.target.value)}
style={input}
/>

<br/>

{/* 🔥 NUEVO CAMPO */}
<input
placeholder="Marca (Ej: Toyota, Nissan, Chevrolet)"
value={marca}
onChange={(e)=>setMarca(e.target.value)}
style={input}
/>

<br/>

<select
value={tipo}
onChange={(e)=>setTipo(e.target.value)}
style={input}
>
<option value="ALFA">ALFA</option>
<option value="BRAVO">BRAVO</option>
</select>

<br/><br/>

<button
onClick={guardar}
style={btnGuardar}
disabled={loading}
>
{loading ? "Guardando..." : "Guardar"}
</button>

<button
onClick={()=>router.push("/dashboard")}
style={btnCancelar}
>
Cancelar
</button>

</div>
)
}

/* ========================= */
/* ESTILOS */
/* ========================= */

const input = {
display:"block",
marginBottom:"10px",
width:"300px",
padding:"8px",
border:"1px solid #ccc",
borderRadius:"4px"
}

const btnGuardar = {
background:"#16a34a",
color:"white",
padding:"8px 16px",
border:"none",
borderRadius:"4px",
marginRight:"10px",
cursor:"pointer"
}

const btnCancelar = {
background:"#ccc",
padding:"8px 16px",
border:"none",
borderRadius:"4px",
cursor:"pointer"
}