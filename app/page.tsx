"use client"

import { useEffect, useState } from "react"
import { createClient } from "@supabase/supabase-js"

export default function SistemaAmbulancias() {

const [ambulancias,setAmbulancias] = useState<any[]>([])
const [usuario,setUsuario] = useState<any>(null)

const [email,setEmail] = useState("")
const [password,setPassword] = useState("")
const [error,setError] = useState("")

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

let supabase:any = null

if(supabaseUrl && supabaseKey){
supabase = createClient(supabaseUrl,supabaseKey)
}

useEffect(()=>{

const u = localStorage.getItem("usuario")

if(u){
setUsuario(JSON.parse(u))
cargarAmbulancias()
}

},[])

const login = async ()=>{

if(!supabase){
setError("Configuración del servidor incorrecta")
return
}

const { data,error } = await supabase
.from("usuarios")
.select("*")
.eq("email",email)
.eq("password",password)
.single()

if(error){
setError("Usuario o contraseña incorrectos")
return
}

localStorage.setItem("usuario",JSON.stringify(data))
setUsuario(data)

cargarAmbulancias()

}

const cargarAmbulancias = async ()=>{

if(!supabase) return

const { data } = await supabase
.from("ambulancias")
.select("*")

if(data){
setAmbulancias(data)
}

}

const operativas = ambulancias.filter(a=>a.estado==="Operativa").length
const mantenimiento = ambulancias.filter(a=>a.estado==="Mantenimiento").length
const fuera = ambulancias.filter(a=>a.estado==="Fuera de servicio").length

if(!usuario){

return(

<div style={{padding:"40px"}}>

<h1>Sistema de Control de Ambulancias</h1>

<h2>Ingreso al sistema</h2>

<input
placeholder="Correo"
value={email}
onChange={(e)=>setEmail(e.target.value)}
/>

<br/><br/>

<input
type="password"
placeholder="Contraseña"
value={password}
onChange={(e)=>setPassword(e.target.value)}
/>

<br/><br/>

<button onClick={login}>
Ingresar
</button>

<p style={{color:"red"}}>{error}</p>

</div>

)

}

return(

<div style={{padding:"40px"}}>

<h1>Sistema de Control de Ambulancias</h1>

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

<h2>Flota registrada</h2>

<table border={1} cellPadding={10}>

<thead>

<tr>
<th>Código</th>
<th>Estado</th>
<th>Acceso</th>
</tr>

</thead>

<tbody>

{ambulancias
.sort((a,b)=>a.codigo_operativo.localeCompare(b.codigo_operativo))
.map((a,index)=>(
<tr key={index}>
<td>{a.codigo_operativo}</td>
<td>{a.estado || "Operativa"}</td>
<td>Abrir ficha</td>
</tr>
))}

</tbody>

</table>

</div>

)

}