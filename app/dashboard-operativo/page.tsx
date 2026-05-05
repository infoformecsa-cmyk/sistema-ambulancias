'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const GUARDIAS = ['G1', 'G2', 'G3', 'G4', 'G5']
const medalEmojis = ['🥇', '🥈', '🥉', '4°', '5°']
const medalColors = ['#FFD700', '#C0C0C0', '#CD7F32', '#6ee7f7', '#6ee7f7']

const EP: Record<string, { c: string; bg: string; border: string; dot: string }> = {
  'Activo':        { c:'#4ade80', bg:'rgba(74,222,128,0.1)',  border:'rgba(74,222,128,0.3)',  dot:'#4ade80' },
  'Reposo Médico': { c:'#f87171', bg:'rgba(248,113,113,0.12)',border:'rgba(248,113,113,0.4)', dot:'#f87171' },
  'Permiso':       { c:'#fb923c', bg:'rgba(251,146,60,0.1)',  border:'rgba(251,146,60,0.3)',  dot:'#fb923c' },
  'Vacaciones':    { c:'#fbbf24', bg:'rgba(251,191,36,0.1)',  border:'rgba(251,191,36,0.3)',  dot:'#fbbf24' },
}

function StatCard({ label, value, color, sub }: { label: string; value: any; color: string; sub?: string }) {
  return (
    <div style={{ background:'linear-gradient(135deg,rgba(15,23,42,0.9),rgba(13,20,36,0.9))', border:`1px solid ${color}22`, borderRadius:12, padding:'14px 16px', position:'relative', overflow:'hidden' }}>
      <div style={{ position:'absolute', top:0, right:0, width:60, height:60, borderRadius:'0 12px 0 60px', background:`${color}08` }}/>
      <p style={{ margin:0, fontSize:8, color:'#475569', letterSpacing:'0.12em', fontWeight:700 }}>{label}</p>
      <p style={{ margin:'6px 0 0', fontSize:26, fontWeight:900, color, lineHeight:1 }}>{value}</p>
      {sub && <p style={{ margin:'4px 0 0', fontSize:9, color:'#334155' }}>{sub}</p>}
    </div>
  )
}

function GuardiaTag({ g }: { g: string }) {
  return (
    <span style={{ background:'rgba(34,211,238,0.12)', border:'1px solid rgba(34,211,238,0.3)', color:'#22d3ee', fontSize:10, fontWeight:800, padding:'3px 10px', borderRadius:6, letterSpacing:'0.08em' }}>{g}</span>
  )
}

function EstadoBadge({ estado, small }: { estado: string; small?: boolean }) {
  const e = EP[estado] || EP['Activo']
  return (
    <span style={{ background:e.bg, border:`1px solid ${e.border}`, color:e.c, fontSize:small?8:9, fontWeight:700, padding:small?'2px 6px':'3px 9px', borderRadius:20, letterSpacing:'0.04em', display:'inline-flex', alignItems:'center', gap:4, whiteSpace:'nowrap' }}>
      <span style={{ width:5, height:5, borderRadius:'50%', background:e.dot, display:'inline-block' }}/>
      {estado}
    </span>
  )
}

function pct(n: number, t: number) { return t > 0 ? Math.round(n / t * 100) : 0 }

