"use client"

import { useEffect, useState } from "react"
import type { CSSProperties } from "react"
import { supabase } from "@/lib/supabaseClient"
import { useRouter } from "next/navigation"

export default function Asistencia(){

const router = useRouter()

const [personal,setPersonal] = useState<any[]>([])
const [agrupado,setAgrupado] = useState<any>({})
const [ambulancias,setAmbulancias] = useState<any[]>([])

const [tipo,setTipo] = useState("ambulancia")
const [guardia,setGuardia] = useState("G1")
const [turnoGlobal,setTurnoGlobal] = useState("24h")
const [fecha,setFecha] = useState(new Date().toISOString().slice(0,10))

const [registros,setRegistros] = useState<any>({})
const [archivos,setArchivos] = useState<any>({})
const [preview,setPreview] = useState<string | null>(null)

useEffect(()=>{
cargar()
},[tipo,guardia])

async function cargar(){

const {data} = await supabase
.from("personal")
.select("*")
.eq("tipo",tipo)
.eq("guardia",guardia)

setPersonal(data || [])

/* 🔥 TRAER ID + CODIGO */
const {data:amb} = await supabase
.from("ambulancias")
.select("id, codigo_operativo")

setAmbulancias(amb || [])

/* 🔥 MAPA ID → CODIGO */
const mapa:any = {}
;(amb || []).forEach((a:any)=>{
mapa[a.id] = a.codigo_operativo
})

/* 🔥 AGRUPAR CON NOMBRE CORRECTO */
const grupo:any = {}
;(data || []).forEach((p:any)=>{
const key = mapa[p.ambulancia_base] || "SIN ASIGNAR"
if(!grupo[key]) grupo[key] = []
grupo[key].push(p)
})

setAgrupado(grupo)

}

/* SUBIR ARCHIVO */
async function subirArchivo(file:File){

const nombre = `asistencia_${Date.now()}_${file.name}`

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

/* GUARDAR */
async function guardar(){

const usuario = localStorage.getItem("email") || "admin"

for(const p of personal){

const r = registros[p.id]
if(!r) continue

const turnoFinal = r.turno || turnoGlobal

let horas = 0
if(turnoFinal === "24h") horas = 24
if(turnoFinal === "guardia_16h") horas = 16
if(turnoFinal === "12h_dia") horas = 12
if(turnoFinal === "12h_noche") horas = 12

if((r.estado === "permiso" || r.estado === "vacaciones") && !archivos[p.id]){
alert(`⚠️ Falta justificativo de ${p.nombre}`)
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
turno: turnoFinal,
horas
}])

}

alert("✅ Asistencia registrada")
setRegistros({})
setArchivos({})
}

return(

<div style={container}>

<h1>👥 Control de Asistencia</h1>

<h3 style={{opacity:0.7}}>
Guardia: {guardia} | Turno: {turnoGlobal}
</h3>

<div style={filtros}>

<select value={tipo} onChange={(e)=>setTipo(e.target.value)} style={input}>
<option value="ambulancia">Ambulancias</option>
<option value="consola">Consola</option>
</select>

<select value={guardia} onChange={(e)=>setGuardia(e.target.value)} style={input}>
<option value="G1">Guardia 1</option>
<option value="G2">Guardia 2</option>
<option value="G3">Guardia 3</option>
<option value="G4">Guardia 4</option>
</select>

<select value={turnoGlobal} onChange={(e)=>setTurnoGlobal(e.target.value)} style={input}>
<option value="24h">24h</option>
<option value="guardia_16h">16h</option>
<option value="12h_dia">12 Día</option>
<option value="12h_noche">12 Noche</option>
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

{/* 🔥 AGRUPADO */}
{Object.keys(agrupado).sort().map(ambu=>(
<div key={ambu}>

<h2 style={{color:"#38bdf8"}}>
🚑 {ambu}
</h2>

{agrupado[ambu].map((p:any)=>{

const estado = registros[p.id]?.estado

return(
<div key={p.id} style={card}>

<div style={{display:"flex",justifyContent:"space-between"}}>

<h3>{p.nombre}</h3>

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
<option key={a.id} value={a.codigo_operativo}>
{a.codigo_operativo}
</option>
))}

</select>

</div>

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

<span style={{fontSize:12,opacity:0.7}}>Turno:</span>

<select
onChange={(e)=>setRegistros({
...registros,
[p.id]: {...registros[p.id], turno:e.target.value}
})}
style={inputMini}
>
<option value="">Seleccionar</option>
<option value="24h">24h</option>
<option value="guardia_16h">16h</option>
<option value="12h_dia">12 Día</option>
<option value="12h_noche">12 Noche</option>
</select>

</div>

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

</div>
))}

<button onClick={guardar} style={btnGuardar}>
💾 Guardar Asistencia
</button>

{preview && (
<div style={modal} onClick={()=>setPreview(null)}>
<img src={preview} style={modalImg}/>
</div>
)}

</div>
)
}

/* ESTILOS (NO TOCADOS) */
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
marginBottom:10,
border:"1px solid #1e293b"
}

const estadoContainer: CSSProperties = {
display:"flex",
gap:8,
marginTop:10,
flexWrap:"wrap",
alignItems:"center"
}

const estadoBtn: CSSProperties = {
padding:"6px 10px",
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

const miniatura: CSSProperties = {
marginTop:10,
width:120,
cursor:"pointer",
border:"1px solid #334155",
borderRadius:8,
overflow:"hidden"
}

const modal: CSSProperties = {
position:"fixed",
top:0,
left:0,
width:"100%",
height:"100%",
background:"rgba(0,0,0,0.8)",
display:"flex",
alignItems:"center",
justifyContent:"center",
zIndex:999
}

const modalImg: CSSProperties = {
maxWidth:"90%",
maxHeight:"90%"
}