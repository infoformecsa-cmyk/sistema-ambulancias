"use client"

import { useEffect, useState } from "react"
import type { CSSProperties } from "react"
import { supabase } from "@/lib/supabaseClient"
import { useRouter } from "next/navigation"

export default function Asistencia(){

const router = useRouter()

const [personal,setPersonal] = useState<any[]>([])
const [tipo,setTipo] = useState("ambulancia")
const [turno,setTurno] = useState("24h")
const [fecha,setFecha] = useState(new Date().toISOString().slice(0,10))

const [registros,setRegistros] = useState<any>({})
const [archivos,setArchivos] = useState<any>({})

useEffect(()=>{
cargar()
},[tipo,turno])

async function cargar(){

const {data,error} = await supabase
.from("personal")
.select("*")
.eq("tipo",tipo)

if(error){
console.error("Error cargando personal:", error)
}

setPersonal(data || [])
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

await supabase
.from("asistencia")
.insert([{
personal_id: p.id,
fecha,
estado: r.estado,
tipo_permiso: r.tipo || null,
archivo_url: url,
observacion: r.obs || "",
usuario_registro: usuario
}])

}

alert("✅ Asistencia registrada")
setRegistros({})
setArchivos({})
}

return(

<div style={container}>

<h1>👥 Control de Asistencia</h1>

<div style={filtros}>

<select value={tipo} onChange={(e)=>setTipo(e.target.value)} style={input}>
<option value="ambulancia">Ambulancias</option>
<option value="consola">Consola</option>
</select>

<select value={turno} onChange={(e)=>setTurno(e.target.value)} style={input}>
<option value="24h">24h</option>
<option value="12h_dia">12h Día</option>
<option value="12h_noche">12h Noche</option>
<option value="mañana">Mañana</option>
<option value="tarde">Tarde</option>
<option value="noche">Noche</option>
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

{personal.map(p=>(

<div key={p.id} style={card}>

<h3>{p.nombre}</h3>

<select
onChange={(e)=>setRegistros({
...registros,
[p.id]: {...registros[p.id], estado:e.target.value}
})}
style={input}
>

<option value="">Estado</option>
<option value="asistio">Asistió</option>
<option value="atraso">Atraso</option>
<option value="falta">Falta</option>
<option value="permiso">Permiso</option>
<option value="vacaciones">Vacaciones</option>

</select>

{["permiso","vacaciones"].includes(registros[p.id]?.estado) && (

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

<input
placeholder="Observación"
onChange={(e)=>setRegistros({
...registros,
[p.id]: {...registros[p.id], obs:e.target.value}
})}
style={input}
/>

</div>

))}

<button onClick={guardar} style={btnGuardar}>
💾 Guardar Asistencia
</button>

</div>
)
}

/* 🎨 ESTILOS TIPADOS */

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
background:"#111827",
padding:15,
borderRadius:10,
marginBottom:10
}

const input: CSSProperties = {
padding:10,
borderRadius:8,
background:"#1f2937",
color:"white",
border:"none",
marginTop:5
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