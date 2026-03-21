"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { useRouter } from "next/navigation"

export default function Supervisor(){

const router = useRouter()

const [ambulancias,setAmbulancias] = useState<any[]>([])
const [grupo,setGrupo] = useState("ALFA")

/* 🔵 KM */
const [editKm,setEditKm] = useState<Record<string,string>>({})

/* 🔴 NUEVO: MOTIVO + FOTO */
const [motivo,setMotivo] = useState<Record<string,string>>({})
const [foto,setFoto] = useState<Record<string,File | null>>({})

useEffect(()=>{
cargar()
},[grupo])

async function cargar(){

const {data} = await supabase
.from("ambulancias")
.select("*")
.eq("tipo",grupo)
.order("codigo_operativo")

setAmbulancias(data || [])
}

/* 📸 SUBIR FOTO */
async function subirFoto(id:string){

const file = foto[id]
if(!file) return null

const nombre = `ambulancia_${id}_${Date.now()}`

const {error} = await supabase.storage
.from("ambulancias")
.upload(nombre,file)

if(error){
console.log(error)
return null
}

const {data} = supabase.storage
.from("ambulancias")
.getPublicUrl(nombre)

return data.publicUrl
}

/* 🔄 CAMBIO ESTADO CON HISTORIAL */
async function cambiarEstado(id:string,estado:string){

if(!motivo[id]){
alert("Ingrese motivo")
return
}

const usuario = localStorage.getItem("nombre")

/* subir foto */
const foto_url = await subirFoto(id)

/* cerrar evento anterior */
const {data:ultimo} = await supabase
.from("historial_operativo")
.select("*")
.eq("ambulancia_id",id)
.order("fecha_inicio",{ascending:false})
.limit(1)

const last = ultimo && ultimo.length > 0 ? ultimo[0] : null

if(last && !last.fecha_fin){
await supabase
.from("historial_operativo")
.update({ fecha_fin: new Date().toISOString() })
.eq("id",last.id)
}

/* crear historial */
await supabase
.from("historial_operativo")
.insert({
ambulancia_id:id,
estado,
motivo:motivo[id],
fecha_inicio:new Date().toISOString(),
usuario,
foto_url
})

/* actualizar ambulancia */
await supabase
.from("ambulancias")
.update({ estado })
.eq("id",id)

/* limpiar */
setMotivo({...motivo,[id]:""})
setFoto({...foto,[id]:null})

cargar()
}

/* 🔵 ACTUALIZAR KM */
async function actualizarKm(id:string){

const km = Number(editKm[id])
if(!km) return

await supabase
.from("ambulancias")
.update({ kilometraje_actual: km })
.eq("id",id)

setEditKm({...editKm,[id]:""})
cargar()
}

/* 🔴 CERRAR SESIÓN */
function cerrarSesion(){
localStorage.clear()
router.push("/")
}

/* 🎨 COLORES */

function colorEstado(e:string){
if(e==="operativa") return "#16a34a"
if(e==="mantenimiento") return "#f59e0b"
return "#dc2626"
}

function bordeEstado(e:string){
if(e==="operativa") return "#16a34a"
if(e==="mantenimiento") return "#f59e0b"
return "#dc2626"
}

/* 🚨 ALERTAS */

const mttoVencido = ambulancias.filter(a=>{
if(!a.kilometraje_mtto || !a.kilometraje_actual) return false
return a.kilometraje_actual >= a.kilometraje_mtto
})

const mttoProximo = ambulancias.filter(a=>{
if(!a.kilometraje_mtto || !a.kilometraje_actual) return false
const faltan = a.kilometraje_mtto - a.kilometraje_actual
return faltan <= 400 && faltan > 0
})

return(

<div style={{padding:30,fontFamily:"Arial",maxWidth:1000,margin:"auto"}}>

<h1>👨‍⚕️ Panel Supervisor</h1>

<button onClick={cerrarSesion} style={btnSalir}>
Cerrar sesión
</button>

<div style={{display:"flex",gap:10,margin:"20px 0"}}>

<button onClick={()=>setGrupo("ALFA")} style={grupo==="ALFA"?btnActive:btn}>
ALFA
</button>

<button onClick={()=>setGrupo("BRAVO")} style={grupo==="BRAVO"?btnActive:btn}>
BRAVO
</button>

</div>

{/* ALERTAS */}

{mttoVencido.length>0 && (
<div style={alertRed}>
<h3>🚨 Mantenimiento vencido</h3>
{mttoVencido.map(a=>(
<div key={a.id}>{a.codigo_operativo}</div>
))}
</div>
)}

{mttoProximo.length>0 && (
<div style={alertYellow}>
<h3>⚠️ Mantenimiento próximo</h3>
{mttoProximo.map(a=>{
const faltan = a.kilometraje_mtto - a.kilometraje_actual
return <div key={a.id}>{a.codigo_operativo} → {faltan} km</div>
})}
</div>
)}

{/* LISTADO */}

{ambulancias.map(a=>(
<div key={a.id} style={{
background:"white",
padding:20,
borderRadius:12,
marginBottom:15,
boxShadow:"0 2px 8px rgba(0,0,0,0.08)",
borderLeft:`6px solid ${bordeEstado(a.estado)}`
}}>

<h3>🚑 {a.codigo_operativo} | {a.placa}</h3>

<p><b>KM:</b> {a.kilometraje_actual || 0}</p>

<input
placeholder="Nuevo KM"
value={editKm[a.id] || ""}
onChange={(e)=>setEditKm({...editKm,[a.id]:e.target.value})}
/>

<button onClick={()=>actualizarKm(a.id)}>Guardar KM</button>

<p><b>Próximo mantenimiento:</b> {a.kilometraje_mtto || "-"}</p>

<p>
Estado: <span style={{color:colorEstado(a.estado)}}>{a.estado}</span>
</p>

{/* 🔴 MOTIVO */}
<textarea
placeholder="Motivo del cambio"
value={motivo[a.id] || ""}
onChange={(e)=>setMotivo({...motivo,[a.id]:e.target.value})}
style={{width:"100%",marginTop:10}}
/>

{/* 📸 FOTO */}
<input
type="file"
onChange={(e)=>setFoto({...foto,[a.id]:e.target.files?.[0] || null})}
/>

<div style={{display:"flex",gap:10,marginTop:10}}>

<button style={btnEstado("#16a34a")} onClick={()=>cambiarEstado(a.id,"operativa")}>
Operativa
</button>

<button style={btnEstado("#f59e0b")} onClick={()=>cambiarEstado(a.id,"mantenimiento")}>
Mtto
</button>

<button style={btnEstado("#dc2626")} onClick={()=>cambiarEstado(a.id,"no operativa")}>
Fuera
</button>

</div>

</div>
))}

</div>
)
}

/* ESTILOS */

const btn = {padding:"8px 16px",borderRadius:20,background:"#e5e7eb",border:"none"}
const btnActive = {padding:"8px 16px",borderRadius:20,background:"#2563eb",color:"white",border:"none"}
const btnSalir = {background:"#374151",color:"white",padding:10,borderRadius:6}
const btnEstado = (c:string)=>({background:c,color:"white",padding:"8px 12px",borderRadius:6,border:"none"})

const alertRed = {background:"#fee2e2",padding:15,borderRadius:8,marginBottom:20}
const alertYellow = {background:"#fef9c3",padding:15,borderRadius:8,marginBottom:20}