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

const {data:amb} = await supabase
.from("ambulancias")
.select("id, codigo_operativo")

setAmbulancias(amb || [])

const mapa:any = {}
;(amb || []).forEach((a:any)=>{
mapa[a.id] = a.codigo_operativo
})

const grupo:any = {}
;(data || []).forEach((p:any)=>{
const key = mapa[p.ambulancia_base] || p.ambulancia_base_text || "SIN ASIGNAR"
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
horas,

/* 🔥 NUEVO */
es_r2: r.es_r2 || false,
origen_r2: r.origen_r2 || null

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

{/* AGRUPADO */}
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

{/* 🔥 NUEVO R2 */}
<label style={{fontSize:12}}>
<input
type="checkbox"
checked={registros[p.id]?.es_r2 || false}
onChange={(e)=>setRegistros({
...registros,
[p.id]: {...registros[p.id], es_r2:e.target.checked}
})}
/>
R2
</label>

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

{/* 🔥 ORIGEN R2 */}
{registros[p.id]?.es_r2 && (
<input
placeholder="Origen R2 (ej: ALFA 3)"
onChange={(e)=>setRegistros({
...registros,
[p.id]: {...registros[p.id], origen_r2:e.target.value}
})}
style={input}
/>
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