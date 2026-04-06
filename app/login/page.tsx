'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function Login() {
  const router = useRouter()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleLogin = async () => {
    setError('')

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError('Credenciales incorrectas')
      return
    }

    // 🔥 FORZAR REDIRECCIÓN LIMPIA
    window.location.href = '/dashboard-operativo'
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-white">

      <div className="bg-gray-900 p-8 rounded-xl w-[350px] border border-cyan-500">

        <h1 className="text-2xl mb-6 text-center text-cyan-400">
          🔐 Iniciar Sesión
        </h1>

        <input
          type="email"
          placeholder="Correo"
          className="w-full mb-3 p-2 bg-black border border-gray-600 rounded"
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          placeholder="Clave"
          className="w-full mb-3 p-2 bg-black border border-gray-600 rounded"
          onChange={(e) => setPassword(e.target.value)}
        />

        {error && (
          <p className="text-red-400 text-sm mb-2">{error}</p>
        )}

        <button
          onClick={handleLogin}
          className="w-full bg-cyan-500 hover:bg-cyan-600 p-2 rounded font-bold"
        >
          Ingresar
        </button>

      </div>
    </div>
  )
}