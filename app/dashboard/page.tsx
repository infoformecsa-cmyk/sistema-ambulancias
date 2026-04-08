"use client"

import { useEffect,useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { useRouter } from "next/navigation"

export default function Dashboard(){

const router = useRouter()

const [rol,setRol] = useState("")
const [nombre,setNombre] = useState("")
const [ambulancias,setAmbulancias] = useState<any[]>([])
const [alertas,setAlertas] = useState<any[]>([])
const [historial,setHistorial] = useState<any[]>([])

const [editando,setEditando] = useState<string | null>(null)
const [editData,setEditData] = useState<any>({})

const [horasMap,setHorasMap] = useState<Record<string, number>>({})

useEffect(()=>{

const r = localStorage.getItem("rol")
const n = localStorage.getItem("nombre")
const email = localStorage.getItem("email")

if(!r){
router.push("/")
return
}

async function validarRol(){

if(!email){
router.push("/")
return
}

const { data } = await supabase
.from("usuarios")
.select("rol")
.eq("email", email)
.single()

if(data?.rol !== "admin"){

if(data?.rol === "supervisor"){
router.push("/supervisor")
return
}

router.push("/")
return
}

}

validarRol()

if(r==="conductor"){
router.push("/conductor")
return
}

setRol(r)
setNombre(n || "")

cargar()

const intervalo=setInterval(()=>{cargar()},30000)
return ()=>clearInterval(intervalo)

},[])

async function cargar(){

const {data:amb} = await supabase.from("ambulancias").select("*").order("codigo_operativo")
const {data:alert} = await supabase.from("reportes_fallas").select("*").eq("estado","abierta").eq("criticidad","critica")
const {data:hist} = await supabase.from("historial_operativo").select("*")

const ambs = amb || []
const histo = hist || []

setAmbulancias(ambs)
setAlertas(alert || [])
setHistorial(histo)

const mapa: Record<string, number> = {}

ambs.forEach(a=>{
const eventos = histo.filter(h=>String(h.ambulancia_id) === String(a.id))
let total = 0

eventos.forEach(e=>{
if(e.estado === "operativa") return
const inicio = new Date(e.fecha_inicio)
const fin = e.fecha_fin ? new Date(e.fecha_fin) : new Date()
if(isNaN(inicio.getTime()) || isNaN(fin.getTime()) || fin < inicio) return
total += (fin.getTime() - inicio.getTime())
})

mapa[String(a.id)] = Math.floor(total / (1000*60*60))
})

setHorasMap(mapa)
}

async function eliminarAmbulancia(id:string){
if(!confirm("¿Eliminar ambulancia?")) return
await supabase.from("historial_operativo").delete().eq("ambulancia_id",id)
await supabase.from("mantenimientos").delete().eq("ambulancia_id",id)
await supabase.from("ambulancias").delete().eq("id",id)
cargar()
}

async function guardarEdicion(id:string){
await supabase.from("ambulancias").update({
codigo_operativo: editData.codigo_operativo,
placa: editData.placa,
marca: editData.marca,
tipo: editData.tipo
}).eq("id",id)
setEditando(null)
cargar()
}

/* KPI */
const total = ambulancias.length
const operativas = ambulancias.filter(a=>a.estado==="operativa").length
const mantenimiento = ambulancias.filter(a=>a.estado==="mantenimiento").length
const fuera = ambulancias.filter(a=>a.estado==="no operativa").length
const disponibilidad = total>0 ? Math.round((operativas/total)*100) : 0

const totalHorasFuera = Object.values(horasMap).reduce((a,b)=>a+(b||0),0)
const promedioHoras = total ? Math.round(totalHorasFuera / total) : 0

const mttoVencido = ambulancias.filter(a=>a.kilometraje_actual >= a.kilometraje_mtto)
const mttoProximo = ambulancias.filter(a=>{
const faltan = a.kilometraje_mtto - a.kilometraje_actual
return faltan <= 400 && faltan > 0
})

function cerrarSesion(){
localStorage.clear()
router.push("/")
}

function colorEstado(e:string){
if(e==="operativa") return "#22c55e"
if(e==="mantenimiento") return "#f59e0b"
return "#ef4444"
}

return(

<div style={container}>

<div style={header}>
<div>
<h1 style={title}>🚑 Centro de Control de Ambulancias</h1>
<p style={sub}>Dirección Provincial de Salud del Guayas</p>
</div>

<div>
<b>{nombre}</b> | {rol}
<button onClick={cerrarSesion} style={logout}>Salir</button>
</div>
</div>

<div style={actions}>
<button onClick={()=>router.push("/dashboard/nueva-ambulancia")} style={btnPrimary}>+ Ambulancia</button>
<button onClick={()=>router.push("/dashboard/informe-flota")} style={btnAlt}>Informe</button>
<button onClick={()=>router.push("/inventario/kilometrajes")} style={btnInfo}>KM Diario</button>
<button onClick={()=>router.push("/dashboard/inteligencia")} style={btnPrimary}>🧠 Inteligencia de mantenimiento</button>
</div>

{mttoVencido.length>0 && (
<div style={alertRed}>
🚨 Mantenimiento vencido: {mttoVencido.map(a=>a.codigo_operativo).join(", ")}
</div>
)}

{mttoProximo.length>0 && (
<div style={alertYellow}>
⚠️ Próximo mantenimiento: {mttoProximo.map(a=>a.codigo_operativo).join(", ")}
</div>
)}

<div style={grid}>
<Card title="Operativas" value={operativas} color="#22c55e"/>
<Card title="Mantenimiento" value={mantenimiento} color="#f59e0b"/>
<Card title="No operativas" value={fuera} color="#ef4444"/>
<Card title="Disponibilidad" value={disponibilidad+"%"} />
<Card title="Horas fuera" value={totalHorasFuera+"h"} />
<Card title="Promedio" value={promedioHoras+"h"} />
</div>

<div style={tableBox}>

<table style={table}>
<thead>
<tr>
<th>Estado</th>
<th>Código</th>
<th>Placa</th>
<th>Marca</th>
<th>Tipo</th>
<th>KM</th>
<th>Horas</th>
<th>Acciones</th>
</tr>
</thead>

<tbody>
{ambulancias.map(a=>(
<tr key={a.id} style={row}>

<td style={{color:colorEstado(a.estado)}}>{a.estado}</td>

<td>
{editando === a.id
? <input value={editData.codigo_operativo} onChange={(e)=>setEditData({...editData,codigo_operativo:e.target.value})} style={inputEdit}/>
: a.codigo_operativo}
</td>

<td>
{editando === a.id
? <input value={editData.placa} onChange={(e)=>setEditData({...editData,placa:e.target.value})} style={inputEdit}/>
: a.placa}
</td>

<td>
{editando === a.id
? <input value={editData.marca || ""} onChange={(e)=>setEditData({...editData,marca:e.target.value})} style={inputEdit}/>
: a.marca || "-"}
</td>

<td>
{editando === a.id
? <select value={editData.tipo} onChange={(e)=>setEditData({...editData,tipo:e.target.value})} style={inputEdit}>
<option value="ALFA">ALFA</option>
<option value="BRAVO">BRAVO</option>
</select>
: a.tipo}
</td>

<td>{a.kilometraje_actual}</td>
<td>{horasMap[String(a.id)] || 0}h</td>

<td>

{editando === a.id ? (
<>
<button onClick={()=>guardarEdicion(a.id)} style={btnMini}>💾</button>
<button onClick={()=>setEditando(null)} style={btnMini}>❌</button>
</>
) : (
<>
<button onClick={()=>router.push(`/ambulancia/${a.id}`)} style={btnMini}>Ficha</button>

<button onClick={()=>{
setEditando(a.id)
setEditData(a)
}} style={btnMini}>
Editar
</button>

<button onClick={()=>router.push(`/dashboard/historial?ambulancia=${a.id}`)} style={btnMini}>
Historial
</button>

<button onClick={()=>eliminarAmbulancia(a.id)} style={btnDanger}>
🗑
</button>
</>
)}

</td>

</tr>
))}
</tbody>
</table>

</div>

</div>
)
}

/* KPI */
function Card({title,value,color}:{title:string,value:any,color?:string}){
return(
<div style={card}>
<p>{title}</p>
<h2 style={{color:color || "white"}}>{value}</h2>
</div>
)
}

/* ESTILOS */

const container = {background:"#020617",color:"white",minHeight:"100vh",padding:30}
const header = {display:"flex",justifyContent:"space-between",marginBottom:20}
const title = {fontSize:28}
const sub = {opacity:0.6}
const logout = {marginLeft:10,background:"#ef4444",color:"white",border:"none",padding:"6px 10px",borderRadius:6}
const actions = {display:"flex",gap:10,marginBottom:20}
const btnPrimary = {background:"#2563eb",padding:10,borderRadius:6,color:"white"}
const btnAlt = {background:"#0f766e",padding:10,borderRadius:6,color:"white"}
const btnInfo = {background:"#0284c7",padding:10,borderRadius:6,color:"white"}
const alertRed = {background:"#7f1d1d",padding:15,borderRadius:10,marginBottom:10}
const alertYellow = {background:"#78350f",padding:15,borderRadius:10,marginBottom:10}
const grid = {display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:15,marginBottom:20}
const card = {background:"#0f172a",padding:15,borderRadius:10}
const tableBox = {background:"#0f172a",padding:20,borderRadius:10}
const table = {width:"100%"}
const row = {borderBottom:"1px solid #1e293b"}
const btnMini = {background:"#1e293b",color:"white",padding:"5px 8px",marginRight:5,borderRadius:6}
const btnDanger = {background:"#dc2626",color:"white",padding:"5px 8px",borderRadius:6}
const inputEdit = {background:"#1e293b",color:"white",border:"none",padding:5,borderRadius:6}