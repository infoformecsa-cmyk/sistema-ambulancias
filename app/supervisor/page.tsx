"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"

export default function Supervisor(){

const [ambulancias,setAmbulancias] = useState<any[]>([])
const [grupo,setGrupo] = useState("ALFA")

useEffect(()=>{
cargar()
},[grupo])

async function cargar(){

const {data} = await supabase
.from("ambulancias")
.select("*")
.eq("tipo",grupo)
.order("codigo_operativo")

setAmbulancias(data || [])
}

async function cambiarEstado(id:string,estado:string){

await supabase
.from("ambulancias")
.update({ estado })
.eq("id",id)

cargar()
}

return(

<div style={{padding:30,fontFamily:"Arial",maxWidth:900,margin:"auto"}}>

<h1>Panel Supervisor</h1>

<div style={{display:"flex",gap:10,marginBottom:20}}>

<button onClick={()=>setGrupo("ALFA")}>ALFA</button>
<button onClick={()=>setGrupo("BRAVO")}>BRAVO</button>

</div>

{ambulancias.map(a=>(
<div key={a.id} style={{
background:"#f3f4f6",
padding:15,
borderRadius:10,
marginBottom:10
}}>

<h3>{a.codigo_operativo} | {a.placa}</h3>

<p>KM: {a.kilometraje_actual}</p>
<p>Estado: {a.estado}</p>

<div style={{display:"flex",gap:10}}>

<button onClick={()=>cambiarEstado(a.id,"operativa")}>
Operativa
</button>

<button onClick={()=>cambiarEstado(a.id,"mantenimiento")}>
Mantenimiento
</button>

<button onClick={()=>cambiarEstado(a.id,"no operativa")}>
Fuera servicio
</button>

</div>

</div>
))}

</div>
)
}