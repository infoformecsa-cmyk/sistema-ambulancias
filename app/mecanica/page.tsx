"use client"

import { useState } from "react"
import { createClient } from "@supabase/supabase-js"
import type { CSSProperties } from "react"
import { useRouter } from "next/navigation"

const supabase = createClient(
process.env.NEXT_PUBLIC_SUPABASE_URL!,
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function Mecanica(){

const router = useRouter()

/* 🔥 SOLO NUEVAS */
const [ambulancias,setAmbulancias] = useState<any[]>([])
const [ambulancia,setAmbulancia] = useState("")

const [estado,setEstado] = useState("operativa")
const [motivo,setMotivo] = useState("")
const [foto,setFoto] = useState<File | null>(null)

/* NUEVA */
const [nueva,setNueva] = useState({
codigo:"",
placa:"",
tipo:"ALFA",
km:"",
mtto:""
})

/* ============================= */
/* CREAR AMBULANCIA */
const crearAmbulancia = async ()=>{

if(!nueva.codigo || !nueva.placa){
alert("Complete datos")
return
}

const { data, error } = await supabase
.from("ambulancias")
.insert({
codigo_operativo:nueva.codigo,
placa:nueva.placa,
tipo:nueva.tipo,
estado:"operativa",
kilometraje_actual:Number(nueva.km),
kilometraje_mtto:Number(nueva.mtto)
})
.select()
.single()

if(error){
alert("Error creando ambulancia")
return
}

/* 🔥 SOLO AGREGAR A LISTA LOCAL */
setAmbulancias(prev => [...prev, data])

/* 🔥 LIMPIAR FORMULARIO */
setNueva({
codigo:"",
placa:"",
tipo:"ALFA",
km:"",
mtto:""
})

alert("Ambulancia creada")

}

/* ============================= */
/* SUBIR FOTO */
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
/* CAMBIAR ESTADO */
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
/* CERRAR SESIÓN */
function cerrarSesion(){
localStorage.clear()
router.push("/")
}

/* ============================= */
/* INTERFAZ */
/* ============================= */

return(

<div style={{padding:"40px"}}>

<h1>SSM Guayas – APH</h1>
<h2>Módulo Mecánico</h2>

<button onClick={cerrarSesion} style={{marginBottom:20}}>
Cerrar sesión
</button>

<hr/>

<h3>Nueva Ambulancia</h3>

<input placeholder="Código"
value={nueva.codigo}
onChange={(e)=>setNueva({...nueva,codigo:e.target.value})} />

<input placeholder="Placa"
value={nueva.placa}
onChange={(e)=>setNueva({...nueva,placa:e.target.value})} />

<input type="number" placeholder="KM"
value={nueva.km}
onChange={(e)=>setNueva({...nueva,km:e.target.value})} />

<input type="number" placeholder="Próx mantenimiento"
value={nueva.mtto}
onChange={(e)=>setNueva({...nueva,mtto:e.target.value})} />

<br/><br/>

<button onClick={crearAmbulancia}>
Crear Ambulancia
</button>

<hr/>

<h3>Cambio de estado</h3>

<select
value={ambulancia}
onChange={(e)=>setAmbulancia(e.target.value)}
>
<option value="">Seleccionar ambulancia</option>
{ambulancias.map((a:any)=>(
<option key={a.id} value={a.id}>
{a.codigo_operativo}
</option>
))}
</select>

<br/><br/>

{/* 🔥 SELECT ESTADO */}
<select
value={estado}
onChange={(e)=>setEstado(e.target.value)}
>
<option value="operativa">Operativa</option>
<option value="mantenimiento">Mantenimiento</option>
<option value="no operativa">Fuera de servicio</option>
</select>

<br/><br/>

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

</div>
)
}