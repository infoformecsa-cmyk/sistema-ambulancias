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
  const [loading,setLoading] = useState(false)

  async function ingresar(){

    setError("")
    setLoading(true)

    try{

      /* LOGIN CON SUPABASE AUTH */

      const { data:loginData, error:loginError } =
        await supabase.auth.signInWithPassword({
          email: email,
          password: password
        })

      if(loginError){
        setError("Usuario o contraseña incorrectos")
        setLoading(false)
        return
      }

      /* OBTENER USUARIO AUTENTICADO */

      const { data:userData } = await supabase.auth.getUser()

      if(!userData || !userData.user){
        setError("Error obteniendo sesión del usuario")
        setLoading(false)
        return
      }

      const userEmail = userData.user.email

      /* CONSULTAR TABLA USUARIOS */

      const { data:usuario } = await supabase
.from("usuarios")
.select("*")
.eq("id", user.id)
.maybeSingle()

	const usuario = usuarios && usuarios.length > 0 ? usuarios[0] : null

      if(!usuario){
        setError("Usuario no registrado en el sistema")
        setLoading(false)
        return
      }

      /* GUARDAR ROL EN LOCAL STORAGE */

      localStorage.setItem("rol", usuario.rol)
      localStorage.setItem("nombre", usuario.nombre)

      /* REDIRIGIR AL DASHBOARD */

      router.push("/dashboard")

    }catch(e){

      setError("Error inesperado al iniciar sesión")

    }

    setLoading(false)

  }

  return(

  <div style={{padding:"40px",maxWidth:"400px"}}>

    <h1>Sistema de Control de Ambulancias</h1>

    <h2>Ingreso al sistema</h2>

    <input
      type="email"
      placeholder="Correo"
      value={email}
      onChange={(e)=>setEmail(e.target.value)}
      style={{display:"block",marginBottom:"10px",width:"100%"}}
    />

    <input
      type="password"
      placeholder="Contraseña"
      value={password}
      onChange={(e)=>setPassword(e.target.value)}
      style={{display:"block",marginBottom:"10px",width:"100%"}}
    />

    <button
      onClick={ingresar}
      disabled={loading}
      style={{padding:"8px 20px"}}
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