"use client"

import { useEffect, useState } from "react"
import { createClient } from "@supabase/supabase-js"
import type { CSSProperties } from "react"

const supabase = createClient(
process.env.NEXT_PUBLIC_SUPABASE_URL!,
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function Mecanica(){

const [ambulancias,setAmbulancias] = useState<any[]>([])
const [historial,setHistorial] = useState<any[]>([])
const [ambulancia,setAmbulancia] = useState("")

const [descripcion,setDescripcion] = useState("")
const [kilometraje,setKilometraje] = useState("")
const [tipo,setTipo] = useState("Preventivo")
const [cargando,setCargando] = useState(false)

/* 🔥 NUEVO */
const [estado,setEstado] = useState("operativa")
const [motivo,setMotivo] = useState("")
const [foto,setFoto] = useState<File | null>(null)

/* 🔥 NUEVA AMBULANCIA */
const [nueva,setNueva] = useState({
codigo:"",
placa:"",
tipo:"ALFA",
km:"",
mtto:""
})

/* ============================= */
useEffect(()=>{
cargarAmbulancias()
},[])

/* ============================= */
const cargarAmbulancias = async () => {

const { data } = await supabase
.from("ambulancias")
.select("*")
.order("codigo_operativo",{ascending:true})

setAmbulancias(data || [])
}

/* ============================= */
const cargarHistorial = async (id:string)=>{

const {data} = await supabase
.from("mantenimientos")
.select("*")
.eq("ambulancia_id",id)
.order("fecha",{ascending:false})

setHistorial(data || [])
}

/* ============================= */
const seleccionarAmbulancia = (id:string)=>{
setAmbulancia(id)
if(id) cargarHistorial(id)
}

/* ============================= */
/* 🔥 CREAR AMBULANCIA */
const crearAmbulancia = async ()=>{

if(!nueva.codigo || !nueva.placa){
alert("Complete datos")
return
}

await supabase.from("ambulancias").insert({
codigo_operativo:nueva.codigo,
placa:nueva.placa,
tipo:nueva.tipo,
estado:"operativa",
kilometraje_actual:Number(nueva.km),
kilometraje_mtto:Number(nueva.mtto)
})

alert("Ambulancia creada")
cargarAmbulancias()

}

/* ============================= */
/* 🔥 SUBIR FOTO */
async function subirFoto(): Promise<string | null>{

if(!foto) return null

const nombre = `mecanica_${Date.now()}`

const { error } = await supabase.storage
.from("ambulancias")
.upload(nombre, foto)

if(error){
alert("Error subiendo imagen")
return null
}

const { data } = supabase.storage
.from("ambulancias")
.getPublicUrl(nombre)

return data.publicUrl
}

/* ============================= */
/* 🔥 CAMBIO DE ESTADO */
const cambiarEstado = async ()=>{

if(!ambulancia){
alert("Seleccione ambulancia")
return
}

if(!motivo){
alert("Ingrese motivo")
return
}

const foto_url = await subirFoto()

await supabase.from("historial_operativo").insert({
ambulancia_id:ambulancia,
estado,
motivo,
fecha_inicio:new Date().toISOString(),
foto_url
})

await supabase.from("ambulancias").update({
estado,
motivo_no_operativo:estado === "operativa" ? null : motivo
}).eq("id",ambulancia)

alert("Estado actualizado")

setMotivo("")
setFoto(null)

}

/* ============================= */
/* REGISTRO MANTENIMIENTO */
const registrarMantenimiento = async ()=>{

if(!ambulancia){
alert("Seleccione una ambulancia")
return
}

if(!descripcion){
alert("Ingrese una descripción")
return
}

setCargando(true)

await supabase.from("mantenimientos").insert([
{
ambulancia_id:ambulancia,
tipo,
descripcion,
kilometraje:kilometraje ? Number(kilometraje) : null,
fecha:new Date()
}
])

setCargando(false)

setDescripcion("")
setKilometraje("")

cargarHistorial(ambulancia)

alert("Mantenimiento registrado")
}

/* ============================= */
/* INTERFAZ */
/* ============================= */

return(

<div style={{padding:"40px"}}>

<h1>SSM Guayas – APH</h1>
<h2>Módulo Mecánico</h2>

<hr/>

{/* 🔥 NUEVA AMBULANCIA */}

<h3>Nueva Ambulancia</h3>

<input placeholder="Código"
onChange={(e)=>setNueva({...nueva,codigo:e.target.value})} />

<input placeholder="Placa"
onChange={(e)=>setNueva({...nueva,placa:e.target.value})} />

<input type="number" placeholder="KM"
onChange={(e)=>setNueva({...nueva,km:e.target.value})} />

<input type="number" placeholder="Próx mantenimiento"
onChange={(e)=>setNueva({...nueva,mtto:e.target.value})} />

<br/><br/>

<button onClick={crearAmbulancia}>
Crear Ambulancia
</button>

<hr/>

<h3>Registrar mantenimiento</h3>

<select
value={ambulancia}
onChange={(e)=>seleccionarAmbulancia(e.target.value)}
>
<option value="">Seleccionar ambulancia</option>
{ambulancias.map((a:any)=>(
<option key={a.id} value={a.id}>
{a.codigo_operativo}
</option>
))}
</select>

<br/><br/>

{/* 🔥 BOTONES ESTADO */}

<div style={{display:"flex",gap:10}}>
<button onClick={()=>setEstado("operativa")} style={btnGreen}>Operativa</button>
<button onClick={()=>setEstado("mantenimiento")} style={btnYellow}>Mantenimiento</button>
<button onClick={()=>setEstado("no operativa")} style={btnRed}>Fuera servicio</button>
</div>

<br/>

<textarea
placeholder="Motivo del estado"
value={motivo}
onChange={(e)=>setMotivo(e.target.value)}
/>

<br/>

<input type="file" onChange={(e)=>setFoto(e.target.files?.[0] || null)} />

<br/><br/>

<button onClick={cambiarEstado}>
Cambiar estado
</button>

<hr/>

{/* MANTENIMIENTO */}

<select value={tipo} onChange={(e)=>setTipo(e.target.value)}>
<option>Preventivo</option>
<option>Correctivo</option>
</select>

<input
type="number"
placeholder="Kilometraje"
value={kilometraje}
onChange={(e)=>setKilometraje(e.target.value)}
/>

<textarea
placeholder="Descripción"
value={descripcion}
onChange={(e)=>setDescripcion(e.target.value)}
/>

<br/>

<button onClick={registrarMantenimiento}>
{cargando ? "Guardando..." : "Registrar mantenimiento"}
</button>

{/* HISTORIAL */}

{ambulancia && (
<table border={1} style={{marginTop:20}}>
<tbody>
{historial.map((m:any)=>(
<tr key={m.id}>
<td>{m.tipo}</td>
<td>{m.descripcion}</td>
</tr>
))}
</tbody>
</table>
)}

</div>
)
}

/* ESTILOS */

const btnGreen: CSSProperties = {background:"#16a34a",color:"white",padding:10,borderRadius:6}
const btnYellow: CSSProperties = {background:"#f59e0b",color:"white",padding:10,borderRadius:6}
const btnRed: CSSProperties = {background:"#dc2626",color:"white",padding:10,borderRadius:6}