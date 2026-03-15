"use client"

import {useEffect,useState} from "react"
import {supabase} from "@/lib/supabaseClient"
import {useRouter} from "next/navigation"

export default function InformeFlota(){

const router = useRouter()

const [ambulancias,setAmbulancias] = useState<any[]>([])

useEffect(()=>{
cargar()
},[])

async function cargar(){

const {data,error} = await supabase
.from("ambulancias")
.select("*")
.order("codigo_operativo")

if(error){
console.log(error)
return
}

setAmbulancias(data || [])

}

const operativas = ambulancias.filter(a=>a.estado==="operativa").length
const mantenimiento = ambulancias.filter(a=>a.estado==="mantenimiento").length
const noOperativas = ambulancias.filter(a=>a.estado==="no operativa").length

const total = ambulancias.length

const disponibilidad =
total>0 ? ((operativas/total)*100).toFixed(1) : 0

return(

<div style={{padding:40,fontFamily:"Arial"}}>

<style jsx global>{`

@media print{
button{display:none}
}

`}</style>

<h1>Informe General de Flota</h1>

<button onClick={()=>router.push("/dashboard")}>
← Volver
</button>

<button
onClick={()=>window.print()}
style={{marginLeft:10}}
>
Imprimir Informe
</button>

<hr/>

<h2>Resumen Operativo</h2>

<p>Total ambulancias: {total}</p>
<p>Operativas: {operativas}</p>
<p>Mantenimiento: {mantenimiento}</p>
<p>No operativas: {noOperativas}</p>

<h3>
Disponibilidad de flota: {disponibilidad}%
</h3>

<hr/>

<h2>Detalle de Flota</h2>

<table border={1} cellPadding={8} style={{width:"100%",borderCollapse:"collapse"}}>

<thead>

<tr>

<th>Estado</th>
<th>Código</th>
<th>Placa</th>
<th>Tipo</th>
<th>KM</th>
<th>Próx Mtto</th>
<th>Motivo</th>

</tr>

</thead>

<tbody>

{ambulancias.map(a=>(

<tr key={a.id}>

<td>{a.estado}</td>
<td>{a.codigo_operativo}</td>
<td>{a.placa}</td>
<td>{a.tipo}</td>
<td>{a.kilometraje_actual}</td>
<td>{a.kilometraje_mtto}</td>
<td>{a.motivo_no_operativo}</td>

</tr>

))}

</tbody>

</table>

</div>

)

}