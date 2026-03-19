"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { useRouter, useParams } from "next/navigation"

export default function FichaAmbulancia(){

const router = useRouter()
const params = useParams()
const id = params?.id as string

const [ambulancia,setAmbulancia] = useState<any>(null)

const [nuevoKm,setNuevoKm] = useState("")
const [kmMtto,setKmMtto] = useState("")

const [historial,setHistorial] = useState<any[]>([])

const [mostrarModal,setMostrarModal] = useState(false)
const [estadoPendiente,setEstadoPendiente] = useState("")
const [motivoCambio,setMotivoCambio] = useState("")
const [loading,setLoading] = useState(false)

/* 🔥 CARGA */
useEffect(()=>{
if(!id) return

async function init(){
await Promise.all([
cargarAmbulancia(),
cargarHistorial()
])
}

init()

},[id])

async function cargarAmbulancia(){
const {data} = await supabase
.from("ambulancias")
.select("*")
.eq("id",id)
.single()

if(data) setAmbulancia(data)
}

async function cargarHistorial(){
const {data} = await supabase
.from("historial_operativo")
.select("*")
.eq("ambulancia_id",id)
.order("fecha_inicio",{ascending:false})

setHistorial(data || [])
}

/* 🔥 CAMBIO DE ESTADO SEGURO */
function abrirCambioEstado(estado:string){
setEstadoPendiente(estado)
setMostrarModal(true)
}

async function confirmarCambioEstado(){

if(loading) return

if(!motivoCambio){
alert("Debe ingresar un motivo")
return
}

setLoading(true)

try{

const usuario = localStorage.getItem("nombre")

/* 🔒 VALIDAR DUPLICADO */
const {data:ultimo} = await supabase
.from("historial_operativo")
.select("*")
.eq("ambulancia_id",id)
.order("fecha_inicio",{ascending:false})
.limit(1)

if(ultimo && ultimo.length > 0){
const last = ultimo[0]

if(last.estado === estadoPendiente && !last.fecha_fin){
alert("Ya existe este estado activo")
setLoading(false)
return
}
}

/* cerrar evento anterior */
await supabase
.from("historial_operativo")
.update({ fecha_fin: new Date().toISOString() })
.eq("ambulancia_id",id)
.is("fecha_fin",null)

/* nuevo evento */
await supabase
.from("historial_operativo")
.insert({
ambulancia_id:id,
estado:estadoPendiente,
motivo:motivoCambio,
fecha_inicio:new Date().toISOString(),
usuario
})

/* actualizar ambulancia */
await supabase
.from("ambulancias")
.update({
estado:estadoPendiente,
motivo_no_operativo:
estadoPendiente === "operativa"
? null
: motivoCambio
})
.eq("id",id)

alert("Estado actualizado")

setMostrarModal(false)
setMotivoCambio("")
setEstadoPendiente("")

await Promise.all([cargarAmbulancia(),cargarHistorial()])

}catch(e){
alert("Error en el cambio de estado")
console.log(e)
}

setLoading(false)
}

/* 🔥 KM */
async function actualizarKilometraje(){

if(!nuevoKm) return

await supabase
.from("ambulancias")
.update({ kilometraje_actual: Number(nuevoKm) })
.eq("id",id)

setNuevoKm("")
cargarAmbulancia()
}

/* 🔥 MTTO */
async function guardarMtto(){

if(!kmMtto) return

await supabase
.from("ambulancias")
.update({ kilometraje_mtto: Number(kmMtto) })
.eq("id",id)

setKmMtto("")
cargarAmbulancia()
}

/* 🔥 ALERTA */
function renderAlerta(){

if(!ambulancia?.kilometraje_mtto || !ambulancia?.kilometraje_actual) return null

const faltan = ambulancia.kilometraje_mtto - ambulancia.kilometraje_actual

if(faltan <= 0){
return <div style={{background:"#fee2e2",padding:12,borderRadius:6}}>🚨 Mantenimiento vencido</div>
}

if(faltan <= 400){
return <div style={{background:"#fef9c3",padding:12,borderRadius:6}}>⚠️ Faltan {faltan} km</div>
}

return <div style={{background:"#dcfce7",padding:12,borderRadius:6}}>✅ Operativa</div>
}

/* 🔥 TIEMPO CORRECTO */
function calcularTiempo(inicio:string, fin:string|null){

const i = new Date(inicio)
const f = fin ? new Date(fin) : new Date()

if(f < i) return "0 h"

const diff = f.getTime() - i.getTime()

const dias = Math.floor(diff / (1000*60*60*24))
const horas = Math.floor((diff % (1000*60*60*24)) / (1000*60*60))
const minutos = Math.floor((diff % (1000*60*60)) / (1000*60))

if(dias > 0) return `${dias} d ${horas} h`

return `${horas} h ${minutos} min`
}

if(!ambulancia) return <div style={{padding:40}}>Cargando...</div>

return(

<div style={{padding:30,fontFamily:"Arial",maxWidth:900}}>

<h1>🚑 Ficha Mecánica</h1>

<button onClick={()=>router.push("/dashboard")}>
← Volver
</button>

<hr/>

{/* 🔹 ESTADO */}
<h2>Estado Operativo</h2>

<div style={{background:"#f3f4f6",padding:15,borderRadius:8}}>

<p><b>KM:</b> {ambulancia.kilometraje_actual || 0}</p>
<p><b>Estado:</b> {ambulancia.estado}</p>

{renderAlerta()}

</div>

<div style={{marginTop:15}}>

<button onClick={()=>abrirCambioEstado("operativa")} style={{background:"#16a34a",color:"white",padding:10,borderRadius:6}}>
🟢 Operativa
</button>

<button onClick={()=>abrirCambioEstado("mantenimiento")} style={{background:"#f59e0b",color:"white",padding:10,borderRadius:6,marginLeft:10}}>
🔧 Mantenimiento
</button>

<button onClick={()=>abrirCambioEstado("no operativa")} style={{background:"#dc2626",color:"white",padding:10,borderRadius:6,marginLeft:10}}>
🔴 Fuera de servicio
</button>

</div>

<hr/>

{/* 🔹 KM */}
<h2>Registro Diario</h2>

<input type="number" placeholder="Nuevo KM" value={nuevoKm}
onChange={(e)=>setNuevoKm(e.target.value)} />

<button onClick={actualizarKilometraje} style={{marginLeft:10}}>
Actualizar
</button>

<hr/>

{/* 🔹 MTTO */}
<h2>Mantenimiento Preventivo</h2>

<p>Próximo: {ambulancia.kilometraje_mtto || "-"}</p>

<input type="number" placeholder="KM mantenimiento" value={kmMtto}
onChange={(e)=>setKmMtto(e.target.value)} />

<button onClick={guardarMtto} style={{marginLeft:10}}>
Guardar
</button>

<hr/>

{/* 🔹 HISTORIAL */}
<h2>Historial Operativo</h2>

<table style={{width:"100%",borderCollapse:"collapse"}}>

<thead>
<tr style={{background:"#f3f4f6"}}>
<th>Estado</th>
<th>Motivo</th>
<th>Tiempo</th>
</tr>
</thead>

<tbody>

{historial.map(h=>(
<tr key={h.id} style={{borderBottom:"1px solid #ddd"}}>
<td>{h.estado}</td>
<td>{h.motivo}</td>
<td>{calcularTiempo(h.fecha_inicio,h.fecha_fin)}</td>
</tr>
))}

</tbody>

</table>

{/* 🔹 MODAL */}
{mostrarModal && (

<div style={{
position:"fixed",
top:0,left:0,width:"100%",height:"100%",
background:"rgba(0,0,0,0.5)",
display:"flex",justifyContent:"center",alignItems:"center"
}}>

<div style={{background:"white",padding:20,width:400,borderRadius:10}}>

<h3>Cambio de estado</h3>

<p><b>{estadoPendiente}</b></p>

<textarea
value={motivoCambio}
onChange={(e)=>setMotivoCambio(e.target.value)}
style={{width:"100%",height:100}}
/>

<br/><br/>

<button onClick={confirmarCambioEstado} disabled={loading}>
{loading ? "Guardando..." : "Confirmar"}
</button>

<button onClick={()=>setMostrarModal(false)} style={{marginLeft:10}}>
Cancelar
</button>

</div>

</div>

)}

</div>

)

}