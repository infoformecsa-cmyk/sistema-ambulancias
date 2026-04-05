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
.select("*")
.gte("created_at", inicio.toISOString())
.lte("created_at", fin.toISOString())
.order("created_at",{ascending:false})

setRegistros(data || [])
}

/* ========================= */
/* ELIMINAR UNO */
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
/* 🔥 LIMPIAR TODO EL DÍA */
/* ========================= */

async function limpiarDia(){

if(!confirm("⚠️ Esto eliminará TODOS los registros del día ¿Continuar?")) return

const inicio = new Date(fecha + "T00:00:00")
const fin = new Date(fecha + "T23:59:59")

await supabase
.from("registro_kilometraje")
.delete()
.gte("created_at", inicio.toISOString())
.lte("created_at", fin.toISOString())

alert("✅ Registros eliminados")

cargar()
}

/* ========================= */
/* FORMATO HORA ECUADOR */
/* ========================= */

function horaLocal(fecha:string){
return new Date(fecha).toLocaleTimeString("es-EC",{
hour:"2-digit",
minute:"2-digit",
second:"2-digit"
})
}

/* ========================= */
/* UI */
/* ========================= */

return(

<div style={container}>

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

<button onClick={limpiarDia} style={btnEliminarTodo}>
🗑 Limpiar día
</button>

</div>

{/* LISTADO */}

{registros.length === 0 ? (
<p>No hay registros para este día</p>
) : (

registros.map(r=>(
<div key={r.id} style={row}>

<div style={{flex:2}}>
🚑 {r.ambulancia_id}
</div>

<div style={{flex:2}}>
📏 {r.kilometraje} km
</div>

<div style={{flex:2}}>
🕒 {horaLocal(r.created_at)}
</div>

<div style={{flex:1}}>

<button onClick={()=>eliminar(r.id)} style={btnEliminar}>
🗑
</button>

</div>

</div>
))

)}

</div>
)
}

/* ========================= */
/* ESTILOS */
/* ========================= */

const container = {
padding:30,
background:"#020617",
color:"white",
minHeight:"100vh"
}

const row = {
display:"flex",
gap:10,
padding:12,
borderBottom:"1px solid #1f2937",
alignItems:"center"
}

const btnEliminar = {
background:"#dc2626",
color:"white",
border:"none",
padding:"6px 10px",
borderRadius:6,
cursor:"pointer"
}

const btnEliminarTodo = {
background:"#7f1d1d",
color:"white",
border:"none",
padding:"8px 12px",
borderRadius:8,
cursor:"pointer"
}