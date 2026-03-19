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

const [fallas,setFallas] = useState<any[]>([])
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
cargarFallas(),
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

async function cargarFallas(){
const {data} = await supabase
.from("reportes_fallas")
.select("*")
.eq("ambulancia_id",id)
.order("created_at",{ascending:false})

setFallas(data || [])
}

async function cargarHistorial(){
const {data} = await supabase
.from("historial_operativo")
.select("*")
.eq("ambulancia_id",id)
.order("fecha_inicio",{ascending:false})

setHistorial(data || [])
}

/* 🔥 ESTADO */
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

const usuario = localStorage.getItem("nombre")

await supabase
.from("historial_operativo")
.update({ fecha_fin: new Date().toISOString() })
.eq("ambulancia_id",id)
.is("fecha_fin",null)

await supabase
.from("historial_operativo")
.insert({
ambulancia_id:id,
estado:estadoPendiente,
motivo:motivoCambio,
fecha_inicio:new Date().toISOString(),
usuario
})

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

setLoading(false)
}

/* 🔥 KM */
async function actualizarKilometraje(){

if(!nuevoKm) return

await supabase
.from("ambulancias")
.update({ kilometraje_actual: Number(nuevoKm) })
.eq("id",id)

alert("Kilometraje actualizado")

setNuevoKm("")
cargarAmbulancia()
}

async function guardarMtto(){

if(!kmMtto) return

await supabase
.from("ambulancias")
.update({ kilometraje_mtto: Number(kmMtto) })
.eq("id",id)

alert("Mantenimiento guardado")

setKmMtto("")
cargarAmbulancia()
}

/* 🔥 ALERTA */
function renderAlerta(){

if(!ambulancia?.kilometraje_mtto || !ambulancia?.kilometraje_actual) return null

const faltan = ambulancia.kilometraje_mtto - ambulancia.kilometraje_actual

if(faltan <= 0){
return <div style={{background:"#ffdddd",padding:10}}>🚨 MANTENIMIENTO VENCIDO</div>
}

if(faltan <= 400){
return <div style={{background:"#fff3cd",padding:10}}>⚠️ Faltan {faltan} km para mantenimiento</div>
}

return <div style={{background:"#e6f7ff",padding:10}}>✅ Operación normal</div>
}

function calcularTiempo(i:string,f:string|null){
const inicio = new Date(i)
const fin = f ? new Date(f) : new Date()
const diff = fin.getTime() - inicio.getTime()
const h = Math.floor(diff/(1000*60*60))
return `${h} h`
}

if(!ambulancia) return <div style={{padding:40}}>Cargando...</div>

return(

<div style={{padding:40,fontFamily:"Arial",maxWidth:900}}>

<h1>Ficha Mecánica Ambulancia</h1>

<button onClick={()=>router.push("/dashboard")}>
← Volver al Dashboard
</button>

<hr/>

{/* 🔹 ESTADO */}
<h2>Estado Operativo</h2>

<p><b>KM actual:</b> {ambulancia.kilometraje_actual || 0}</p>
<p><b>Estado:</b> {ambulancia.estado}</p>

{renderAlerta()}

<div style={{marginTop:15}}>

<button onClick={()=>abrirCambioEstado("operativa")} style={{background:"green",color:"white",padding:8,marginRight:10}}>
Operativa
</button>

<button onClick={()=>abrirCambioEstado("mantenimiento")} style={{background:"orange",color:"white",padding:8,marginRight:10}}>
Mantenimiento
</button>

<button onClick={()=>abrirCambioEstado("no operativa")} style={{background:"red",color:"white",padding:8}}>
Fuera de servicio
</button>

</div>

<hr/>

{/* 🔹 KM */}
<h2>Registro Diario</h2>

<input
type="number"
placeholder="Nuevo KM"
value={nuevoKm}
onChange={(e)=>setNuevoKm(e.target.value)}
/>

<button onClick={actualizarKilometraje} style={{marginLeft:10}}>
Actualizar KM
</button>

<hr/>

{/* 🔹 MTTO */}
<h2>Mantenimiento Preventivo</h2>

<p>Próximo: {ambulancia.kilometraje_mtto || "-"}</p>

<input
type="number"
placeholder="Definir KM mantenimiento"
value={kmMtto}
onChange={(e)=>setKmMtto(e.target.value)}
/>

<button onClick={guardarMtto} style={{marginLeft:10}}>
Guardar
</button>

<hr/>

{/* 🔹 HISTORIAL */}
<h2>Historial Operativo</h2>

<table border={1} style={{width:"100%",borderCollapse:"collapse"}}>

<thead>
<tr>
<th>Estado</th>
<th>Motivo</th>
<th>Tiempo</th>
</tr>
</thead>

<tbody>

{historial.map(h=>(
<tr key={h.id}>
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