'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const ESTADOS = ['asistio', 'atraso', 'falta', 'permiso', 'vacaciones']

export default function Historial() {
  const router = useRouter()

  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [fecha, setFecha] = useState('')
  const [estado, setEstado] = useState('')
  const [tipoPermiso, setTipoPermiso] = useState('')
  const [texto, setTexto] = useState('')

  useEffect(() => {
    cargar()
  }, [])

  const cargar = async () => {
    setLoading(true)

    let query = supabase
      .from('asistencia')
      .select(`
        id,
        fecha,
        estado,
        observacion,
        turno,
        tipo_permiso,
        archivo_url,
        archivo_nombre,
        personal:personal_id (nombre, guardia, ambulancia_codigo)
      `)
      .order('fecha', { ascending: false })

    if (fecha) query = query.eq('fecha', fecha)
    if (estado) query = query.eq('estado', estado)
    if (tipoPermiso) query = query.eq('tipo_permiso', tipoPermiso)

    const { data, error } = await query

    if (error) {
      console.error('Error cargando historial:', error)
      setLoading(false)
      return
    }

    setData(data || [])
    setLoading(false)
  }

  const filteredData = useMemo(() => {
    return data.filter((registro) => {
      if (!texto) return true
      const search = texto.toLowerCase()
      const nombre = registro.personal?.nombre?.toLowerCase() || ''
      const observacion = registro.observacion?.toLowerCase() || ''
      return nombre.includes(search) || observacion.includes(search)
    })
  }, [data, texto])

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        Cargando historial...
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
        <div>
          <h1 className="text-3xl text-cyan-400 font-bold">📊 Historial de Asistencia</h1>
          <p className="text-gray-400 mt-1">Registros de asistencia, permisos y documentos.</p>
        </div>

        <button
          onClick={() => router.back()}
          className="bg-blue-600 px-4 py-2 rounded hover:bg-blue-500 transition"
        >
          ⬅ Volver
        </button>
      </div>

      <div className="grid gap-3 lg:grid-cols-4 mb-6">
        <input
          type="date"
          value={fecha}
          onChange={(e) => setFecha(e.target.value)}
          className="bg-gray-800 p-2 rounded text-white"
        />

        <select
          value={estado}
          onChange={(e) => setEstado(e.target.value)}
          className="bg-gray-800 p-2 rounded text-white"
        >
          <option value="">Todos los estados</option>
          {ESTADOS.map((e) => (
            <option key={e} value={e}>
              {e}
            </option>
          ))}
        </select>

        <select
          value={tipoPermiso}
          onChange={(e) => setTipoPermiso(e.target.value)}
          className="bg-gray-800 p-2 rounded text-white"
        >
          <option value="">Todos los tipos de permiso</option>
          <option value="permiso">permiso</option>
          <option value="Reposo Médico">Reposo Médico</option>
        </select>

        <input
          type="text"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Buscar nombre u observación"
          className="bg-gray-800 p-2 rounded text-white"
        />
      </div>

      <div className="flex gap-3 mb-6 flex-wrap">
        <button
          onClick={cargar}
          className="bg-green-600 px-4 py-2 rounded hover:bg-green-500 transition"
        >
          Filtrar
        </button>
        <button
          onClick={() => {
            setFecha('')
            setEstado('')
            setTipoPermiso('')
            setTexto('')
            cargar()
          }}
          className="bg-gray-700 px-4 py-2 rounded hover:bg-gray-600 transition"
        >
          Limpiar filtros
        </button>
      </div>

      <div className="bg-gray-900 rounded-2xl p-4 mb-6">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="p-4 bg-gray-800 rounded-xl">
            <p className="text-sm text-gray-400">Registros</p>
            <p className="text-3xl font-semibold">{filteredData.length}</p>
          </div>
          <div className="p-4 bg-gray-800 rounded-xl">
            <p className="text-sm text-gray-400">Permisos</p>
            <p className="text-3xl font-semibold">
              {filteredData.filter((r) => r.tipo_permiso).length}
            </p>
          </div>
          <div className="p-4 bg-gray-800 rounded-xl">
            <p className="text-sm text-gray-400">Con documento</p>
            <p className="text-3xl font-semibold">
              {filteredData.filter((r) => r.archivo_url).length}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-gray-900 rounded-2xl p-4">
        {filteredData.length === 0 ? (
          <p className="text-gray-400">No hay registros que coincidan con los filtros.</p>
        ) : (
          filteredData.map((r: any) => (
            <div
              key={r.id}
              className="border-b border-gray-800 last:border-b-0 py-4 flex flex-col gap-3 md:flex-row md:justify-between md:items-center"
            >
              <div className="space-y-2">
                <p className="font-semibold text-white">{r.personal?.nombre || 'Sin nombre'}</p>
                <p className="text-xs text-gray-400">
                  {new Date(r.fecha).toLocaleDateString('es-EC')} · {r.turno || 'Sin turno'}
                </p>
                <p className="text-sm text-cyan-300">{r.estado}</p>
                {r.tipo_permiso && (
                  <p className="text-sm text-yellow-300">{r.tipo_permiso}</p>
                )}
                {r.observacion && (
                  <p className="text-sm text-gray-300">{r.observacion}</p>
                )}
              </div>

              <div className="flex flex-col gap-2 items-start sm:items-end">
                {r.archivo_url ? (
                  <a
                    href={r.archivo_url}
                    target="_blank"
                    rel="noreferrer"
                    className="bg-cyan-600 px-3 py-1 rounded text-xs hover:bg-cyan-500 transition"
                  >
                    📎 Ver documento
                  </a>
                ) : (
                  <span className="text-xs text-gray-500">Sin archivo</span>
                )}
                <span className="text-xs text-gray-500">
                  {r.archivo_nombre || r.tipo_archivo ? `${r.archivo_nombre || ''}` : ''}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}