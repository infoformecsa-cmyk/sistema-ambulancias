'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function Dashboard() {
  const router = useRouter()

  const [personal, setPersonal] = useState<any[]>([])
  const [archivos, setArchivos] = useState<any[]>([])
  const [editando, setEditando] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    verificarSesion()
  }, [])

  const verificarSesion = async () => {
    const { data } = await supabase.auth.getSession()

    if (!data.session) {
      router.push('/login')
      return
    }

    await fetchData()
    setLoading(false)
  }

  const fetchData = async () => {
    const { data: p } = await supabase.from('personal').select('*')
    const { data: a } = await supabase
      .from('archivos_asistencia')
      .select('*')
      .order('fecha', { ascending: false })

    if (p) setPersonal(p)
    if (a) setArchivos(a)
  }

  const logout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const eliminar = async (id: number) => {
    if (!confirm('¿Eliminar este registro?')) return
    await supabase.from('personal').delete().eq('id', id)
    fetchData()
  }

  const guardarEdicion = async () => {
    await supabase
      .from('personal')
      .update({
        nombre: editando.nombre,
        ambulancia_codigo: editando.ambulancia_codigo
      })
      .eq('id', editando.id)

    setEditando(null)
    fetchData()
  }

  const guardias = ['G1', 'G2', 'G3', 'G4']

  const getGuardia = (g: string) =>
    personal.filter((p) => p.guardia === g)

  const agruparPorAmbulancia = (data: any[]) => {
    const grupos: any = {}

    data.forEach((p) => {
      const key = p.ambulancia_codigo || 'SIN UNIDAD'
      if (!grupos[key]) grupos[key] = []
      grupos[key].push(p)
    })

    return Object.entries(grupos).sort((a: any, b: any) => {
      const numA = parseInt(a[0].replace(/\D/g, '')) || 999
      const numB = parseInt(b[0].replace(/\D/g, '')) || 999
      return numA - numB
    })
  }

  const alertas = personal.filter(
    (p) =>
      p.estado === 'Reposo Médico' ||
      p.estado === 'Permiso'
  )

  const colorEstado = (estado: string) => {
    switch (estado) {
      case 'Activo':
        return 'bg-green-400'
      case 'Vacaciones':
        return 'bg-yellow-400'
      case 'Permiso':
        return 'bg-orange-400'
      case 'Reposo Médico':
        return 'bg-red-500 animate-pulse'
      default:
        return 'bg-gray-400'
    }
  }

  // 🔥 LOADER (IMPORTANTE PARA VERCEL)
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        🚑 Cargando sistema...
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white p-6">

      {/* HEADER */}
      <div className="flex justify-between items-center mb-6">

        <h1 className="text-4xl font-extrabold text-cyan-400">
          🚑 CONTROL OPERATIVO
        </h1>

        <div className="flex gap-3">

          <button
            onClick={fetchData}
            className="bg-blue-600 px-4 py-2 rounded-lg"
          >
            🔄 Actualizar
          </button>

          <button
            className="bg-green-600 px-4 py-2 rounded-lg"
          >
            ➕ Nuevo
          </button>

          <button
            onClick={logout}
            className="bg-red-600 px-4 py-2 rounded-lg"
          >
            🔐 Salir
          </button>

        </div>
      </div>

      {/* ALERTA GENERAL */}
      <div className="mb-6 bg-red-600 px-6 py-3 rounded-xl w-fit">
        ⚠ {alertas.length} ALERTAS
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-6 mb-10">

        <div className="bg-gray-900 p-6 rounded-xl border border-cyan-500">
          <p>Total</p>
          <h2 className="text-3xl">{personal.length}</h2>
        </div>

        <div className="bg-green-900 p-6 rounded-xl">
          <p>Activos</p>
          <h2 className="text-3xl">
            {personal.filter(p => p.estado === 'Activo').length}
          </h2>
        </div>

        <div className="bg-red-900 p-6 rounded-xl">
          <p>No disponibles</p>
          <h2 className="text-3xl">{alertas.length}</h2>
        </div>

        <div className="bg-blue-900 p-6 rounded-xl">
          <p>Reportes</p>
          <h2 className="text-3xl">{archivos.length}</h2>
        </div>

      </div>

      {/* CONTENIDO */}
      <div className="grid grid-cols-3 gap-6">

        {/* GUARDIAS */}
        <div className="col-span-2 grid grid-cols-2 gap-6">

          {guardias.map((g) => {
            const agrupado = agruparPorAmbulancia(getGuardia(g))

            return (
              <div key={g} className="bg-gray-900 p-5 rounded-xl">

                <h2 className="text-xl mb-4 text-cyan-400">{g}</h2>

                {agrupado.map(([ambulancia, personas]: any) => (

                  <div key={ambulancia} className="mb-4 border p-3 rounded">

                    <h3 className="text-cyan-300 mb-2">
                      🚑 {ambulancia}
                    </h3>

                    {personas.map((p: any) => (
                      <div
                        key={p.id}
                        className="flex justify-between items-center bg-black p-2 mb-2 rounded"
                      >

                        <div>
                          <p className="text-sm font-semibold">{p.nombre}</p>
                        </div>

                        <div className="flex items-center gap-2">

                          <div className={`w-3 h-3 rounded-full ${colorEstado(p.estado)}`} />

                          <button
                            onClick={() => setEditando(p)}
                            className="text-xs bg-cyan-600 px-2 py-1 rounded"
                          >
                            ✏️
                          </button>

                          <button
                            onClick={() => eliminar(p.id)}
                            className="text-xs bg-red-600 px-2 py-1 rounded"
                          >
                            🗑️
                          </button>

                          <input
                            className="bg-black border text-xs px-1 w-16"
                            value={p.ambulancia_codigo || ''}
                            onChange={async (e) => {
                              await supabase
                                .from('personal')
                                .update({ ambulancia_codigo: e.target.value })
                                .eq('id', p.id)
                              fetchData()
                            }}
                          />

                        </div>
                      </div>
                    ))}

                  </div>
                ))}

              </div>
            )
          })}

        </div>

        {/* PANEL DERECHO */}
        <div className="space-y-6">

          <div className="bg-red-900/50 p-4 rounded-xl">
            <h2 className="text-red-400 mb-2">⚠ Críticos</h2>

            {alertas.map((p) => (
              <div key={p.id} className="text-sm border-b py-1">
                {p.nombre} — {p.estado}
              </div>
            ))}
          </div>

          <div className="bg-gray-900 p-4 rounded-xl">
            <h2 className="text-blue-400 mb-2">📁 Reportes</h2>

            {archivos.map((a) => (
              <div key={a.id} className="flex justify-between text-sm border-b py-1">
                <span>{a.nombre}</span>
                <span className="text-gray-400">
                  {new Date(a.fecha).toLocaleDateString('es-EC', {
                    timeZone: 'America/Guayaquil'
                  })}
                </span>
              </div>
            ))}
          </div>

        </div>

      </div>

      {/* MODAL EDITAR */}
      {editando && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center">

          <div className="bg-gray-900 p-6 rounded-xl w-80">

            <h2 className="mb-4">Editar</h2>

            <input
              className="w-full mb-3 p-2 bg-black border"
              value={editando.nombre}
              onChange={(e) =>
                setEditando({ ...editando, nombre: e.target.value })
              }
            />

            <input
              className="w-full mb-3 p-2 bg-black border"
              value={editando.ambulancia_codigo || ''}
              onChange={(e) =>
                setEditando({
                  ...editando,
                  ambulancia_codigo: e.target.value
                })
              }
            />

            <div className="flex justify-between">
              <button
                onClick={guardarEdicion}
                className="bg-green-600 px-4 py-2 rounded"
              >
                Guardar
              </button>

              <button
                onClick={() => setEditando(null)}
                className="bg-red-600 px-4 py-2 rounded"
              >
                Cancelar
              </button>
            </div>

          </div>

        </div>
      )}

    </div>
  )
}