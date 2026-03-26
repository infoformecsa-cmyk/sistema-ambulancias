"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { useRouter } from "next/navigation"

/* ============================= */
/* SEMÁFORO */
/* ============================= */
function calcularSemaforo(fecha:string){

const hoy = new Date()
const cad = new Date(fecha)

const diff = (cad.getTime() - hoy.getTime()) / (1000*60*60*24)

if(diff <= 0) return "rojo"
if(diff <= 30) return "amarillo"
return "verde"
}

/* ============================= */

export default function Inventario(){

const router = useRouter()

const [items,setItems] = useState<any[]>([])

const [nuevo,setNuevo] = useState({
nombre:"",
categoria:"medicamento",
cantidad:"",
stock_minimo:"",
fecha:"",
ubicacion:""
})

/* ============================= */
/* VALIDACIÓN USUARIO */
/* ============================= */
useEffect(()=>{

const email = localStorage.getItem("email")

if(!email){
router.push("/")
return
}

if(!["admin.in@ambulancias.ec","inventario@ambulancias.ec"].includes(email)){
router.push("/dashboard")
return
}

cargar()

},[])

/* ============================= */
async function cargar(){

const {data} = await supabase
.from("inventario_items")
.select("*")
.order("created_at",{ascending:false})

setItems(data || [])
}

/* ============================= */
/* CREAR ITEM */
/* ============================= */
async function crear(){

if(!nuevo.nombre || !nuevo.fecha){
alert("Complete los campos")
return
}

const estado = calcularSemaforo(nuevo.fecha)

await supabase.from("inventario_items").insert({
nombre:nuevo.nombre,
categoria:nuevo.categoria,
cantidad:Number(nuevo.cantidad),
stock_minimo:Number(nuevo.stock_minimo),
fecha_caducidad:nuevo.fecha,
estado,
ubicacion:nuevo.ubicacion
})

/* limpiar */
setNuevo({
nombre:"",
categoria:"medicamento",
cantidad:"",
stock_minimo:"",
fecha:"",
ubicacion:""
})

cargar()
}

/* ============================= */
/* COLORES */
/* ============================= */
function colorEstado(e:string){

if(e==="verde") return "#16a34a"
if(e==="amarillo") return "#f59e0b"
return "#dc2626"
}

/* ============================= */

return(

<div style={{padding:30,fontFamily:"Arial",maxWidth:1000}}>

<h1>📦 Inventario Médico</h1>

<button onClick={()=>router.push("/dashboard")}>
← Volver
</button>

<hr/>

<h3>Nuevo producto</h3>

<input
placeholder="Nombre"
value={nuevo.nombre}
onChange={(e)=>setNuevo({...nuevo,nombre:e.target.value})}
/>

<select
value={nuevo.categoria}
onChange={(e)=>setNuevo({...nuevo,categoria:e.target.value})}
>
<option value="medicamento">Medicamento</option>
<option value="insumo">Insumo</option>
<option value="equipo">Equipo biomédico</option>
</select>

<input
type="number"
placeholder="Cantidad"
value={nuevo.cantidad}
onChange={(e)=>setNuevo({...nuevo,cantidad:e.target.value})}
/>

<input
type="number"
placeholder="Stock mínimo"
value={nuevo.stock_minimo}
onChange={(e)=>setNuevo({...nuevo,stock_minimo:e.target.value})}
/>

<input
type="date"
value={nuevo.fecha}
onChange={(e)=>setNuevo({...nuevo,fecha:e.target.value})}
/>

<input
placeholder="Ubicación (ambulancia/bodega)"
value={nuevo.ubicacion}
onChange={(e)=>setNuevo({...nuevo,ubicacion:e.target.value})}
/>

<br/><br/>

<button onClick={crear}>
Guardar
</button>

<hr/>

<h3>Inventario</h3>

<table style={{width:"100%",borderCollapse:"collapse"}}>

<thead style={{background:"#f3f4f6"}}>
<tr>
<th>Nombre</th>
<th>Categoría</th>
<th>Cantidad</th>
<th>Caducidad</th>
<th>Estado</th>
<th>Ubicación</th>
</tr>
</thead>

<tbody>

{items.map(i=>(
<tr key={i.id} style={{borderBottom:"1px solid #ddd"}}>

<td>{i.nombre}</td>
<td>{i.categoria}</td>
<td>{i.cantidad}</td>
<td>{i.fecha_caducidad}</td>

<td style={{color:colorEstado(i.estado)}}>
{i.estado}
</td>

<td>{i.ubicacion}</td>

</tr>
))}

</tbody>

</table>

</div>
)
}