"use client"

import { useEffect,useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { useRouter } from "next/navigation"

export default function Dashboard(){

const router=useRouter()

const [ambulancias,setAmbulancias]=useState<any[]>([])
const [codigo,setCodigo]=useState("")
const [placa,setPlaca]=useState("")
const [marca,setMarca]=useState("")
const [ano,setAno]=useState("")
const [base,setBase]=useState("")
const [tipo,setTipo]=useState("ALFA")

useEffect(()=>{
cargarAmbulancias()
},[])

async function cargarAmbulancias(){

const {data}=await supabase
.from("ambulancias")
.select("*")
.order("codigo_operativo")

if(data) setAmbulancias(data)

}

async function crearAmbulancia(){

await supabase
.from("ambulancias")
.insert([{
codigo_operativo:codigo,
placa,
marca,
ano,
base_operativa:base,
tipo,
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

async function cambiarEstado(id:string,estado:string){

await supabase
.from("ambulancias")
.update({estado})
.eq("id",id)

cargarAmbulancias()

}

function colorEstado(e:string){

if(e==="operativa") return "green"
if(e==="mantenimiento") return "orange"
return "red"

}

const operativas=ambulancias.filter(a=>a.estado==="operativa").length
const mantenimiento=ambulancias.filter(a=>a.estado==="mantenimiento").length
const fuera=ambulancias.filter(a=>a.estado==="no operativa").length

return(

<div style={{padding:40,fontFamily:"Arial"}}>

<h1>Sistema de Control de Ambulancias</h1>

<hr/>

<h2>Panel de Control de Flota</h2>

<div style={{display:"flex",gap:"20px"}}>

<div style={{border:"1px solid black",padding:"20px"}}>
🚑 Operativas
<h2>{operativas}</h2>
</div>

<div style={{border:"1px solid black",padding:"20px"}}>
🔧 Mantenimiento
<h2>{mantenimiento}</h2>
</div>

<div style={{border:"1px solid black",padding:"20px"}}>
⛔ Fuera de servicio
<h2>{fuera}</h2>
</div>

</div>

<hr/>

<h2>Registrar nueva ambulancia</h2>

<div style={{display:"flex",flexDirection:"column",width:"300px",gap:"8px"}}>

<input
placeholder="Código"
value={codigo}
onChange={(e)=>setCodigo(e.target.value)}
/>

<input
placeholder="Placa"
value={placa}
onChange={(e)=>setPlaca(e.target.value)}
/>

<input
placeholder="Marca"
value={marca}
onChange={(e)=>setMarca(e.target.value)}
/>

<input
placeholder="Año"
value={ano}
onChange={(e)=>setAno(e.target.value)}
/>

<input
placeholder="Base"
value={base}
onChange={(e)=>setBase(e.target.value)}
/>

<select
value={tipo}
onChange={(e)=>setTipo(e.target.value)}
>

<option value="ALFA">ALFA</option>
<option value="BRAVO">BRAVO</option>

</select>

<button onClick={crearAmbulancia}>
Crear Ambulancia
</button>

</div>

<hr/>

<h2>Flota registrada</h2>

<table border={1} cellPadding={8}>

<thead>

<tr>
<th>Código</th>
<th>Estado</th>
<th>Acciones</th>
</tr>

</thead>

<tbody>

{ambulancias.map(a=>(

<tr key={a.id}>

<td>{a.codigo_operativo}</td>

<td style={{color:colorEstado(a.estado)}}>

{a.estado}

</td>

<td>

<button
onClick={()=>router.push(`/ambulancia/${a.id}`)}
>

Ficha

</button>

<button
onClick={()=>cambiarEstado(a.id,"operativa")}
>

Operativa

</button>

<button
onClick={()=>cambiarEstado(a.id,"mantenimiento")}
>

Mantenimiento

</button>

<button
onClick={()=>cambiarEstado(a.id,"no operativa")}
>

Fuera

</button>

</td>

</tr>

))}

</tbody>

</table>

</div>

)

}