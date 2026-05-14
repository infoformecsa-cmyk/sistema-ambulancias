"use client"

import { useEffect, useState, useMemo } from "react"
import { supabase } from "@/lib/supabaseClient"
import { useRouter } from "next/navigation"

type Registro = {
  id: string
  ambulancia_id: string
  kilometraje: number
  created_at: string
  ambulancias?: { codigo_operativo: string }
}

type RecorridoAmb = {
  codigo:       string
  kmInicio:     number   // primer registro del mes
  kmFin:        number   // último registro del mes
  kmRecorridos: number   // diferencia = km rodados en el mes
  registros:    number
  fechaInicio:  string
  fechaFin:     string
}

/* ── HELPERS ── */
function fmtHora(iso: string) {
  return new Date(iso).toLocaleTimeString("es-EC", { hour:"2-digit", minute:"2-digit" })
}
function fmtFecha(iso: string) {
  return new Date(iso).toLocaleDateString("es-EC", { day:"2-digit", month:"short", year:"numeric" })
}
function fmtShort(iso: string) {
  return new Date(iso).toLocaleDateString("es-EC", { day:"2-digit", month:"short" })
}
function getMesLabel(fecha: string) {
  return new Date(fecha + "-01").toLocaleString("es-EC", { month:"long", year:"numeric" }).toUpperCase()
}

