'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

/* ── TIPOS ── */
type Registro = {
  id: string
  fecha: string
  estado: string
  observacion: string | null
  turno: string | null
  tipo_permiso: string | null
  archivo_url: string | null
  archivo_nombre: string | null
  personal: {
    nombre: string
    guardia: string
    ambulancia_codigo: string
  } | null
}

/* ── CONSTANTES ── */
const GUARDIAS = ['G1','G2','G3','G4','G5']

const EC: Record<string, { text:string; bg:string; border:string; dot:string; label:string; icon:string }> = {
  asistio:    { text:"#4ade80", bg:"rgba(74,222,128,0.1)",  border:"rgba(74,222,128,0.3)",  dot:"#4ade80", label:"Asistió",    icon:"✅" },
  atraso:     { text:"#38bdf8", bg:"rgba(56,189,248,0.1)",  border:"rgba(56,189,248,0.3)",  dot:"#38bdf8", label:"Atraso",     icon:"🕐" },
  falta:      { text:"#f87171", bg:"rgba(248,113,113,0.1)", border:"rgba(248,113,113,0.3)", dot:"#f87171", label:"Falta",      icon:"❌" },
  permiso:    { text:"#fb923c", bg:"rgba(251,146,60,0.1)",  border:"rgba(251,146,60,0.3)",  dot:"#fb923c", label:"Permiso",    icon:"🟠" },
  vacaciones: { text:"#fbbf24", bg:"rgba(251,191,36,0.1)",  border:"rgba(251,191,36,0.3)",  dot:"#fbbf24", label:"Vacaciones", icon:"🏖" },
}

