"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { useParams, useRouter } from "next/navigation"

export default function ChecklistAmbulancia(){

const { codigo } = useParams()
const router = useRouter()

const [data,setData] = useState<any[]>([])
const [loading,setLoading] = useState(true)

/* ========================= */
useEffect(()=>{
cargar()
},[])

/* ========================= */
async function cargar(){

/* buscar id de ambulancia */
const { data: amb } = await supabase
.from("ambulancias")
.select("id,codigo_operativo")
.eq("codigo_operativo", codigo)
.single()

if(!amb){
setLoading(false)
return
}

/* traer checklist */
const { data } = await supabase
.from("inventario_checklist")
.select("*")
.eq("ambulancia_id", amb.id)

/* traer items */
const { data: items } = await supabase
.from("inventario_items")
.select("id,nombre,cantidad_base")

const itemMap:any = {}
items?.forEach(i=>{
itemMap[i.id] = i
})

const dataFinal = (data || []).map((r:any)=>({
...r,
item_nombre: itemMap[r.item_id]?.nombre || "Item",
cantidad_base: itemMap[r.item_id]?.cantidad_base || 0
}))

setData(dataFinal)
setLoading(false)
}

/* ========================= */
function colorEstado(r:any){

if(!r.tiene || r.cantidad < r.cantidad_base){
return "#dc2626" // rojo
}

if(r.fecha_caducidad){
const diff = (new Date(r.fecha_caducidad).getTime() - new Date().getTime())/(1000*60*60*24)

if(diff <= 0) return "#dc2626"
if(diff <= 30) return "#f59e0b"
}

return "#16a34a"
}

/* ========================= */
return(

<div style={{padding:30,fontFamily:"Arial"}}>

<button onClick={()=>router.back()} style={{marginBottom:20}}>
⬅ Volver
</button>

<h1>🚑 Ambulancia {codigo}</h1>

<p>Checklist clínico detallado</p>

<hr/>

{loading && <p>Cargando...</p>}

<table style={{width:"100%",borderCollapse:"collapse"}}>

<thead style={{background:"#111827",color:"white"}}>
<tr>
<th style={th}>Item</th>
<th style={th}>Cantidad</th>
<th style={th}>Base</th>
<th style={th}>Estado</th>
<th style={th}>Caducidad</th>
</tr>
</thead>

<tbody>

{data.map(r=>(

<tr key={r.id} style={{borderBottom:"1px solid #ddd"}}>

<td style={td}>{r.item_nombre}</td>

<td style={td}>{r.cantidad}</td>

<td style={td}>{r.cantidad_base}</td>

<td style={{...td,color:colorEstado(r)}}>
●
</td>

<td style={td}>{r.fecha_caducidad || "-"}</td>

</tr>

))}

</tbody>

</table>

</div>
)
}

/* ========================= */
const th = {
padding:10,
textAlign:"left" as const
}

const td = {
padding:10
}