export default function Dashboard() {
  const router = useRouter()

  const [personal,          setPersonal]          = useState<any[]>([])
  const [archivos,          setArchivos]          = useState<any[]>([])
  const [ambulancias,       setAmbulancias]       = useState<any[]>([])
  const [editando,          setEditando]          = useState<any>(null)
  const [nuevo,             setNuevo]             = useState(false)
  const [nuevaAmbulancia,   setNuevaAmbulancia]   = useState(false)
  const [codigoAmbulancia,  setCodigoAmbulancia]  = useState('')
  const [loading,           setLoading]           = useState(true)
  const [excelFile,         setExcelFile]         = useState<File | null>(null)
  const [modalExcel,        setModalExcel]        = useState(false)
  const [excelUrl,          setExcelUrl]          = useState<string | null>(null)
  const [expandedRanking,   setExpandedRanking]   = useState<number | null>(null)
  const [openGuardia,       setOpenGuardia]       = useState<Record<string, boolean>>({})
  const [formNuevo,         setFormNuevo]         = useState<any>({ nombre:'', tipo:'ambulancia', guardia:'G1', ambulancia_codigo:'' })

  useEffect(() => { iniciar() }, [])
  useEffect(() => { cargarExcelUrl() }, [])

  const iniciar = async () => { await fetchData(); setLoading(false) }

  const cargarExcelUrl = async () => {
    try {
      const { data: lista, error } = await supabase.storage.from('excel_turnos').list('', { limit:100, sortBy:{ column:'created_at', order:'desc' } })
      if (error || !lista?.length) return
      const excels = lista.filter((f: any) => f.name.endsWith('.xlsx') || f.name.endsWith('.xls'))
      if (!excels.length) return
      const enc = excels[0].name.split('/').map((p: string) => encodeURIComponent(p)).join('/')
      const { data } = supabase.storage.from('excel_turnos').getPublicUrl(enc)
      if (data?.publicUrl) setExcelUrl(data.publicUrl)
    } catch {}
  }

  const fetchReportes = async () => {
    const sources = [
      { table:'archivos_asistencia', order:'fecha' }, { table:'archivos_asistencia', order:'created_at' },
      { table:'archivos', order:'fecha' }, { table:'archivos', order:'created_at' },
      { table:'reportes', order:'fecha' }, { table:'reportes', order:'created_at' },
      { table:'historial_asistencia', order:'fecha' }, { table:'historial_asistencia', order:'created_at' },
      { table:'asistencia', order:'fecha' }, { table:'asistencia', order:'created_at' },
    ]
    for (const s of sources) {
      const { data, error } = await supabase.from(s.table).select('*').order(s.order, { ascending:false })
      if (!error && Array.isArray(data) && data.length > 0) return data
    }
    return []
  }

  const fetchData = async () => {
    const { data: p } = await supabase.from('personal').select('id,nombre,tipo,guardia,ambulancia_codigo,estado')
    const archivosData = await fetchReportes()
    const { data: amb } = await supabase.from('ambulancias').select('id,codigo_operativo').order('codigo_operativo')
    if (p) setPersonal(p)
    setArchivos(Array.isArray(archivosData) ? archivosData : [])
    if (amb) setAmbulancias(amb)
  }

  const editarPersonal = (persona: any) =>
    setEditando({ ...persona, tipo:persona.tipo||'ambulancia', guardia:persona.guardia||'G1', ambulancia_codigo:persona.ambulancia_codigo||'', estado:persona.estado||'Activo' })

  const eliminar = async (id: any) => {
    if (!confirm('¿Eliminar registro?')) return
    await supabase.from('personal').delete().eq('id', id); fetchData()
  }

  const actualizar = async () => {
    if (!editando) return
    const { error } = await supabase.from('personal').update({ nombre:editando.nombre, tipo:editando.tipo, guardia:editando.guardia, ambulancia_codigo:editando.tipo==='ambulancia'?editando.ambulancia_codigo:null, estado:editando.estado }).eq('id', editando.id)
    if (error) { alert('Error actualizando personal'); return }
    setEditando(null); fetchData()
  }

  const crearNuevo = async () => {
    if (!formNuevo.nombre) { alert('Nombre requerido'); return }
    if (formNuevo.tipo === 'ambulancia' && !formNuevo.ambulancia_codigo) { alert('Seleccione ambulancia'); return }
    const { error } = await supabase.from('personal').insert([{ nombre:formNuevo.nombre, tipo:formNuevo.tipo, guardia:formNuevo.guardia, ambulancia_codigo:formNuevo.tipo==='ambulancia'?formNuevo.ambulancia_codigo:null, estado:'Activo' }])
    if (error) { alert('Error: '+error.message); return }
    setNuevo(false); setFormNuevo({ nombre:'', tipo:'ambulancia', guardia:'G1', ambulancia_codigo:'' }); fetchData()
  }

  const crearAmbulancia = async () => {
    if (!codigoAmbulancia) { alert('Ingrese código'); return }
    const { error } = await supabase.from('ambulancias').insert([{ codigo_operativo:codigoAmbulancia }])
    if (error) { alert('Error: '+error.message); return }
    setCodigoAmbulancia(''); setNuevaAmbulancia(false); fetchData()
  }

  const subirExcel = async () => {
    if (!excelFile) { alert('Seleccione un archivo Excel'); return }
    if (!excelFile.name.endsWith('.xlsx') && !excelFile.name.endsWith('.xls')) { alert('Debe ser archivo Excel'); return }
    const nombreLimpio = excelFile.name.replace(/\s+/g,'_')
    const nombre = `excel_turnos_${Date.now()}_${nombreLimpio}`
    const { error } = await supabase.storage.from('excel_turnos').upload(nombre, excelFile)
    if (error) { alert('Error subiendo Excel'); return }
    const enc = nombre.split('/').map((p: string) => encodeURIComponent(p)).join('/')
    const { data } = supabase.storage.from('excel_turnos').getPublicUrl(enc)
    setExcelUrl(data.publicUrl); setModalExcel(false); setExcelFile(null)
    await cargarExcelUrl(); alert('✅ Excel subido correctamente')
  }

  const logout = () => { localStorage.clear(); sessionStorage.clear(); router.replace('/') }
  const irHistorial = () => router.push('/dashboard-operativo/historial')

  const getAmbulancia = (g: string) => personal.filter(p => p.guardia === g && p.tipo === 'ambulancia')
  const getConsola = (g: string) => personal.filter(p => p.guardia === g && p.tipo === 'consola')

  const agruparPorAmbulancia = (data: any[]) => {
    const grupos: any = {}
    data.forEach(p => { const key = p.ambulancia_codigo||'SIN UNIDAD'; if (!grupos[key]) grupos[key]=[]; grupos[key].push(p) })
    return Object.entries(grupos).sort((a: any, b: any) => (parseInt(a[0].replace(/\D/g,''))||999) - (parseInt(b[0].replace(/\D/g,''))||999))
  }

  const alertas = personal.filter(p => p.estado === 'Reposo Médico' || p.estado === 'Permiso')

  const normalizarTexto = (a: any) =>
    [a.estado,a.tipo,a.descripcion,a.observacion,a.motivo,a.categoria,a.documento,a.archivo,a.nombre,a.persona,a.empleado,a.nombres,a.apellidos].filter(Boolean).join(' ').toLowerCase()

  const esRelevante = (a: any) => {
    const t = normalizarTexto(a)
    return Boolean(a.archivo||a.documento||a.file||a.url||a.enlace||a.link||a.archivo_url||a.documento_url) ||
      ['permiso','reposo','falta','ausente','incapacidad','médico','licencia'].some(k => t.includes(k))
  }

  const obtenerUrl = (a: any) => {
    for (const v of [a.url,a.link,a.enlace,a.archivo,a.documento,a.file,a.archivo_url,a.documento_url,a.ruta,a.path]) {
      if (!v) continue
      if (typeof v === 'string' && v.trim()) return v.trim()
      if (typeof v === 'object') return v.url||v.publicURL||v.path||null
    }
    return null
  }

  const obtenerNombre = (a: any) => {
    const ids = [a.personal_id,a.empleado_id,a.id_personal,a.persona_id,a.usuario_id,a.idUsuario,a.user_id,a.personaId,a.id_empleado].filter(Boolean)
    if (ids.length) { const idStr = String(ids[0]).trim().toLowerCase(); const p = personal.find(p => String(p.id).trim().toLowerCase()===idStr); if (p?.nombre) return p.nombre }
    const nombres = [a.funcionario,a.nombre_funcionario,a.nombre_completo,a.nombre_persona,a.persona,a.empleado,a.usuario,a.colaborador,a.nombres,a.apellidos,a.nombre_empleado,a.nombre_colaborador,a.empleado_nombre,a.persona_nombre,a.nombre_completo_funcionario,a.nombre_reporte,a.nombre].filter(Boolean).map(i => String(i).trim()).filter(Boolean)
    if (!nombres.length) return 'Reporte'
    return nombres.join(' ').replace(/\b(reporte|permiso|reposo|falta)\b/gi,'').trim() || nombres[0]
  }

  const obtenerSubtitulo = (a: any) => a.estado||a.tipo||a.motivo||a.descripcion||a.observacion||a.categoria||a.tipo_permiso||a.detalle||'Permiso / reporte'
  const obtenerFecha = (a: any) => { const f = a.fecha||a.created_at; return f ? new Date(f).toLocaleDateString('es-EC') : '' }

  const reportesImportantes = Array.isArray(archivos) ? archivos.filter(esRelevante) : []
  const reportesTotales = reportesImportantes.length
  const reportesHoy = reportesImportantes.filter(a => { const f=a.fecha||a.created_at; return f && new Date(f).toDateString()===new Date().toDateString() }).length

  const categorizarReporte = (a: any): 'permiso'|'reposo'|'falta' => {
    const t = normalizarTexto(a)
    if (t.includes('reposo')||t.includes('médico')||t.includes('incapacidad')) return 'reposo'
    if (t.includes('falta')||t.includes('ausente')) return 'falta'
    return 'permiso'
  }

  const rankingPermisosMes: { nombre:string; total:number; detalle:{permisos:number;faltas:number;reposo:number}; ultimaFecha:string }[] =
    Object.entries(reportesImportantes.reduce((acc: Record<string,any>, r) => {
      const nombre = obtenerNombre(r)
      if (!nombre || nombre==='Reporte') return acc
      if (!acc[nombre]) acc[nombre] = { total:0, detalle:{permisos:0,faltas:0,reposo:0}, ultimaFecha:'' }
      acc[nombre].total++
      const cat = categorizarReporte(r)
      if (cat==='reposo') acc[nombre].detalle.reposo++
      else if (cat==='falta') acc[nombre].detalle.faltas++
      else acc[nombre].detalle.permisos++
      const f = r.fecha||r.created_at
      if (f && !acc[nombre].ultimaFecha) acc[nombre].ultimaFecha = new Date(f).toLocaleDateString('es-EC')
      return acc
    }, {}))
    .map(([nombre, data]) => ({ nombre, ...data }))
    .sort((a: any, b: any) => b.total - a.total).slice(0, 5)

  const maxRanking = rankingPermisosMes.length > 0 ? rankingPermisosMes[0].total : 1
  const mesActualLabel = new Date().toLocaleString('es-EC', { month:'short', year:'numeric' }).toUpperCase()

  const F = "font-family:'Space Mono','Courier New',monospace"
  const inp: React.CSSProperties = { background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.1)', color:'white', padding:'9px 12px', borderRadius:8, fontSize:11, outline:'none', width:'100%', boxSizing:'border-box', fontFamily:"'Space Mono','Courier New',monospace" }
  const lbl: React.CSSProperties = { margin:'0 0 5px', fontSize:9, color:'#475569', letterSpacing:'0.1em', fontWeight:700, display:'block' }

  if (loading) return (
    <div style={{ minHeight:'100vh', background:'#050b15', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:"'Space Mono',monospace" }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ fontSize:32, marginBottom:12 }}>🚑</div>
        <p style={{ color:'#22d3ee', fontSize:11, letterSpacing:'0.1em' }}>CARGANDO SISTEMA...</p>
      </div>
    </div>
  )

  return (
    <div style={{ background:'#050b15', minHeight:'100vh', color:'white', fontFamily:"'Space Mono','Courier New',monospace", position:'relative' }}>

      {/* Fondo decorativo */}
      <div style={{ position:'fixed', top:0, left:0, right:0, bottom:0, pointerEvents:'none', zIndex:0, overflow:'hidden' }}>
        <div style={{ position:'absolute', top:-120, right:-100, width:400, height:400, borderRadius:'50%', background:'radial-gradient(circle,rgba(34,211,238,0.03) 0%,transparent 70%)' }}/>
        <div style={{ position:'absolute', bottom:200, left:-100, width:300, height:300, borderRadius:'50%', background:'radial-gradient(circle,rgba(167,139,250,0.03) 0%,transparent 70%)' }}/>
      </div>

      {/* ── HEADER ── */}
      <div style={{ position:'sticky', top:0, zIndex:20, background:'rgba(5,11,21,0.95)', backdropFilter:'blur(12px)', borderBottom:'1px solid rgba(255,255,255,0.06)', padding:'12px 16px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:32, height:32, borderRadius:9, background:'linear-gradient(135deg,#0891b2,#0e7490)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16 }}>🚑</div>
            <div>
              <p style={{ margin:0, fontSize:13, fontWeight:800, color:'#f1f5f9', letterSpacing:'0.04em' }}>CONTROL OPERATIVO</p>
              <p style={{ margin:0, fontSize:7, color:'#334155', letterSpacing:'0.08em' }}>DIR. PROVINCIAL DE SALUD DEL GUAYAS</p>
            </div>
          </div>
          <button onClick={logout} style={{ background:'rgba(239,68,68,0.12)', border:'1px solid rgba(239,68,68,0.25)', color:'#f87171', padding:'6px 11px', borderRadius:7, fontSize:9, fontWeight:700, cursor:'pointer', letterSpacing:'0.04em' }}>🔐 SALIR</button>
        </div>

        {/* Botones — scroll horizontal */}
        <div style={{ overflowX:'auto', paddingBottom:2 }}>
          <div style={{ display:'flex', gap:7, width:'max-content' }}>
            {[
              { l:'🔄 Actualizar',  fn: fetchData,                    c:'rgba(29,78,216,0.15)',  bc:'rgba(29,78,216,0.35)',  tc:'#60a5fa' },
              { l:'➕ Nuevo',        fn: ()=>setNuevo(true),           c:'rgba(22,163,74,0.15)',  bc:'rgba(22,163,74,0.35)',  tc:'#4ade80' },
              { l:'🚑 Ambulancia',  fn: ()=>setNuevaAmbulancia(true),  c:'rgba(124,58,237,0.15)', bc:'rgba(124,58,237,0.35)', tc:'#a78bfa' },
              { l:'📊 Historial',   fn: irHistorial,                   c:'rgba(8,145,178,0.15)',  bc:'rgba(8,145,178,0.35)',  tc:'#22d3ee' },
              { l:'📊 Excel',       fn: ()=>setModalExcel(true),       c:'rgba(202,138,4,0.15)',  bc:'rgba(202,138,4,0.35)',  tc:'#fbbf24' },
            ].map(b => (
              <button key={b.l} onClick={b.fn} style={{ background:b.c, border:`1px solid ${b.bc}`, color:b.tc, padding:'8px 12px', borderRadius:8, fontSize:9, fontWeight:700, cursor:'pointer', whiteSpace:'nowrap', letterSpacing:'0.04em' }}>{b.l}</button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ padding:'14px 14px 30px', position:'relative', zIndex:1 }}>

        {/* Alerta banner */}
        {alertas.length > 0 && (
          <div style={{ background:'linear-gradient(135deg,rgba(239,68,68,0.12),rgba(239,68,68,0.06))', border:'1px solid rgba(239,68,68,0.25)', borderRadius:10, padding:'10px 14px', marginBottom:14, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div style={{ display:'flex', alignItems:'center', gap:7 }}>
              <span style={{ fontSize:14 }}>⚠️</span>
              <span style={{ fontSize:10, fontWeight:700, color:'#f87171', letterSpacing:'0.04em' }}>{alertas.length} ALERTAS ACTIVAS</span>
            </div>
            <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
              {alertas.slice(0,2).map(a => (
                <span key={a.id} style={{ background:'rgba(248,113,113,0.15)', border:'1px solid rgba(248,113,113,0.25)', color:'#fca5a5', fontSize:7, padding:'2px 6px', borderRadius:10, fontWeight:700, maxWidth:80, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{a.nombre.split(' ')[0]}</span>
              ))}
            </div>
          </div>
        )}

        {/* KPIs */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:14 }}>
          <StatCard label="TOTAL PERSONAL"  value={personal.length}                                   color="#38bdf8" />
          <StatCard label="ACTIVOS"          value={personal.filter(p=>p.estado==='Activo').length}    color="#4ade80" />
          <StatCard label="NO DISPONIBLES"   value={alertas.length}                                    color="#f87171" />
          <StatCard label="REPORTES"         value={reportesTotales}                                   color="#a78bfa" sub={`${reportesHoy} hoy`} />
        </div>

        {/* Divisor */}
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
          <div style={{ height:1, flex:1, background:'rgba(255,255,255,0.06)' }}/>
          <span style={{ fontSize:8, color:'#334155', letterSpacing:'0.12em', fontWeight:700 }}>GUARDIAS</span>
          <div style={{ height:1, flex:1, background:'rgba(255,255,255,0.06)' }}/>
        </div>

        {/* Guardias */}
        {GUARDIAS.map(g => {
          const ambulanciasPorGuardia = agruparPorAmbulancia(getAmbulancia(g))
          const consola = getConsola(g)
          if (ambulanciasPorGuardia.length === 0 && consola.length === 0) return null
          const pers = [...getAmbulancia(g), ...consola]
          const isOpen = openGuardia[g] !== false
          const noDisp = pers.filter(p => p.estado !== 'Activo').length

          return (
            <div key={g} style={{ marginBottom:10, borderRadius:12, overflow:'hidden', border:'1px solid rgba(255,255,255,0.07)', background:'rgba(11,17,32,0.8)' }}>

              {/* Cabecera guardia */}
              <div onClick={() => setOpenGuardia(p => ({ ...p, [g]: !isOpen }))} style={{ padding:'11px 14px', cursor:'pointer', display:'flex', justifyContent:'space-between', alignItems:'center', background:'rgba(255,255,255,0.02)' }}>
                <div style={{ display:'flex', alignItems:'center', gap:9 }}>
                  <GuardiaTag g={g}/>
                  <span style={{ fontSize:10, color:'#475569' }}>{pers.length} funcionarios</span>
                  {noDisp > 0 && <span style={{ background:'rgba(248,113,113,0.12)', border:'1px solid rgba(248,113,113,0.25)', color:'#f87171', fontSize:8, fontWeight:700, padding:'2px 8px', borderRadius:10 }}>⚠ {noDisp}</span>}
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:7 }}>
                  <div style={{ width:40, height:4, borderRadius:2, overflow:'hidden', background:'rgba(255,255,255,0.06)' }}>
                    <div style={{ width:`${pct(pers.filter(p=>p.estado==='Activo').length, pers.length)}%`, height:'100%', background:'#4ade80', borderRadius:2 }}/>
                  </div>
                  <span style={{ color:'#1e293b', fontSize:11, transform:isOpen?'rotate(0)':'rotate(-90deg)', transition:'transform 0.2s' }}>▼</span>
                </div>
              </div>

              {isOpen && (
                <div style={{ padding:'10px 12px', display:'flex', flexDirection:'column', gap:8 }}>

                  {/* Ambulancias agrupadas */}
                  {ambulanciasPorGuardia.map(([ambulancia, personas]: any) => (
                    <div key={ambulancia} style={{ borderRadius:9, overflow:'hidden', border:'1px solid rgba(34,211,238,0.1)' }}>
                      <div style={{ background:'rgba(34,211,238,0.04)', padding:'7px 12px', borderBottom:'1px solid rgba(34,211,238,0.08)', display:'flex', alignItems:'center', gap:6 }}>
                        <span style={{ fontSize:12 }}>🚑</span>
                        <span style={{ fontSize:10, fontWeight:700, color:'#67e8f9', letterSpacing:'0.04em' }}>{ambulancia}</span>
                        <span style={{ fontSize:8, color:'#164e63', marginLeft:'auto' }}>{personas.length} tripulantes</span>
                      </div>
                      {personas.map((p: any, idx: number) => {
                        const ec = EP[p.estado] || EP['Activo']
                        return (
                          <div key={p.id} style={{ padding:'9px 12px', display:'flex', justifyContent:'space-between', alignItems:'center', borderBottom:idx<personas.length-1?'1px solid rgba(255,255,255,0.03)':'none', background:p.estado!=='Activo'?ec.bg:'transparent' }}>
                            <div style={{ display:'flex', alignItems:'center', gap:8, minWidth:0, flex:1 }}>
                              <div style={{ width:7, height:7, borderRadius:'50%', background:ec.dot, flexShrink:0, boxShadow:`0 0 5px ${ec.dot}` }}/>
                              <div style={{ minWidth:0 }}>
                                <p style={{ margin:0, fontSize:11, fontWeight:600, color:'#e2e8f0', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.nombre}</p>
                                {p.estado !== 'Activo' && <EstadoBadge estado={p.estado} small/>}
                              </div>
                            </div>
                            <div style={{ display:'flex', gap:4, flexShrink:0, marginLeft:8 }}>
                              <button onClick={() => editarPersonal(p)} style={{ background:'rgba(34,211,238,0.08)', border:'1px solid rgba(34,211,238,0.2)', color:'#67e8f9', padding:'5px 8px', borderRadius:6, fontSize:11, cursor:'pointer' }}>✏️</button>
                              <button onClick={() => eliminar(p.id)} style={{ background:'rgba(248,113,113,0.08)', border:'1px solid rgba(248,113,113,0.2)', color:'#fca5a5', padding:'5px 8px', borderRadius:6, fontSize:11, cursor:'pointer' }}>🗑️</button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ))}

                  {/* Consola */}
                  {consola.length > 0 && (
                    <div style={{ borderRadius:9, border:'1px solid rgba(74,222,128,0.12)', overflow:'hidden' }}>
                      <div style={{ background:'rgba(74,222,128,0.04)', padding:'7px 12px', borderBottom:'1px solid rgba(74,222,128,0.08)', display:'flex', alignItems:'center', gap:6 }}>
                        <span style={{ fontSize:11 }}>💻</span>
                        <span style={{ fontSize:9, fontWeight:700, color:'#86efac', letterSpacing:'0.06em' }}>CONSOLA</span>
                      </div>
                      {consola.map((p: any) => (
                        <div key={p.id} style={{ padding:'9px 12px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                          <span style={{ fontSize:11, color:'#e2e8f0', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', flex:1, marginRight:8 }}>{p.nombre}</span>
                          <div style={{ display:'flex', gap:4, flexShrink:0 }}>
                            <button onClick={() => editarPersonal(p)} style={{ background:'rgba(34,211,238,0.08)', border:'1px solid rgba(34,211,238,0.2)', color:'#67e8f9', padding:'5px 8px', borderRadius:6, fontSize:11, cursor:'pointer' }}>✏️</button>
                            <button onClick={() => eliminar(p.id)} style={{ background:'rgba(248,113,113,0.08)', border:'1px solid rgba(248,113,113,0.2)', color:'#fca5a5', padding:'5px 8px', borderRadius:6, fontSize:11, cursor:'pointer' }}>🗑️</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}

        {/* Divisor */}
        <div style={{ display:'flex', alignItems:'center', gap:8, margin:'18px 0 12px' }}>
          <div style={{ height:1, flex:1, background:'rgba(255,255,255,0.06)' }}/>
          <span style={{ fontSize:8, color:'#334155', letterSpacing:'0.12em', fontWeight:700 }}>PANEL DERECHO</span>
          <div style={{ height:1, flex:1, background:'rgba(255,255,255,0.06)' }}/>
        </div>

        {/* Críticos */}
        {alertas.length > 0 && (
          <div style={{ background:'linear-gradient(135deg,rgba(127,29,29,0.3),rgba(127,29,29,0.1))', border:'1px solid rgba(248,113,113,0.2)', borderRadius:12, padding:'14px', marginBottom:12 }}>
            <p style={{ margin:'0 0 10px', fontSize:10, fontWeight:700, color:'#f87171', letterSpacing:'0.08em' }}>⚠ CRÍTICOS</p>
            {alertas.map(p => {
              const ec = EP[p.estado] || EP['Activo']
              return (
                <div key={p.id} style={{ display:'flex', alignItems:'center', gap:8, padding:'6px 0', borderBottom:'1px solid rgba(255,255,255,0.04)' }}>
                  <div style={{ width:6, height:6, borderRadius:'50%', background:ec.dot, flexShrink:0 }}/>
                  <span style={{ fontSize:10, color:'#e2e8f0', flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.nombre}</span>
                  <EstadoBadge estado={p.estado} small/>
                </div>
              )
            })}
          </div>
        )}

        {/* TOP PERMISOS */}
        <div style={{ background:'linear-gradient(160deg,rgba(30,41,59,0.9),rgba(15,23,42,0.9))', border:'1px solid rgba(34,211,238,0.15)', borderRadius:14, padding:16, marginBottom:12 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
            <div style={{ display:'flex', alignItems:'center', gap:7 }}>
              <span style={{ fontSize:15 }}>🏆</span>
              <span style={{ color:'#e2e8f0', fontWeight:700, fontSize:12, letterSpacing:'0.08em', textTransform:'uppercase' }}>Top Permisos</span>
            </div>
            <span style={{ background:'rgba(34,211,238,0.1)', color:'#22d3ee', fontSize:9, fontWeight:700, padding:'3px 7px', borderRadius:5 }}>{mesActualLabel}</span>
          </div>
          <div style={{ display:'flex', gap:5, marginBottom:10, flexWrap:'wrap' }}>
            {[{label:'🟠 Permiso',bg:'rgba(251,146,60,0.15)'},{label:'🔴 Reposo',bg:'rgba(248,113,113,0.15)'},{label:'⚫ Falta',bg:'rgba(148,163,184,0.15)'}].map(b => (
              <span key={b.label} style={{ background:b.bg, color:'#94a3b8', fontSize:9, fontWeight:700, padding:'2px 7px', borderRadius:'999px' }}>{b.label}</span>
            ))}
          </div>
          <div style={{ height:1, background:'rgba(255,255,255,0.06)', marginBottom:10 }}/>
          {rankingPermisosMes.length === 0 ? (
            <p style={{ color:'#475569', fontSize:12, textAlign:'center', padding:'12px 0' }}>Sin permisos relevantes</p>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
              {rankingPermisosMes.map((item, i) => {
                const isOpen = expandedRanking === i
                return (
                  <div key={item.nombre} onClick={() => setExpandedRanking(isOpen ? null : i)} style={{ background:isOpen?'rgba(34,211,238,0.07)':'rgba(255,255,255,0.03)', border:isOpen?'1px solid rgba(34,211,238,0.25)':'1px solid rgba(255,255,255,0.06)', borderRadius:9, padding:'9px 10px', cursor:'pointer' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <span style={{ fontSize:i<3?14:10, minWidth:18, textAlign:'center', color:medalColors[i], fontWeight:700 }}>{medalEmojis[i]}</span>
                      <div style={{ flex:1, minWidth:0 }}>
                        <p style={{ color:'#e2e8f0', fontSize:10, fontWeight:600, margin:0, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{item.nombre}</p>
                        <div style={{ width:'100%', height:3, background:'rgba(255,255,255,0.07)', borderRadius:2, overflow:'hidden', marginTop:5 }}>
                          <div style={{ width:`${(item.total/maxRanking)*100}%`, height:'100%', background:'linear-gradient(90deg,#22d3ee,#a78bfa)', borderRadius:2 }}/>
                        </div>
                      </div>
                      <div style={{ background:'rgba(34,211,238,0.12)', color:'#22d3ee', fontSize:12, fontWeight:800, minWidth:26, height:26, borderRadius:7, display:'flex', alignItems:'center', justifyContent:'center' }}>{item.total}</div>
                      <span style={{ color:'#475569', fontSize:9, transform:isOpen?'rotate(180deg)':'rotate(0deg)', transition:'transform 0.2s', userSelect:'none' as const }}>▼</span>
                    </div>
                    {isOpen && (
                      <div style={{ marginTop:9, paddingTop:9, borderTop:'1px solid rgba(255,255,255,0.07)', display:'flex', flexDirection:'column', gap:6 }}>
                        <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
                          {item.detalle.permisos > 0 && <span style={{ background:'rgba(251,146,60,0.15)', border:'1px solid rgba(251,146,60,0.3)', color:'#fb923c', fontSize:10, fontWeight:700, padding:'3px 8px', borderRadius:5 }}>🟠 {item.detalle.permisos} Permiso{item.detalle.permisos>1?'s':''}</span>}
                          {item.detalle.reposo > 0 && <span style={{ background:'rgba(248,113,113,0.15)', border:'1px solid rgba(248,113,113,0.3)', color:'#f87171', fontSize:10, fontWeight:700, padding:'3px 8px', borderRadius:5 }}>🔴 {item.detalle.reposo} Reposo{item.detalle.reposo>1?'s':''}</span>}
                          {item.detalle.faltas > 0 && <span style={{ background:'rgba(148,163,184,0.1)', border:'1px solid rgba(148,163,184,0.2)', color:'#94a3b8', fontSize:10, fontWeight:700, padding:'3px 8px', borderRadius:5 }}>⚫ {item.detalle.faltas} Falta{item.detalle.faltas>1?'s':''}</span>}
                        </div>
                        {item.ultimaFecha && (
                          <div style={{ display:'flex', gap:5, alignItems:'center' }}>
                            <span style={{ color:'#475569', fontSize:9 }}>Último:</span>
                            <span style={{ color:'#64748b', fontSize:9, fontWeight:600 }}>{item.ultimaFecha}</span>
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
            <div style={{ marginTop:10, paddingTop:9, borderTop:'1px solid rgba(255,255,255,0.06)', display:'flex', justifyContent:'space-between' }}>
              <span style={{ color:'#334155', fontSize:9 }}>Toca para ver detalle</span>
              <span style={{ color:'#334155', fontSize:9 }}>Total: {rankingPermisosMes.reduce((s,i)=>s+i.total,0)} registros</span>
            </div>
          )}
        </div>

        {/* Reportes */}
        <div style={{ background:'rgba(11,17,32,0.9)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:12, padding:14, marginBottom:12 }}>
          <p style={{ margin:'0 0 10px', fontSize:10, fontWeight:700, color:'#60a5fa', letterSpacing:'0.08em' }}>📁 REPORTES</p>
          {reportesImportantes.length === 0 ? (
            <p style={{ fontSize:11, color:'#334155' }}>No hay reportes relevantes</p>
          ) : (
            reportesImportantes.map(a => {
              const url = obtenerUrl(a)
              return (
                <div key={a.id||`${obtenerNombre(a)}-${a.fecha||a.created_at}`} style={{ padding:'10px 0', borderBottom:'1px solid rgba(255,255,255,0.04)' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:8, marginBottom:6 }}>
                    <div style={{ minWidth:0, flex:1 }}>
                      <p style={{ margin:0, fontSize:11, fontWeight:600, color:'#e2e8f0', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{obtenerNombre(a)}</p>
                      <p style={{ margin:'2px 0 0', fontSize:9, color:'#475569' }}>{obtenerSubtitulo(a)}</p>
                    </div>
                    <span style={{ fontSize:8, color:'#334155', flexShrink:0 }}>{obtenerFecha(a)}</span>
                  </div>
                  {url
                    ? <a href={url} target="_blank" rel="noreferrer" style={{ background:'rgba(34,211,238,0.1)', border:'1px solid rgba(34,211,238,0.25)', color:'#22d3ee', padding:'5px 12px', borderRadius:6, fontSize:9, fontWeight:700, textDecoration:'none', letterSpacing:'0.04em', display:'inline-block' }}>Ver reporte →</a>
                    : <span style={{ fontSize:9, color:'#1e293b' }}>Sin archivo disponible</span>
                  }
                </div>
              )
            })
          )}
        </div>

        {/* Excel */}
        <div style={{ background:'linear-gradient(135deg,rgba(120,53,15,0.2),rgba(120,53,15,0.1))', border:'1px solid rgba(251,191,36,0.2)', borderRadius:12, padding:14 }}>
          <p style={{ margin:'0 0 10px', fontSize:10, fontWeight:700, color:'#fbbf24', letterSpacing:'0.08em' }}>📊 EXCEL TURNOS</p>
          {excelUrl
            ? <a href={excelUrl} target="_blank" rel="noreferrer" style={{ background:'rgba(202,138,4,0.15)', border:'1px solid rgba(202,138,4,0.35)', color:'#fbbf24', padding:'8px 16px', borderRadius:7, fontSize:9, fontWeight:700, textDecoration:'none', letterSpacing:'0.04em', display:'inline-block' }}>Ver archivo Excel →</a>
            : <p style={{ fontSize:11, color:'#334155', margin:0 }}>No hay archivo cargado</p>
          }
        </div>
      </div>

      {/* ── MODALES ── */}
      {[
        { show: nuevo, title:'Nuevo funcionario', onClose:()=>setNuevo(false), content:(
          <>
            <label style={lbl}>NOMBRE</label>
            <input style={{...inp,marginBottom:10}} placeholder="Nombre completo" value={formNuevo.nombre} onChange={e=>setFormNuevo({...formNuevo,nombre:e.target.value})}/>
            <label style={lbl}>TIPO</label>
            <select style={{...inp,marginBottom:10}} value={formNuevo.tipo} onChange={e=>setFormNuevo({...formNuevo,tipo:e.target.value})}>
              <option value="ambulancia">Ambulancia</option>
              <option value="consola">Consola</option>
            </select>
            <label style={lbl}>GUARDIA</label>
            <select style={{...inp,marginBottom:10}} value={formNuevo.guardia} onChange={e=>setFormNuevo({...formNuevo,guardia:e.target.value})}>
              {GUARDIAS.map(g=><option key={g} value={g}>{g}</option>)}
            </select>
            {formNuevo.tipo==='ambulancia'&&<>
              <label style={lbl}>UNIDAD</label>
              <select style={{...inp,marginBottom:10}} value={formNuevo.ambulancia_codigo} onChange={e=>setFormNuevo({...formNuevo,ambulancia_codigo:e.target.value})}>
                <option value="">Seleccionar unidad</option>
                {ambulancias.map((a:any)=><option key={a.id} value={a.codigo_operativo}>{a.codigo_operativo}</option>)}
              </select>
            </>}
            <div style={{display:'flex',gap:8,marginTop:6}}>
              <button onClick={crearNuevo} style={{flex:1,background:'rgba(22,163,74,0.15)',border:'1px solid rgba(22,163,74,0.35)',color:'#4ade80',padding:'10px',borderRadius:8,fontSize:10,fontWeight:700,cursor:'pointer'}}>Guardar</button>
              <button onClick={()=>setNuevo(false)} style={{flex:1,background:'rgba(248,113,113,0.1)',border:'1px solid rgba(248,113,113,0.3)',color:'#f87171',padding:'10px',borderRadius:8,fontSize:10,fontWeight:700,cursor:'pointer'}}>Cancelar</button>
            </div>
          </>
        )},
        { show: nuevaAmbulancia, title:'Nueva ambulancia', onClose:()=>setNuevaAmbulancia(false), content:(
          <>
            <label style={lbl}>CÓDIGO OPERATIVO</label>
            <input style={{...inp,marginBottom:14}} placeholder="Ej: GA-15" value={codigoAmbulancia} onChange={e=>setCodigoAmbulancia(e.target.value)}/>
            <div style={{display:'flex',gap:8}}>
              <button onClick={crearAmbulancia} style={{flex:1,background:'rgba(124,58,237,0.15)',border:'1px solid rgba(124,58,237,0.35)',color:'#a78bfa',padding:'10px',borderRadius:8,fontSize:10,fontWeight:700,cursor:'pointer'}}>Guardar</button>
              <button onClick={()=>setNuevaAmbulancia(false)} style={{flex:1,background:'rgba(248,113,113,0.1)',border:'1px solid rgba(248,113,113,0.3)',color:'#f87171',padding:'10px',borderRadius:8,fontSize:10,fontWeight:700,cursor:'pointer'}}>Cancelar</button>
            </div>
          </>
        )},
        { show: modalExcel, title:'Subir Excel de Turnos', onClose:()=>setModalExcel(false), content:(
          <>
            <label style={lbl}>ARCHIVO EXCEL</label>
            <input type="file" accept=".xlsx,.xls" onChange={e=>setExcelFile(e.target.files?.[0]||null)} style={{...inp,marginBottom:14,fontSize:10}}/>
            <div style={{display:'flex',gap:8}}>
              <button onClick={subirExcel} style={{flex:1,background:'rgba(202,138,4,0.15)',border:'1px solid rgba(202,138,4,0.35)',color:'#fbbf24',padding:'10px',borderRadius:8,fontSize:10,fontWeight:700,cursor:'pointer'}}>Subir</button>
              <button onClick={()=>setModalExcel(false)} style={{flex:1,background:'rgba(248,113,113,0.1)',border:'1px solid rgba(248,113,113,0.3)',color:'#f87171',padding:'10px',borderRadius:8,fontSize:10,fontWeight:700,cursor:'pointer'}}>Cancelar</button>
            </div>
          </>
        )},
      ].map(m => m.show && (
        <div key={m.title} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.85)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:50, padding:16, backdropFilter:'blur(4px)' }}>
          <div style={{ background:'linear-gradient(135deg,#0f172a,#0b1120)', border:'1px solid rgba(34,211,238,0.15)', borderRadius:16, padding:20, width:'100%', maxWidth:360 }}>
            <p style={{ margin:'0 0 16px', fontSize:12, fontWeight:800, color:'#e2e8f0', letterSpacing:'0.06em' }}>{m.title.toUpperCase()}</p>
            {m.content}
          </div>
        </div>
      ))}

      {/* Modal editar */}
      {editando && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.85)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:50, padding:16, backdropFilter:'blur(4px)' }}>
          <div style={{ background:'linear-gradient(135deg,#0f172a,#0b1120)', border:'1px solid rgba(34,211,238,0.15)', borderRadius:16, padding:20, width:'100%', maxWidth:360 }}>
            <p style={{ margin:'0 0 16px', fontSize:12, fontWeight:800, color:'#e2e8f0', letterSpacing:'0.06em' }}>EDITAR FUNCIONARIO</p>
            <label style={lbl}>NOMBRE</label>
            <input style={{...inp,marginBottom:10}} value={editando.nombre} onChange={e=>setEditando({...editando,nombre:e.target.value})}/>
            <label style={lbl}>TIPO</label>
            <select style={{...inp,marginBottom:10}} value={editando.tipo} onChange={e=>setEditando({...editando,tipo:e.target.value})}>
              <option value="ambulancia">Ambulancia</option>
              <option value="consola">Consola</option>
            </select>
            <label style={lbl}>GUARDIA</label>
            <select style={{...inp,marginBottom:10}} value={editando.guardia} onChange={e=>setEditando({...editando,guardia:e.target.value})}>
              {GUARDIAS.map(g=><option key={g} value={g}>{g}</option>)}
            </select>
            <label style={lbl}>UNIDAD</label>
            <select style={{...inp,marginBottom:10}} value={editando.ambulancia_codigo} onChange={e=>setEditando({...editando,ambulancia_codigo:e.target.value})}>
              <option value="">Seleccionar unidad</option>
              {ambulancias.map((a:any)=><option key={a.id} value={a.codigo_operativo}>{a.codigo_operativo}</option>)}
            </select>
            <label style={lbl}>ESTADO</label>
            <select style={{...inp,marginBottom:14}} value={editando.estado} onChange={e=>setEditando({...editando,estado:e.target.value})}>
              <option value="Activo">Activo</option>
              <option value="Permiso">Permiso</option>
              <option value="Reposo Médico">Reposo Médico</option>
              <option value="Vacaciones">Vacaciones</option>
            </select>
            <div style={{display:'flex',gap:8}}>
              <button onClick={actualizar} style={{flex:1,background:'rgba(22,163,74,0.15)',border:'1px solid rgba(22,163,74,0.35)',color:'#4ade80',padding:'10px',borderRadius:8,fontSize:10,fontWeight:700,cursor:'pointer'}}>Guardar</button>
              <button onClick={()=>setEditando(null)} style={{flex:1,background:'rgba(248,113,113,0.1)',border:'1px solid rgba(248,113,113,0.3)',color:'#f87171',padding:'10px',borderRadius:8,fontSize:10,fontWeight:700,cursor:'pointer'}}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
