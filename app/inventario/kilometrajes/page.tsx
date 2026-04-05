"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { useRouter } from "next/navigation"

export default function Kilometraje(){

const router = useRouter()

const [registros,setRegistros] = useState<any[]>([])
const [fecha,setFecha] = useState(() => {
const hoy = new Date()
return hoy.toISOString().split("T")[0]
})

useEffect(()=>{
cargar()
},[fecha])

/* ========================= */
/* CARGAR */
/* ========================= */

async function cargar(){

const inicio = new Date(fecha + "T00:00:00")
const fin = new Date(fecha + "T23:59:59")

const { data } = await supabase
.from("registro_kilometraje")
.select(`
*,
ambulancias (
codigo_operativo
)
`)
.gte("created_at", inicio.toISOString())
.lte("created_at", fin.toISOString())
.order("created_at",{ascending:false})

setRegistros(data || [])
}

/* ========================= */
/* 🗑 ELIMINAR INDIVIDUAL */
/* ========================= */

async function eliminar(id:string){

if(!confirm("¿Eliminar registro?")) return

await supabase
.from("registro_kilometraje")
.delete()
.eq("id",id)

cargar()
}

/* ========================= */
/* 🧹 LIMPIAR DÍA */
/* ========================= */

async function limpiarDia(){

if(!confirm("⚠️ Eliminar TODOS los registros del día?")) return

const inicio = new Date(fecha + "T00:00:00")
const fin = new Date(fecha + "T23:59:59")

await supabase
.from("registro_kilometraje")
.delete()
.gte("created_at", inicio.toISOString())
.lte("created_at", fin.toISOString())

cargar()
}

/* ========================= */
/* UI */
/* ========================= */

return(

<div style={{padding:30}}>

<h1>📊 Kilometraje Diario</h1>

<div style={{display:"flex",gap:10,marginBottom:20}}>

<input
type="date"
value={fecha}
onChange={(e)=>setFecha(e.target.value)}
/>

<button onClick={()=>setFecha(new Date().toISOString().split("T")[0])}>
HOY
</button>

<button onClick={()=>router.back()}>
⬅ Volver
</button>

{/* 🔥 BOTÓN NUEVO */}
<button onClick={limpiarDia}>
🗑 Limpiar día
</button>

</div>

{/* LISTADO */}

{registros.length === 0 ? (
<p>No hay registros para este día</p>
) : (

registros.map(r=>(
<div key={r.id} style={{
display:"flex",
justifyContent:"space-between",
padding:10,
borderBottom:"1px solid #ccc"
}}>

{/* ✅ AQUÍ ESTÁ EL FIX REAL */}
<div>
🚑 {r.ambulancias?.codigo_operativo || r.ambulancia_id}
</div>

<div>📏 {r.kilometraje} km</div>

<div>
🕒 {new Date(r.created_at).toLocaleTimeString("es-EC")}
</div>

{/* BOTÓN ELIMINAR */}
<button onClick={()=>eliminar(r.id)}>
🗑
</button>

</div>
))

)}

</div>
)
}