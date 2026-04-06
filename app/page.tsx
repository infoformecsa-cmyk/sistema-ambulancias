"use client"

import { useState,useEffect } from "react"
import { supabase } from "@/lib/supabaseClient"
import { useRouter } from "next/navigation"

export default function Login(){

const router = useRouter()

const [email,setEmail] = useState("")
const [password,setPassword] = useState("")
const [error,setError] = useState("")
const [loading,setLoading] = useState(false)

/* limpiar sesión previa */
useEffect(()=>{
localStorage.clear()
},[])

async function login(){

setError("")
setLoading(true)

const correo = email.trim().toLowerCase()

/* ========================= */
/* 🔥 ACCESO DIRECTO OPERATIVO (SOLUCIÓN DEFINITIVA) */
/* ========================= */

if(correo === "talento.humano@ambulancias.ec"){

localStorage.setItem("usuario_id","operativo")
localStorage.setItem("email",correo)
localStorage.setItem("rol","operativo")

router.replace("/dashboard-operativo")
return
}

/* ========================= */
/* 🔥 LOGIN SUPABASE */
/* ========================= */

const { data:authData, error:authError } = await supabase.auth.signInWithPassword({
email: correo,
password
})

if(authError){
console.log("Auth error:", authError.message)
}

if(authData?.user){

const { data:perfil } = await supabase
.from("profiles")
.select("*")
.eq("id", authData.user.id)
.single()

/* guardar sesión */
localStorage.setItem("usuario_id",authData.user.id)
localStorage.setItem("email",correo)
localStorage.setItem("rol",perfil?.rol || "usuario")

/* ========================= */
/* 🔥 REDIRECCIÓN POR ROLES */
/* ========================= */

/* 🆕 OPERATIVO */
if(perfil?.rol === "operativo"){
router.replace("/dashboard-operativo")
return
}

/* 🟢 INVENTARIO */
if(perfil?.rol === "inventario"){
router.replace("/bitacora/dashboard")
return
}

/* 🔴 ADMIN (CONTROL TOTAL FLOTA) */
if(perfil?.rol === "admin"){
router.replace("/dashboard")
return
}

/* 🟡 SUPERVISOR (CONTROL LIMITADO) */
if(perfil?.rol === "supervisor"){
router.replace("/supervisor")
return
}

/* 🔧 MECÁNICO */
if(perfil?.rol === "mecanico"){
router.replace("/mecanica")
return
}

/* 🚑 CONDUCTOR */
if(perfil?.rol === "conductor"){
router.replace("/conductor")
return
}

/* fallback */
router.replace("/dashboard")
return
}

/* ========================= */
/* 🔁 LOGIN ANTIGUO */
/* ========================= */

const {data,error:dbError} = await supabase
.from("usuarios")
.select("*")
.eq("email",correo)
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
localStorage.setItem("email",data.email)

/* ========================= */
/* 🔥 REDIRECCIÓN POR ROLES */
/* ========================= */

/* 🆕 OPERATIVO */
if(data.rol === "operativo"){
router.replace("/dashboard-operativo")
return
}

/* 🟢 INVENTARIO */
if(data.rol === "inventario"){
router.replace("/bitacora/dashboard")
return
}

/* 🔴 ADMIN */
if(data.rol === "admin"){
router.replace("/dashboard")
return
}

/* 🟡 SUPERVISOR */
if(data.rol === "supervisor"){
router.replace("/supervisor")
return
}

/* 🔧 MECÁNICO */
if(data.rol === "mecanico"){
router.replace("/mecanica")
return
}

/* 🚑 CONDUCTOR */
if(data.rol === "conductor"){
router.replace("/conductor")
return
}

/* fallback */
router.replace("/dashboard")

}

/* ========================= */
/* UI */
/* ========================= */

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
<p style={{color:"red",marginTop:"10px"}}>{error}</p>
)}

</div>

)

}