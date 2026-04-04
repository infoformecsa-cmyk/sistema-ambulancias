"use client"

export const dynamic = "force-dynamic"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { useRouter } from "next/navigation"

export default function Kilometrajes(){

const router = useRouter()

const [fecha,setFecha] = useState(
new Date().toISOString().slice(0,10)
)

const [data,setData] = useState<any[]>([])
const [ambulancias,setAmbulancias] = useState<any[]>([])

/* ========================= */

useEffect(()=>{
cargar()
},[fecha])

async function cargar(){

try{

const {data:amb} = await supabase
.from("ambulancias")
.select("*")

const {data:km,error} = await supabase
.from("kilometrajes")
.select("*")
.eq("usuario","supervisor@ambulancias.ec")
.eq("fecha",fecha)
.order("hora",{ascending:false})

if(error) throw error

setData(km || [])
setAmbulancias(amb || [])

}catch(err){
console.error("Error:", err)
alert("Error cargando kilometrajes")
}

}

/* ========================= */

function getAmbulancia(id:string){
const a = ambulancias.find(x=>String(x.id)===String(id))
return a?.codigo_operativo || id
}

/* ========================= */

return(

<div style={container}>

{/* HEADER */}
<div style={header}>

<h1>📊 Kilometraje Diario</h1>

<div style={{display:"flex",gap:10}}>

<input
type="date"
value={fecha}
onChange={(e)=>setFecha(e.target.value)}
style={input}
/>

<button
onClick={()=>setFecha(new Date().toISOString().slice(0,10))}
style={btn}
>
HOY
</button>

<button
onClick={()=>router.push("/dashboard")}
style={btnBack}
>
⬅ Volver
</button>

</div>

</div>

{/* TABLA */}

<div style={tabla}>

<div style={headerTabla}>
<div>Ambulancia</div>
<div>Kilometraje</div>
<div>Hora</div>
</div>

{data.map((d,i)=>(

<div key={i} style={row}>

<div>🚑 {getAmbulancia(d.ambulancia_id)}</div>

<div>📏 {d.kilometraje} km</div>

<div>🕒 {new Date(d.hora).toLocaleTimeString()}</div>

</div>

))}

{data.length === 0 && (
<div style={empty}>
No hay registros para este día
</div>
)}

</div>

</div>
)
}

/* ========================= */
/* 🎨 ESTILOS */
/* ========================= */

const container = {
background:"#020617",
color:"white",
minHeight:"100vh",
padding:30
}

const header = {
display:"flex",
justifyContent:"space-between",
alignItems:"center",
marginBottom:20
}

const input = {
padding:10,
borderRadius:8,
background:"#1f2937",
color:"white",
border:"none"
}

const btn = {
background:"#2563eb",
color:"white",
border:"none",
padding:"10px 15px",
borderRadius:8,
cursor:"pointer"
}

const btnBack = {
background:"#374151",
color:"white",
border:"none",
padding:"10px 15px",
borderRadius:8,
cursor:"pointer"
}

const tabla = {
background:"#111827",
borderRadius:10,
padding:10
}

const headerTabla = {
display:"flex",
justifyContent:"space-between",
padding:"10px",
borderBottom:"2px solid #1f2937",
fontWeight:"bold"
}

const row = {
display:"flex",
justifyContent:"space-between",
padding:10,
borderBottom:"1px solid #1f2937"
}

const empty = {
textAlign:"center",
padding:20,
color:"#9ca3af"
}