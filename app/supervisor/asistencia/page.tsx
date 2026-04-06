"use client"

import { useEffect, useState } from "react"
import type { CSSProperties } from "react"
import { supabase } from "@/lib/supabaseClient"
import { useRouter } from "next/navigation"

export default function Asistencia(){

const router = useRouter()

const [personal,setPersonal] = useState<any[]>([])
const [ambulancias,setAmbulancias] = useState<any[]>([])

const [tipo,setTipo] = useState("ambulancia")
const [turno,setTurno] = useState("24h")
const [fecha,setFecha] = useState(new Date().toISOString().slice(0,10))

const [registros,setRegistros] = useState<any>({})
const [archivos,setArchivos] = useState<any>({})

useEffect(()=>{
cargar()
},[tipo])

async function cargar(){

const {data} = await supabase
.from("personal")
.select("*")
.eq("tipo",tipo)

setPersonal(data || [])

const {data:amb} = await supabase
.from("ambulancias")
.select("codigo_operativo")

setAmbulancias(amb || [])

}

/* 📎 SUBIR ARCHIVO */
async function subirArchivo(file:File){

if(!file) return null

const nombre = `asistencia_${Date.now()}`

const { error } = await supabase.storage
.from("asistencia")
.upload(nombre,file)

if(error){
console.error(error)
return null
}

const { data } = supabase.storage
.from("asistencia")
.getPublicUrl(nombre)

return data.publicUrl
}

/* 💾 GUARDAR */
async function guardar(){

const usuario = localStorage.getItem("email") || "admin"

let horas = 0
if(turno === "24h") horas = 24
if(turno === "guardia_16h") horas = 16
if(turno === "12h_dia") horas = 12
if(turno === "12h_noche") horas = 12

for(const p of personal){

const r = registros[p.id]
if(!r) continue

if((r.estado === "permiso" || r.estado === "vacaciones") && !archivos[p.id]){
alert(`Falta respaldo de ${p.nombre}`)
return
}

let url = null
if(archivos[p.id]){
url = await subirArchivo(archivos[p.id])
}

await supabase.from("asistencia").insert([{
personal_id: p.id,
fecha,
estado: r.estado,
tipo_permiso: r.tipo || null,
archivo_url: url,
observacion: r.obs || "",
usuario_registro: usuario,
ambulancia_turno: r.ubicacion || null,
reubicado: r.ubicacion && r.ubicacion !== p.ambulancia_base,
turno,
horas
}])

}

alert("✅ Asistencia registrada")
setRegistros({})
setArchivos({})
}

return(

<div style={container}>

<h1 style={{fontSize:28}}>👥 Control de Asistencia</h1>

{/* FILTROS */}
<div style={filtros}>

<select value={tipo} onChange={(e)=>setTipo(e.target.value)} style={input}>
<option value="ambulancia">Ambulancias</option>
<option value="consola">Consola</option>
</select>

<select value={turno} onChange={(e)=>setTurno(e.target.value)} style={input}>
<option value="24h">24h (08:00 - 08:00)</option>
<option value="guardia_16h">16h Guardia</option>
<option value="12h_dia">12h Día</option>
<option value="12h_noche">12h Noche</option>
</select>

<input
type="date"
value={fecha}
onChange={(e)=>setFecha(e.target.value)}
style={input}
/>

<button onClick={()=>router.push("/supervisor")} style={btn}>
⬅ Volver
</button>

</div>

{/* LISTADO */}
{personal.map(p=>{

const estado = registros[p.id]?.estado

return(

<div key={p.id} style={card}>

{/* HEADER */}
<div style={{display:"flex",justifyContent:"space-between"}}>

<div>
<h3 style={{margin:0}}>{p.nombre}</h3>
<span style={{fontSize:12,color:"#9ca3af"}}>
🚑 {p.ambulancia_base}
</span>
</div>

<select
onChange={(e)=>setRegistros({
...registros,
[p.id]: {...registros[p.id], ubicacion:e.target.value}
})}
style={inputMini}
>
<option value="">Ubicación</option>
<option value="CONSOLA">CONSOLA</option>

{ambulancias.map(a=>(
<option key={a.codigo_operativo}>
{a.codigo_operativo}
</option>
))}

</select>

</div>

{/* ESTADOS COMO BOTONES */}
<div style={estadoContainer}>

{["asistio","atraso","falta","permiso","vacaciones"].map(s=>(
<button
key={s}
onClick={()=>setRegistros({
...registros,
[p.id]: {...registros[p.id], estado:s}
})}
style={{
...estadoBtn,
background: estado === s ? colores[s] : "#1f2937"
}}
>
{s.toUpperCase()}
</button>
))}

</div>

{/* PERMISO / VACACIONES */}
{["permiso","vacaciones"].includes(estado) && (

<>
<select
onChange={(e)=>setRegistros({
...registros,
[p.id]: {...registros[p.id], tipo:e.target.value}
})}
style={input}
>
<option value="">Tipo</option>
<option value="medico">Médico</option>
<option value="vacaciones">Vacaciones</option>
<option value="otro">Otro</option>
</select>

<input
type="file"
onChange={(e)=>setArchivos({
...archivos,
[p.id]: e.target.files?.[0]
})}
/>
</>

)}

{/* OBS */}
<input
placeholder="Observación"
onChange={(e)=>setRegistros({
...registros,
[p.id]: {...registros[p.id], obs:e.target.value}
})}
style={input}
/>

</div>
)
})}

<button onClick={guardar} style={btnGuardar}>
💾 Guardar Asistencia
</button>

</div>
)
}

/* 🎨 ESTILOS */

const colores:any = {
asistio:"#22c55e",
atraso:"#eab308",
falta:"#ef4444",
permiso:"#3b82f6",
vacaciones:"#a855f7"
}

const container: CSSProperties = {
background:"#020617",
color:"white",
minHeight:"100vh",
padding:30
}

const filtros: CSSProperties = {
display:"flex",
gap:10,
marginBottom:20,
flexWrap:"wrap"
}

const card: CSSProperties = {
background:"#0f172a",
padding:15,
borderRadius:12,
marginBottom:12,
border:"1px solid #1e293b"
}

const estadoContainer: CSSProperties = {
display:"flex",
gap:8,
marginTop:10,
flexWrap:"wrap"
}

const estadoBtn: CSSProperties = {
padding:"8px 10px",
borderRadius:8,
border:"none",
color:"white",
cursor:"pointer",
fontSize:12
}

const input: CSSProperties = {
padding:10,
borderRadius:8,
background:"#1f2937",
color:"white",
border:"none",
marginTop:10,
width:"100%"
}

const inputMini: CSSProperties = {
padding:6,
borderRadius:6,
background:"#1f2937",
color:"white",
border:"none"
}

const btn: CSSProperties = {
background:"#2563eb",
color:"white",
padding:"10px 15px",
borderRadius:8,
border:"none"
}

const btnGuardar: CSSProperties = {
marginTop:20,
width:"100%",
background:"#22c55e",
padding:18,
borderRadius:12,
fontWeight:"bold",
fontSize:16,
border:"none"
}