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

useEffect(()=>{

const r = localStorage.getItem("rol")
const n = localStorage.getItem("nombre")

if(!r){
router.push("/")
return
}

if(r==="conductor"){
router.push("/conductor")
return
}

setRol(r)
setNombre(n || "")

cargar()

const intervalo=setInterval(()=>{
cargar()
},30000)

return ()=>clearInterval(intervalo)

},[])

async function cargar(){

const {data:amb} = await supabase
.from("ambulancias")
.select("*")

const {data:alert} = await supabase
.from("reportes_fallas")
.select("*")
.eq("estado","abierta")
.eq("criticidad","critica")

const {data:hist} = await supabase
.from("historial_operativo")
.select("*")

setAmbulancias(amb || [])
setAlertas(alert || [])
setHistorial(hist || [])

}

/* ===================== */
/* 🧠 TIEMPO FUERA SERVICIO */
/* ===================== */

function calcularHorasFuera(ambulanciaId:string){

const eventos = historial.filter(h=>h.ambulancia_id === ambulanciaId)

let total = 0

eventos.forEach(e=>{

if(e.estado === "operativa") return

const inicio = new Date(e.fecha_inicio)
const fin = e.fecha_fin ? new Date(e.fecha_fin) : new Date()

if(fin < inicio) return

const diff = fin.getTime() - inicio.getTime()

total += diff

})

return Math.floor(total / (1000*60*60)) // horas
}

/* ===================== */
/* 🏆 RANKING */
/* ===================== */

const ranking = ambulancias.map(a=>({
...a,
horasFuera: calcularHorasFuera(a.id)
}))
.sort((a,b)=>b.horasFuera - a.horasFuera)
.slice(0,5)

/* ===================== */
/* 🚦 SEMAFORO */
/* ===================== */

function semaforo(horas:number){

if(horas > 100) return "🔴 Crítica"
if(horas > 40) return "🟡 Riesgo"
return "🟢 Normal"

}

/* ===================== */
/* 📊 KPI */
/* ===================== */

const totalHorasFuera = ambulancias.reduce((acc,a)=>{
return acc + calcularHorasFuera(a.id)
},0)

return(

<div style={{padding:30,fontFamily:"Arial"}}>

<h1>🚑 Dashboard Gerencial</h1>

<p><b>{nombre}</b> | {rol}</p>

<button onClick={()=>{
localStorage.clear()
router.push("/")
}}>
Cerrar sesión
</button>

<hr/>

{/* 🔥 KPI NUEVO */}

<h2>📊 Indicadores de Operación</h2>

<div style={{display:"flex",gap:20}}>

<div style={{padding:20,border:"1px solid #ddd",borderRadius:10}}>
<h3>Total horas fuera servicio</h3>
<h2>{totalHorasFuera} h</h2>
</div>

<div style={{padding:20,border:"1px solid #ddd",borderRadius:10}}>
<h3>Promedio por ambulancia</h3>
<h2>{ambulancias.length ? Math.round(totalHorasFuera/ambulancias.length) : 0} h</h2>
</div>

</div>

<hr/>

{/* 🔥 RANKING */}

<h2>🏆 Ambulancias más críticas</h2>

<table style={{width:"100%"}}>
<thead>
<tr>
<th>Unidad</th>
<th>Horas fuera</th>
<th>Estado</th>
</tr>
</thead>

<tbody>

{ranking.map(a=>(
<tr key={a.id}>
<td>{a.codigo_operativo}</td>
<td>{a.horasFuera} h</td>
<td>{semaforo(a.horasFuera)}</td>
</tr>
))}

</tbody>

</table>

<hr/>

{/* 🔥 ALERTAS EXISTENTES */}

{alertas.length>0 && (
<div style={{background:"#fee2e2",padding:20}}>
<h3>🚨 Fallas críticas</h3>
{alertas.map(a=>(
<div key={a.id}>{a.descripcion}</div>
))}
</div>
)}

<hr/>

{/* 🔥 TABLA ORIGINAL (sin romper) */}

<h2>📋 Flota</h2>

<table style={{width:"100%"}}>

<thead>
<tr>
<th>Estado</th>
<th>Código</th>
<th>KM</th>
<th>Horas fuera</th>
<th>Acciones</th>
</tr>
</thead>

<tbody>

{ambulancias.map(a=>(
<tr key={a.id}>

<td>{a.estado}</td>
<td>{a.codigo_operativo}</td>
<td>{a.kilometraje_actual}</td>
<td>{calcularHorasFuera(a.id)} h</td>

<td>
<button onClick={()=>router.push(`/ambulancia/${a.id}`)}>Ficha</button>
</td>

</tr>
))}

</tbody>

</table>

</div>

)

}