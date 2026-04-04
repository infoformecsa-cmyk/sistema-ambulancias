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
const {data:amb,error:errorAmb} = await supabase
.from("ambulancias")
.select("id,codigo_operativo")

if(errorAmb){
console.error("❌ Error ambulancias:", errorAmb)
}

/* 🔥 KM */
const {data:km,error} = await supabase
.from("registro_kilometraje")
.select("*")
.order("created_at",{ascending:false})

if(error){
console.error("❌ ERROR REAL KM:", error)
alert("Error cargando kilometrajes")
return
}

/* 🔥 FILTRO SEGURO */
const filtrados = (km || []).filter((item:any)=>{

if(!item.created_at){
console.warn("⚠️ Registro sin fecha:", item)
return false
}

try{
const fechaItem = new Date(item.created_at)
.toISOString()
.slice(0,10)

return fechaItem === fecha
}catch(e){
console.warn("⚠️ Error procesando fecha:", item)
return false
}

})

/* DEBUG */
console.log("📊 TOTAL REGISTROS BD:", km?.length)
console.log("📅 FILTRADOS HOY:", filtrados.length)

/* SET */
setData(filtrados)
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

<button 
onClick={()=>setFecha(new Date().toISOString().slice(0,10))} 
style={btn}
>
HOY
</button>

<button 
onClick={()=>router.push("/dashboard")} 
style={btn}
>
⬅ Volver
</button>

</div>

{/* 🔥 LISTADO */}
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

<div>📏 {Number(d.kilometraje || 0)} km</div>

<div>
🕒 {d.created_at 
? new Date(d.created_at).toLocaleTimeString()
: "--"}
</div>

</div>

))}

{/* 🔥 VACÍO */}
{data.length === 0 && (
<div style={empty}>
No hay registros para este día
</div>
)}

</div>
)
}

/* 🎨 ESTILOS */
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