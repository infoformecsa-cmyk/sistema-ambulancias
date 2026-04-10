"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { useRouter } from "next/navigation"

export default function HistorialChecklist(){

const router = useRouter()

const [ambulancias,setAmbulancias] = useState<any[]>([])
const [ambulancia,setAmbulancia] = useState("")

const [checklists,setChecklists] = useState<any[]>([]) // 🔥 LISTA AGRUPADA
const [detalle,setDetalle] = useState<any[]>([]) // 🔥 DETALLE

const [fechaInicio,setFechaInicio] = useState("")
const [fechaFin,setFechaFin] = useState("")

useEffect(()=>{
cargarAmbulancias()
},[])

/* ========================= */

async function cargarAmbulancias(){
const { data } = await supabase
.from("ambulancias")
.select("id,codigo_operativo")

setAmbulancias(data || [])
}

/* ========================= */
/* 🔥 CARGAR CHECKLISTS AGRUPADOS */
/* ========================= */

async function cargarHistorial(id:string){

if(!id) return

let query = supabase
.from("inventario_checklist")
.select("*")
.eq("ambulancia_id", id)

if(fechaInicio){
query = query.gte("created_at", `${fechaInicio}T00:00:00`)
}
if(fechaFin){
query = query.lte("created_at", `${fechaFin}T23:59:59`)
}

const { data } = await query.order("created_at",{ascending:false})

if(!data) return

/* 🔥 AGRUPAR POR CHECKLIST */
const grupos:any = {}

data.forEach(item=>{
const key = new Date(item.created_at).toISOString()

if(!grupos[key]){
grupos[key] = []
}

grupos[key].push(item)
})

/* 🔥 CONVERTIR A LISTA */
const lista = Object.keys(grupos).map(fecha=>({
fecha,
items: grupos[fecha]
}))

/* 🔥 ORDEN DESC */
lista.sort((a,b)=> new Date(b.fecha).getTime() - new Date(a.fecha).getTime())

setChecklists(lista)

/* 🔥 AUTO SELECCIONAR EL ÚLTIMO */
if(lista.length > 0){
setDetalle(lista[0].items)
}

}

/* ========================= */
/* 🔥 VER DETALLE */
/* ========================= */

function verDetalle(items:any[]){
setDetalle(items)
}

/* ========================= */

function colorEstado(){
return "#22c55e"
}

/* ========================= */

return(

<div style={container}>

<button onClick={()=>router.push("/bitacora/dashboard")} style={btn}>
⬅ Volver
</button>

<h1>📊 Historial Checklist</h1>

<select
value={ambulancia}
onChange={(e)=>{
const id = e.target.value
setAmbulancia(id)
cargarHistorial(id)
}}
style={input}
>
<option value="">Seleccionar ambulancia</option>
{ambulancias.map(a=>(
<option key={a.id} value={a.id}>{a.codigo_operativo}</option>
))}
</select>

<div style={{display:"flex",gap:10}}>

<input type="date" value={fechaInicio} onChange={e=>setFechaInicio(e.target.value)} style={input}/>
<input type="date" value={fechaFin} onChange={e=>setFechaFin(e.target.value)} style={input}/>

<button onClick={()=>cargarHistorial(ambulancia)} style={input}>
Filtrar
</button>

</div>

{/* ========================= */}
{/* 🔥 LISTA DE CHECKLISTS */}
{/* ========================= */}

<h2>🗂 Checklists</h2>

<div style={tabla}>

{checklists.map((c,i)=>(

<div key={i} style={rowClickable} onClick={()=>verDetalle(c.items)}>

<div>
📅 {new Date(c.fecha).toLocaleString()}
</div>

<div>
🧾 {c.items.length} items
</div>

</div>

))}

</div>

{/* ========================= */}
{/* 🔥 DETALLE */}
{/* ========================= */}

<h2>📋 Detalle</h2>

<div style={tabla}>

<div style={headerRow}>
<div>Item</div>
<div>Lote</div>
<div>Cantidad</div>
<div>Caducidad</div>
<div>Estado</div>
</div>

{detalle.map(d=>(

<div key={d.id} style={row}>

<div>{d.item_id}</div>
<div>{d.lote || "-"}</div>
<div>{d.cantidad}</div>
<div>{d.fecha_caducidad || "-"}</div>

<div style={{
background:colorEstado(),
padding:"5px",
borderRadius:6,
textAlign:"center"
}}>
OK
</div>

</div>

))}

</div>

</div>
)
}

/* ========================= */

const container = {background:"#020617",color:"white",minHeight:"100vh",padding:30}
const input = {padding:10,borderRadius:8,background:"#1f2937",color:"white",border:"none"}
const btn = {marginBottom:20,background:"#1f2937",color:"white",padding:10,borderRadius:8}

const tabla = {background:"#111827",borderRadius:10,padding:10,marginTop:20}

const headerRow = {
display:"grid",
gridTemplateColumns:"repeat(5,1fr)",
fontWeight:"bold",
padding:10
}

const row = {
display:"grid",
gridTemplateColumns:"repeat(5,1fr)",
padding:10,
borderBottom:"1px solid #1f2937"
}

const rowClickable = {
display:"flex",
justifyContent:"space-between",
padding:10,
borderBottom:"1px solid #1f2937",
cursor:"pointer"
}