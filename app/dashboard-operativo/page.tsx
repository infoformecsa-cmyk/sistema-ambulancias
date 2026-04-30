'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const GUARDIAS = ['G1', 'G2', 'G3', 'G4', 'G5']

export default function Dashboard() {
  const router = useRouter()

  const [personal, setPersonal] = useState<any[]>([])
  const [archivos, setArchivos] = useState<any[]>([])
  const [ambulancias, setAmbulancias] = useState<any[]>([])
  const [editando, setEditando] = useState<any>(null)
  const [nuevo, setNuevo] = useState(false)
  const [nuevaAmbulancia, setNuevaAmbulancia] = useState(false)
  const [codigoAmbulancia, setCodigoAmbulancia] = useState('')
  const [loading, setLoading] = useState(true)
  const [formNuevo, setFormNuevo] = useState<any>({
    nombre: '',
    tipo: 'ambulancia',
    guardia: 'G1',
    ambulancia_codigo: ''
  })

  useEffect(() => {
    iniciar()
  }, [])

  const iniciar = async () => {
    await fetchData()
    setLoading(false)
  }

  const fetchData = async () => {
    const { data: p } = await supabase
      .from('personal')
      .select('id,nombre,tipo,guardia,ambulancia_codigo,estado')

    const { data: a } = await supabase
      .from('archivos_asistencia')
      .select('*')
      .order('fecha', { ascending: false })

    const { data: amb } = await supabase
      .from('ambulancias')
      .select('id,codigo_operativo')
      .order('codigo_operativo')

    if (p) setPersonal(p)
    if (a) setArchivos(a)
    if (amb) setAmbulancias(amb)
  }

  const editarPersonal = (persona: any) => {
    setEditando({
      ...persona,
      tipo: persona.tipo || 'ambulancia',
      guardia: persona.guardia || 'G1',
      ambulancia_codigo: persona.ambulancia_codigo || '',
      estado: persona.estado || 'Activo'
    })
  }

  const eliminar = async (id: any) => {
    if (!confirm('¿Eliminar registro?')) return
    await supabase.from('personal').delete().eq('id', id)
    fetchData()
  }

  const actualizar = async () => {
    if (!editando) return

    const { error } = await supabase
      .from('personal')
      .update({
        nombre: editando.nombre,
        tipo: editando.tipo,
        guardia: editando.guardia,
        ambulancia_codigo:
          editando.tipo === 'ambulancia' ? editando.ambulancia_codigo : null,
        estado: editando.estado
      })
      .eq('id', editando.id)

    if (error) {
      alert('Error actualizando personal')
      console.error(error)
      return
    }

    setEditando(null)
    fetchData()
  }

  const crearNuevo = async () => {
    if (!formNuevo.nombre) {
      alert('Nombre requerido')
      return
    }

    if (formNuevo.tipo === 'ambulancia' && !formNuevo.ambulancia_codigo) {
      alert('Debe seleccionar una ambulancia')
      return
    }

    const { error } = await supabase.from('personal').insert([
      {
        nombre: formNuevo.nombre,
        tipo: formNuevo.tipo,
        guardia: formNuevo.guardia,
        ambulancia_codigo:
          formNuevo.tipo === 'ambulancia' ? formNuevo.ambulancia_codigo : null,
        estado: 'Activo'
      }
    ])

    if (error) {
      alert('Error: ' + error.message)
      return
    }

    setNuevo(false)
    setFormNuevo({
      nombre: '',
      tipo: 'ambulancia',
      guardia: 'G1',
      ambulancia_codigo: ''
    })
    fetchData()
  }

  const crearAmbulancia = async () => {
    if (!codigoAmbulancia) {
      alert('Ingrese código')
      return
    }

    const { error } = await supabase
      .from('ambulancias')
      .insert([{ codigo_operativo: codigoAmbulancia }])

    if (error) {
      alert('Error: ' + error.message)
      return
    }

    setCodigoAmbulancia('')
    setNuevaAmbulancia(false)
    fetchData()
  }

  const logout = () => {
    localStorage.clear()
    sessionStorage.clear()
    router.replace('/')
  }

  const irHistorial = () => {
    router.push('/dashboard-operativo/historial')
  }

  const getAmbulancia = (g: string) =>
    personal.filter((p) => p.guardia === g && p.tipo === 'ambulancia')

  const getConsola = (g: string) =>
    personal.filter((p) => p.guardia === g && p.tipo === 'consola')

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
    (p) => p.estado === 'Reposo Médico' || p.estado === 'Permiso'
  )

  const reportesTotales = archivos.length
  const reportesHoy = archivos.filter(
    (a) => new Date(a.fecha).toDateString() === new Date().toDateString()
  ).length

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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        🚑 Cargando sistema...
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-4xl font-extrabold text-cyan-400">
          🚑 CONTROL OPERATIVO
        </h1>

        <div className="flex gap-3 flex-wrap">
          <button
            onClick={fetchData}
            className="bg-blue-600 px-4 py-2 rounded-lg"
          >
            🔄 Actualizar
          </button>
          <button
            onClick={() => setNuevo(true)}
            className="bg-green-600 px-4 py-2 rounded-lg"
          >
            ➕ Nuevo
          </button>
          <button
            onClick={() => setNuevaAmbulancia(true)}
            className="bg-purple-600 px-4 py-2 rounded-lg"
          >
            🚑 Ambulancia
          </button>
          <button
            onClick={irHistorial}
            className="bg-cyan-600 px-4 py-2 rounded-lg"
          >
            📊 Historial
          </button>
          <button
            onClick={logout}
            className="bg-red-600 px-4 py-2 rounded-lg"
          >
            🔐 Salir
          </button>
        </div>
      </div>

      <div className="mb-6 bg-red-600 px-6 py-3 rounded-xl w-fit">
        ⚠ {alertas.length} ALERTAS
      </div>

      <div className="grid grid-cols-4 gap-6 mb-10">
        <div className="bg-gray-900 p-6 rounded-xl border border-cyan-500">
          <p>Total</p>
          <h2 className="text-3xl">{personal.length}</h2>
        </div>
        <div className="bg-green-900 p-6 rounded-xl">
          <p>Activos</p>
          <h2 className="text-3xl">
            {personal.filter((p) => p.estado === 'Activo').length}
          </h2>
        </div>
        <div className="bg-red-900 p-6 rounded-xl">
          <p>No disponibles</p>
          <h2 className="text-3xl">{alertas.length}</h2>
        </div>
        <div className="bg-blue-900 p-6 rounded-xl">
          <p>Reportes</p>
          <h2 className="text-3xl">{reportesTotales}</h2>
          <p className="text-sm text-gray-300">{reportesHoy} hoy</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 grid grid-cols-2 gap-6">
          {GUARDIAS.map((g) => {
            const ambulanciasPorGuardia = agruparPorAmbulancia(getAmbulancia(g))
            const consola = getConsola(g)

            return (
              <div key={g} className="bg-gray-900 p-5 rounded-xl">
                <h2 className="text-xl mb-4 text-cyan-400">{g}</h2>

                {ambulanciasPorGuardia.map(([ambulancia, personas]: any) => (
                  <div key={ambulancia} className="mb-4 border p-3 rounded">
                    <h3 className="text-cyan-300 mb-2">🚑 {ambulancia}</h3>

                    {personas.map((p: any) => (
                      <div
                        key={p.id}
                        className="flex justify-between items-center bg-black p-2 mb-2 rounded"
                      >
                        <div>
                          <p className="text-sm font-semibold">{p.nombre}</p>
                          <p className="text-xs text-gray-400">{p.estado}</p>
                        </div>

                        <div className="flex items-center gap-2">
                          <div
                            className={`w-3 h-3 rounded-full ${colorEstado(
                              p.estado
                            )}`}
                          />
                          <button
                            onClick={() => editarPersonal(p)}
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
                        </div>
                      </div>
                    ))}
                  </div>
                ))}

                {consola.length > 0 && (
                  <div className="mt-3 border border-green-500/40 p-3 rounded bg-black/40">
                    <h3 className="text-green-400 mb-2">💻 CONSOLA</h3>

                    {consola.map((p: any) => (
                      <div
                        key={p.id}
                        className="flex justify-between items-center bg-black p-2 mb-2 rounded"
                      >
                        <p className="text-sm">{p.nombre}</p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => editarPersonal(p)}
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
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>

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
              <div
                key={a.id}
                className="flex justify-between text-sm border-b py-1"
              >
                <span>{a.nombre}</span>
                <span className="text-gray-400">
                  {new Date(a.fecha).toLocaleDateString('es-EC')}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {nuevo && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-gray-900 p-6 rounded-xl w-80">
            <h2 className="mb-4 text-white">Nuevo funcionario</h2>

            <input
              className="w-full mb-2 p-2 bg-black border text-white rounded"
              placeholder="Nombre"
              value={formNuevo.nombre}
              onChange={(e) =>
                setFormNuevo({ ...formNuevo, nombre: e.target.value })
              }
            />

            <select
              className="w-full mb-2 p-2 bg-black border text-white rounded"
              value={formNuevo.tipo}
              onChange={(e) =>
                setFormNuevo({ ...formNuevo, tipo: e.target.value })
              }
            >
              <option value="ambulancia">Ambulancia</option>
              <option value="consola">Consola</option>
            </select>

            <select
              className="w-full mb-2 p-2 bg-black border text-white rounded"
              value={formNuevo.guardia}
              onChange={(e) =>
                setFormNuevo({ ...formNuevo, guardia: e.target.value })
              }
            >
              {GUARDIAS.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>

            {formNuevo.tipo === 'ambulancia' && (
              <select
                className="w-full mb-2 p-2 bg-black border text-white rounded"
                value={formNuevo.ambulancia_codigo}
                onChange={(e) =>
                  setFormNuevo({
                    ...formNuevo,
                    ambulancia_codigo: e.target.value
                  })
                }
              >
                <option value="">Seleccionar unidad</option>
                {ambulancias.map((a: any) => (
                  <option key={a.id} value={a.codigo_operativo}>
                    {a.codigo_operativo}
                  </option>
                ))}
              </select>
            )}

            <div className="flex justify-between mt-4">
              <button
                onClick={crearNuevo}
                className="bg-green-600 px-4 py-2 rounded"
              >
                Guardar
              </button>
              <button
                onClick={() => setNuevo(false)}
                className="bg-red-600 px-4 py-2 rounded"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {nuevaAmbulancia && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-gray-900 p-6 rounded-xl w-80">
            <h2 className="mb-4 text-white">Nueva ambulancia</h2>

            <input
              className="w-full mb-4 p-2 bg-black border text-white rounded"
              placeholder="Código operativo"
              value={codigoAmbulancia}
              onChange={(e) => setCodigoAmbulancia(e.target.value)}
            />

            <div className="flex justify-between">
              <button
                onClick={crearAmbulancia}
                className="bg-purple-600 px-4 py-2 rounded"
              >
                Guardar
              </button>
              <button
                onClick={() => setNuevaAmbulancia(false)}
                className="bg-red-600 px-4 py-2 rounded"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {editando && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-gray-900 p-6 rounded-xl w-80">
            <h2 className="mb-4">Editar funcionario</h2>

            <input
              className="w-full mb-3 p-2 bg-black border text-white rounded"
              value={editando.nombre}
              onChange={(e) =>
                setEditando({ ...editando, nombre: e.target.value })
              }
            />

            <select
              className="w-full mb-3 p-2 bg-black border text-white rounded"
              value={editando.tipo}
              onChange={(e) =>
                setEditando({ ...editando, tipo: e.target.value })
              }
            >
              <option value="ambulancia">Ambulancia</option>
              <option value="consola">Consola</option>
            </select>

            <select
              className="w-full mb-3 p-2 bg-black border text-white rounded"
              value={editando.guardia}
              onChange={(e) =>
                setEditando({ ...editando, guardia: e.target.value })
              }
            >
              {GUARDIAS.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>

            <select
              className="w-full mb-3 p-2 bg-black border text-white rounded"
              value={editando.ambulancia_codigo}
              onChange={(e) =>
                setEditando({
                  ...editando,
                  ambulancia_codigo: e.target.value
                })
              }
            >
              <option value="">Seleccionar unidad</option>
              {ambulancias.map((a: any) => (
                <option key={a.id} value={a.codigo_operativo}>
                  {a.codigo_operativo}
                </option>
              ))}
            </select>

            <select
              className="w-full mb-4 p-2 bg-black border text-white rounded"
              value={editando.estado}
              onChange={(e) =>
                setEditando({ ...editando, estado: e.target.value })
              }
            >
              <option value="Activo">Activo</option>
              <option value="Permiso">Permiso</option>
              <option value="Reposo Médico">Reposo Médico</option>
              <option value="Vacaciones">Vacaciones</option>
            </select>

            <div className="flex justify-between">
              <button
                onClick={actualizar}
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