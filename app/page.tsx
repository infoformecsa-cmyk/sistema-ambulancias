"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { useRouter } from "next/navigation"

export default function Login(){

const router=useRouter()

const [email,setEmail]=useState("")
const [password,setPassword]=useState("")
const [error,setError]=useState("")

async function login(){

setError("")

const {data,error:authError}=await supabase.auth.signInWithPassword({

email:email,
password:password

})

if(authError){

setError("Usuario o contraseña incorrectos")
return

}

const user=data.user

if(!user){

setError("No se pudo iniciar sesión")
return

}

let rol="conductor"

if(email.includes("admin")) rol="admin"
if(email.includes("supervisor")) rol="supervisor"

localStorage.setItem("rol",rol)
localStorage.setItem("nombre",email)

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
style={{display:"block",marginBottom:"10px",width:"300px"}}
/>

<input
type="password"
placeholder="Contraseña"
value={password}
onChange={(e)=>setPassword(e.target.value)}
style={{display:"block",marginBottom:"10px",width:"300px"}}
/>

<button onClick={login}>
Ingresar
</button>

{error && (

<p style={{color:"red"}}>

{error}

</p>

)}

</div>

)

}