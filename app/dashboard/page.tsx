"use client"

import { useEffect, useState, useMemo, useRef } from "react"
import { supabase } from "@/lib/supabaseClient"
import { useRouter } from "next/navigation"
import FichaDrawer from "@/components/FichaDrawer"

type Ambulancia = {
  id: string; codigo_operativo: string; placa: string; marca: string
  tipo: string; kilometraje_actual: number; kilometraje_mtto: number
  estado: string; base_operativa: string
}

const EA: Record<string, { c: string; bg: string; border: string; glow: string }> = {
  operativa:      { c:"#22c55e", bg:"rgba(34,197,94,0.12)",  border:"rgba(34,197,94,0.45)",  glow:"rgba(34,197,94,0.3)"  },
  mantenimiento:  { c:"#d97706", bg:"rgba(217,119,6,0.12)",  border:"rgba(217,119,6,0.45)",  glow:"rgba(217,119,6,0.3)"  },
  "no operativa": { c:"#dc2626", bg:"rgba(220,38,38,0.12)",  border:"rgba(220,38,38,0.45)",  glow:"rgba(220,38,38,0.3)"  },
}

const TC: Record<string, { c: string; bg: string; border: string }> = {
  operativa:      { c:"#22c55e", bg:"rgba(34,197,94,0.12)",  border:"rgba(34,197,94,0.4)"  },
  mantenimiento:  { c:"#d97706", bg:"rgba(217,119,6,0.12)",  border:"rgba(217,119,6,0.4)"  },
  "no operativa": { c:"#dc2626", bg:"rgba(220,38,38,0.12)",  border:"rgba(220,38,38,0.4)"  },
}

const inputStyle: React.CSSProperties = {
  background:"rgba(56,189,248,0.08)", border:"1px solid rgba(56,189,248,0.35)",
  color:"#f1f5f9", padding:"5px 8px", borderRadius:5, fontSize:10,
  outline:"none", width:"80px", fontFamily:"'Space Mono','Courier New',monospace",
}

/* ── input más ancho para base operativa en tabla ── */
const inputStyleWide: React.CSSProperties = {
  ...inputStyle,
  width:"110px",
}

function pct(n: number, t: number) { return t > 0 ? Math.round(n / t * 100) : 0 }

function StatCard({ label, value, color }: { label: string; value: any; color: string }) {
  return (
    <div style={{ background:'linear-gradient(135deg,rgba(15,23,42,0.95),rgba(13,20,36,0.95))', border:`1px solid ${color}30`, borderRadius:12, padding:'12px 14px', position:'relative', overflow:'hidden' }}>
      <div style={{ position:'absolute', top:0, right:0, width:50, height:50, borderRadius:'0 12px 0 50px', background:`${color}10` }}/>
      <p style={{ margin:0, fontSize:8, color:'#64748b', letterSpacing:'0.12em', fontWeight:700 }}>{label}</p>
      <p style={{ margin:'5px 0 0', fontSize:22, fontWeight:900, color, lineHeight:1 }}>{value}</p>
    </div>
  )
}

function TipoCard({ tipo, list, accent }: { tipo: string; list: Ambulancia[]; accent: string }) {
  const op    = list.filter(a => a.estado === "operativa").length
  const mt    = list.filter(a => a.estado === "mantenimiento").length
  const fu    = list.filter(a => a.estado === "no operativa").length
  const total = list.length
  return (
    <div style={{ background:'linear-gradient(135deg,rgba(15,23,42,0.95),rgba(13,20,36,0.95))', border:`1px solid ${accent}25`, borderRadius:12, padding:'12px 13px' }}>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
        <span style={{ fontSize:11, fontWeight:800, color:accent, letterSpacing:'0.05em' }}>🚑 TIPO {tipo}</span>
        <span style={{ fontSize:9, color:'#64748b' }}>{total} u.</span>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:3, marginBottom:7 }}>
        {[{l:"Op.",v:op,c:"#22c55e"},{l:"Mtto",v:mt,c:"#d97706"},{l:"No op.",v:fu,c:"#dc2626"}].map(k => (
          <div key={k.l} style={{ textAlign:'center' }}>
            <div style={{ fontSize:16, fontWeight:800, color:k.c }}>{k.v}</div>
            <div style={{ fontSize:7, color:'#64748b' }}>{k.l}</div>
            <div style={{ fontSize:8, color:k.c, opacity:0.8 }}>{pct(k.v,total)}%</div>
          </div>
        ))}
      </div>
      <div style={{ display:'flex', gap:1, height:4, borderRadius:2, overflow:'hidden' }}>
        <div style={{ flex:op, background:'#22c55e' }}/>
        <div style={{ flex:mt, background:'#d97706' }}/>
        <div style={{ flex:fu, background:'#dc2626' }}/>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════
   BUSCADOR DE UNIDADES
