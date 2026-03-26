"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"

type DatosType = Record<string, {
tiene?: boolean
cantidad?: number
fecha?: string
}>

export default function Checklist(){

const [ambulancias,setAmbulancias] = useState<any[]>([])
const [items,setItems] = useState<any[]>([])

const [ambulancia,setAmbulancia] = useState("")

const [responsable,setResponsable] = useState({
nombre:"",
apellido:""
})

const [datos,setDatos] = useState<DatosType>({})

useEffect(()=>{
cargar()
},[])

async function cargar(){

const {data:amb} = await supabase.from("ambulancias").select("*")
const {data:inv} = await supabase.from("inventario_items").select("*")

setAmbulancias(amb || [])
setItems(inv || [])
}

/* ========================= */
/* 🔥 SEMÁFORO */
/* ========================= */
function getSemaforo(fecha?: string){

if(!fecha) return "⚪"

const hoy = new Date()
const cad = new Date(fecha)

const diff = cad.getTime() - hoy.getTime()
const dias = diff / (1000*60*60*24)

if(dias <= 0) return "🔴"
if(dias <= 30) return "🟡"
return "🟢"
}

/* ========================= */
/* ACTUALIZAR */
/* ========================= */
function actualizar(id:string, campo:string, valor:any){

setDatos((prev: DatosType) => ({
...prev,
[id]: {
...prev[id],
[campo]: valor
}
}))

}

/* ========================= */
/* GUARDAR */
/* ========================= */
async function guardar(){

if(!ambulancia){
alert("Seleccione ambulancia")
return
}

if(!responsable.nombre){
alert("Ingrese responsable")
return
}

for(const item of items){

const d = datos[item.id]
if(!d) continue

await supabase.from("inventario_checklist").insert({
ambulancia_id:ambulancia,
item_id:item.id,
tiene:d.tiene || false,
cantidad:Number(d.cantidad || 0),
fecha_caducidad:d.fecha || null,
nombre_responsable:responsable.nombre,
apellido_responsable:responsable.apellido
})

}

alert("Checklist guardado")

setDatos({})
}

/* ========================= */
/* UI */
/* ========================= */

return(

<div style={{padding:30,fontFamily:"Arial"}}>

<h1>📋 Checklist Ambulancia</h1>

<select onChange={(e)=>setAmbulancia(e.target.value)}>
<option value="">Seleccione ambulancia</option>
{ambulancias.map(a=>(
<option key={a.id} value={a.id}>
{a.codigo_operativo}
</option>
))}
</select>

<br/><br/>

<input
placeholder="Nombre"
onChange={(e)=>setResponsable({...responsable,nombre:e.target.value})}
/>

<input
placeholder="Apellido"
onChange={(e)=>setResponsable({...responsable,apellido:e.target.value})}
/>

<hr/>

<table style={{width:"100%",borderCollapse:"collapse"}}>

<thead style={{background:"#f3f4f6"}}>
<tr>
<th>Ambulancia</th>
<th>Item</th>
<th>Tiene</th>
<th>Cantidad</th>
<th>Caducidad</th>
<th>Estado</th>
</tr>
</thead>

<tbody>

{items.map(i=>{

const d = datos[i.id]

return(
<tr key={i.id} style={{borderBottom:"1px solid #ddd"}}>

<td>
{ambulancias.find(a=>a.id==ambulancia)?.codigo_operativo || "-"}
</td>

<td>{i.nombre}</td>

<td>
<input
type="checkbox"
onChange={(e)=>actualizar(i.id,"tiene",e.target.checked)}
/>
</td>

<td>
<input
type="number"
onChange={(e)=>actualizar(i.id,"cantidad",e.target.value)}
/>
</td>

<td>
<input
type="date"
onChange={(e)=>actualizar(i.id,"fecha",e.target.value)}
/>
</td>

<td style={{fontSize:20}}>
{getSemaforo(d?.fecha)}
</td>

</tr>
)
})}

</tbody>

</table>

<br/>

<button onClick={guardar}>
Guardar Checklist
</button>

</div>
)
}