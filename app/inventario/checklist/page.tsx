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
const [guardando,setGuardando] = useState(false)

/* ========================= */
useEffect(()=>{
  cargar()
},[])

/* ========================= */
async function cargar(){

const {data:amb} = await supabase.from("ambulancias").select("*")

const {data:inv} = await supabase
.from("inventario_items")
.select("*")
.order("categoria",{ascending:true})

setAmbulancias(amb || [])
setItems(inv || [])
}

/* ========================= */
/* 🔥 SEMÁFORO PRO */
/* ========================= */
function getSemaforo(fecha?: string){

if(!fecha) return {color:"#9ca3af",label:"Sin fecha"}

const hoy = new Date()
const cad = new Date(fecha)

const diff = cad.getTime() - hoy.getTime()
const dias = diff / (1000*60*60*24)

if(dias <= 0) return {color:"#dc2626",label:"Caducado"}
if(dias <= 30) return {color:"#f59e0b",label:"Próximo"}
return {color:"#16a34a",label:"Óptimo"}
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

setGuardando(true)

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

setGuardando(false)

alert("✅ Checklist guardado correctamente")

setDatos({})
setResponsable({nombre:"",apellido:""})
setAmbulancia("")
}

/* ========================= */
/* COLOR POR CATEGORÍA */
/* ========================= */
function colorCategoria(cat:string){

if(cat==="medicamentos") return "#7f1d1d"
if(cat==="respiratorio") return "#1e3a8a"
if(cat==="trauma") return "#78350f"
if(cat==="lenceria") return "#6b21a8"
if(cat==="canalizacion") return "#065f46"
return "#1f2937"

}

/* ========================= */
/* UI */
/* ========================= */

return(

<div style={{padding:30,fontFamily:"Arial",background:"#f9fafb"}}>

<h1 style={{fontSize:28,fontWeight:"bold"}}>
🚑 Checklist Digital de Ambulancia
</h1>

<p style={{color:"#6b7280"}}>
Control clínico en tiempo real — medicamentos, insumos y equipos
</p>

<hr/>

{/* SELECT */}
<select
value={ambulancia}
onChange={(e)=>setAmbulancia(e.target.value)}
style={input}
>
<option value="">Seleccione ambulancia</option>
{ambulancias.map(a=>(
<option key={a.id} value={a.id}>
{a.codigo_operativo}
</option>
))}
</select>

<br/><br/>

{/* RESPONSABLE */}
<input
placeholder="Nombre"
value={responsable.nombre}
onChange={(e)=>setResponsable({...responsable,nombre:e.target.value})}
style={input}
/>

<input
placeholder="Apellido"
value={responsable.apellido}
onChange={(e)=>setResponsable({...responsable,apellido:e.target.value})}
style={input}
/>

<hr/>

<table style={{width:"100%",borderCollapse:"collapse",marginTop:20}}>

<thead style={{background:"#111827",color:"white"}}>
<tr>
<th style={th}>Ambulancia</th>
<th style={th}>Item</th>
<th style={th}>Tiene</th>
<th style={th}>Cantidad</th>
<th style={th}>Caducidad</th>
<th style={th}>Estado</th>
</tr>
</thead>

<tbody>

{/* 🔥 AGRUPACIÓN PRO */}

{Array.from(new Set(items.map(i => i.categoria))).map(cat => (

<>

{/* CATEGORIA */}
<tr>
<td colSpan={6} style={{
background:colorCategoria(cat),
color:"white",
padding:12,
fontWeight:"bold",
fontSize:14
}}>
{cat.toUpperCase()}
</td>
</tr>

{/* SUBCATEGORIAS */}
{Array.from(new Set(items.filter(i=>i.categoria===cat).map(i=>i.subcategoria))).map(sub => (

<>

<tr>
<td colSpan={6} style={{
background:"#e5e7eb",
fontWeight:"bold",
padding:8,
fontSize:13
}}>
{sub}
</td>
</tr>

{/* ITEMS */}
{items
.filter(i=>i.categoria===cat && i.subcategoria===sub)
.map(i=>{

const d = datos[i.id]
const sem = getSemaforo(d?.fecha)

return(
<tr key={i.id} style={{borderBottom:"1px solid #e5e7eb"}}>

<td style={td}>
{ambulancias.find(a=>a.id==ambulancia)?.codigo_operativo || "-"}
</td>

<td style={td}>
{i.nombre}
<br/>
<span style={{fontSize:10,color:"#9ca3af"}}>
Base: {i.cantidad_base || 0}
</span>
</td>

<td style={td}>
<input
type="checkbox"
checked={d?.tiene || false}
onChange={(e)=>actualizar(i.id,"tiene",e.target.checked)}
/>
</td>

<td style={td}>
<input
type="number"
style={{width:70}}
value={d?.cantidad || ""}
onChange={(e)=>actualizar(i.id,"cantidad",e.target.value)}
/>
</td>

<td style={td}>
<input
type="date"
value={d?.fecha || ""}
onChange={(e)=>actualizar(i.id,"fecha",e.target.value)}
/>
</td>

<td style={td}>
<span style={{
background:sem.color,
color:"white",
padding:"4px 10px",
borderRadius:6,
fontSize:12
}}>
{sem.label}
</span>
</td>

</tr>
)

})}

</>
))}

</>
))}

</tbody>

</table>

<br/>

<button
onClick={guardar}
style={btn}
>
{guardando ? "Guardando..." : "Guardar Checklist"}
</button>

</div>
)
}

/* ========================= */
/* ESTILOS */
/* ========================= */

const input = {
padding:10,
marginRight:10,
border:"1px solid #d1d5db",
borderRadius:8
}

const th = {
padding:12,
textAlign:"left" as const
}

const td = {
padding:10
}

const btn = {
background:"#2563eb",
color:"white",
padding:"14px 24px",
borderRadius:10,
border:"none",
cursor:"pointer",
fontWeight:"bold"
}