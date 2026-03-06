"use client"

import { useEffect, useState } from "react"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
process.env.NEXT_PUBLIC_SUPABASE_URL!,
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function Dashboard(){

const [ambulancias,setAmbulancias] = useState<any[]>([])

useEffect(()=>{

cargarAmbulancias()

},[])

const cargarAmbulancias = async ()=>{

const { data } = await supabase
.from("ambulancias")
.select("*")

if(data){
setAmbulancias(data)
}

}

const total = ambulancias.length

const operativas = ambulancias.filter(a=>a.estado==="Operativa").length
const mantenimiento = ambulancias.filter(a=>a.estado==="Mantenimiento").length
const fuera = ambulancias.filter(a=>a.estado==="Fuera de servicio").length

const alfaOperativas = ambulancias.filter(
a=>a.tipo==="ALFA" && a.estado==="Operativa"
).length

const bravoOperativas = ambulancias.filter(
a=>a.tipo==="BRAVO" && a.estado==="Operativa"
).length

const porcentaje = total>0 ? Math.round((operativas/total)*100) : 0

return(

<div style={{padding:"40px"}}>

<h1 style={{fontSize:"34px"}}>
Sistema de Control de Ambulancias
</h1>

<h2 style={{color:"#555"}}>
SSM Guayas – APH
</h2>

<hr style={{margin:"20px 0"}}/>

<h2>Panel Operativo</h2>

<div style={{
display:"flex",
gap:"20px",
flexWrap:"wrap",
marginBottom:"40px"
}}>

<div style={{border:"1px solid black",padding:"20px",width:"200px"}}>
<h3>Ambulancias Totales</h3>
<h1>{total}</h1>
</div>

<div style={{border:"1px solid black",padding:"20px",width:"200px"}}>
<h3>Operativas</h3>
<h1>{operativas}</h1>
</div>

<div style={{border:"1px solid black",padding:"20px",width:"200px"}}>
<h3>Mantenimiento</h3>
<h1>{mantenimiento}</h1>
</div>

<div style={{border:"1px solid black",padding:"20px",width:"200px"}}>
<h3>Fuera Servicio</h3>
<h1>{fuera}</h1>
</div>

<div style={{border:"1px solid black",padding:"20px",width:"200px"}}>
<h3>% Operatividad</h3>
<h1>{porcentaje}%</h1>
</div>

</div>

<h2>Disponibilidad por Tipo</h2>

<div style={{
display:"flex",
gap:"20px",
marginBottom:"40px"
}}>

<div style={{border:"1px solid black",padding:"20px",width:"200px"}}>
<h3>ALFA Operativas</h3>
<h1>{alfaOperativas}</h1>
</div>

<div style={{border:"1px solid black",padding:"20px",width:"200px"}}>
<h3>BRAVO Operativas</h3>
<h1>{bravoOperativas}</h1>
</div>

</div>

<h2>Flota de Ambulancias</h2>

<table border={1} cellPadding={10}>

<thead>

<tr>

<th>Código</th>
<th>Placa</th>
<th>Marca</th>
<th>Modelo</th>
<th>Año</th>
<th>Base Operativa</th>
<th>Kilometraje</th>
<th>Estado</th>
<th>Motivo No Operativo</th>
<th>Observaciones</th>
<th>Actualizado por</th>
<th>Fecha Actualización</th>

</tr>

</thead>

<tbody>

{ambulancias
.sort((a,b)=>a.codigo_operativo.localeCompare(b.codigo_operativo))
.map((a:any)=>(

<tr key={a.id}>

<td>{a.codigo_operativo}</td>

<td>{a.placa}</td>

<td>{a.marca}</td>

<td>{a.modelo}</td>

<td>{a.ano}</td>

<td>{a.base_operativa}</td>

<td>{a.kilometraje_actual}</td>

<td>{a.estado}</td>

<td>{a.motivo_no_operativo}</td>

<td>{a.observaciones}</td>

<td>{a.actualizado_por}</td>

<td>{a.fecha_actualizacion}</td>

</tr>
))}

</tbody>

</table>

</div>

)

}
