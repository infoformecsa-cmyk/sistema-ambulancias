'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const GUARDIAS = ['G1', 'G2', 'G3', 'G4', 'G5']

const medalEmojis = ['🥇', '🥈', '🥉', '4°', '5°']
const medalColors = ['#FFD700', '#C0C0C0', '#CD7F32', '#6ee7f7', '#6ee7f7']

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
  const [excelFile, setExcelFile] = useState<File | null>(null)
  const [modalExcel, setModalExcel] = useState(false)
  const [excelUrl, setExcelUrl] = useState<string | null>(null)
  const [expandedRanking, setExpandedRanking] = useState<number | null>(null)
  const [formNuevo, setFormNuevo] = useState<any>({
    nombre: '',
    tipo: 'ambulancia',
    guardia: 'G1',
    ambulancia_codigo: ''
  })

  useEffect(() => {
    iniciar()
  }, [])

  useEffect(() => {
    cargarExcelUrl()
  }, [])

  const iniciar = async () => {
    await fetchData()
    setLoading(false)
  }

  const cargarExcelUrl = async () => {
    try {
      const { data: lista, error } = await supabase.storage
        .from('excel_turnos')
        .list('', { limit: 100, sortBy: { column: 'created_at', order: 'desc' } })

      if (error || !lista || lista.length === 0) {
        console.warn('⚠️ No hay archivos en el bucket excel_turnos')
        return
      }

      const archivosExcel = lista.filter(
        (f: any) => f.name.endsWith('.xlsx') || f.name.endsWith('.xls')
      )

      if (archivosExcel.length === 0) {
        console.warn('⚠️ No hay archivos Excel en el bucket')
        return
      }

      const nombreArchivo = archivosExcel[0].name
      const nombreEncodeado = nombreArchivo
        .split('/')
        .map((parte: string) => encodeURIComponent(parte))
        .join('/')

      const { data: urlData } = supabase.storage
        .from('excel_turnos')
        .getPublicUrl(nombreEncodeado)

      if (urlData?.publicUrl) {
        setExcelUrl(urlData.publicUrl)
      }
    } catch (err) {
      console.error('❌ Error en cargarExcelUrl:', err)
    }
  }

  const fetchReportes = async () => {
    const sources = [
      { table: 'archivos_asistencia', order: 'fecha' },
      { table: 'archivos_asistencia', order: 'created_at' },
      { table: 'archivos', order: 'fecha' },
      { table: 'archivos', order: 'created_at' },
      { table: 'reportes', order: 'fecha' },
      { table: 'reportes', order: 'created_at' },
      { table: 'historial_asistencia', order: 'fecha' },
      { table: 'historial_asistencia', order: 'created_at' },
      { table: 'asistencia', order: 'fecha' },
      { table: 'asistencia', order: 'created_at' }
    ]

    for (const source of sources) {
      const { data, error } = await supabase
        .from(source.table)
        .select('*')
        .order(source.order, { ascending: false })

      if (error) {
        console.warn(`fetch reportes error ${source.table}.${source.order}`, error)
        continue
      }

      if (Array.isArray(data) && data.length > 0) {
        return data
      }
    }

    return []
  }

  const fetchData = async () => {
    const { data: p, error: personalError } = await supabase
      .from('personal')
      .select('id,nombre,tipo,guardia,ambulancia_codigo,estado')

    const archivosData = await fetchReportes()

    const { data: amb, error: ambulanciasError } = await supabase
      .from('ambulancias')
      .select('id,codigo_operativo')
      .order('codigo_operativo')

    if (personalError) console.error('personal fetch error', personalError)
    if (ambulanciasError) console.error('ambulancias fetch error', ambulanciasError)

    if (p) setPersonal(p)
    setArchivos(Array.isArray(archivosData) ? archivosData : [])
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
    setFormNuevo({ nombre: '', tipo: 'ambulancia', guardia: 'G1', ambulancia_codigo: '' })
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

  const subirExcel = async () => {
    if (!excelFile) {
      alert('Seleccione un archivo Excel')
      return
    }

    if (!excelFile.name.endsWith('.xlsx') && !excelFile.name.endsWith('.xls')) {
      alert('Debe ser archivo Excel')
      return
    }

    const nombreLimpio = excelFile.name.replace(/\s+/g, '_')
    const nombre = `excel_turnos_${Date.now()}_${nombreLimpio}`

    const { error } = await supabase.storage
      .from('excel_turnos')
      .upload(nombre, excelFile)

    if (error) {
      console.error(error)
      alert('Error subiendo Excel')
      return
    }

    const nombreEncodeado = nombre
      .split('/')
      .map((parte: string) => encodeURIComponent(parte))
      .join('/')

    const { data } = supabase.storage
      .from('excel_turnos')
      .getPublicUrl(nombreEncodeado)

    setExcelUrl(data.publicUrl)
    setModalExcel(false)
    setExcelFile(null)
    await cargarExcelUrl()
    alert('✅ Excel subido correctamente')
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

  const normalizarTextoReporte = (a: any) => {
    return [
      a.estado, a.tipo, a.descripcion, a.observacion, a.motivo,
      a.categoria, a.documento, a.archivo, a.nombre, a.persona,
      a.empleado, a.nombres, a.apellidos
    ].filter(Boolean).join(' ').toLowerCase()
  }

  const esReporteRelevante = (a: any) => {
    const texto = normalizarTextoReporte(a)
    const tieneArchivo = Boolean(
      a.archivo || a.documento || a.file || a.url ||
      a.enlace || a.link || a.archivo_url || a.documento_url
    )
    return (
      tieneArchivo ||
      texto.includes('permiso') ||
      texto.includes('reposo') ||
      texto.includes('falta') ||
      texto.includes('ausente') ||
      texto.includes('incapacidad') ||
      texto.includes('médico') ||
      texto.includes('licencia')
    )
  }

  const obtenerUrlReporte = (a: any) => {
    const posibles = [
      a.url, a.link, a.enlace, a.archivo, a.documento,
      a.file, a.archivo_url, a.documento_url, a.ruta, a.path
    ]
    for (const valor of posibles) {
      if (!valor) continue
      if (typeof valor === 'string' && valor.trim()) return valor.trim()
      if (typeof valor === 'object') {
        if (valor.url) return valor.url
        if (valor.publicURL) return valor.publicURL
        if (valor.path) return valor.path
      }
    }
    return null
  }

  const obtenerNombreDesdePersonal = (a: any) => {
    const ids = [
      a.personal_id, a.empleado_id, a.id_personal, a.persona_id,
      a.usuario_id, a.idUsuario, a.user_id, a.personaId, a.id_empleado
    ].filter(Boolean)
    if (ids.length === 0) return null
    const idStr = String(ids[0]).trim().toLowerCase()
    const persona = personal.find(
      (p) =>
        String(p.id).trim().toLowerCase() === idStr ||
        String(p.nombre).trim().toLowerCase() === idStr
    )
    return persona?.nombre ?? null
  }

  const obtenerNombrePersonaReporte = (a: any) => {
    const desdePersonal = obtenerNombreDesdePersonal(a)
    if (desdePersonal) return desdePersonal

    const nombres = [
      a.funcionario, a.nombre_funcionario, a.nombre_completo, a.nombre_persona,
      a.persona, a.empleado, a.usuario, a.colaborador, a.nombres, a.apellidos,
      a.nombre_empleado, a.nombre_colaborador, a.empleado_nombre, a.persona_nombre,
      a.nombre_completo_funcionario, a.nombre_reporte, a.nombre
    ].filter(Boolean).map((item) => String(item).trim()).filter(Boolean)

    if (nombres.length === 0) return 'Reporte'
    const nombre = nombres.join(' ')
    const limpio = nombre.replace(/\b(reporte|permiso|reposo|falta)\b/gi, '').trim()
    return limpio || nombres[0]
  }

  const obtenerSubtituloReporte = (a: any) =>
    a.estado || a.tipo || a.motivo || a.descripcion ||
    a.observacion || a.categoria || a.tipo_permiso || a.detalle || 'Permiso / reporte'

  const reportesImportantes = Array.isArray(archivos) ? archivos.filter(esReporteRelevante) : []

  const reportesTotales = reportesImportantes.length
  const reportesHoy = reportesImportantes.filter((a) => {
    const fecha = a.fecha || a.created_at
    return fecha && new Date(fecha).toDateString() === new Date().toDateString()
  }).length

  const esMesActual = (a: any) => {
    const fecha = a.fecha || a.created_at
    if (!fecha) return true
    const d = new Date(fecha)
    const ahora = new Date()
    const diffMeses =
      (ahora.getFullYear() - d.getFullYear()) * 12 + (ahora.getMonth() - d.getMonth())
    return diffMeses <= 1
  }

  const categorizarReporte = (a: any): 'permiso' | 'reposo' | 'falta' => {
    const texto = normalizarTextoReporte(a)
    if (texto.includes('reposo') || texto.includes('médico') || texto.includes('incapacidad')) return 'reposo'
    if (texto.includes('falta') || texto.includes('ausente')) return 'falta'
    return 'permiso'
  }

  const rankingPermisosMes: {
    nombre: string
    total: number
    detalle: { permisos: number; faltas: number; reposo: number }
    ultimaFecha: string
  }[] = Object.entries(
    reportesImportantes.reduce((acc: Record<string, any>, reporte) => {
      const nombre = obtenerNombrePersonaReporte(reporte)
      if (!nombre || nombre === 'Reporte') return acc
      if (!acc[nombre]) {
        acc[nombre] = { total: 0, detalle: { permisos: 0, faltas: 0, reposo: 0 }, ultimaFecha: '' }
      }
      acc[nombre].total += 1
      const cat = categorizarReporte(reporte)
      if (cat === 'reposo') acc[nombre].detalle.reposo += 1
      else if (cat === 'falta') acc[nombre].detalle.faltas += 1
      else acc[nombre].detalle.permisos += 1
      const fecha = reporte.fecha || reporte.created_at
      if (fecha && !acc[nombre].ultimaFecha) {
        acc[nombre].ultimaFecha = new Date(fecha).toLocaleDateString('es-EC')
      }
      return acc
    }, {})
  )
    .map(([nombre, data]) => ({ nombre, ...data }))
    .sort((a: any, b: any) => b.total - a.total)
    .slice(0, 5)

  const maxRanking = rankingPermisosMes.length > 0 ? rankingPermisosMes[0].total : 1

  const mesActualLabel = new Date()
    .toLocaleString('es-EC', { month: 'short', year: 'numeric' })
    .toUpperCase()

  const obtenerFecha = (a: any) => {
    const fecha = a.fecha || a.created_at
    return fecha ? new Date(fecha).toLocaleDateString('es-EC') : ''
  }

  const colorEstado = (estado: string) => {
    switch (estado) {
      case 'Activo': return 'bg-green-400'
      case 'Vacaciones': return 'bg-yellow-400'
      case 'Permiso': return 'bg-orange-400'
      case 'Reposo Médico': return 'bg-red-500 animate-pulse'
      default: return 'bg-gray-400'
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
          <button onClick={fetchData} className="bg-blue-600 px-4 py-2 rounded-lg">🔄 Actualizar</button>
          <button onClick={() => setNuevo(true)} className="bg-green-600 px-4 py-2 rounded-lg">➕ Nuevo</button>
          <button onClick={() => setNuevaAmbulancia(true)} className="bg-purple-600 px-4 py-2 rounded-lg">🚑 Ambulancia</button>
          <button onClick={irHistorial} className="bg-cyan-600 px-4 py-2 rounded-lg">📊 Historial</button>
          <button onClick={logout} className="bg-red-600 px-4 py-2 rounded-lg">🔐 Salir</button>
          <button onClick={() => setModalExcel(true)} className="bg-yellow-600 px-4 py-2 rounded-lg">📊 Excel</button>
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
          <h2 className="text-3xl">{personal.filter((p) => p.estado === 'Activo').length}</h2>
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
                      <div key={p.id} className="flex justify-between items-center bg-black p-2 mb-2 rounded">
                        <div>
                          <p className="text-sm font-semibold">{p.nombre}</p>
                          <p className="text-xs text-gray-400">{p.estado}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${colorEstado(p.estado)}`} />
                          <button onClick={() => editarPersonal(p)} className="text-xs bg-cyan-600 px-2 py-1 rounded">✏️</button>
                          <button onClick={() => eliminar(p.id)} className="text-xs bg-red-600 px-2 py-1 rounded">🗑️</button>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
                {consola.length > 0 && (
                  <div className="mt-3 border border-green-500/40 p-3 rounded bg-black/40">
                    <h3 className="text-green-400 mb-2">💻 CONSOLA</h3>
                    {consola.map((p: any) => (
                      <div key={p.id} className="flex justify-between items-center bg-black p-2 mb-2 rounded">
                        <p className="text-sm">{p.nombre}</p>
                        <div className="flex gap-2">
                          <button onClick={() => editarPersonal(p)} className="text-xs bg-cyan-600 px-2 py-1 rounded">✏️</button>
                          <button onClick={() => eliminar(p.id)} className="text-xs bg-red-600 px-2 py-1 rounded">🗑️</button>
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
          {/* Críticos */}
          <div className="bg-red-900/50 p-4 rounded-xl">
            <h2 className="text-red-400 mb-2">⚠ Críticos</h2>
            {alertas.map((p) => (
              <div key={p.id} className="text-sm border-b py-1">
                {p.nombre} — {p.estado}
              </div>
            ))}
          </div>

          {/* TOP PERMISOS */}
          <div style={{
            background: 'linear-gradient(160deg, #1e293b 0%, #0f172a 100%)',
            border: '1px solid rgba(34,211,238,0.15)',
            borderRadius: '14px',
            padding: '16px',
            boxShadow: '0 0 30px rgba(34,211,238,0.05)',
            fontFamily: "'DM Mono', 'Courier New', monospace",
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                <span style={{ fontSize: '15px' }}>🏆</span>
                <span style={{ color: '#e2e8f0', fontWeight: 700, fontSize: '12px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  Top Permisos
                </span>
              </div>
              <span style={{
                background: 'rgba(34,211,238,0.1)',
                color: '#22d3ee',
                fontSize: '9px',
                fontWeight: 700,
                padding: '3px 7px',
                borderRadius: '5px',
                letterSpacing: '0.05em',
              }}>
                {mesActualLabel}
              </span>
            </div>

            <div style={{ display: 'flex', gap: '5px', marginBottom: '10px', flexWrap: 'wrap' }}>
              {[
                { label: '🟠 Permiso', bg: 'rgba(251,146,60,0.15)' },
                { label: '🔴 Reposo', bg: 'rgba(248,113,113,0.15)' },
                { label: '⚫ Falta', bg: 'rgba(148,163,184,0.15)' },
              ].map((b) => (
                <span key={b.label} style={{
                  background: b.bg,
                  color: '#94a3b8',
                  fontSize: '9px',
                  fontWeight: 700,
                  padding: '2px 7px',
                  borderRadius: '999px',
                }}>
                  {b.label}
                </span>
              ))}
            </div>

            <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', marginBottom: '10px' }} />

            {rankingPermisosMes.length === 0 ? (
              <p style={{ color: '#475569', fontSize: '12px', textAlign: 'center', padding: '12px 0' }}>
                Sin permisos relevantes
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                {rankingPermisosMes.map((item, i) => {
                  const isOpen = expandedRanking === i
                  return (
                    <div
                      key={item.nombre}
                      onClick={() => setExpandedRanking(isOpen ? null : i)}
                      style={{
                        background: isOpen ? 'rgba(34,211,238,0.07)' : 'rgba(255,255,255,0.03)',
                        border: isOpen ? '1px solid rgba(34,211,238,0.25)' : '1px solid rgba(255,255,255,0.06)',
                        borderRadius: '9px',
                        padding: '9px 10px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{
                          fontSize: i < 3 ? '14px' : '10px',
                          minWidth: '18px',
                          textAlign: 'center',
                          color: medalColors[i],
                          fontWeight: 700,
                        }}>
                          {medalEmojis[i]}
                        </span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{
                            color: '#e2e8f0',
                            fontSize: '10px',
                            fontWeight: 600,
                            margin: 0,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            letterSpacing: '0.02em',
                          }}>
                            {item.nombre}
                          </p>
                          <div style={{
                            width: '100%', height: '3px',
                            background: 'rgba(255,255,255,0.07)',
                            borderRadius: '2px', overflow: 'hidden', marginTop: '5px',
                          }}>
                            <div style={{
                              width: `${(item.total / maxRanking) * 100}%`,
                              height: '100%',
                              background: 'linear-gradient(90deg, #22d3ee, #a78bfa)',
                              borderRadius: '2px',
                            }} />
                          </div>
                        </div>
                        <div style={{
                          background: 'rgba(34,211,238,0.12)',
                          color: '#22d3ee',
                          fontSize: '12px',
                          fontWeight: 800,
                          minWidth: '26px',
                          height: '26px',
                          borderRadius: '7px',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          {item.total}
                        </div>
                        <span style={{
                          color: '#475569', fontSize: '9px',
                          transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                          transition: 'transform 0.2s',
                          userSelect: 'none' as const,
                        }}>▼</span>
                      </div>

                      {isOpen && (
                        <div style={{
                          marginTop: '9px', paddingTop: '9px',
                          borderTop: '1px solid rgba(255,255,255,0.07)',
                          display: 'flex', flexDirection: 'column', gap: '6px',
                        }}>
                          <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                            {item.detalle.permisos > 0 && (
                              <span style={{
                                background: 'rgba(251,146,60,0.15)',
                                border: '1px solid rgba(251,146,60,0.3)',
                                color: '#fb923c', fontSize: '10px', fontWeight: 700,
                                padding: '3px 8px', borderRadius: '5px',
                              }}>
                                🟠 {item.detalle.permisos} Permiso{item.detalle.permisos > 1 ? 's' : ''}
                              </span>
                            )}
                            {item.detalle.reposo > 0 && (
                              <span style={{
                                background: 'rgba(248,113,113,0.15)',
                                border: '1px solid rgba(248,113,113,0.3)',
                                color: '#f87171', fontSize: '10px', fontWeight: 700,
                                padding: '3px 8px', borderRadius: '5px',
                              }}>
                                🔴 {item.detalle.reposo} Reposo{item.detalle.reposo > 1 ? 's' : ''}
                              </span>
                            )}
                            {item.detalle.faltas > 0 && (
                              <span style={{
                                background: 'rgba(148,163,184,0.1)',
                                border: '1px solid rgba(148,163,184,0.2)',
                                color: '#94a3b8', fontSize: '10px', fontWeight: 700,
                                padding: '3px 8px', borderRadius: '5px',
                              }}>
                                ⚫ {item.detalle.faltas} Falta{item.detalle.faltas > 1 ? 's' : ''}
                              </span>
                            )}
                          </div>
                          {item.ultimaFecha && (
                            <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                              <span style={{ color: '#475569', fontSize: '9px' }}>Último:</span>
                              <span style={{ color: '#64748b', fontSize: '9px', fontWeight: 600 }}>{item.ultimaFecha}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {rankingPermisosMes.length > 0 && (
              <div style={{
                marginTop: '10px', paddingTop: '9px',
                borderTop: '1px solid rgba(255,255,255,0.06)',
                display: 'flex', justifyContent: 'space-between',
              }}>
                <span style={{ color: '#334155', fontSize: '9px' }}>Toca para ver detalle</span>
                <span style={{ color: '#334155', fontSize: '9px' }}>
                  Total: {rankingPermisosMes.reduce((s, i) => s + i.total, 0)} registros
                </span>
              </div>
            )}
          </div>

          {/* Reportes */}
          <div className="bg-gray-900 p-4 rounded-xl">
            <h2 className="text-blue-400 mb-2">📁 Reportes</h2>
            {reportesImportantes.length === 0 ? (
              <div className="text-sm text-gray-400">No hay reportes relevantes</div>
            ) : (
              reportesImportantes.map((a) => {
                const url = obtenerUrlReporte(a)
                return (
                  <div
                    key={a.id || `${obtenerNombrePersonaReporte(a)}-${a.fecha || a.created_at}`}
                    className="flex flex-col gap-2 border-b py-3"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold">{obtenerNombrePersonaReporte(a)}</p>
                        <p className="text-xs text-gray-400">{obtenerSubtituloReporte(a)}</p>
                      </div>
                      <span className="text-gray-400">{obtenerFecha(a)}</span>
                    </div>
                    {url ? (
                      <a href={url} target="_blank" rel="noreferrer"
                        className="inline-block text-xs bg-cyan-600 px-3 py-1 rounded hover:bg-cyan-500">
                        Ver reporte
                      </a>
                    ) : (
                      <span className="text-xs text-gray-500">Sin archivo disponible</span>
                    )}
                  </div>
                )
              })
            )}
          </div>

          {/* Excel */}
          <div className="bg-yellow-900/20 p-4 rounded-xl border border-yellow-500/20">
            <h2 className="text-yellow-300 mb-2">📊 Excel Turnos</h2>
            {excelUrl ? (
              <a href={excelUrl} target="_blank" rel="noreferrer"
                className="text-sm bg-yellow-600 px-3 py-1 rounded inline-block">
                Ver archivo Excel
              </a>
            ) : (
              <p className="text-gray-400 text-sm">No hay archivo cargado</p>
            )}
          </div>
        </div>
      </div>

      {/* Modal: Nuevo funcionario */}
      {nuevo && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-gray-900 p-6 rounded-xl w-80">
            <h2 className="mb-4 text-white">Nuevo funcionario</h2>
            <input className="w-full mb-2 p-2 bg-black border text-white rounded" placeholder="Nombre"
              value={formNuevo.nombre} onChange={(e) => setFormNuevo({ ...formNuevo, nombre: e.target.value })} />
            <select className="w-full mb-2 p-2 bg-black border text-white rounded"
              value={formNuevo.tipo} onChange={(e) => setFormNuevo({ ...formNuevo, tipo: e.target.value })}>
              <option value="ambulancia">Ambulancia</option>
              <option value="consola">Consola</option>
            </select>
            <select className="w-full mb-2 p-2 bg-black border text-white rounded"
              value={formNuevo.guardia} onChange={(e) => setFormNuevo({ ...formNuevo, guardia: e.target.value })}>
              {GUARDIAS.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
            {formNuevo.tipo === 'ambulancia' && (
              <select className="w-full mb-2 p-2 bg-black border text-white rounded"
                value={formNuevo.ambulancia_codigo}
                onChange={(e) => setFormNuevo({ ...formNuevo, ambulancia_codigo: e.target.value })}>
                <option value="">Seleccionar unidad</option>
                {ambulancias.map((a: any) => (
                  <option key={a.id} value={a.codigo_operativo}>{a.codigo_operativo}</option>
                ))}
              </select>
            )}
            <div className="flex justify-between mt-4">
              <button onClick={crearNuevo} className="bg-green-600 px-4 py-2 rounded">Guardar</button>
              <button onClick={() => setNuevo(false)} className="bg-red-600 px-4 py-2 rounded">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Nueva ambulancia */}
      {nuevaAmbulancia && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-gray-900 p-6 rounded-xl w-80">
            <h2 className="mb-4 text-white">Nueva ambulancia</h2>
            <input className="w-full mb-4 p-2 bg-black border text-white rounded" placeholder="Código operativo"
              value={codigoAmbulancia} onChange={(e) => setCodigoAmbulancia(e.target.value)} />
            <div className="flex justify-between">
              <button onClick={crearAmbulancia} className="bg-purple-600 px-4 py-2 rounded">Guardar</button>
              <button onClick={() => setNuevaAmbulancia(false)} className="bg-red-600 px-4 py-2 rounded">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Editar funcionario */}
      {editando && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-gray-900 p-6 rounded-xl w-80">
            <h2 className="mb-4">Editar funcionario</h2>
            <input className="w-full mb-3 p-2 bg-black border text-white rounded"
              value={editando.nombre} onChange={(e) => setEditando({ ...editando, nombre: e.target.value })} />
            <select className="w-full mb-3 p-2 bg-black border text-white rounded"
              value={editando.tipo} onChange={(e) => setEditando({ ...editando, tipo: e.target.value })}>
              <option value="ambulancia">Ambulancia</option>
              <option value="consola">Consola</option>
            </select>
            <select className="w-full mb-3 p-2 bg-black border text-white rounded"
              value={editando.guardia} onChange={(e) => setEditando({ ...editando, guardia: e.target.value })}>
              {GUARDIAS.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
            <select className="w-full mb-3 p-2 bg-black border text-white rounded"
              value={editando.ambulancia_codigo}
              onChange={(e) => setEditando({ ...editando, ambulancia_codigo: e.target.value })}>
              <option value="">Seleccionar unidad</option>
              {ambulancias.map((a: any) => (
                <option key={a.id} value={a.codigo_operativo}>{a.codigo_operativo}</option>
              ))}
            </select>
            <select className="w-full mb-4 p-2 bg-black border text-white rounded"
              value={editando.estado} onChange={(e) => setEditando({ ...editando, estado: e.target.value })}>
              <option value="Activo">Activo</option>
              <option value="Permiso">Permiso</option>
              <option value="Reposo Médico">Reposo Médico</option>
              <option value="Vacaciones">Vacaciones</option>
            </select>
            <div className="flex justify-between">
              <button onClick={actualizar} className="bg-green-600 px-4 py-2 rounded">Guardar</button>
              <button onClick={() => setEditando(null)} className="bg-red-600 px-4 py-2 rounded">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Subir Excel */}
      {modalExcel && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-gray-900 p-6 rounded-xl w-80">
            <h2 className="mb-4 text-white">Subir Excel de Turnos</h2>
            <input type="file" accept=".xlsx,.xls"
              onChange={(e) => setExcelFile(e.target.files?.[0] || null)}
              className="w-full mb-4 p-2 bg-black border text-white" />
            <div className="flex justify-between">
              <button onClick={subirExcel} className="bg-yellow-600 px-4 py-2 rounded">Subir</button>
              <button onClick={() => setModalExcel(false)} className="bg-red-600 px-4 py-2 rounded">Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