/* ── FIX FECHA: evita desfase de timezone ── */
function formatFecha(fechaStr: string): string {
  // Al agregar T12:00:00 evitamos que UTC lo lleve al día anterior
  return new Date(fechaStr + 'T12:00:00').toLocaleDateString('es-EC', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

/* ── COMPONENTES ── */
function Badge({ estado }: { estado: string }) {
  const c = EC[estado] || EC['falta']
  return (
    <span style={{
      background: c.bg, border: `1px solid ${c.border}`, color: c.text,
      fontSize: 9, fontWeight: 700, padding: '3px 9px', borderRadius: 20,
      letterSpacing: '0.05em', whiteSpace: 'nowrap',
      display: 'inline-flex', alignItems: 'center', gap: 4,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: c.dot, display: 'inline-block' }} />
      {c.icon} {c.label.toUpperCase()}
    </span>
  )
}

/* ══════════════════════════════════════════
   PÁGINA PRINCIPAL
══════════════════════════════════════════ */
export default function Historial() {
  const router = useRouter()

  const [data,       setData]       = useState<Registro[]>([])
  const [loading,    setLoading]    = useState(true)
  const [fecha,      setFecha]      = useState('')
  const [estado,     setEstado]     = useState('')
  const [tipoPermiso,setTipoPermiso]= useState('')
  const [texto,      setTexto]      = useState('')
  const [guardia,    setGuardia]    = useState('')
  const [collapse,   setCollapse]   = useState<Record<string,boolean>>({})

  /* ── CARGA ── */
  useEffect(() => { cargar() }, [fecha, estado, tipoPermiso])

  const cargar = async () => {
    setLoading(true)
    let query = supabase
      .from('asistencia')
      .select(`
        id, fecha, estado, observacion, turno,
        tipo_permiso, archivo_url, archivo_nombre,
        personal:personal_id (nombre, guardia, ambulancia_codigo)
      `)
      .order('fecha', { ascending: false })

    if (fecha)       query = query.eq('fecha', fecha)
    if (estado)      query = query.eq('estado', estado)
    if (tipoPermiso) query = query.eq('tipo_permiso', tipoPermiso)

    const { data: result, error } = await query
    if (error) { console.error(error); setLoading(false); return }
    setData((result || []) as unknown as Registro[])
    setLoading(false)
  }

  /* ── FILTRO LOCAL (texto + guardia) ── */
  const filtered = useMemo(() => {
    return data.filter(r => {
      if (guardia && r.personal?.guardia !== guardia) return false
      if (texto) {
        const s = texto.toLowerCase()
        if (
          !r.personal?.nombre?.toLowerCase().includes(s) &&
          !r.observacion?.toLowerCase().includes(s)
        ) return false
      }
      return true
    })
  }, [data, texto, guardia])

  /* ── AGRUPADO ── */
  const byGuardia = useMemo(() => {
    const map: Record<string, Registro[]> = {}
    filtered.forEach(r => {
      const g = r.personal?.guardia || 'SIN GUARDIA'
      if (!map[g]) map[g] = []
      map[g].push(r)
    })
    return map
  }, [filtered])

  /* ── STATS ── */
  const stats = useMemo(() => ({
    total:      filtered.length,
    asistio:    filtered.filter(r => r.estado === 'asistio').length,
    falta:      filtered.filter(r => r.estado === 'falta').length,
    permiso:    filtered.filter(r => r.estado === 'permiso').length,
    atraso:     filtered.filter(r => r.estado === 'atraso').length,
    vacaciones: filtered.filter(r => r.estado === 'vacaciones').length,
    conDoc:     filtered.filter(r => r.archivo_url).length,
  }), [filtered])

  function limpiarTodo() {
    setFecha(''); setEstado(''); setTipoPermiso(''); setTexto(''); setGuardia('')
  }

  const hayFiltros = fecha || estado || tipoPermiso || texto || guardia

  /* ── ESTILOS ── */
  const inp: React.CSSProperties = {
    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
    color: 'white', padding: '8px 12px', borderRadius: 7, fontSize: 10,
    fontFamily: "'IBM Plex Mono','Courier New',monospace", outline: 'none',
    width: '100%', boxSizing: 'border-box',
  }
  const lbl: React.CSSProperties = {
    margin: '0 0 4px', fontSize: 8, color: '#475569',
    letterSpacing: '0.08em', fontWeight: 700,
  }

  if (loading) {
    return (
      <div style={{ minHeight:'100vh', background:'#060a14', color:'white', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:"'IBM Plex Mono',monospace" }}>
        <div style={{ textAlign:'center' }}>
          <div style={{ fontSize:30, marginBottom:10 }}>📊</div>
          <p style={{ color:'#475569', fontSize:11, letterSpacing:'0.08em' }}>Cargando historial...</p>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      background: '#060a14', minHeight: '100vh', color: 'white',
      fontFamily: "'IBM Plex Mono','Courier New',monospace", padding: 24,
    }}>

      {/* ── HEADER ── */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20 }}>
        <div>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ fontSize:20 }}>📊</span>
            <h1 style={{ margin:0, fontSize:18, fontWeight:800, color:'#e2e8f0', letterSpacing:'0.05em' }}>
              HISTORIAL DE ASISTENCIA
            </h1>
          </div>
          <p style={{ margin:'4px 0 0 28px', fontSize:10, color:'#475569', letterSpacing:'0.08em' }}>
            Registros de asistencia, permisos y documentos
          </p>
        </div>
        <button onClick={() => router.back()} style={{
          background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.3)',
          color: '#38bdf8', padding: '7px 16px', borderRadius: 7,
          fontSize: 10, fontWeight: 700, cursor: 'pointer',
        }}>← Volver</button>
      </div>

      {/* ── LEYENDA / FILTRO RÁPIDO POR ESTADO ── */}
      <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:14, alignItems:'center' }}>
        <span style={{ fontSize:9, color:'#334155', letterSpacing:'0.08em', fontWeight:700, marginRight:4 }}>ESTADO:</span>
        {Object.entries(EC).map(([k, v]) => (
          <button key={k} onClick={() => setEstado(estado === k ? '' : k)} style={{
            background: estado===k ? v.bg : 'rgba(255,255,255,0.03)',
            border: `1px solid ${estado===k ? v.border : 'rgba(255,255,255,0.07)'}`,
            color: estado===k ? v.text : '#475569',
            padding: '5px 12px', borderRadius: 20, fontSize: 9, fontWeight: 700, cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', gap: 5,
          }}>
            <span style={{ width:7, height:7, borderRadius:'50%', background:estado===k?v.dot:'#334155', display:'inline-block' }}/>
            {v.icon} {v.label}
          </button>
        ))}
        {hayFiltros && (
          <button onClick={limpiarTodo} style={{
            background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.25)',
            color: '#f87171', padding: '5px 10px', borderRadius: 20,
            fontSize: 9, fontWeight: 700, cursor: 'pointer',
          }}>✕ Limpiar todo</button>
        )}
      </div>

      {/* ── FILTROS ── */}
      <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr 1fr', gap:8, marginBottom:16 }}>
        <div>
          <p style={lbl}>🔍 BUSCAR</p>
          <input
            value={texto} onChange={e => setTexto(e.target.value)}
            placeholder="Nombre u observación..." style={inp}
          />
        </div>
        <div>
          <p style={lbl}>👥 GUARDIA</p>
          <select value={guardia} onChange={e => setGuardia(e.target.value)} style={inp}>
            <option value="">Todas</option>
            {GUARDIAS.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>
        <div>
          <p style={lbl}>📝 TIPO PERMISO</p>
          <select value={tipoPermiso} onChange={e => setTipoPermiso(e.target.value)} style={inp}>
            <option value="">Todos</option>
            <option value="permiso">Permiso</option>
            <option value="Reposo Médico">Reposo Médico</option>
            <option value="vacaciones">Vacaciones</option>
          </select>
        </div>
        <div>
          <p style={lbl}>📅 FECHA</p>
          <input type="date" value={fecha} onChange={e => setFecha(e.target.value)} style={inp}/>
        </div>
      </div>

      {/* ── STATS ── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:7, marginBottom:22 }}>
        {[
          { l:'TOTAL',      v:stats.total,      c:'#e2e8f0' },
          { l:'ASISTIÓ',    v:stats.asistio,    c:'#4ade80' },
          { l:'FALTA',      v:stats.falta,      c:'#f87171' },
          { l:'PERMISO',    v:stats.permiso,    c:'#fb923c' },
          { l:'ATRASO',     v:stats.atraso,     c:'#38bdf8' },
          { l:'VACACIONES', v:stats.vacaciones, c:'#fbbf24' },
          { l:'CON DOC.',   v:stats.conDoc,     c:'#a78bfa' },
        ].map(k => (
          <div key={k.l} style={{
            background: `${k.c}09`, border: `1px solid ${k.c}22`,
            borderRadius: 9, padding: '10px 0', textAlign: 'center',
          }}>
            <p style={{ margin:0, fontSize:7, color:'#475569', letterSpacing:'0.07em', fontWeight:700 }}>{k.l}</p>
            <p style={{ margin:'4px 0 0', fontSize:22, fontWeight:800, color:k.c }}>{k.v}</p>
          </div>
        ))}
      </div>

      {/* ── REGISTROS AGRUPADOS POR GUARDIA ── */}
      {filtered.length === 0 ? (
        <div style={{
          border: '1px dashed rgba(255,255,255,0.08)', borderRadius: 10,
          padding: 40, textAlign: 'center', color: '#334155', fontSize: 11,
        }}>
          No hay registros que coincidan con los filtros
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {GUARDIAS.filter(g => byGuardia[g]?.length > 0).map(g => {
            const regs  = byGuardia[g] || []
            const isC   = collapse[g]
            const gA    = regs.filter(r => r.estado === 'asistio').length
            const gF    = regs.filter(r => r.estado === 'falta').length
            const gP    = regs.filter(r => r.estado === 'permiso' || r.estado === 'vacaciones').length
            const gT    = regs.filter(r => r.estado === 'atraso').length
            const pctA  = regs.length > 0 ? Math.round(gA / regs.length * 100) : 0

            return (
              <div key={g} style={{
                background: '#0b1120', border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: 12, overflow: 'hidden',
              }}>
                {/* Cabecera guardia */}
                <div
                  onClick={() => setCollapse(p => ({ ...p, [g]: !p[g] }))}
                  style={{
                    padding: '11px 16px', cursor: 'pointer',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    background: 'rgba(255,255,255,0.025)',
                    borderBottom: isC ? 'none' : '1px solid rgba(255,255,255,0.06)',
                  }}
                >
                  <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
                    <span style={{
                      background: 'rgba(34,211,238,0.15)', border: '1px solid rgba(34,211,238,0.35)',
                      color: '#22d3ee', fontSize: 11, fontWeight: 800,
                      padding: '3px 12px', borderRadius: 6, letterSpacing: '0.08em',
                    }}>{g}</span>
                    <span style={{ fontSize:10, color:'#475569' }}>{regs.length} funcionarios</span>

                    <div style={{ display:'flex', gap:4 }}>
                      {gA>0 && <span style={{ background:'rgba(74,222,128,0.1)',  border:'1px solid rgba(74,222,128,0.25)',  color:'#4ade80', fontSize:8, fontWeight:700, padding:'2px 8px', borderRadius:10 }}>✅ {gA}</span>}
                      {gF>0 && <span style={{ background:'rgba(248,113,113,0.1)', border:'1px solid rgba(248,113,113,0.25)', color:'#f87171', fontSize:8, fontWeight:700, padding:'2px 8px', borderRadius:10 }}>❌ {gF}</span>}
                      {gP>0 && <span style={{ background:'rgba(251,146,60,0.1)',  border:'1px solid rgba(251,146,60,0.25)',  color:'#fb923c', fontSize:8, fontWeight:700, padding:'2px 8px', borderRadius:10 }}>🟠 {gP}</span>}
                      {gT>0 && <span style={{ background:'rgba(56,189,248,0.1)',  border:'1px solid rgba(56,189,248,0.25)',  color:'#38bdf8', fontSize:8, fontWeight:700, padding:'2px 8px', borderRadius:10 }}>🕐 {gT}</span>}
                    </div>

                    {/* Barra % asistencia */}
                    <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                      <div style={{ width:60, height:4, background:'rgba(255,255,255,0.06)', borderRadius:2, overflow:'hidden' }}>
                        <div style={{ width:`${pctA}%`, height:'100%', background: pctA>=80?'#4ade80':pctA>=50?'#fbbf24':'#f87171', borderRadius:2 }}/>
                      </div>
                      <span style={{ fontSize:8, fontWeight:700, color:pctA>=80?'#4ade80':pctA>=50?'#fbbf24':'#f87171' }}>{pctA}%</span>
                    </div>
                  </div>
                  <span style={{ color:'#334155', fontSize:11, display:'inline-block', transform:isC?'rotate(-90deg)':'rotate(0deg)', transition:'transform 0.2s' }}>▼</span>
                </div>

                {/* Filas */}
                {!isC && (
                  <div>
                    {regs.map((r, i) => {
                      const ec = EC[r.estado] || EC['falta']
                      return (
                        <div key={r.id} style={{
                          padding: '11px 16px',
                          borderBottom: i < regs.length-1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          background: i%2 ? 'rgba(255,255,255,0.01)' : 'transparent',
                          borderLeft: `3px solid ${ec.dot}`,
                        }}>
                          <div style={{ display:'flex', alignItems:'center', gap:10, flex:1, minWidth:0 }}>
                            <div style={{ width:10, height:10, borderRadius:'50%', background:ec.dot, flexShrink:0, boxShadow:`0 0 6px ${ec.dot}70` }}/>
                            <div style={{ flex:1, minWidth:0 }}>
                              <div style={{ display:'flex', alignItems:'center', gap:7, flexWrap:'wrap' }}>
                                <span style={{ fontSize:11, fontWeight:700, color:'#e2e8f0', whiteSpace:'nowrap' }}>
                                  {r.personal?.nombre || 'Sin nombre'}
                                </span>
                                {r.personal?.ambulancia_codigo && (
                                  <span style={{ fontSize:9, color:'#334155' }}>· {r.personal.ambulancia_codigo}</span>
                                )}
                                <Badge estado={r.estado}/>
                                {r.tipo_permiso && r.tipo_permiso !== r.estado && (
                                  <span style={{ background:'rgba(251,191,36,0.1)', border:'1px solid rgba(251,191,36,0.25)', color:'#fbbf24', fontSize:8, fontWeight:700, padding:'2px 7px', borderRadius:10 }}>
                                    {r.tipo_permiso}
                                  </span>
                                )}
                                {r.turno && (
                                  <span style={{ fontSize:8, color:'#334155' }}>· Turno: {r.turno}</span>
                                )}
                              </div>
                              {r.observacion && (
                                <p style={{ margin:'3px 0 0', fontSize:9, color:'#64748b' }}>💬 {r.observacion}</p>
                              )}
                            </div>
                          </div>

                          <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:4, flexShrink:0, marginLeft:12 }}>
                            <span style={{ fontSize:8, color:'#334155' }}>
                              {formatFecha(r.fecha)}
                            </span>
                            {r.archivo_url ? (
                              <a href={r.archivo_url} target="_blank" rel="noreferrer" style={{
                                background: 'rgba(167,139,250,0.12)', border: '1px solid rgba(167,139,250,0.3)',
                                color: '#a78bfa', padding: '4px 10px', borderRadius: 5,
                                fontSize: 8, fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap',
                              }}>📎 Ver doc.</a>
                            ) : (
                              <span style={{ fontSize:8, color:'#1e293b' }}>Sin archivo</span>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}

          {/* Guardias sin asignar */}
          {byGuardia['SIN GUARDIA']?.length > 0 && (
            <div style={{ background:'#0b1120', border:'1px solid rgba(255,255,255,0.07)', borderRadius:12, overflow:'hidden' }}>
              <div style={{ padding:'11px 16px', background:'rgba(255,255,255,0.025)', borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
                <span style={{ fontSize:10, color:'#334155', fontWeight:700 }}>SIN GUARDIA ASIGNADA · {byGuardia['SIN GUARDIA'].length}</span>
              </div>
              {byGuardia['SIN GUARDIA'].map((r, i) => {
                const ec = EC[r.estado] || EC['falta']
                return (
                  <div key={r.id} style={{ padding:'11px 16px', borderBottom:i<byGuardia['SIN GUARDIA'].length-1?'1px solid rgba(255,255,255,0.04)':'none', display:'flex', justifyContent:'space-between', borderLeft:`3px solid ${ec.dot}` }}>
                    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                      <div style={{ width:10, height:10, borderRadius:'50%', background:ec.dot, flexShrink:0 }}/>
                      <span style={{ fontSize:11, fontWeight:700, color:'#e2e8f0' }}>{r.personal?.nombre || 'Sin nombre'}</span>
                      <Badge estado={r.estado}/>
                    </div>
                    <span style={{ fontSize:8, color:'#334155' }}>{formatFecha(r.fecha)}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      <div style={{ marginTop:16, display:'flex', justifyContent:'space-between', fontSize:8, color:'#1e293b' }}>
        <span>CONTROL OPERATIVO — ASISTENCIA</span>
        <span>{filtered.length} registros mostrados</span>
      </div>
    </div>
  )
}
