"use client"

import { useState } from "react"
import { createClient } from "@supabase/supabase-js"
import { useRouter } from "next/navigation"

const supabase = createClient(
process.env.NEXT_PUBLIC_SUPABASE_URL!,
process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
)

export default function Login(){

const router = useRouter()

const [email,setEmail] = useState("")
const [password,setPassword] = useState("")
const [error,setError] = useState("")

async function ingresar(){

setError("")

const { data, error } = await supabase.auth.signInWithPassword({
email: email,
password: password
})

if(error){
setError("Usuario o contraseña incorrectos")
return
}

/* CONSULTAR ROL DESPUES DEL LOGIN */

const { data:usuario, error:usuarioError } = await supabase
.from("usuarios")
.select("email,nombre,rol")
.eq("email", email)
.single()

if(!usuario){
setError("Usuario no registrado en sistema")
return
}

router.push("/dashboard")

}

return(

<div style={{padding:"40px"}}>

<h1>Sistema de Control de Ambulancias</h1>

<h2>Ingreso al sistema</h2>

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

<button onClick={ingresar}>
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