══════════════════════════════════════════ */
function BuscadorUnidad({
  ambulancias, horasMap, onVerFicha, onEditar,
}: {
  ambulancias: Ambulancia[]
  horasMap: Record<string, number>
  onVerFicha: (id: string) => void
  onEditar: (a: Ambulancia) => void
}) {
  const [query,     setQuery]     = useState("")
  const [resultado, setResultado] = useState<Ambulancia | null>(null)
  const [buscado,   setBuscado]   = useState(false)
  const [showDrop,  setShowDrop]  = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const sugerencias = useMemo(() => {
    if (query.trim().length < 2) return []
    const q = query.toLowerCase().trim()
    return ambulancias.filter(a =>
      a.codigo_operativo.toLowerCase().includes(q) ||
      a.placa.toLowerCase().includes(q) ||
      a.marca.toLowerCase().includes(q) ||
      (a.base_operativa || "").toLowerCase().includes(q)
    ).slice(0, 5)
  }, [query, ambulancias])

  function ejecutarBusqueda(amb?: Ambulancia) {
    const found = amb || (() => {
      const q = query.toLowerCase().trim()
      return ambulancias.find(a =>
        a.codigo_operativo.toLowerCase() === q ||
        a.placa.toLowerCase() === q ||
        a.codigo_operativo.toLowerCase().includes(q) ||
        a.placa.toLowerCase().includes(q)
      )
    })()
    setResultado(found || null); setBuscado(true); setShowDrop(false)
  }

  function seleccionar(a: Ambulancia) {
    setQuery(a.codigo_operativo); setResultado(a); setBuscado(true); setShowDrop(false)
  }

  function limpiar() {
    setQuery(""); setResultado(null); setBuscado(false); setShowDrop(false)
    inputRef.current?.focus()
  }

  const ec      = resultado ? (EA[resultado.estado] || EA["no operativa"]) : null
  const kmAlert = resultado ? resultado.kilometraje_actual >= resultado.kilometraje_mtto : false
  const kmPct   = resultado ? Math.min(resultado.kilometraje_actual / resultado.kilometraje_mtto * 100, 100) : 0
  const horas   = resultado ? (horasMap[String(resultado.id)] || 0) : 0

  const inpSt: React.CSSProperties = {
    flex:1, background:"transparent", border:"none", outline:"none",
    color:"#f1f5f9", fontSize:12, padding:"12px 0",
    fontFamily:"'Space Mono','Courier New',monospace", letterSpacing:"0.02em",
  }
  const lbl: React.CSSProperties = { margin:0, fontSize:7, color:"#1e293b", letterSpacing:"0.1em", fontWeight:700 }
  const val: React.CSSProperties = { margin:"3px 0 0", fontSize:11, fontWeight:700 }

  return (
    <div style={{ background:"linear-gradient(135deg,rgba(15,23,42,0.97),rgba(11,17,32,0.97))", border:"1px solid rgba(34,211,238,0.18)", borderRadius:16, padding:18, marginBottom:20, boxShadow:"0 0 30px rgba(34,211,238,0.07)" }}>
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14 }}>
        <span style={{ fontSize:16 }}>🔍</span>
        <div>
          <p style={{ margin:0, fontSize:11, fontWeight:800, color:'#e2e8f0', letterSpacing:'0.04em' }}>LOCALIZADOR DE UNIDADES</p>
          <p style={{ margin:0, fontSize:8, color:'#475569', letterSpacing:'0.06em' }}>Busca por código, placa, marca o base operativa</p>
        </div>
      </div>

      <div style={{ position:'relative' }}>
        <div style={{ display:'flex', background:'rgba(255,255,255,0.05)', border:`1px solid ${showDrop || buscado ? 'rgba(34,211,238,0.4)' : 'rgba(255,255,255,0.1)'}`, borderRadius: showDrop && sugerencias.length > 0 ? '10px 10px 0 0' : '10px', overflow:'hidden', transition:'border-color 0.2s' }}>
          <div style={{ padding:'0 12px', display:'flex', alignItems:'center', color:'#22d3ee', fontSize:14, flexShrink:0 }}>🔍</div>
          <input
            ref={inputRef} value={query}
            onChange={e => { setQuery(e.target.value); setBuscado(false); setShowDrop(true) }}
            onFocus={() => { if (query.length >= 2) setShowDrop(true) }}
            onBlur={() => setTimeout(() => setShowDrop(false), 150)}
            onKeyDown={e => { if (e.key === 'Enter') ejecutarBusqueda() }}
            placeholder="Ej: GA-01, MEA1891, IVECO, Colimes..."
            style={inpSt}
          />
          {query && <button onClick={limpiar} style={{ padding:'0 12px', background:'transparent', border:'none', color:'#475569', fontSize:14, cursor:'pointer' }}>✕</button>}
          <button onClick={() => ejecutarBusqueda()} style={{ background:'linear-gradient(135deg,#0891b2,#0e7490)', border:'none', color:'white', padding:'10px 16px', fontSize:9, fontWeight:700, cursor:'pointer', whiteSpace:'nowrap', letterSpacing:'0.04em', flexShrink:0 }}>BUSCAR</button>
        </div>

        {showDrop && sugerencias.length > 0 && (
          <div style={{ position:'absolute', top:'100%', left:0, right:0, zIndex:50, background:'rgba(9,14,24,0.99)', border:'1px solid rgba(34,211,238,0.2)', borderTop:'none', borderRadius:'0 0 10px 10px', overflow:'hidden', boxShadow:'0 12px 30px rgba(0,0,0,0.6)' }}>
            {sugerencias.map((a, idx) => {
              const ec2 = EA[a.estado] || EA["no operativa"]
              return (
                <div key={a.id} onMouseDown={() => seleccionar(a)}
                  style={{ padding:'10px 14px', cursor:'pointer', borderBottom: idx < sugerencias.length-1 ? '1px solid rgba(255,255,255,0.04)' : 'none', display:'flex', alignItems:'center', gap:10 }}
                  onMouseEnter={e => (e.currentTarget.style.background='rgba(34,211,238,0.06)')}
                  onMouseLeave={e => (e.currentTarget.style.background='transparent')}
                >
                  <div style={{ width:8, height:8, borderRadius:'50%', background:ec2.c, flexShrink:0, boxShadow:`0 0 5px ${ec2.glow}` }}/>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                      <span style={{ fontSize:11, fontWeight:800, color:'#f1f5f9' }}>{a.codigo_operativo}</span>
                      <span style={{ fontSize:8, color:'#334155' }}>·</span>
                      <span style={{ fontSize:9, color:'#64748b' }}>{a.placa}</span>
                      <span style={{ background:a.tipo==="ALFA"?"rgba(56,189,248,0.12)":"rgba(167,139,250,0.12)", color:a.tipo==="ALFA"?"#38bdf8":"#a78bfa", border:`1px solid ${a.tipo==="ALFA"?"rgba(56,189,248,0.25)":"rgba(167,139,250,0.25)"}`, fontSize:7, fontWeight:800, padding:'1px 5px', borderRadius:3 }}>{a.tipo}</span>
                    </div>
                    <p style={{ margin:0, fontSize:8, color:'#334155', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{a.base_operativa} · {a.marca}</p>
                  </div>
                  <span style={{ background:ec2.bg, border:`1px solid ${ec2.border}`, color:ec2.c, fontSize:8, fontWeight:700, padding:'2px 7px', borderRadius:4, whiteSpace:'nowrap' }}>{a.estado.toUpperCase()}</span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {buscado && resultado && ec && (
        <div style={{ marginTop:14, background:"rgba(255,255,255,0.02)", border:`1px solid ${ec.border}`, borderRadius:12, overflow:'hidden', boxShadow:`0 0 20px ${ec.glow}` }}>
          <div style={{ padding:'12px 14px', background:ec.bg, borderBottom:`1px solid ${ec.border}`, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <div style={{ width:10, height:10, borderRadius:'50%', background:ec.c, boxShadow:`0 0 8px ${ec.glow}` }}/>
              <span style={{ fontSize:15, fontWeight:900, color:'#f1f5f9', letterSpacing:'0.06em' }}>{resultado.codigo_operativo}</span>
              <span style={{ background:resultado.tipo==="ALFA"?"rgba(56,189,248,0.15)":"rgba(167,139,250,0.15)", color:resultado.tipo==="ALFA"?"#38bdf8":"#a78bfa", border:`1px solid ${resultado.tipo==="ALFA"?"rgba(56,189,248,0.3)":"rgba(167,139,250,0.3)"}`, fontSize:9, fontWeight:800, padding:'2px 8px', borderRadius:5 }}>{resultado.tipo}</span>
            </div>
            <span style={{ background:ec.bg, border:`1px solid ${ec.border}`, color:ec.c, fontSize:9, fontWeight:700, padding:'3px 10px', borderRadius:5, letterSpacing:'0.05em' }}>{resultado.estado.toUpperCase()}</span>
          </div>
          <div style={{ padding:'14px', display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
            {[
              { l:"PLACA",       v:resultado.placa,                                      c:"#e2e8f0"                   },
              { l:"MARCA",       v:resultado.marca,                                      c:"#94a3b8"                   },
              { l:"BASE OP.",    v:resultado.base_operativa || "—",                      c:"#94a3b8"                   },
              { l:"HORAS FUERA", v:horas+"h",                                            c:"#64748b"                   },
              { l:"KM ACTUAL",   v:resultado.kilometraje_actual?.toLocaleString()+" km", c:kmAlert?"#dc2626":"#94a3b8" },
              { l:"PRÓX. MTTO",  v:resultado.kilometraje_mtto?.toLocaleString()+" km",   c:"#d97706"                   },
            ].map(f => (
              <div key={f.l} style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:8, padding:'8px 10px' }}>
                <p style={lbl}>{f.l}</p>
                <p style={{ ...val, color:f.c, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{f.v}</p>
              </div>
            ))}
          </div>
          <div style={{ padding:'0 14px 14px' }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
              <span style={{ fontSize:8, color:'#475569', fontWeight:700, letterSpacing:'0.08em' }}>PROGRESO KM → MANTENIMIENTO</span>
              <span style={{ fontSize:8, color:kmAlert?"#dc2626":"#64748b", fontWeight:700 }}>{kmAlert ? "⚠ VENCIDO" : `${Math.round(100-kmPct)}% restante`}</span>
            </div>
            <div style={{ background:'rgba(255,255,255,0.06)', borderRadius:4, height:7, overflow:'hidden' }}>
              <div style={{ width:`${kmPct}%`, height:'100%', background: kmAlert ? "linear-gradient(90deg,#dc2626,#b91c1c)" : "linear-gradient(90deg,#22d3ee,#0891b2)", borderRadius:4, transition:'width 0.5s' }}/>
            </div>
          </div>
          <div style={{ padding:'0 14px 14px', display:'grid', gridTemplateColumns:'1fr 1fr 42px', gap:7 }}>
            <button onClick={() => onVerFicha(resultado.id)} style={{ background:'rgba(34,211,238,0.1)', border:'1px solid rgba(34,211,238,0.3)', color:'#22d3ee', padding:'10px', borderRadius:8, fontSize:10, fontWeight:700, cursor:'pointer', letterSpacing:'0.03em' }}>📋 Ver Ficha</button>
            <button onClick={() => onEditar(resultado)} style={{ background:'rgba(217,119,6,0.1)', border:'1px solid rgba(217,119,6,0.3)', color:'#d97706', padding:'10px', borderRadius:8, fontSize:10, fontWeight:700, cursor:'pointer', letterSpacing:'0.03em' }}>✏️ Editar</button>
            <button onClick={limpiar} style={{ background:'rgba(220,38,38,0.1)', border:'1px solid rgba(220,38,38,0.3)', color:'#f87171', padding:'10px', borderRadius:8, fontSize:12, cursor:'pointer' }}>✕</button>
          </div>
        </div>
      )}

      {buscado && !resultado && (
        <div style={{ marginTop:14, padding:'20px', textAlign:'center', border:'1px dashed rgba(255,255,255,0.07)', borderRadius:10 }}>
          <span style={{ fontSize:24 }}>🔍</span>
          <p style={{ margin:'8px 0 0', fontSize:10, color:'#475569', letterSpacing:'0.06em' }}>Sin resultados para <span style={{ color:'#22d3ee' }}>"{query}"</span></p>
          <p style={{ margin:'4px 0 0', fontSize:8, color:'#334155' }}>Intenta con código (GA-01) o placa (MEA1891)</p>
        </div>
      )}
    </div>
  )
}

/* ══════════════════════════════════════════
   DASHBOARD PRINCIPAL
══════════════════════════════════════════ */
export default function Dashboard() {
  const router = useRouter()

  const [rol,         setRol]         = useState("")
  const [nombre,      setNombre]      = useState("")
  const [ambulancias, setAmbulancias] = useState<Ambulancia[]>([])
  const [alertas,     setAlertas]     = useState<any[]>([])
  const [horasMap,    setHorasMap]    = useState<Record<string,number>>({})
  const [editando,    setEditando]    = useState<string|null>(null)
  const [editData,    setEditData]    = useState<any>({})
  const [filtro,      setFiltro]      = useState<"TODOS"|"ALFA"|"BRAVO">("TODOS")
  const [hoveredRow,  setHoveredRow]  = useState<string|null>(null)
  const [drawerOpen,  setDrawerOpen]  = useState(false)
  const [drawerAmbId, setDrawerAmbId] = useState<string|null>(null)
  const [filtroTipo,  setFiltroTipo]  = useState<"TODOS"|"ALFA"|"BRAVO">("TODOS")

  useEffect(() => {
    const r     = localStorage.getItem("rol")
    const n     = localStorage.getItem("nombre")
    const email = localStorage.getItem("email")
    if (!r) { router.push("/"); return }

    async function validarRol() {
      if (!email) { router.push("/"); return }
      const { data } = await supabase.from("usuarios").select("rol").eq("email", email).single()
      if (data?.rol !== "admin") {
        if (data?.rol === "supervisor") { router.push("/supervisor"); return }
        router.push("/"); return
      }
    }

    validarRol()
    if (r === "conductor") { router.push("/conductor"); return }
    setRol(r); setNombre(n || "")
    cargar()
    const intervalo = setInterval(cargar, 30000)
    return () => clearInterval(intervalo)
  }, [])

  async function cargar() {
    const { data: amb   } = await supabase.from("ambulancias").select("*").order("codigo_operativo")
    const { data: alert } = await supabase.from("reportes_fallas").select("*").eq("estado","abierta").eq("criticidad","critica")
    const { data: hist  } = await supabase.from("historial_operativo").select("*")

    const ambs  = (amb  || []) as Ambulancia[]
    const histo = hist || []

    setAmbulancias(ambs)
    setAlertas(alert || [])

    const mapa: Record<string,number> = {}
    ambs.forEach(a => {
      const eventos = histo.filter((h: any) => String(h.ambulancia_id) === String(a.id))
      let total = 0
      eventos.forEach((e: any) => {
        if (e.estado === "operativa") return
        const ini = new Date(e.fecha_inicio)
        const fin = e.fecha_fin ? new Date(e.fecha_fin) : new Date()
        if (isNaN(ini.getTime()) || isNaN(fin.getTime()) || fin < ini) return
        total += fin.getTime() - ini.getTime()
      })
      mapa[String(a.id)] = Math.floor(total / (1000 * 60 * 60))
    })
    setHorasMap(mapa)
  }

  async function eliminarAmbulancia(id: string) {
    if (!confirm("¿Eliminar ambulancia?")) return
    await supabase.from("historial_operativo").delete().eq("ambulancia_id", id)
    await supabase.from("mantenimientos").delete().eq("ambulancia_id", id)
    await supabase.from("ambulancias").delete().eq("id", id)
    cargar()
  }

  /* ── FIX: ahora incluye base_operativa ── */
  async function guardarEdicion(id: string) {
    await supabase.from("ambulancias").update({
      codigo_operativo: editData.codigo_operativo,
      placa:            editData.placa,
      marca:            editData.marca,
      tipo:             editData.tipo,
      base_operativa:   editData.base_operativa,   // ← NUEVO
    }).eq("id", id)
    setEditando(null)
    cargar()
  }

  function abrirEdicion(a: Ambulancia) {
    setEditando(a.id)
    setEditData(a)
  }

  function cerrarSesion() { localStorage.clear(); router.push("/") }

  const alfas         = ambulancias.filter(a => a.tipo === "ALFA")
  const bravos        = ambulancias.filter(a => a.tipo === "BRAVO")
  const total         = ambulancias.length
  const operativas    = ambulancias.filter(a => a.estado === "operativa").length
  const mantenimiento = ambulancias.filter(a => a.estado === "mantenimiento").length
  const fuera         = ambulancias.filter(a => a.estado === "no operativa").length
  const totalHoras    = Object.values(horasMap).reduce((a, b) => a + (b || 0), 0)
  const promedioH     = total ? Math.round(totalHoras / total) : 0
  const mttoVencido   = ambulancias.filter(a => a.kilometraje_actual >= a.kilometraje_mtto)
  const mttoProximo   = ambulancias.filter(a => { const d = a.kilometraje_mtto - a.kilometraje_actual; return d <= 400 && d > 0 })
  const visible       = filtro === "ALFA" ? alfas : filtro === "BRAVO" ? bravos : ambulancias

  const modalInp: React.CSSProperties = {
    background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.1)',
    color:'#f1f5f9', padding:'9px 12px', borderRadius:8, fontSize:11,
    outline:'none', width:'100%', boxSizing:'border-box' as const,
    fontFamily:"'Space Mono','Courier New',monospace",
  }

  return (
    <>
    <div style={{
      background:"#050b15", minHeight:"100vh", color:"white",
      fontFamily:"'Space Mono','Courier New',monospace",
      filter: drawerOpen ? "blur(1px) brightness(0.4)" : "none",
      transition:"filter 0.3s",
      pointerEvents: drawerOpen ? "none" : "auto",
      position:"relative",
    }}>

      {/* Fondo */}
      <div style={{ position:'fixed', inset:0, pointerEvents:'none', zIndex:0, overflow:'hidden' }}>
        <div style={{ position:'absolute', top:-100, right:-80, width:350, height:350, borderRadius:'50%', background:'radial-gradient(circle,rgba(34,211,238,0.04) 0%,transparent 70%)' }}/>
        <div style={{ position:'absolute', bottom:100, left:-80, width:250, height:250, borderRadius:'50%', background:'radial-gradient(circle,rgba(167,139,250,0.04) 0%,transparent 70%)' }}/>
      </div>

      {/* ── HEADER ── */}
      <div style={{ position:'sticky', top:0, zIndex:20, background:'rgba(5,11,21,0.96)', backdropFilter:'blur(12px)', borderBottom:'1px solid rgba(255,255,255,0.07)', padding:'12px 16px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:32, height:32, borderRadius:9, background:'linear-gradient(135deg,#0891b2,#0e7490)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16 }}>🚑</div>
            <div>
              <p style={{ margin:0, fontSize:12, fontWeight:800, color:'#f1f5f9', letterSpacing:'0.04em' }}>CENTRO DE CONTROL</p>
              <p style={{ margin:0, fontSize:7, color:'#475569', letterSpacing:'0.08em' }}>DIR. PROVINCIAL DE SALUD DEL GUAYAS</p>
            </div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ fontSize:10, color:'#64748b' }}><b style={{ color:'#cbd5e1' }}>{nombre}</b> | {rol}</span>
            <button onClick={cerrarSesion} style={{ background:'rgba(220,38,38,0.12)', border:'1px solid rgba(220,38,38,0.3)', color:'#f87171', padding:'6px 11px', borderRadius:7, fontSize:9, fontWeight:700, cursor:'pointer', letterSpacing:'0.04em' }}>🔐 SALIR</button>
          </div>
        </div>
        <div style={{ overflowX:'auto', paddingBottom:2 }}>
          <div style={{ display:'flex', gap:7, width:'max-content' }}>
            {[
              { l:"+ Ambulancia",    path:"/dashboard/nueva-ambulancia", c:"rgba(29,78,216,0.15)",  bc:"rgba(29,78,216,0.4)",  tc:"#60a5fa" },
              { l:"Informe",         path:"/dashboard/informe-flota",    c:"rgba(15,118,110,0.15)", bc:"rgba(15,118,110,0.4)", tc:"#2dd4bf" },
              { l:"KM Diario",       path:"/inventario/kilometrajes",    c:"rgba(3,105,161,0.15)",  bc:"rgba(3,105,161,0.4)",  tc:"#38bdf8" },
              { l:"🧠 Inteligencia", path:"/dashboard/inteligencia",     c:"rgba(124,58,237,0.15)", bc:"rgba(124,58,237,0.4)", tc:"#a78bfa" },
            ].map(b => (
              <button key={b.l} onClick={() => router.push(b.path)} style={{ background:b.c, border:`1px solid ${b.bc}`, color:b.tc, padding:'8px 12px', borderRadius:8, fontSize:9, fontWeight:700, cursor:'pointer', whiteSpace:'nowrap', letterSpacing:'0.04em', flexShrink:0 }}>{b.l}</button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ padding:'14px 16px 30px', position:'relative', zIndex:1 }}>

        {/* Alertas */}
        {mttoVencido.length > 0 && (
          <div style={{ background:'linear-gradient(135deg,rgba(127,29,29,0.5),rgba(127,29,29,0.25))', border:'1px solid rgba(220,38,38,0.35)', borderRadius:10, padding:'9px 13px', marginBottom:8, fontSize:10 }}>
            🚨 <b style={{ color:'#fca5a5' }}>Mtto vencido:</b>{' '}
            <span style={{ color:'#cbd5e1' }}>{mttoVencido.map(a => a.codigo_operativo).join(", ")}</span>
          </div>
        )}
        {mttoProximo.length > 0 && (
          <div style={{ background:'linear-gradient(135deg,rgba(120,53,15,0.5),rgba(120,53,15,0.25))', border:'1px solid rgba(217,119,6,0.35)', borderRadius:10, padding:'9px 13px', marginBottom:8, fontSize:10 }}>
            ⚠️ <b style={{ color:'#fde68a' }}>Próximo mtto:</b>{' '}
            <span style={{ color:'#cbd5e1' }}>{mttoProximo.map(a => a.codigo_operativo).join(", ")}</span>
          </div>
        )}
        {alertas.length > 0 && (
          <div style={{ background:'linear-gradient(135deg,rgba(127,29,29,0.4),rgba(127,29,29,0.2))', border:'1px solid rgba(220,38,38,0.3)', borderRadius:10, padding:'9px 13px', marginBottom:14, fontSize:10 }}>
            🔴 <b style={{ color:'#fca5a5' }}>{alertas.length} falla(s) crítica(s) abiertas</b>
          </div>
        )}

        {/* Buscador */}
        <BuscadorUnidad
          ambulancias={ambulancias}
          horasMap={horasMap}
          onVerFicha={(id) => { setDrawerAmbId(id); setDrawerOpen(true) }}
          onEditar={(a) => abrirEdicion(a)}
        />

        {/* KPIs */}
        <div style={{ marginBottom:6 }}><span style={{ fontSize:8, color:'#475569', letterSpacing:'0.12em', fontWeight:700 }}>▸ FLOTA TOTAL</span></div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:7, marginBottom:8 }}>
          <StatCard label="OPERATIVAS"    value={operativas}    color="#22c55e"/>
          <StatCard label="MANTENIMIENTO" value={mantenimiento} color="#d97706"/>
          <StatCard label="NO OPERATIVAS" value={fuera}         color="#dc2626"/>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:7, marginBottom:18 }}>
          <StatCard label="DISPONIBILIDAD" value={pct(operativas,total)+"%"} color="#38bdf8"/>
          <StatCard label="HORAS FUERA"    value={totalHoras+"h"}            color="#94a3b8"/>
          <StatCard label="PROMEDIO"       value={promedioH+"h"}             color="#64748b"/>
        </div>

        {/* ALFA / BRAVO */}
        <div style={{ marginBottom:6 }}><span style={{ fontSize:8, color:'#475569', letterSpacing:'0.12em', fontWeight:700 }}>▸ POR TIPO DE UNIDAD</span></div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:20 }}>
          <TipoCard tipo="ALFA"  list={alfas}  accent="#38bdf8"/>
          <TipoCard tipo="BRAVO" list={bravos} accent="#a78bfa"/>
        </div>

        {/* Filtros */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
          <span style={{ fontSize:8, color:'#475569', letterSpacing:'0.1em', fontWeight:700 }}>▸ FLOTA — {visible.length} unidades</span>
          <div style={{ display:'flex', gap:5 }}>
            {(["TODOS","ALFA","BRAVO"] as const).map(f => (
              <button key={f} onClick={() => setFiltro(f)} style={{ background:filtro===f?"rgba(34,211,238,0.15)":"rgba(255,255,255,0.04)", border:`1px solid ${filtro===f?"rgba(34,211,238,0.4)":"rgba(255,255,255,0.08)"}`, color:filtro===f?"#22d3ee":"#64748b", padding:'5px 10px', borderRadius:6, fontSize:9, fontWeight:700, cursor:'pointer' }}>{f}</button>
            ))}
          </div>
        </div>

        {/* Tabla */}
        <div style={{ background:'rgba(11,17,32,0.95)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:12, overflowX:'auto', WebkitOverflowScrolling:'touch' as any }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:10, minWidth:640 }}>
            <thead>
              <tr style={{ background:'rgba(255,255,255,0.04)', borderBottom:'1px solid rgba(255,255,255,0.07)' }}>
                {["Estado","Código","Placa","Marca","Tipo","Base Op.","KM","Horas","Acciones"].map(h => (
                  <th key={h} style={{ padding:'9px 10px', textAlign:'left', fontSize:8, color:'#64748b', letterSpacing:'0.08em', fontWeight:700, whiteSpace:'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.map((a, i) => {
                const c         = TC[a.estado] || TC["no operativa"]
                const isEdit    = editando === a.id
                const isHover   = hoveredRow === a.id
                const horas     = horasMap[String(a.id)] || 0
                const kmAlerta  = a.kilometraje_actual >= a.kilometraje_mtto
                const kmProximo = !kmAlerta && (a.kilometraje_mtto - a.kilometraje_actual) <= 400

                return (
                  <tr key={a.id}
                    onMouseEnter={() => setHoveredRow(a.id)}
                    onMouseLeave={() => setHoveredRow(null)}
                    style={{
                      borderBottom:'1px solid rgba(255,255,255,0.05)',
                      background: isEdit   ? "rgba(56,189,248,0.05)"
                                : isHover  ? "rgba(255,255,255,0.03)"
                                : i%2===0  ? "transparent"
                                           : "rgba(255,255,255,0.015)",
                      transition:'background 0.15s',
                      borderLeft: kmAlerta  ? "2px solid #dc2626"
                                : kmProximo ? "2px solid #d97706"
                                           : "2px solid transparent",
                    }}
                  >
                    <td style={{ padding:'9px 10px' }}>
                      <span style={{ background:c.bg, border:`1px solid ${c.border}`, color:c.c, fontSize:8, fontWeight:700, padding:'2px 7px', borderRadius:4, whiteSpace:'nowrap' }}>{a.estado.toUpperCase()}</span>
                    </td>
                    <td style={{ padding:'9px 10px' }}>
                      {isEdit ? <input value={editData.codigo_operativo||""} style={inputStyle} onChange={e=>setEditData({...editData,codigo_operativo:e.target.value})}/> : <span style={{ fontWeight:800, color:'#f1f5f9', whiteSpace:'nowrap' }}>{a.codigo_operativo}</span>}
                    </td>
                    <td style={{ padding:'9px 10px' }}>
                      {isEdit ? <input value={editData.placa||""} style={inputStyle} onChange={e=>setEditData({...editData,placa:e.target.value})}/> : <span style={{ color:'#94a3b8' }}>{a.placa}</span>}
                    </td>
                    <td style={{ padding:'9px 10px' }}>
                      {isEdit ? <input value={editData.marca||""} style={inputStyle} onChange={e=>setEditData({...editData,marca:e.target.value})}/> : <span style={{ color:'#94a3b8' }}>{a.marca||"—"}</span>}
                    </td>
                    <td style={{ padding:'9px 10px' }}>
                      {isEdit
                        ? <select value={editData.tipo||""} style={inputStyle} onChange={e=>setEditData({...editData,tipo:e.target.value})}>
                            <option value="ALFA">ALFA</option>
                            <option value="BRAVO">BRAVO</option>
                          </select>
                        : <span style={{ background:a.tipo==="ALFA"?"rgba(56,189,248,0.12)":"rgba(167,139,250,0.12)", color:a.tipo==="ALFA"?"#38bdf8":"#a78bfa", border:`1px solid ${a.tipo==="ALFA"?"rgba(56,189,248,0.3)":"rgba(167,139,250,0.3)"}`, fontSize:8, fontWeight:800, padding:'2px 7px', borderRadius:4 }}>{a.tipo}</span>
                      }
                    </td>

                    {/* ── BASE OPERATIVA — ahora editable ── */}
                    <td style={{ padding:'9px 10px' }}>
                      {isEdit
                        ? <input
                            value={editData.base_operativa||""}
                            style={inputStyleWide}
                            placeholder="Base operativa"
                            onChange={e=>setEditData({...editData,base_operativa:e.target.value})}
                          />
                        : <span style={{ color:'#94a3b8', fontSize:9, maxWidth:90, display:'inline-block', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{a.base_operativa||"—"}</span>
                      }
                    </td>

                    <td style={{ padding:'9px 10px' }}>
                      <span style={{ color:kmAlerta?"#dc2626":kmProximo?"#d97706":"#94a3b8", whiteSpace:'nowrap', fontWeight:kmAlerta||kmProximo?700:400 }}>{a.kilometraje_actual?.toLocaleString()}</span>
                      {kmAlerta  && <span style={{ fontSize:7, color:'#dc2626', marginLeft:3 }}>⚠</span>}
                      {kmProximo && <span style={{ fontSize:7, color:'#d97706', marginLeft:3 }}>↑</span>}
                    </td>
                    <td style={{ padding:'9px 10px', color:'#64748b' }}>{horas}h</td>
                    <td style={{ padding:'9px 10px' }}>
                      {isEdit ? (
                        <div style={{ display:'flex', gap:4 }}>
                          <button onClick={()=>guardarEdicion(a.id)} style={{ background:'rgba(34,197,94,0.12)', border:'1px solid rgba(34,197,94,0.35)', color:'#22c55e', padding:'5px 9px', borderRadius:5, fontSize:9, fontWeight:700, cursor:'pointer' }}>💾</button>
                          <button onClick={()=>setEditando(null)} style={{ background:'rgba(220,38,38,0.1)', border:'1px solid rgba(220,38,38,0.3)', color:'#f87171', padding:'5px 7px', borderRadius:5, fontSize:9, cursor:'pointer' }}>✕</button>
                        </div>
                      ) : (
                        <div style={{ display:'flex', gap:4 }}>
                          <button onClick={()=>{ setDrawerAmbId(a.id); setDrawerOpen(true) }} style={{ background:'rgba(34,211,238,0.1)', border:'1px solid rgba(34,211,238,0.3)', color:'#22d3ee', padding:'5px 8px', borderRadius:5, fontSize:9, fontWeight:800, cursor:'pointer', whiteSpace:'nowrap' }}>📋</button>
                          <button onClick={()=>abrirEdicion(a)} style={{ background:'rgba(217,119,6,0.1)', border:'1px solid rgba(217,119,6,0.3)', color:'#d97706', padding:'5px 8px', borderRadius:5, fontSize:9, cursor:'pointer' }}>✏️</button>
                          <button onClick={()=>eliminarAmbulancia(a.id)} style={{ background:'rgba(220,38,38,0.1)', border:'1px solid rgba(220,38,38,0.3)', color:'#f87171', padding:'5px 7px', borderRadius:5, fontSize:10, cursor:'pointer' }}>🗑</button>
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* ── MODAL EDICIÓN — ahora con base_operativa ── */}
        {editando && (
          <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.88)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:50, padding:16, backdropFilter:'blur(4px)' }}>
            <div style={{ background:'linear-gradient(135deg,#0f172a,#0b1120)', border:'1px solid rgba(34,211,238,0.18)', borderRadius:16, padding:20, width:'100%', maxWidth:380 }}>
              <p style={{ margin:'0 0 16px', fontSize:12, fontWeight:800, color:'#f1f5f9', letterSpacing:'0.06em' }}>EDITAR UNIDAD</p>

              {/* Campos de texto */}
              {[
                { l:"CÓDIGO OPERATIVO", k:"codigo_operativo",  ph:"Ej: GA-01"           },
                { l:"PLACA",            k:"placa",             ph:"Ej: MEA1891"          },
                { l:"MARCA",            k:"marca",             ph:"Ej: IVECO"            },
                { l:"BASE OPERATIVA",   k:"base_operativa",    ph:"Ej: Hosp. Mariana"    }, // ← NUEVO
              ].map(f => (
                <div key={f.k} style={{ marginBottom:10 }}>
                  <label style={{ fontSize:9, color:'#475569', letterSpacing:'0.1em', fontWeight:700, display:'block', marginBottom:5 }}>{f.l}</label>
                  <input
                    value={editData[f.k]||""}
                    placeholder={f.ph}
                    onChange={e => setEditData({...editData,[f.k]:e.target.value})}
                    style={modalInp}
                  />
                </div>
              ))}

              {/* Tipo */}
              <div style={{ marginBottom:16 }}>
                <label style={{ fontSize:9, color:'#475569', letterSpacing:'0.1em', fontWeight:700, display:'block', marginBottom:5 }}>TIPO</label>
                <select
                  value={editData.tipo||""}
                  onChange={e => setEditData({...editData,tipo:e.target.value})}
                  style={{ ...modalInp, cursor:'pointer' }}
                >
                  <option value="ALFA">ALFA</option>
                  <option value="BRAVO">BRAVO</option>
                </select>
              </div>

              <div style={{ display:'flex', gap:8 }}>
                <button onClick={()=>guardarEdicion(editando)} style={{ flex:1, background:'rgba(34,197,94,0.12)', border:'1px solid rgba(34,197,94,0.35)', color:'#22c55e', padding:'11px', borderRadius:8, fontSize:10, fontWeight:700, cursor:'pointer' }}>💾 Guardar</button>
                <button onClick={()=>setEditando(null)} style={{ flex:1, background:'rgba(220,38,38,0.1)', border:'1px solid rgba(220,38,38,0.3)', color:'#f87171', padding:'11px', borderRadius:8, fontSize:10, fontWeight:700, cursor:'pointer' }}>Cancelar</button>
              </div>
            </div>
          </div>
        )}

        <div style={{ marginTop:12, display:'flex', justifyContent:'space-between', fontSize:8, color:'#1e293b' }}>
          <span>SISTEMA DE GESTIÓN DE FLOTA v2.0</span>
          <span>Auto-actualización 30s</span>
        </div>
      </div>
    </div>

    <FichaDrawer
      open={drawerOpen}
      onClose={() => setDrawerOpen(false)}
      ambulanciaId={drawerAmbId}
      ambulancias={ambulancias}
      onSelectAmb={id => setDrawerAmbId(id)}
      filtroTipo={filtroTipo}
      setFiltroTipo={setFiltroTipo}
      onRefresh={cargar}
    />
    </>
  )
}
