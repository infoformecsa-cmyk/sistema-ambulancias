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

/* cerrar sesión */

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

const imagen=prompt("URL de imagen (opcional)")

await supabase
.from("reportes_fallas")
.insert([{

ambulancia_id:id,
descripcion:descripcion,
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

/* abrir ficha */

async function abrirFicha(a:any){

setFicha(a)

const {data}=await supabase
.from("reportes_fallas")
.select("*")
.eq("ambulancia_id",a.id)
.order("created_at",{ascending:false})

if(data) setFallas(data)

}

/* descargar PDF */

function descargarPDF(){

let contenido = `
INFORME TECNICO DE AMBULANCIA

Codigo: ${ficha.codigo_operativo}
Placa: ${ficha.placa}
Marca: ${ficha.marca}
Tipo: ${ficha.tipo}
KM: ${ficha.kilometraje_actual}

HISTORIAL DE FALLAS
`

fallas.forEach(f=>{

contenido += `
Fecha: ${f.created_at}
Usuario: ${f.usuario}
Descripcion: ${f.descripcion}

`

})

const blob=new Blob([contenido],{type:"text/plain"})
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

<h2>Flota registrada</h2>

<table border={1} cellPadding={8}>

<thead>

<tr>
<th>Estado</th>
<th>Código</th>
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
<td>{a.kilometraje_actual || 0}</td>

<td>

{/* ADMIN */}

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

{/* SUPERVISOR */}

{esSupervisor && (

<>

<button onClick={()=>registrarKm(a.id)}>KM</button>

<button onClick={()=>cambiarEstado(a.id,"operativa")}>Operativa</button>

<button onClick={()=>cambiarEstado(a.id,"mantenimiento")}>Mtto</button>

<button onClick={()=>cambiarEstado(a.id,"no operativa")}>Fuera</button>

<button onClick={()=>registrarFalla(a.id)}>Reporte</button>

</>

)}

{/* CONDUCTOR */}

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

<div key={f.id} style={{marginBottom:10}}>

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