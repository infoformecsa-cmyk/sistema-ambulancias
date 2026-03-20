"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { useRouter } from "next/navigation"

export default function Supervisor(){

const router = useRouter()

const [ambulancias,setAmbulancias] = useState<any[]>([])
const [grupo,setGrupo] = useState("ALFA")

/* 🔥 NUEVOS STATES */
const [editKm,setEditKm] = useState<Record<string,string>>({})
const [editMtto,setEditMtto] = useState<Record<string,string>>({})

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

async function cambiarEstado(id:string,estado:string){

await supabase
.from("ambulancias")
.update({ estado })
.eq("id",id)

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

/* 🟡 ACTUALIZAR MTTO */
async function actualizarMtto(id:string){

const km = Number(editMtto[id])
if(!km) return

await supabase
.from("ambulancias")
.update({ kilometraje_mtto: km })
.eq("id",id)

setEditMtto({...editMtto,[id]:""})
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

{/* 🔴 CERRAR SESIÓN */}
<div style={{marginBottom:10}}>
<button onClick={cerrarSesion} style={btnSalir}>
Cerrar sesión
</button>
</div>

{/* 🔘 GRUPOS */}
<div style={{display:"flex",gap:10,marginBottom:20}}>

<button 
onClick={()=>setGrupo("ALFA")} 
style={grupo==="ALFA"?btnActive:btn}
>
ALFA
</button>

<button 
onClick={()=>setGrupo("BRAVO")} 
style={grupo==="BRAVO"?btnActive:btn}
>
BRAVO
</button>

</div>

{/* 🚨 ALERTAS */}

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

{/* 🚑 LISTADO */}

{ambulancias.map(a=>(
<div 
key={a.id} 
style={{
background:"white",
padding:20,
borderRadius:12,
marginBottom:15,
boxShadow:"0 2px 8px rgba(0,0,0,0.08)",
borderLeft:`6px solid ${bordeEstado(a.estado)}`
}}>

{/* HEADER */}
<div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
<h3 style={{margin:0}}>
🚑 {a.codigo_operativo}
</h3>

<span style={{
background:"#f3f4f6",
padding:"4px 10px",
borderRadius:6,
fontSize:12
}}>
{a.placa}
</span>
</div>

{/* 🔵 KM ACTUAL */}
<div style={{marginTop:10}}>
<p style={{fontSize:18,fontWeight:"bold"}}>
KM: {a.kilometraje_actual || 0}
</p>

<input
placeholder="Nuevo KM"
value={editKm[a.id] || ""}
onChange={(e)=>setEditKm({...editKm,[a.id]:e.target.value})}
style={{padding:6,marginRight:8}}
/>

<button onClick={()=>actualizarKm(a.id)}>
Guardar
</button>
</div>

{/* 🟡 MTTO */}
<div style={{marginTop:10}}>

<p>
<b>Próximo mantenimiento:</b> {a.kilometraje_mtto || "-"}
</p>

<input
placeholder="KM mantenimiento"
value={editMtto[a.id] || ""}
onChange={(e)=>setEditMtto({...editMtto,[a.id]:e.target.value})}
style={{padding:6,marginRight:8}}
/>

<button onClick={()=>actualizarMtto(a.id)}>
Guardar
</button>

</div>

{/* ESTADO */}
<p style={{marginTop:10}}>
Estado: 
<span style={{color:colorEstado(a.estado),fontWeight:"bold"}}>
{" "}{a.estado}
</span>
</p>

{/* BOTONES */}
<div style={{display:"flex",gap:8,marginTop:10}}>

<button 
style={btnEstado("#16a34a")}
onClick={()=>cambiarEstado(a.id,"operativa")}
>
Operativa
</button>

<button 
style={btnEstado("#f59e0b")}
onClick={()=>cambiarEstado(a.id,"mantenimiento")}
>
Mtto
</button>

<button 
style={btnEstado("#dc2626")}
onClick={()=>cambiarEstado(a.id,"no operativa")}
>
Fuera
</button>

</div>

</div>
))}

</div>
)
}

/* 🎨 ESTILOS */

const btn = {
padding:"8px 16px",
borderRadius:20,
background:"#e5e7eb",
border:"none",
cursor:"pointer"
}

const btnActive = {
padding:"8px 16px",
borderRadius:20,
background:"#2563eb",
color:"white",
border:"none",
cursor:"pointer"
}

const btnSalir = {
background:"#374151",
color:"white",
padding:10,
borderRadius:6,
border:"none",
cursor:"pointer"
}

const btnEstado = (color:string)=>({
background:color,
color:"white",
padding:"8px 12px",
borderRadius:6,
border:"none",
fontSize:12,
cursor:"pointer"
})

const alertRed = {
background:"#fee2e2",
padding:15,
borderRadius:8,
marginBottom:20,
borderLeft:"6px solid #dc2626"
}

const alertYellow = {
background:"#fef9c3",
padding:15,
borderRadius:8,
marginBottom:20,
borderLeft:"6px solid #f59e0b"
}