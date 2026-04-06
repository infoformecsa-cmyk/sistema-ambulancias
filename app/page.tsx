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

if(perfil?.rol === "operativo"){
router.replace("/dashboard-operativo")
return
}

if(perfil?.rol === "inventario"){
router.replace("/bitacora/dashboard")
return
}

if(perfil?.rol === "admin"){
router.replace("/dashboard")
return
}

if(perfil?.rol === "supervisor"){
router.replace("/supervisor")
return
}

if(perfil?.rol === "mecanico"){
router.replace("/mecanica")
return
}

if(perfil?.rol === "conductor"){
router.replace("/conductor")
return
}

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

if(data.rol === "operativo"){
router.replace("/dashboard-operativo")
return
}

if(data.rol === "inventario"){
router.replace("/bitacora/dashboard")
return
}

if(data.rol === "admin"){
router.replace("/dashboard")
return
}

if(data.rol === "supervisor"){
router.replace("/supervisor")
return
}

if(data.rol === "mecanico"){
router.replace("/mecanica")
return
}

if(data.rol === "conductor"){
router.replace("/conductor")
return
}

router.replace("/dashboard")

}

/* ========================= */
/* UI MEJORADO */
/* ========================= */

return(

<div style={container}>

<div style={card}>

<h1 style={title}>🚑 Sistema de Ambulancias</h1>
<p style={subtitle}>Control Operativo y Gestión Institucional</p>

<input
placeholder="Correo institucional"
value={email}
onChange={(e)=>setEmail(e.target.value)}
style={input}
/>

<input
type="password"
placeholder="Contraseña"
value={password}
onChange={(e)=>setPassword(e.target.value)}
style={input}
/>

<button
onClick={login}
disabled={loading}
style={button}
>
{loading ? "Ingresando..." : "Ingresar"}
</button>

{error && (
<p style={errorStyle}>{error}</p>
)}

</div>

</div>

)

}

/* ========================= */
/* ESTILOS PRO */
/* ========================= */

const container: React.CSSProperties = {
minHeight:"100vh",
display:"flex",
justifyContent:"center",
alignItems:"center",
background:"linear-gradient(135deg,#020617,#0f172a)",
fontFamily:"Arial"
}

const card: React.CSSProperties = {
background:"#020617",
padding:"40px 30px",
borderRadius:16,
width:340,
boxShadow:"0 0 50px rgba(0,255,255,0.08)",
border:"1px solid rgba(0,255,255,0.15)",
textAlign:"center"
}

const title: React.CSSProperties = {
color:"#22d3ee",
marginBottom:5,
fontSize:24
}

const subtitle: React.CSSProperties = {
color:"#94a3b8",
marginBottom:25,
fontSize:13
}

const input: React.CSSProperties = {
width:"100%",
padding:12,
marginBottom:12,
borderRadius:8,
border:"1px solid #1e293b",
background:"#020617",
color:"white",
outline:"none"
}

const button: React.CSSProperties = {
width:"100%",
padding:12,
background:"#06b6d4",
border:"none",
borderRadius:8,
color:"#020617",
fontWeight:"bold",
cursor:"pointer",
marginTop:10
}

const errorStyle: React.CSSProperties = {
color:"#ef4444",
marginTop:12,
fontSize:13
}