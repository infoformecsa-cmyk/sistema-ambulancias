"use client"

import { useEffect, useState } from "react"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
process.env.NEXT_PUBLIC_SUPABASE_URL!,
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function Mecanica(){

const [ambulancias,setAmbulancias] = useState<any[]>([])
const [ambulancia,setAmbulancia] = useState("")
const [descripcion,setDescripcion] = useState("")
const [kilometraje,setKilometraje] = useState("")
const [tipo,setTipo] = useState("Preventivo")

useEffect(()=>{
cargarAmbulancias()
},[])

const cargarAmbulancias = async ()=>{

const { data } = await supabase
.from("ambulancias")
.select("id,codigo_operativo")

if(data){
setAmbulancias(data)
}

}

const registrarMantenimiento = async ()=>{

if(!ambulancia || !descripcion) return

await supabase
.from("mantenimientos")
.insert([
{
ambulancia_id:ambulancia,
tipo:tipo,
descripcion:descripcion,
kilometraje:kilometraje,
fecha:new Date()
}
])

setDescripcion("")
setKilometraje("")

alert("Mantenimiento registrado")

}

return(

<div style={{padding:"40px"}}>

<h1>SSM Guayas – APH</h1>

<h2>Módulo Mecánico</h2>

<hr style={{margin:"20px 0"}}/>

<h3>Registrar mantenimiento</h3>

<div style={{marginBottom:"20px"}}>

<select
value={ambulancia}
onChange={(e)=>setAmbulancia(e.target.value)}

>

<option value="">Seleccionar ambulancia</option>

{ambulancias.map((a:any)=>(

<option key={a.id} value={a.id}>
{a.codigo_operativo}
</option>
))}

</select>

</div>

<div style={{marginBottom:"20px"}}>

<select
value={tipo}
onChange={(e)=>setTipo(e.target.value)}

>

<option>Preventivo</option>
<option>Correctivo</option>

</select>

</div>

<div style={{marginBottom:"20px"}}>

<input
placeholder="Kilometraje actual"
value={kilometraje}
onChange={(e)=>setKilometraje(e.target.value)}
/>

</div>

<div style={{marginBottom:"20px"}}>

<textarea
placeholder="Descripción del mantenimiento"
value={descripcion}
onChange={(e)=>setDescripcion(e.target.value)}
style={{width:"400px",height:"120px"}}
/>

</div>

<button onClick={registrarMantenimiento}>
Registrar mantenimiento
</button>

</div>

)

}

