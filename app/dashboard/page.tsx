"use client"

import { useEffect,useState } from "react"
import { createClient } from "@supabase/supabase-js"
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

const supabase=createClient(
process.env.NEXT_PUBLIC_SUPABASE_URL!,
process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
)

export default function Dashboard(){

const [ambulancias,setAmbulancias]=useState([])
const [alertas,setAlertas]=useState([])
const [historial,setHistorial]=useState([])

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

function evaluarAlertas(lista){

let alertasTemp=[]

lista.forEach(a=>{

if(!a.kilometraje_mtto) return

const proximo=a.kilometraje_mtto+5000
const actual=a.kilometraje_actual
const restante=proximo-actual

if(restante<=0){
alertasTemp.push(`🚨 ${a.codigo_operativo} mantenimiento vencido`)
}
else if(restante<500){
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

await supabase.from("mantenimientos").insert([{
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

function exportarExcel(){

let csv="Codigo,Placa,Marca,Año,Base,Kilometraje,Estado\n"

ambulancias.forEach(a=>{
csv+=`${a.codigo_operativo},${a.placa},${a.marca},${a.ano},${a.base_operativa},${a.kilometraje_actual},${a.estado}\n`
})

const blob=new Blob([csv])
const url=URL.createObjectURL(blob)

const link=document.createElement("a")
link.href=url
link.download="ambulancias.csv"
link.click()

}

function colorEstado(e){

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

<div style={{padding:"40px",fontFamily:"Arial"}}>

<h1>Sistema de Control de Ambulancias</h1>

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

<h2>Gráfico Operativo</h2>

<div style={{width:"600px"}}>
<Bar data={dataGrafico}/>
</div>

<hr/>

<h2>Alertas de Mantenimiento</h2>

<ul>
{alertas.map((a,i)=>(
<li key={i}>{a}</li>
))}
</ul>

<hr/>

<h2>Agregar Nueva Ambulancia</h2>

<div style={{display:"flex",flexDirection:"column",width:"300px",gap:"10px"}}>

<input placeholder="Codigo Operativo" value={codigo} onChange={e=>setCodigo(e.target.value)}/>
<input placeholder="Placa" value={placa} onChange={e=>setPlaca(e.target.value)}/>
<input placeholder="Marca" value={marca} onChange={e=>setMarca(e.target.value)}/>
<input placeholder="Año" value={ano} onChange={e=>setAno(e.target.value)}/>
<input placeholder="Base Operativa" value={base} onChange={e=>setBase(e.target.value)}/>

<select value={tipo} onChange={e=>setTipo(e.target.value)}>
<option value="ALFA">ALFA</option>
<option value="BRAVO">BRAVO</option>
</select>

<button onClick={crearAmbulancia}>Crear Ambulancia</button>

</div>

<hr/>

<h2>Registrar Mantenimiento</h2>

<select value={ambulanciaMtto} onChange={e=>setAmbulanciaMtto(e.target.value)}>

<option value="">Seleccionar Ambulancia</option>

{ambulancias.map(a=>(
<option key={a.id} value={a.id}>
{a.codigo_operativo}
</option>
))}

</select>

<input
placeholder="Kilometraje salida taller"
value={kmMtto}
onChange={e=>setKmMtto(e.target.value)}
/>

<input
placeholder="Descripción mantenimiento"
value={descripcionMtto}
onChange={e=>setDescripcionMtto(e.target.value)}
/>

<button onClick={registrarMtto}>
Registrar Mtto
</button>

<hr/>

<button onClick={exportarExcel}>
Exportar Excel
</button>

<hr/>

<h2>Flota de Ambulancias</h2>

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