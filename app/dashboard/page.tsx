"use client"

import { useEffect,useState } from "react"
import { supabase } from "@/lib/supabaseClient"

import {
Chart as ChartJS,
CategoryScale,
LinearScale,
BarElement,
Title,
Tooltip,
Legend
} from "chart.js"

import { Bar } from "react-chartjs-2"

ChartJS.register(
CategoryScale,
LinearScale,
BarElement,
Title,
Tooltip,
Legend
)

export default function Dashboard(){

const [rol,setRol]=useState("")
const [ambulancias,setAmbulancias]=useState<any[]>([])
const [alertas,setAlertas]=useState<any[]>([])
const [historial,setHistorial]=useState<any[]>([])

const [codigo,setCodigo]=useState("")
const [placa,setPlaca]=useState("")
const [marca,setMarca]=useState("")
const [ano,setAno]=useState("")
const [base,setBase]=useState("")
const [tipo,setTipo]=useState("ALFA")

const [ambulanciaMtto,setAmbulanciaMtto]=useState("")
const [kmMtto,setKmMtto]=useState("")
const [descripcionMtto,setDescripcionMtto]=useState("")

useEffect(()=>{

const rolLocal=localStorage.getItem("rol")

if(!rolLocal){
window.location.href="/"
return
}

setRol(rolLocal)

cargarAmbulancias()
cargarHistorial()

},[])

async function cargarAmbulancias(){

const {data}=await supabase
.from("ambulancias")
.select("*")
.order("codigo_operativo",{ascending:true})

if(data){
setAmbulancias(data)
evaluarAlertas(data)
}

}

async function cargarHistorial(){

const {data}=await supabase
.from("mantenimientos")
.select("*")
.order("created_at",{ascending:false})

if(data){
setHistorial(data)
}

}

function evaluarAlertas(lista:any[]){

let alertasTemp:any[]=[]

lista.forEach(a=>{

if(!a.kilometraje_mtto) return

const proximo=a.kilometraje_mtto+5000
const actual=a.kilometraje_actual
const restante=proximo-actual

if(restante<=0){

alertasTemp.push(`🚨 ${a.codigo_operativo} mantenimiento vencido`)

}else if(restante<500){

alertasTemp.push(`⚠ ${a.codigo_operativo} mantenimiento en ${restante} km`)

}

})

setAlertas(alertasTemp)

}

async function crearAmbulancia(){

await supabase
.from("ambulancias")
.insert([{
codigo_operativo:codigo,
placa:placa,
marca:marca,
ano:ano,
base_operativa:base,
tipo:tipo,
estado:"operativa",
kilometraje_actual:0,
kilometraje_mtto:0
}])

setCodigo("")
setPlaca("")
setMarca("")
setAno("")
setBase("")

cargarAmbulancias()

}

async function registrarMtto(){

await supabase
.from("mantenimientos")
.insert([{
ambulancia_id:ambulanciaMtto,
kilometraje:kmMtto,
descripcion:descripcionMtto
}])

await supabase
.from("ambulancias")
.update({kilometraje_mtto:kmMtto})
.eq("id",ambulanciaMtto)

setKmMtto("")
setDescripcionMtto("")
setAmbulanciaMtto("")

cargarAmbulancias()
cargarHistorial()

}

function colorEstado(e:string){

if(e==="operativa") return "green"
if(e==="mantenimiento") return "orange"

return "red"

}

const alfa=ambulancias.filter(a=>a.tipo==="ALFA")
const bravo=ambulancias.filter(a=>a.tipo==="BRAVO")

const alfaOperativas=alfa.filter(a=>a.estado==="operativa").length
const alfaInoperativas=alfa.filter(a=>a.estado!=="operativa").length

const bravoOperativas=bravo.filter(a=>a.estado==="operativa").length
const bravoInoperativas=bravo.filter(a=>a.estado!=="operativa").length

const alfaOperatividad=alfa.length?Math.round((alfaOperativas/alfa.length)*100):0
const bravoOperatividad=bravo.length?Math.round((bravoOperativas/bravo.length)*100):0

const dataGrafico={

labels:["ALFA","BRAVO"],

datasets:[
{
label:"Operativas",
data:[alfaOperativas,bravoOperativas],
backgroundColor:"green"
},
{
label:"Inoperativas",
data:[alfaInoperativas,bravoInoperativas],
backgroundColor:"red"
}
]

}

return(

<div style={{padding:"40px"}}>

<h1>Sistema de Control de Ambulancias</h1>

<h3>Rol actual: {rol}</h3>

<hr/>

<h2>Panel Operativo</h2>

<div style={{display:"flex",gap:"120px"}}>

<div>
<h3>ALFA</h3>
<p>Total: {alfa.length}</p>
<p>Operativas: {alfaOperativas}</p>
<p>Inoperativas: {alfaInoperativas}</p>
<p>% Operatividad: {alfaOperatividad}%</p>
</div>

<div>
<h3>BRAVO</h3>
<p>Total: {bravo.length}</p>
<p>Operativas: {bravoOperativas}</p>
<p>Inoperativas: {bravoInoperativas}</p>
<p>% Operatividad: {bravoOperatividad}%</p>
</div>

</div>

<hr/>

<h2>Grafico Operativo</h2>

<div style={{width:"600px"}}>

<Bar data={dataGrafico}/>

</div>

<hr/>

<h2>Alertas</h2>

<ul>

{alertas.map((a,i)=>(
<li key={i}>{a}</li>
))}

</ul>

<hr/>

{rol==="admin" && (

<>

<h2>Agregar Ambulancia</h2>

<input placeholder="Codigo" value={codigo} onChange={e=>setCodigo(e.target.value)}/>
<input placeholder="Placa" value={placa} onChange={e=>setPlaca(e.target.value)}/>
<input placeholder="Marca" value={marca} onChange={e=>setMarca(e.target.value)}/>
<input placeholder="Año" value={ano} onChange={e=>setAno(e.target.value)}/>
<input placeholder="Base" value={base} onChange={e=>setBase(e.target.value)}/>

<select value={tipo} onChange={e=>setTipo(e.target.value)}>

<option value="ALFA">ALFA</option>
<option value="BRAVO">BRAVO</option>

</select>

<button onClick={crearAmbulancia}>Crear Ambulancia</button>

<hr/>

</>

)}

<h2>Flota</h2>

<table border={1} cellPadding={8}>

<thead>

<tr>

<th>Codigo</th>
<th>Placa</th>
<th>Marca</th>
<th>Año</th>
<th>Base</th>
<th>Kilometraje</th>
<th>Estado</th>
<th>Tipo</th>

</tr>

</thead>

<tbody>

{ambulancias.map(a=>(

<tr key={a.id}>

<td>{a.codigo_operativo}</td>
<td>{a.placa}</td>
<td>{a.marca}</td>
<td>{a.ano}</td>
<td>{a.base_operativa}</td>
<td>{a.kilometraje_actual}</td>

<td style={{color:colorEstado(a.estado)}}>

{a.estado}

</td>

<td>{a.tipo}</td>

</tr>

))}

</tbody>

</table>

<hr/>

<h2>Historial Mecánico</h2>

<table border={1} cellPadding={8}>

<thead>

<tr>

<th>Ambulancia</th>
<th>Kilometraje</th>
<th>Descripción</th>
<th>Fecha</th>

</tr>

</thead>

<tbody>

{historial.map(h=>(

<tr key={h.id}>

<td>{h.ambulancia_id}</td>
<td>{h.kilometraje}</td>
<td>{h.descripcion}</td>
<td>{h.created_at}</td>

</tr>

))}

</tbody>

</table>

</div>

)

}