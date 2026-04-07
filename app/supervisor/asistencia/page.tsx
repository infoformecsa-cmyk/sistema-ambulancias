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

useEffect(()=>{
cargar()
},[tipo,guardia])

async function cargar(){

const {data,error} = await supabase
.from("personal")
.select("*")
.eq("tipo",tipo)
.eq("guardia",guardia)

if(error){
console.error(error)
return
}

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
const key = mapa[p.ambulancia_base] || "SIN ASIGNAR"
if(!grupo[key]) grupo[key] = []
grupo[key].push(p)
})

setAgrupado(grupo)

}

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

const { error } = await supabase.from("asistencia").insert([{
personal_id: p.id,
fecha,
estado: r.estado,
observacion: r.obs || "",
usuario_registro: usuario,
ambulancia_turno: r.ubicacion || null,
turno: turnoFinal,
horas
}])

if(error){
console.error(error)
alert("Error guardando")
return
}

}

alert("✅ Guardado")
setRegistros({})
}

return(

<div style={container}>

<h1>👥 Control de Asistencia</h1>

<div style={filtros}>

<select value={tipo} onChange={(e)=>setTipo(e.target.value)} style={input}>
<option value="ambulancia">Ambulancias</option>
<option value="consola">Consola</option>
</select>

<select value={guardia} onChange={(e)=>setGuardia(e.target.value)} style={input}>
<option value="G1">G1</option>
<option value="G2">G2</option>
<option value="G3">G3</option>
<option value="G4">G4</option>
<option value="G5">G5</option>
</select>

<input type="date" value={fecha} onChange={(e)=>setFecha(e.target.value)} style={input}/>

<button onClick={()=>router.push("/supervisor")} style={btn}>
Volver
</button>

</div>

{Object.keys(agrupado).map(g=>(
<div key={g}>

<h2>🚑 {g}</h2>

{agrupado[g].map((p:any)=>(
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
<option value="falta">Falta</option>
</select>

</div>
))}

</div>
))}

<button onClick={guardar} style={btnGuardar}>
Guardar
</button>

</div>
)
}

/* 🔥 ESTILOS RESTAURADOS */

const container: CSSProperties = {
padding:30,
background:"#020617",
minHeight:"100vh",
color:"white"
}

const filtros: CSSProperties = {
display:"flex",
gap:10,
marginBottom:20
}

const card: CSSProperties = {
background:"#0f172a",
padding:15,
borderRadius:12,
marginBottom:10
}

const input: CSSProperties = {
padding:10,
borderRadius:8,
background:"#1f2937",
color:"white",
border:"none"
}

const btn: CSSProperties = {
background:"#2563eb",
color:"white",
padding:10,
borderRadius:8,
border:"none"
}

const btnGuardar: CSSProperties = {
marginTop:20,
width:"100%",
background:"#22c55e",
padding:15,
borderRadius:10,
border:"none"
}