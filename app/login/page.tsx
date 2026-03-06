"use client"

import { useState } from "react"
import { getSupabase } from "../../lib/supabaseClient"

export default function Login() {

  const [email,setEmail] = useState("")
  const [password,setPassword] = useState("")
  const [error,setError] = useState("")

  const login = async () => {

    const supabase = getSupabase()
    if (!supabase) {
      setError("Configuración del servidor incompleta")
      return
    }

    const { data, error } = await supabase
      .from("usuarios")
      .select("*")
      .eq("email",email)
      .eq("password",password)
      .single()

    if(error){
      setError("Usuario o contraseña incorrecta")
      return
    }

    localStorage.setItem("usuario",JSON.stringify(data))
    window.location.href="/dashboard"
  }

  return(
    <div style={{padding:"40px"}}>
      <h1>Ingreso al Sistema</h1>

      <input
        placeholder="Correo"
        value={email}
        onChange={(e)=>setEmail(e.target.value)}
      />

      <input
        type="password"
        placeholder="Contraseña"
        value={password}
        onChange={(e)=>setPassword(e.target.value)}
      />

      <button onClick={login}>Ingresar</button>

      <p style={{color:"red"}}>{error}</p>
    </div>
  )
}