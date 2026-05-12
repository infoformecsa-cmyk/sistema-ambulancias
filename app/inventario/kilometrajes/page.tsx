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

type PromedioAmb = {
  codigo: string
  promedio: number
  total: number
  registros: number
  min: number
  max: number
}

/* ── HELPERS ── */
function fmtHora(iso: string) {
  return new Date(iso).toLocaleTimeString("es-EC", { hour:"2-digit", minute:"2-digit" })
}
function fmtFecha(iso: string) {
  return new Date(iso).toLocaleDateString("es-EC", { day:"2-digit", month:"short", year:"numeric" })
}
function getMesLabel(fecha: string) {
  const d = new Date(fecha + "-01")
  return d.toLocaleString("es-EC", { month:"long", year:"numeric" }).toUpperCase()
}

export default function Kilometraje() {
  const router = useRouter()

  const [registros,      setRegistros]      = useState<Registro[]>([])
  const [todosRegistros, setTodosRegistros] = useState<Registro[]>([])
  const [fecha,          setFecha]          = useState(() => new Date().toISOString().split("T")[0])
  const [mesSeleccionado,setMesSeleccionado]= useState(() => new Date().toISOString().slice(0,7))
  const [vista,          setVista]          = useState<"diario"|"mensual">("diario")
  const [loading,        setLoading]        = useState(false)

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
      .order("created_at", { ascending: false })

    setTodosRegistros((data || []) as Registro[])
  }

  /* ── PROMEDIOS MENSUAL ── */
  const promediosPorAmb = useMemo((): PromedioAmb[] => {
    const map: Record<string, number[]> = {}
    const codigos: Record<string, string> = {}

    todosRegistros.forEach(r => {
      const id = r.ambulancia_id
      if (!map[id]) map[id] = []
      map[id].push(r.kilometraje)
      codigos[id] = r.ambulancias?.codigo_operativo || id
    })

    return Object.entries(map)
      .map(([id, kms]) => ({
        codigo:    codigos[id],
        promedio:  Math.round(kms.reduce((a, b) => a + b, 0) / kms.length),
        total:     kms.reduce((a, b) => a + b, 0),
        registros: kms.length,
        min:       Math.min(...kms),
        max:       Math.max(...kms),
      }))
      .sort((a, b) => b.promedio - a.promedio)
  }, [todosRegistros])

  const maxPromedio = promediosPorAmb.length > 0 ? promediosPorAmb[0].promedio : 1

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
      promedio: Math.round(kms.reduce((a,b)=>a+b,0) / kms.length),
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

  return (
    <div style={{ background:"#050b15", minHeight:"100vh", color:"white", fontFamily:"'Space Mono','Courier New',monospace", position:"relative" }}>

      {/* Fondo */}
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
              <p style={{ margin:0, fontSize:13, fontWeight:800, color:"#f1f5f9", letterSpacing:"0.04em" }}>KILOMETRAJE DIARIO</p>
              <p style={{ margin:0, fontSize:8, color:"#475569", letterSpacing:"0.08em" }}>MONITOREO DE REGISTROS POR UNIDAD</p>
            </div>
          </div>
          <button onClick={() => router.back()} style={{ background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)", color:"#94a3b8", padding:"7px 14px", borderRadius:7, fontSize:10, fontWeight:700, cursor:"pointer" }}>← Volver</button>
        </div>

        {/* Tabs */}
        <div style={{ maxWidth:1200, margin:"0 auto", padding:"0 18px 12px", display:"flex", gap:6 }}>
          {([
            { k:"diario",   l:"📅 Vista Diaria"   },
            { k:"mensual",  l:"📈 Promedio Mensual" },
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

        {/* ════════ VISTA DIARIA ════════ */}
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
              <span style={{ fontSize:9, color:"#334155", marginLeft:4 }}>
                {fmtFecha(fecha + "T12:00:00")}
              </span>
            </div>

            {/* Stats diarios */}
            {statsDiarios && (
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))", gap:8, marginBottom:18 }}>
                {[
                  { l:"REGISTROS",  v:statsDiarios.total,    c:"#38bdf8"  },
                  { l:"PROMEDIO",   v:statsDiarios.promedio+" km", c:"#22c55e" },
                  { l:"MÁXIMO",     v:statsDiarios.max+" km",      c:"#a78bfa" },
                  { l:"MÍNIMO",     v:statsDiarios.min+" km",      c:"#64748b" },
                ].map(k => (
                  <div key={k.l} style={{ background:"linear-gradient(135deg,rgba(15,23,42,0.95),rgba(13,20,36,0.95))", border:`1px solid ${k.c}25`, borderRadius:11, padding:"11px 13px", position:"relative", overflow:"hidden" }}>
                    <div style={{ position:"absolute", top:0, right:0, width:40, height:40, borderRadius:"0 11px 0 40px", background:`${k.c}10` }}/>
                    <p style={{ margin:0, fontSize:7, color:"#64748b", letterSpacing:"0.1em", fontWeight:700 }}>{k.l}</p>
                    <p style={{ margin:"4px 0 0", fontSize:18, fontWeight:900, color:k.c, lineHeight:1 }}>{k.v}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Lista */}
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
                    border:"1px solid rgba(255,255,255,0.07)",
                    borderRadius:11, padding:"12px 16px",
                    display:"flex", justifyContent:"space-between", alignItems:"center", gap:12, flexWrap:"wrap",
                  }}>
                    {/* Ambulancia */}
                    <div style={{ display:"flex", alignItems:"center", gap:9, minWidth:120 }}>
                      <div style={{ width:8, height:8, borderRadius:"50%", background:"#22d3ee", flexShrink:0, boxShadow:"0 0 5px #22d3ee" }}/>
                      <span style={{ fontSize:12, fontWeight:800, color:"#f1f5f9", letterSpacing:"0.04em" }}>
                        🚑 {r.ambulancias?.codigo_operativo || r.ambulancia_id}
                      </span>
                    </div>

                    {/* KM — grande y centrado */}
                    <div style={{ textAlign:"center", flex:1 }}>
                      <span style={{ fontSize:20, fontWeight:900, color:"#22c55e", letterSpacing:"0.03em" }}>
                        {r.kilometraje.toLocaleString()}
                      </span>
                      <span style={{ fontSize:10, color:"#475569", marginLeft:4 }}>km</span>
                    </div>

                    {/* Hora + eliminar */}
                    <div style={{ display:"flex", alignItems:"center", gap:10, flexShrink:0 }}>
                      <div style={{ textAlign:"right" }}>
                        <p style={{ margin:0, fontSize:10, color:"#64748b" }}>🕒 {fmtHora(r.created_at)}</p>
                      </div>
                      <button onClick={() => eliminar(r.id)} style={{ background:"rgba(220,38,38,0.1)", border:"1px solid rgba(220,38,38,0.25)", color:"#f87171", padding:"6px 10px", borderRadius:7, fontSize:12, cursor:"pointer" }}>🗑</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ════════ VISTA MENSUAL ════════ */}
        {vista === "mensual" && (
          <>
            {/* Selector mes */}
            <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:16, alignItems:"center" }}>
              <input
                type="month"
                value={mesSeleccionado}
                onChange={e => setMesSeleccionado(e.target.value)}
                style={inp}
              />
              <button onClick={() => setMesSeleccionado(new Date().toISOString().slice(0,7))} style={{ background:"rgba(34,211,238,0.12)", border:"1px solid rgba(34,211,238,0.3)", color:"#22d3ee", padding:"9px 14px", borderRadius:8, fontSize:10, fontWeight:700, cursor:"pointer" }}>
                📅 Mes actual
              </button>
              <span style={{ fontSize:10, color:"#22d3ee", fontWeight:700, letterSpacing:"0.06em" }}>
                {getMesLabel(mesSeleccionado)}
              </span>
            </div>

            {/* Resumen mensual */}
            {todosRegistros.length > 0 && (
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))", gap:8, marginBottom:20 }}>
                {[
                  { l:"REGISTROS TOTALES", v:todosRegistros.length,                                                                                          c:"#38bdf8" },
                  { l:"AMBULANCIAS",       v:promediosPorAmb.length,                                                                                         c:"#22d3ee" },
                  { l:"PROMEDIO GLOBAL",   v:Math.round(todosRegistros.reduce((s,r)=>s+r.kilometraje,0)/todosRegistros.length).toLocaleString()+" km",        c:"#22c55e" },
                  { l:"KM TOTAL",          v:todosRegistros.reduce((s,r)=>s+r.kilometraje,0).toLocaleString()+" km",                                         c:"#a78bfa" },
                ].map(k => (
                  <div key={k.l} style={{ background:"linear-gradient(135deg,rgba(15,23,42,0.95),rgba(13,20,36,0.95))", border:`1px solid ${k.c}25`, borderRadius:11, padding:"11px 13px", position:"relative", overflow:"hidden" }}>
                    <div style={{ position:"absolute", top:0, right:0, width:40, height:40, borderRadius:"0 11px 0 40px", background:`${k.c}10` }}/>
                    <p style={{ margin:0, fontSize:7, color:"#64748b", letterSpacing:"0.1em", fontWeight:700 }}>{k.l}</p>
                    <p style={{ margin:"4px 0 0", fontSize:16, fontWeight:900, color:k.c, lineHeight:1 }}>{k.v}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Sección label */}
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12 }}>
              <div style={{ width:3, height:16, borderRadius:2, background:"#22d3ee" }}/>
              <span style={{ fontSize:10, color:"#e2e8f0", letterSpacing:"0.1em", fontWeight:800 }}>PROMEDIO POR AMBULANCIA</span>
            </div>

            {promediosPorAmb.length === 0 ? (
              <div style={{ border:"1px dashed rgba(255,255,255,0.07)", borderRadius:12, padding:40, textAlign:"center" }}>
                <span style={{ fontSize:28 }}>📭</span>
                <p style={{ margin:"10px 0 0", fontSize:11, color:"#334155", letterSpacing:"0.06em" }}>Sin registros para este mes</p>
              </div>
            ) : (
              <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                {promediosPorAmb.map((a, i) => {
                  const barPct = Math.round((a.promedio / maxPromedio) * 100)
                  const color  = i===0?"#fbbf24":i===1?"#94a3b8":i===2?"#cd7f32":"#22d3ee"
                  const medal  = i===0?"🥇":i===1?"🥈":i===2?"🥉":null

                  return (
                    <div key={a.codigo} style={{ background:"rgba(11,17,32,0.97)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:13, padding:"14px 18px", borderLeft:`4px solid ${color}` }}>

                      {/* Fila principal */}
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10, flexWrap:"wrap", gap:8 }}>
                        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                          {medal && <span style={{ fontSize:16 }}>{medal}</span>}
                          <span style={{ fontSize:13, fontWeight:900, color:"#f1f5f9", letterSpacing:"0.05em" }}>🚑 {a.codigo}</span>
                          <span style={{ background:`${color}15`, border:`1px solid ${color}35`, color, fontSize:8, fontWeight:700, padding:"2px 8px", borderRadius:4 }}>
                            #{i+1} RANKING
                          </span>
                        </div>
                        <div style={{ display:"flex", gap:16, flexWrap:"wrap" }}>
                          <div style={{ textAlign:"center" }}>
                            <p style={{ margin:0, fontSize:7, color:"#475569", letterSpacing:"0.08em", fontWeight:700 }}>PROMEDIO</p>
                            <p style={{ margin:"2px 0 0", fontSize:18, fontWeight:900, color, lineHeight:1 }}>{a.promedio.toLocaleString()} <span style={{ fontSize:10, fontWeight:400 }}>km</span></p>
                          </div>
                          <div style={{ textAlign:"center" }}>
                            <p style={{ margin:0, fontSize:7, color:"#475569", letterSpacing:"0.08em", fontWeight:700 }}>TOTAL</p>
                            <p style={{ margin:"2px 0 0", fontSize:14, fontWeight:800, color:"#94a3b8", lineHeight:1 }}>{a.total.toLocaleString()} km</p>
                          </div>
                          <div style={{ textAlign:"center" }}>
                            <p style={{ margin:0, fontSize:7, color:"#475569", letterSpacing:"0.08em", fontWeight:700 }}>REGISTROS</p>
                            <p style={{ margin:"2px 0 0", fontSize:14, fontWeight:800, color:"#64748b", lineHeight:1 }}>{a.registros}</p>
                          </div>
                        </div>
                      </div>

                      {/* Barra proporcional */}
                      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                        <div style={{ flex:1, background:"rgba(255,255,255,0.05)", borderRadius:999, height:7, overflow:"hidden" }}>
                          <div style={{ width:`${barPct}%`, height:"100%", background:`linear-gradient(90deg,${color},${color}aa)`, borderRadius:999, transition:"width 0.5s" }}/>
                        </div>
                        <span style={{ fontSize:9, color, fontWeight:700, width:36, textAlign:"right", flexShrink:0 }}>{barPct}%</span>
                      </div>

                      {/* Min / Max */}
                      <div style={{ display:"flex", gap:16, marginTop:8 }}>
                        <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                          <span style={{ fontSize:8, color:"#334155" }}>MIN</span>
                          <span style={{ fontSize:9, color:"#22c55e", fontWeight:700 }}>{a.min.toLocaleString()} km</span>
                        </div>
                        <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                          <span style={{ fontSize:8, color:"#334155" }}>MÁX</span>
                          <span style={{ fontSize:9, color:"#f87171", fontWeight:700 }}>{a.max.toLocaleString()} km</span>
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
