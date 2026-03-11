"use client"

import { useEffect,useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { useRouter } from "next/navigation"

export default function Dashboard(){

const router=useRouter()

const [rol,setRol]=useState("")
const [nombre,setNombre]=useState("")
const [ambulancias,setAmbulancias]=useState<any[]>([])
const [ficha,setFicha]=useState<any>(null)
const [fallas,setFallas]=useState<any[]>([])

useEffect(()=>{

const r=localStorage.getItem("rol")
const n=localStorage.getItem("nombre")

if(!r){
router.push("/")
return
}

setRol(r)
setNombre(n || "")

cargarAmbulancias()

},[])

async function cargarAmbulancias(){

const {data}=await supabase
.from("ambulancias")
.select("*")
.order("codigo_operativo")

if(data) setAmbulancias(data)

}

function cerrarSesion(){

localStorage.clear()
router.push("/")

}

/* registrar kilometraje */

async function registrarKm(id:string){

const km=prompt("Ingrese kilometraje")

if(!km) return

await supabase
.from("ambulancias")
.update({kilometraje_actual:parseInt(km)})
.eq("id",id)

cargarAmbulancias()

}

/* cambiar estado */

async function cambiarEstado(id:string,estado:string){

await supabase
.from("ambulancias")
.update({estado})
.eq("id",id)

cargarAmbulancias()

}

/* registrar falla */

async function registrarFalla(id:string){

const descripcion=prompt("Describa la falla")

if(!descripcion) return

const imagen=prompt("URL imagen (opcional)")

await supabase
.from("reportes_fallas")
.insert([{

ambulancia_id:id,
descripcion,
imagen_url:imagen || null,
usuario:nombre

}])

alert("Reporte registrado")

}

/* editar ambulancia ADMIN */

async function editarAmbulancia(a:any){

const placa=prompt("Placa",a.placa)
const marca=prompt("Marca",a.marca)
const tipo=prompt("Tipo",a.tipo)

await supabase
.from("ambulancias")
.update({
placa,
marca,
tipo
})
.eq("id",a.id)

cargarAmbulancias()

}

/* abrir ficha mecanica */

async function abrirFicha(a:any){

setFicha(a)

const {data}=await supabase
.from("reportes_fallas")
.select("*")
.eq("ambulancia_id",a.id)
.order("created_at",{ascending:false})

if(data) setFallas(data)

}

/* generar informe */

function descargarPDF(){

let texto=`

INFORME TECNICO DE AMBULANCIA

Codigo: ${ficha.codigo_operativo}
Placa: ${ficha.placa}
Marca: ${ficha.marca}
Tipo: ${ficha.tipo}
Kilometraje: ${ficha.kilometraje_actual}

HISTORIAL DE FALLAS
`

fallas.forEach(f=>{

texto+=`
Fecha: ${f.created_at}
Usuario: ${f.usuario}
Descripcion: ${f.descripcion}

`

})

const blob=new Blob([texto],{type:"text/plain"})
const url=URL.createObjectURL(blob)

const a=document.createElement("a")
a.href=url
a.download="informe_ambulancia.txt"
a.click()

}

/* permisos */

const esAdmin = rol==="admin"
const esSupervisor = rol==="supervisor"
const esConductor = rol==="conductor"

/* ===== CALCULOS DE FLOTA ===== */

const total = ambulancias.length

const operativas = ambulancias.filter(a=>a.estado==="operativa").length
const mantenimiento = ambulancias.filter(a=>a.estado==="mantenimiento").length
const fuera = ambulancias.filter(a=>a.estado==="no operativa").length

const porcentajeOperatividad = total ? Math.round((operativas/total)*100) : 0

/* separar ALFA / BRAVO */

const alfas = ambulancias.filter(a=>a.tipo==="ALFA")
const bravos = ambulancias.filter(a=>a.tipo==="BRAVO")

const alfaOperativas = alfas.filter(a=>a.estado==="operativa").length
const bravoOperativas = bravos.filter(a=>a.estado==="operativa").length

/* mantenimiento predictivo */

function alertaMtto(km:number){

const limite=10000
const alerta=limite-km

if(alerta<=500) return "⚠ cerca de mantenimiento"

return ""

}

function colorEstado(e:string){

if(e==="operativa") return "green"
if(e==="mantenimiento") return "orange"
return "red"

}

return(

<div style={{padding:40,fontFamily:"Arial"}}>

<h1>Sistema de Control de Ambulancias</h1>

<div style={{marginBottom:20}}>

Usuario: {nombre} | Rol: {rol}

<button
onClick={cerrarSesion}
style={{
marginLeft:20,
background:"red",
color:"white",
border:"none",
padding:"6px 12px"
}}
>

Cerrar sesión

</button>

</div>

<hr/>

{/* PANEL ADMIN */}

{esAdmin && (

<div>

<h2>Panel de Control de Flota</h2>

<div style={{display:"flex",gap:20}}>

<div style={{border:"1px solid black",padding:20}}>
🚑 Operativas
<h2>{operativas}</h2>
</div>

<div style={{border:"1px solid black",padding:20}}>
🔧 Mantenimiento
<h2>{mantenimiento}</h2>
</div>

<div style={{border:"1px solid black",padding:20}}>
⛔ Fuera servicio
<h2>{fuera}</h2>
</div>

<div style={{border:"1px solid black",padding:20}}>
📊 Operatividad
<h2>{porcentajeOperatividad}%</h2>
</div>

</div>

<br/>

<h3>Estado por tipo</h3>

<p>ALFA operativas: {alfaOperativas}/{alfas.length}</p>

<p>BRAVO operativas: {bravoOperativas}/{bravos.length}</p>

<hr/>

</div>

)}

<h2>Flota registrada</h2>

<table border={1} cellPadding={8}>

<thead>

<tr>
<th>Estado</th>
<th>Codigo</th>
<th>Placa</th>
<th>Marca</th>
<th>Tipo</th>
<th>KM</th>
<th>Acciones</th>
</tr>

</thead>

<tbody>

{ambulancias.map(a=>(

<tr key={a.id}>

<td style={{color:colorEstado(a.estado)}}>

{a.estado}

</td>

<td>{a.codigo_operativo}</td>
<td>{a.placa}</td>
<td>{a.marca}</td>
<td>{a.tipo}</td>

<td>

{a.kilometraje_actual || 0}

<br/>

<span style={{color:"red"}}>

{alertaMtto(a.kilometraje_actual)}

</span>

</td>

<td>

{esAdmin && (

<>

<button onClick={()=>registrarKm(a.id)}>KM</button>
<button onClick={()=>cambiarEstado(a.id,"operativa")}>Operativa</button>
<button onClick={()=>cambiarEstado(a.id,"mantenimiento")}>Mtto</button>
<button onClick={()=>cambiarEstado(a.id,"no operativa")}>Fuera</button>
<button onClick={()=>registrarFalla(a.id)}>Reporte</button>
<button onClick={()=>editarAmbulancia(a)}>Editar</button>
<button onClick={()=>abrirFicha(a)}>Ficha</button>

</>

)}

{esSupervisor && (

<>

<button onClick={()=>registrarKm(a.id)}>KM</button>
<button onClick={()=>cambiarEstado(a.id,"operativa")}>Operativa</button>
<button onClick={()=>cambiarEstado(a.id,"mantenimiento")}>Mtto</button>
<button onClick={()=>cambiarEstado(a.id,"no operativa")}>Fuera</button>
<button onClick={()=>registrarFalla(a.id)}>Reporte</button>

</>

)}

{esConductor && (

<>

<button onClick={()=>registrarKm(a.id)}>KM</button>
<button onClick={()=>registrarFalla(a.id)}>Falla</button>

</>

)}

</td>

</tr>

))}

</tbody>

</table>

{/* FICHA MECANICA */}

{ficha && esAdmin && (

<div style={{marginTop:40,border:"2px solid black",padding:20}}>

<h2>Ficha Mecánica</h2>

<p>Codigo: {ficha.codigo_operativo}</p>
<p>Placa: {ficha.placa}</p>
<p>Marca: {ficha.marca}</p>
<p>Tipo: {ficha.tipo}</p>
<p>Kilometraje: {ficha.kilometraje_actual}</p>

<h3>Historial de fallas</h3>

{fallas.map(f=>(

<div key={f.id}>

<b>{f.created_at}</b>

<p>{f.descripcion}</p>

</div>

))}

<button onClick={descargarPDF}>

Descargar informe

</button>

</div>

)}

</div>

)

}