export default function Kilometraje() {
  const router = useRouter()

  const [registros,       setRegistros]       = useState<Registro[]>([])
  const [todosRegistros,  setTodosRegistros]  = useState<Registro[]>([])
  const [fecha,           setFecha]           = useState(() => new Date().toISOString().split("T")[0])
  const [mesSeleccionado, setMesSeleccionado] = useState(() => new Date().toISOString().slice(0,7))
  const [vista,           setVista]           = useState<"diario"|"mensual">("diario")
  const [loading,         setLoading]         = useState(false)

  useEffect(() => { cargar() },        [fecha])
  useEffect(() => { cargarMensual() }, [mesSeleccionado])

  /* ── CARGA DIARIA ── */
  async function cargar() {
    setLoading(true)
    const inicio = new Date(fecha + "T00:00:00")
    const fin    = new Date(fecha + "T23:59:59")
    const { data } = await supabase
      .from("registro_kilometraje")
      .select("*, ambulancias(codigo_operativo)")
      .gte("created_at", inicio.toISOString())
      .lte("created_at", fin.toISOString())
      .order("created_at", { ascending: false })
    setRegistros((data || []) as Registro[])
    setLoading(false)
  }

  /* ── CARGA MENSUAL ── */
  async function cargarMensual() {
    const inicio = new Date(mesSeleccionado + "-01T00:00:00")
    const fin    = new Date(inicio.getFullYear(), inicio.getMonth() + 1, 0, 23, 59, 59)
    const { data } = await supabase
      .from("registro_kilometraje")
      .select("*, ambulancias(codigo_operativo)")
      .gte("created_at", inicio.toISOString())
      .lte("created_at", fin.toISOString())
      .order("created_at", { ascending: true })   // ← ASC: primero el más antiguo
    setTodosRegistros((data || []) as Registro[])
  }

  /* ── KM RECORRIDOS POR AMBULANCIA EN EL MES ── */
  const recorridosPorAmb = useMemo((): RecorridoAmb[] => {
    // Agrupamos por ambulancia, ordenados ASC (ya vienen así)
    const map: Record<string, Registro[]> = {}
    const codigos: Record<string, string> = {}

    todosRegistros.forEach(r => {
      const id = r.ambulancia_id
      if (!map[id]) map[id] = []
      map[id].push(r)
      codigos[id] = r.ambulancias?.codigo_operativo || id
    })

    return Object.entries(map)
      .map(([id, regs]) => {
        // Ordenar por fecha ASC (ya deberían estarlo)
        const sorted    = [...regs].sort((a,b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
        const primero   = sorted[0]
        const ultimo    = sorted[sorted.length - 1]
        const recorrido = Math.max(0, ultimo.kilometraje - primero.kilometraje)

        return {
          codigo:       codigos[id],
          kmInicio:     primero.kilometraje,
          kmFin:        ultimo.kilometraje,
          kmRecorridos: recorrido,
          registros:    regs.length,
          fechaInicio:  primero.created_at,
          fechaFin:     ultimo.created_at,
        }
      })
      .sort((a, b) => b.kmRecorridos - a.kmRecorridos)
  }, [todosRegistros])

  const maxRecorrido = recorridosPorAmb.length > 0 ? recorridosPorAmb[0].kmRecorridos : 1
  const totalRecorrido = recorridosPorAmb.reduce((s, a) => s + a.kmRecorridos, 0)

  /* ── ELIMINAR ── */
  async function eliminar(id: string) {
    if (!confirm("¿Eliminar registro?")) return
    await supabase.from("registro_kilometraje").delete().eq("id", id)
    cargar()
  }

  async function limpiarDia() {
    if (!confirm("⚠️ Eliminar TODOS los registros del día?")) return
    const inicio = new Date(fecha + "T00:00:00")
    const fin    = new Date(fecha + "T23:59:59")
    await supabase.from("registro_kilometraje").delete()
      .gte("created_at", inicio.toISOString())
      .lte("created_at", fin.toISOString())
    cargar()
  }

  /* ── STATS DIARIOS ── */
  const statsDiarios = useMemo(() => {
    if (registros.length === 0) return null
    const kms = registros.map(r => r.kilometraje)
    return {
      total:    registros.length,
      promedio: Math.round(kms.reduce((a,b) => a+b, 0) / kms.length),
      max:      Math.max(...kms),
      min:      Math.min(...kms),
    }
  }, [registros])

  /* ── ESTILOS ── */
  const inp: React.CSSProperties = {
    background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)",
    color:"white", padding:"9px 13px", borderRadius:8, fontSize:11,
    outline:"none", fontFamily:"'Space Mono','Courier New',monospace",
  }

  /* ═══════════════════════ RENDER ═══════════════════════ */
  return (
    <div style={{ background:"#050b15", minHeight:"100vh", color:"white", fontFamily:"'Space Mono','Courier New',monospace", position:"relative" }}>

      {/* Fondo decorativo */}
      <div style={{ position:"fixed", inset:0, pointerEvents:"none", zIndex:0, overflow:"hidden" }}>
        <div style={{ position:"absolute", top:-100, right:-100, width:300, height:300, borderRadius:"50%", background:"radial-gradient(circle,rgba(34,211,238,0.05) 0%,transparent 70%)", filter:"blur(40px)" }}/>
        <div style={{ position:"absolute", bottom:-80, left:-80, width:250, height:250, borderRadius:"50%", background:"radial-gradient(circle,rgba(167,139,250,0.04) 0%,transparent 70%)", filter:"blur(40px)" }}/>
      </div>

      {/* ── HEADER ── */}
      <div style={{ position:"sticky", top:0, zIndex:20, background:"rgba(5,11,21,0.97)", backdropFilter:"blur(14px)", borderBottom:"1px solid rgba(255,255,255,0.07)" }}>
        <div style={{ maxWidth:1200, margin:"0 auto", padding:"13px 18px", display:"flex", justifyContent:"space-between", alignItems:"center", gap:12, flexWrap:"wrap" }}>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <div style={{ width:38, height:38, borderRadius:10, background:"linear-gradient(135deg,#0891b2,#0e7490)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>📊</div>
            <div>
              <p style={{ margin:0, fontSize:13, fontWeight:800, color:"#f1f5f9", letterSpacing:"0.04em" }}>KILOMETRAJE</p>
              <p style={{ margin:0, fontSize:8, color:"#475569", letterSpacing:"0.08em" }}>MONITOREO DE REGISTROS POR UNIDAD</p>
            </div>
          </div>
          <button onClick={() => router.back()} style={{ background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)", color:"#94a3b8", padding:"7px 14px", borderRadius:7, fontSize:10, fontWeight:700, cursor:"pointer" }}>← Volver</button>
        </div>

        {/* Tabs */}
        <div style={{ maxWidth:1200, margin:"0 auto", padding:"0 18px 12px", display:"flex", gap:6 }}>
          {([
            { k:"diario",  l:"📅 Registros Diarios"  },
            { k:"mensual", l:"🛣️ KM Recorridos / Mes" },
          ] as const).map(t => (
            <button key={t.k} onClick={() => setVista(t.k)} style={{
              background: vista===t.k ? "rgba(34,211,238,0.12)" : "rgba(255,255,255,0.03)",
              border:     `1px solid ${vista===t.k ? "rgba(34,211,238,0.4)" : "rgba(255,255,255,0.07)"}`,
              color:      vista===t.k ? "#22d3ee" : "#475569",
              padding:"7px 16px", borderRadius:7, fontSize:10, fontWeight:700, cursor:"pointer", letterSpacing:"0.04em",
            }}>{t.l}</button>
          ))}
        </div>
      </div>

      <div style={{ maxWidth:1200, margin:"0 auto", padding:"16px 18px 40px", position:"relative", zIndex:1 }}>

        {/* ════════════════════ VISTA DIARIA ════════════════════ */}
        {vista === "diario" && (
          <>
            {/* Controles */}
            <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:16, alignItems:"center" }}>
              <input type="date" value={fecha} onChange={e => setFecha(e.target.value)} style={inp}/>
              <button onClick={() => setFecha(new Date().toISOString().split("T")[0])} style={{ background:"rgba(34,211,238,0.12)", border:"1px solid rgba(34,211,238,0.3)", color:"#22d3ee", padding:"9px 14px", borderRadius:8, fontSize:10, fontWeight:700, cursor:"pointer" }}>
                📅 Hoy
              </button>
              <button onClick={limpiarDia} style={{ background:"rgba(220,38,38,0.12)", border:"1px solid rgba(220,38,38,0.3)", color:"#f87171", padding:"9px 14px", borderRadius:8, fontSize:10, fontWeight:700, cursor:"pointer" }}>
                🗑 Limpiar día
              </button>
              <span style={{ fontSize:9, color:"#475569", marginLeft:4 }}>{fmtFecha(fecha + "T12:00:00")}</span>
            </div>

            {/* Stats diarios */}
            {statsDiarios && (
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))", gap:8, marginBottom:18 }}>
                {[
                  { l:"REGISTROS HOY", v:statsDiarios.total,         c:"#38bdf8" },
                  { l:"LECTURA PROM.", v:statsDiarios.promedio+" km", c:"#22c55e" },
                  { l:"LECTURA MÁX.",  v:statsDiarios.max+" km",      c:"#a78bfa" },
                  { l:"LECTURA MÍN.",  v:statsDiarios.min+" km",      c:"#64748b" },
                ].map(k => (
                  <div key={k.l} style={{ background:"linear-gradient(135deg,rgba(15,23,42,0.95),rgba(13,20,36,0.95))", border:`1px solid ${k.c}25`, borderRadius:11, padding:"11px 13px", position:"relative", overflow:"hidden" }}>
                    <div style={{ position:"absolute", top:0, right:0, width:40, height:40, borderRadius:"0 11px 0 40px", background:`${k.c}10` }}/>
                    <p style={{ margin:0, fontSize:7, color:"#64748b", letterSpacing:"0.1em", fontWeight:700 }}>{k.l}</p>
                    <p style={{ margin:"4px 0 0", fontSize:18, fontWeight:900, color:k.c, lineHeight:1 }}>{k.v}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Lista registros */}
            {loading ? (
              <div style={{ textAlign:"center", padding:40, color:"#334155", fontSize:11 }}>Cargando...</div>
            ) : registros.length === 0 ? (
              <div style={{ border:"1px dashed rgba(255,255,255,0.07)", borderRadius:12, padding:40, textAlign:"center" }}>
                <span style={{ fontSize:28 }}>📭</span>
                <p style={{ margin:"10px 0 0", fontSize:11, color:"#334155", letterSpacing:"0.06em" }}>Sin registros para este día</p>
              </div>
            ) : (
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {registros.map((r, i) => (
                  <div key={r.id} style={{
                    background: i%2===0 ? "rgba(11,17,32,0.95)" : "rgba(15,23,42,0.95)",
                    border:"1px solid rgba(255,255,255,0.07)", borderRadius:11, padding:"12px 16px",
                    display:"flex", justifyContent:"space-between", alignItems:"center", gap:12, flexWrap:"wrap",
                  }}>
                    <div style={{ display:"flex", alignItems:"center", gap:9, minWidth:120 }}>
                      <div style={{ width:8, height:8, borderRadius:"50%", background:"#22d3ee", flexShrink:0, boxShadow:"0 0 5px #22d3ee" }}/>
                      <span style={{ fontSize:12, fontWeight:800, color:"#f1f5f9", letterSpacing:"0.04em" }}>
                        🚑 {r.ambulancias?.codigo_operativo || r.ambulancia_id}
                      </span>
                    </div>
                    <div style={{ textAlign:"center", flex:1 }}>
                      <span style={{ fontSize:20, fontWeight:900, color:"#22c55e", letterSpacing:"0.03em" }}>
                        {r.kilometraje.toLocaleString()}
                      </span>
                      <span style={{ fontSize:10, color:"#475569", marginLeft:4 }}>km</span>
                    </div>
                    <div style={{ display:"flex", alignItems:"center", gap:10, flexShrink:0 }}>
                      <p style={{ margin:0, fontSize:10, color:"#64748b" }}>🕒 {fmtHora(r.created_at)}</p>
                      <button onClick={() => eliminar(r.id)} style={{ background:"rgba(220,38,38,0.1)", border:"1px solid rgba(220,38,38,0.25)", color:"#f87171", padding:"6px 10px", borderRadius:7, fontSize:12, cursor:"pointer" }}>🗑</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ════════════════════ VISTA MENSUAL ════════════════════ */}
        {vista === "mensual" && (
          <>
            {/* Selector mes */}
            <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:16, alignItems:"center" }}>
              <input type="month" value={mesSeleccionado} onChange={e => setMesSeleccionado(e.target.value)} style={inp}/>
              <button onClick={() => setMesSeleccionado(new Date().toISOString().slice(0,7))} style={{ background:"rgba(34,211,238,0.12)", border:"1px solid rgba(34,211,238,0.3)", color:"#22d3ee", padding:"9px 14px", borderRadius:8, fontSize:10, fontWeight:700, cursor:"pointer" }}>
                📅 Mes actual
              </button>
              <span style={{ fontSize:10, color:"#22d3ee", fontWeight:700, letterSpacing:"0.06em" }}>
                {getMesLabel(mesSeleccionado)}
              </span>
            </div>

            {/* Explicación */}
            <div style={{ background:"rgba(34,211,238,0.05)", border:"1px solid rgba(34,211,238,0.15)", borderRadius:10, padding:"10px 14px", marginBottom:18, display:"flex", alignItems:"center", gap:8 }}>
              <span style={{ fontSize:14 }}>ℹ️</span>
              <p style={{ margin:0, fontSize:9, color:"#64748b", lineHeight:1.5 }}>
                Los <b style={{ color:"#22d3ee" }}>KM recorridos</b> se calculan como la diferencia entre el{" "}
                <b style={{ color:"#22c55e" }}>último registro</b> y el{" "}
                <b style={{ color:"#a78bfa" }}>primer registro</b> del mes para cada ambulancia.
              </p>
            </div>

            {/* KPIs mensuales */}
            {todosRegistros.length > 0 && (
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))", gap:8, marginBottom:22 }}>
                {[
                  { l:"AMBULANCIAS",       v:recorridosPorAmb.length,             c:"#38bdf8" },
                  { l:"KM TOTAL FLOTA",    v:totalRecorrido.toLocaleString()+" km", c:"#22c55e" },
                  { l:"PROMEDIO POR AMB.", v:recorridosPorAmb.length>0 ? Math.round(totalRecorrido/recorridosPorAmb.length).toLocaleString()+" km" : "—", c:"#a78bfa" },
                  { l:"REGISTROS MES",     v:todosRegistros.length,               c:"#64748b" },
                ].map(k => (
                  <div key={k.l} style={{ background:"linear-gradient(135deg,rgba(15,23,42,0.95),rgba(13,20,36,0.95))", border:`1px solid ${k.c}25`, borderRadius:11, padding:"12px 14px", position:"relative", overflow:"hidden" }}>
                    <div style={{ position:"absolute", top:0, right:0, width:44, height:44, borderRadius:"0 11px 0 44px", background:`${k.c}10` }}/>
                    <p style={{ margin:0, fontSize:7, color:"#64748b", letterSpacing:"0.1em", fontWeight:700 }}>{k.l}</p>
                    <p style={{ margin:"5px 0 0", fontSize:20, fontWeight:900, color:k.c, lineHeight:1 }}>{k.v}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Label sección */}
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12 }}>
              <div style={{ width:3, height:16, borderRadius:2, background:"#22d3ee" }}/>
              <span style={{ fontSize:10, color:"#e2e8f0", letterSpacing:"0.1em", fontWeight:800 }}>KM RECORRIDOS POR AMBULANCIA</span>
            </div>

            {recorridosPorAmb.length === 0 ? (
              <div style={{ border:"1px dashed rgba(255,255,255,0.07)", borderRadius:12, padding:40, textAlign:"center" }}>
                <span style={{ fontSize:28 }}>📭</span>
                <p style={{ margin:"10px 0 0", fontSize:11, color:"#334155", letterSpacing:"0.06em" }}>Sin registros para este mes</p>
              </div>
            ) : (
              <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                {recorridosPorAmb.map((a, i) => {
                  const barPct = maxRecorrido > 0 ? Math.round((a.kmRecorridos / maxRecorrido) * 100) : 0
                  const pctFlota = totalRecorrido > 0 ? Math.round((a.kmRecorridos / totalRecorrido) * 100) : 0
                  const color = i===0 ? "#fbbf24" : i===1 ? "#94a3b8" : i===2 ? "#cd7f32" : "#22d3ee"
                  const medal = i===0 ? "🥇" : i===1 ? "🥈" : i===2 ? "🥉" : null

                  return (
                    <div key={a.codigo} style={{ background:"rgba(11,17,32,0.97)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:14, overflow:"hidden", borderLeft:`4px solid ${color}` }}>

                      {/* Header */}
                      <div style={{ padding:"14px 18px 10px", display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:10 }}>
                        {/* Nombre + ranking */}
                        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                          {medal && <span style={{ fontSize:18 }}>{medal}</span>}
                          <div>
                            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                              <span style={{ fontSize:14, fontWeight:900, color:"#f1f5f9", letterSpacing:"0.05em" }}>🚑 {a.codigo}</span>
                              <span style={{ background:`${color}18`, border:`1px solid ${color}35`, color, fontSize:8, fontWeight:700, padding:"2px 8px", borderRadius:4 }}>#{i+1}</span>
                            </div>
                            <p style={{ margin:"3px 0 0", fontSize:8, color:"#334155" }}>
                              {fmtShort(a.fechaInicio)} → {fmtShort(a.fechaFin)} · {a.registros} registros
                            </p>
                          </div>
                        </div>

                        {/* KM recorridos — número grande */}
                        <div style={{ textAlign:"right" }}>
                          <p style={{ margin:0, fontSize:7, color:"#475569", letterSpacing:"0.1em", fontWeight:700 }}>KM RECORRIDOS EN EL MES</p>
                          <p style={{ margin:"3px 0 0", fontSize:28, fontWeight:900, color, lineHeight:1 }}>
                            {a.kmRecorridos.toLocaleString()}
                            <span style={{ fontSize:12, fontWeight:400, color:"#64748b", marginLeft:4 }}>km</span>
                          </p>
                        </div>
                      </div>

                      {/* Barra recorrido */}
                      <div style={{ padding:"0 18px 12px" }}>
                        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:6 }}>
                          <div style={{ flex:1, background:"rgba(255,255,255,0.05)", borderRadius:999, height:8, overflow:"hidden" }}>
                            <div style={{ width:`${barPct}%`, height:"100%", background:`linear-gradient(90deg,${color},${color}99)`, borderRadius:999, transition:"width 0.6s" }}/>
                          </div>
                          <span style={{ fontSize:9, color, fontWeight:700, width:36, textAlign:"right", flexShrink:0 }}>{barPct}%</span>
                        </div>
                        <p style={{ margin:0, fontSize:8, color:"#334155" }}>
                          {pctFlota}% del total de la flota este mes
                        </p>
                      </div>

                      {/* Detalle: inicio → fin */}
                      <div style={{ borderTop:"1px solid rgba(255,255,255,0.05)", padding:"10px 18px", display:"grid", gridTemplateColumns:"1fr auto 1fr", alignItems:"center", gap:8 }}>
                        {/* Inicio */}
                        <div style={{ background:"rgba(167,139,250,0.06)", border:"1px solid rgba(167,139,250,0.15)", borderRadius:8, padding:"8px 12px" }}>
                          <p style={{ margin:0, fontSize:7, color:"#475569", letterSpacing:"0.08em", fontWeight:700 }}>INICIO DEL MES</p>
                          <p style={{ margin:"3px 0 0", fontSize:14, fontWeight:800, color:"#a78bfa" }}>{a.kmInicio.toLocaleString()} km</p>
                          <p style={{ margin:"2px 0 0", fontSize:8, color:"#334155" }}>{fmtShort(a.fechaInicio)}</p>
                        </div>

                        {/* Flecha */}
                        <div style={{ textAlign:"center" }}>
                          <div style={{ fontSize:16, color:color }}>→</div>
                          <div style={{ fontSize:8, color, fontWeight:800, marginTop:2 }}>+{a.kmRecorridos.toLocaleString()} km</div>
                        </div>

                        {/* Fin */}
                        <div style={{ background:"rgba(34,197,94,0.06)", border:"1px solid rgba(34,197,94,0.15)", borderRadius:8, padding:"8px 12px" }}>
                          <p style={{ margin:0, fontSize:7, color:"#475569", letterSpacing:"0.08em", fontWeight:700 }}>FIN DEL MES</p>
                          <p style={{ margin:"3px 0 0", fontSize:14, fontWeight:800, color:"#22c55e" }}>{a.kmFin.toLocaleString()} km</p>
                          <p style={{ margin:"2px 0 0", fontSize:8, color:"#334155" }}>{fmtShort(a.fechaFin)}</p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}

        <div style={{ marginTop:24, textAlign:"center", fontSize:8, color:"#1e293b", letterSpacing:"0.08em" }}>
          SISTEMA DE GESTIÓN DE FLOTA · KILOMETRAJE
        </div>
      </div>
    </div>
  )
}