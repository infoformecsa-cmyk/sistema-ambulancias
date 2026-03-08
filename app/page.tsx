"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"

export default function Login(){

const router = useRouter()

const [email,setEmail] = useState("")
const [password,setPassword] = useState("")
const [error,setError] = useState("")

const iniciarSesion = async () => {

setError("")

const { data, error } = await supabase
.from("usuarios")
.select("*")
.eq("email", email)
.single()

if(error || !data){
setError("Usuario no encontrado")
return
}

localStorage.setItem("usuario", JSON.stringify(data))

router.push("/dashboard")

}

return(

<div style={{padding:"40px"}}>

<h1>Sistema de Control de Ambulancias</h1>

<h2>Ingreso al sistema</h2>

<div style={{marginTop:"20px"}}>

<input
type="email"
placeholder="Correo"
value={email}
onChange={(e)=>setEmail(e.target.value)}
style={{display:"block",marginBottom:"10px"}}
/>

<input
type="password"
placeholder="Contraseña"
value={password}
onChange={(e)=>setPassword(e.target.value)}
style={{display:"block",marginBottom:"10px"}}
/>

<button onClick={iniciarSesion}>
Ingresar
</button>

</div>

{error && (
<p style={{color:"red",marginTop:"20px"}}>
{error}
</p>
)}

</div>

)

}