"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { useRouter } from "next/navigation"

export default function Login(){

const router = useRouter()

const [email,setEmail] = useState("")
const [password,setPassword] = useState("")
const [error,setError] = useState("")
const [loading,setLoading] = useState(false)

async function login(){

setError("")
setLoading(true)

const {data,error:dbError} = await supabase
.from("usuarios")
.select("*")
.eq("email",email)
.single()

if(dbError || !data){

setError("Usuario no encontrado")
setLoading(false)
return

}

if(data.password !== password){

setError("Contraseña incorrecta")
setLoading(false)
return

}

/* guardar sesión */

localStorage.setItem("usuario_id",data.id)
localStorage.setItem("rol",data.rol)
localStorage.setItem("nombre",data.nombre)

router.push("/dashboard")

}

return(

<div style={{padding:"40px",fontFamily:"Arial"}}>

<h1>Sistema de Control de Ambulancias</h1>

<h2>Ingreso al sistema</h2>

<input
placeholder="Correo"
value={email}
onChange={(e)=>setEmail(e.target.value)}
style={{
display:"block",
marginBottom:"10px",
width:"300px",
padding:"8px"
}}
/>

<input
type="password"
placeholder="Contraseña"
value={password}
onChange={(e)=>setPassword(e.target.value)}
style={{
display:"block",
marginBottom:"10px",
width:"300px",
padding:"8px"
}}
/>

<button
onClick={login}
disabled={loading}
style={{
padding:"10px 20px",
background:"#667eea",
color:"white",
border:"none",
borderRadius:"4px",
cursor:"pointer"
}}
>

{loading ? "Ingresando..." : "Ingresar"}

</button>

{error && (

<p style={{color:"red",marginTop:"10px"}}>

{error}

</p>

)}

</div>

)

}