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

useEffect(()=>{
cargar()
},[fecha])

async function cargar(){

/* 🚑 AMBULANCIAS */
const {data:amb} = await supabase
.from("ambulancias")
.select("id,codigo_operativo")

/* 🔥 CONSULTA CORREGIDA */
const {data:km,error} = await supabase
.from("registro_kilometraje") // ✅ TABLA CORRECTA
.select("*")
.gte("created_at", fecha+"T00:00:00")
.lte("created_at", fecha+"T23:59:59")
.order("created_at",{ascending:false})

if(error){
console.error("ERROR REAL:", error)
alert("Error cargando kilometrajes")
return
}

setData(km || [])
setAmbulancias(amb || [])
}

/* 🚑 NOMBRE */
function getAmbulancia(id:string){
const a = ambulancias.find(x=>String(x.id)===String(id))
return a?.codigo_operativo || id
}

return(

<div style={{
padding:30,
background:"#020617",
color:"white",
minHeight:"100vh"
}}>

<h1>📊 Kilometraje Diario</h1>

<div style={{display:"flex",gap:10,marginBottom:20}}>

<input
type="date"
value={fecha}
onChange={(e)=>setFecha(e.target.value)}
style={input}
/>

<button onClick={()=>setFecha(new Date().toISOString().slice(0,10))} style={btn}>
HOY
</button>

<button onClick={()=>router.push("/dashboard")} style={btn}>
⬅ Volver
</button>

</div>

{data.map((d,i)=>(

<div key={i} style={{
background:"#111827",
padding:10,
marginBottom:8,
borderRadius:8,
display:"flex",
justifyContent:"space-between"
}}>

<div>🚑 {getAmbulancia(d.ambulancia_id)}</div>
<div>📏 {d.kilometraje} km</div>
<div>🕒 {new Date(d.created_at).toLocaleTimeString()}</div>

</div>

))}

{data.length === 0 && (
<div style={empty}>
No hay registros para este día
</div>
)}

</div>
)
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
padding:"10px 15px",
border:"none",
borderRadius:8
}

const empty = {
textAlign:"center" as const,
padding:20,
color:"#9ca3af"
}