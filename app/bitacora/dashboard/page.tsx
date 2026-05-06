"use client"

import { useEffect, useMemo, useState } from "react"
import type { CSSProperties } from "react"
import { supabase } from "@/lib/supabaseClient"
import { useRouter } from "next/navigation"

/* =========================================================
   TIPOS
========================================================= */
type ResumenType = {
  nombre: string
  faltantes: number
  criticos: number
  vencidos: number
  prioridad: "ALTA" | "MEDIA" | "OK"
  faltantesDetalle: any[]
  vencidosDetalle: any[]
  porcentaje: number
  porcMed: number
  porcOtros: number
}

type ModalMode = "ABASTECER" | "CAMBIO"

/* =========================================================
   CONFIG VISUAL
========================================================= */
const PRIORIDAD = {
  ALTA:  { c:"#ef4444", bg:"rgba(239,68,68,0.10)",  border:"rgba(239,68,68,0.35)",  icon:"🚨", label:"ALTA"    },
  MEDIA: { c:"#f59e0b", bg:"rgba(245,158,11,0.10)", border:"rgba(245,158,11,0.35)", icon:"⚠️", label:"MEDIA"   },
  OK:    { c:"#22c55e", bg:"rgba(34,197,94,0.10)",  border:"rgba(34,197,94,0.35)",  icon:"✅", label:"ÓPTIMO"  },
}

const ALERTA_COLOR = {
  VENCIDO:    { c:"#ef4444", bg:"rgba(239,68,68,0.12)",  border:"rgba(239,68,68,0.35)"  },
  CRITICO:    { c:"#f59e0b", bg:"rgba(245,158,11,0.12)", border:"rgba(245,158,11,0.35)" },
  PREVENTIVO: { c:"#38bdf8", bg:"rgba(56,189,248,0.12)", border:"rgba(56,189,248,0.35)" },
}

/* =========================================================
   SUBCOMPONENTES
========================================================= */
function Barra({ pct, color }: { pct: number; color: string }) {
  return (
    <div style={{ flex:1, height:6, borderRadius:999, background:"rgba(255,255,255,0.06)", overflow:"hidden" }}>
      <div style={{ width:`${Math.min(pct,100)}%`, height:"100%", background:color, borderRadius:999, transition:"width 0.4s" }}/>
    </div>
  )
}

/* =========================================================
   DASHBOARD
========================================================= */
export default function Dashboard() {
  const router = useRouter()

  const [loading,          setLoading]          = useState(true)
  const [alertas,          setAlertas]          = useState<any[]>([])
  const [resumen,          setResumen]          = useState<ResumenType[]>([])
  const [expandido,        setExpandido]        = useState<string | null>(null)
  const [modal,            setModal]            = useState(false)
  const [modo,             setModo]             = useState<ModalMode>("ABASTECER")
  const [itemSeleccionado, setItemSeleccionado] = useState<any>(null)
  const [cantidad,         setCantidad]         = useState("")
  const [lote,             setLote]             = useState("")
  const [fechaCaducidad,   setFechaCaducidad]   = useState("")
  const [guardando,        setGuardando]        = useState(false)

  /* ── INIT ── */
  useEffect(() => { init() }, [])

  async function init() {
    try {
      setLoading(true)
      await Promise.all([cargarAlertas(), calcularPrioridad()])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  /* ── HELPERS ── */
  function getNombre(item: any): string {
    if (Array.isArray(item)) return item[0]?.nombre || "Item"
    return item?.nombre || "Item"
  }

  function agruparPorCategoria(lista: any[]): Record<string, any[]> {
    const grupos: Record<string, any[]> = {}
    lista.forEach(i => {
      const cat = (i.categoria || "OTROS").toUpperCase()
      if (!grupos[cat]) grupos[cat] = []
      grupos[cat].push(i)
    })
    return grupos
  }

  /* ── CARGAR ALERTAS ── */
  async function cargarAlertas() {
    const { data, error } = await supabase
      .from("inventario_checklist")
      .select(`ambulancia_id, fecha_caducidad, inventario_items(nombre)`)
      .not("fecha_caducidad", "is", null)

    if (error) { console.error("alertas:", error); return }

    const hoy = new Date()

    const procesado = (data || []).map((i: any) => {
      const diff = (new Date(i.fecha_caducidad).getTime() - hoy.getTime()) / 86400000
      let estado = "OK"
      if (diff <= 0)        estado = "VENCIDO"
      else if (diff <= 30)  estado = "CRITICO"
      else if (diff <= 90)  estado = "PREVENTIVO"
      return { ambulancia: i.ambulancia_id, nombre: getNombre(i.inventario_items), estado, dias: Math.round(diff) }
    })

    setAlertas(procesado.filter(i => i.estado !== "OK"))
  }

  /* ── CALCULAR PRIORIDAD ── */
  async function calcularPrioridad() {
    const [
      { data: base,        error: e1 },
      { data: checklist,   error: e2 },
      { data: movimientos, error: e3 },
      { data: ambulancias, error: e4 },
    ] = await Promise.all([
      supabase.from("inventario_base").select("item_id,nombre,cantidad_minima,categoria"),
      supabase.from("inventario_checklist").select("*,inventario_items(nombre,categoria)").neq("estado","RETIRADO"),
      supabase.from("inventario_movimientos").select("*"),
      supabase.from("ambulancias").select("id,codigo_operativo"),
    ])

    if (e1 || e2 || e3 || e4) {
      console.error("calcularPrioridad errors:", e1, e2, e3, e4)
      return
    }

    if (!base || !checklist || !movimientos || !ambulancias) return

    const hoy = new Date()

    const resultado: ResumenType[] = ambulancias.map((a: any) => {
      /* stock acumulado */
      const stockMap: Record<string, number> = {}

      checklist
        .filter((i: any) => String(i.ambulancia_id) === String(a.id))
        .forEach((i: any) => {
          const id = String(i.item_id)
          stockMap[id] = (stockMap[id] || 0) + Number(i.cantidad || 0)
        })

      movimientos
        .filter((m: any) => String(m.ambulancia_id) === String(a.id))
        .forEach((m: any) => {
          const id = String(m.item_id)
          if (!stockMap[id]) stockMap[id] = 0
          const cant = Number(m.cantidad || 0)
          if (m.tipo === "CONSUMO") stockMap[id] -= cant
          if (m.tipo === "INGRESO") stockMap[id] += cant
          if (stockMap[id] < 0) stockMap[id] = 0
        })

      let faltantes = 0, criticos = 0, vencidos = 0, itemsOK = 0
      let totalMed = 0, okMed = 0, totalOtros = 0, okOtros = 0
      const faltantesDetalle: any[] = []
      const vencidosDetalle: any[] = []

      base.forEach((b: any) => {
        const id     = String(b.item_id)
        const actual = Number(stockMap[id] || 0)
        const minimo = Number(b.cantidad_minima || 0)
        const esMed  = (b.categoria || "").toLowerCase() === "medicamentos"

        if (esMed) { totalMed++;   if (actual >= minimo) okMed++   }
        else       { totalOtros++; if (actual >= minimo) okOtros++ }

        if (actual >= minimo) {
          itemsOK++
        } else {
          faltantes++
          faltantesDetalle.push({
            item_id:      b.item_id,
            nombre:       b.nombre,
            categoria:    b.categoria,
            actual,
            minimo,
            estado:       actual === 0 ? "SIN STOCK" : "INCOMPLETO",
            ambulancia_id: a.id,
          })
        }
      })

      checklist
        .filter((i: any) => String(i.ambulancia_id) === String(a.id))
        .forEach((i: any) => {
          if (!i.fecha_caducidad) return
          const diff = (new Date(i.fecha_caducidad).getTime() - hoy.getTime()) / 86400000
          if (diff <= 0) { vencidos++; vencidosDetalle.push(i) }
          else if (diff <= 30) criticos++
        })

      const prioridad: "ALTA" | "MEDIA" | "OK" =
        vencidos > 0 || faltantes >= 5 ? "ALTA" :
        criticos > 0 || faltantes > 0  ? "MEDIA" : "OK"

      const totalItems = base.length

      return {
        nombre:           a.codigo_operativo,
        faltantes,        criticos,         vencidos,
        prioridad,        faltantesDetalle, vencidosDetalle,
        porcentaje:       totalItems > 0 ? Math.round((itemsOK    / totalItems)  * 100) : 0,
        porcMed:          totalMed   > 0 ? Math.round((okMed      / totalMed)    * 100) : 0,
        porcOtros:        totalOtros > 0 ? Math.round((okOtros    / totalOtros)  * 100) : 0,
      }
    })

    resultado.sort((a, b) => a.nombre.localeCompare(b.nombre, undefined, { numeric: true }))
    setResumen(resultado)
  }

  /* ── MODAL ── */
  function abrirModal(item: any, tipo: ModalMode) {
    setModo(tipo); setItemSeleccionado(item)
    setCantidad(""); setLote(""); setFechaCaducidad("")
    setModal(true)
  }

  async function retirarItem(item: any) {
    try {
      await supabase.from("inventario_checklist")
        .update({ estado:"RETIRADO", cantidad:0 })
        .eq("id", item.id)
      await init()
    } catch (e) { console.error(e); alert("Error retirando item") }
  }

  async function guardar() {
    if (!itemSeleccionado) return
    if (!cantidad || Number(cantidad) <= 0) { alert("Ingresa una cantidad válida"); return }
    try {
      setGuardando(true)
      if (modo === "CAMBIO") await retirarItem(itemSeleccionado)
      const { error } = await supabase.from("inventario_checklist").insert({
        ambulancia_id:   itemSeleccionado.ambulancia_id,
        item_id:         itemSeleccionado.item_id,
        cantidad:        Number(cantidad),
        lote:            lote.trim()          || null,
        fecha_caducidad: fechaCaducidad.trim() || null,
        fecha_registro:  new Date().toISOString(),
        estado:          "ABASTECIMIENTO",
      })
      if (error) throw error
      setModal(false); await init()
    } catch (e) { console.error(e); alert("Error guardando") }
    finally { setGuardando(false) }
  }

  /* ── ACCIONES ── */
  function cerrarSesion() { localStorage.clear(); router.replace("/") }
  function irHistorial()  { router.push("/inventario/historial") }

  /* ── MEMOS ── */
  const totalFaltantes = useMemo(() => resumen.reduce((s, a) => s + a.faltantes, 0), [resumen])
  const totalVencidos  = useMemo(() => resumen.reduce((s, a) => s + a.vencidos,  0), [resumen])
  const ambsAlta       = useMemo(() => resumen.filter(a => a.prioridad === "ALTA").length, [resumen])

  /* =========================================================
     ESTILOS
  ========================================================= */
  const inp: CSSProperties = {
    width:"100%", boxSizing:"border-box" as const, marginBottom:10,
    padding:"11px 13px", borderRadius:9,
    border:"1px solid rgba(255,255,255,0.08)",
    background:"rgba(255,255,255,0.04)",
    color:"white", outline:"none",
    fontFamily:"'Space Mono','Courier New',monospace", fontSize:11,
  }

  /* ── LOADING ── */
  if (loading) {
    return (
      <div style={{ minHeight:"100vh", background:"#050b15", color:"white", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", fontFamily:"'Space Mono',monospace", gap:12 }}>
        <div style={{ width:40, height:40, borderRadius:12, background:"linear-gradient(135deg,#0891b2,#155e75)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20 }}>🚑</div>
        <p style={{ color:"#22d3ee", fontSize:11, letterSpacing:"0.1em", fontWeight:700 }}>CARGANDO SISTEMA EMS...</p>
      </div>
    )
  }

  /* =========================================================
     RENDER
  ========================================================= */
  return (
    <div style={{ background:"#050b15", minHeight:"100vh", color:"white", fontFamily:"'Space Mono','Courier New',monospace", position:"relative" }}>

      {/* Fondo decorativo */}
      <div style={{ position:"fixed", inset:0, pointerEvents:"none", zIndex:0, overflow:"hidden" }}>
        <div style={{ position:"absolute", top:-100, right:-100, width:350, height:350, borderRadius:"50%", background:"radial-gradient(circle,rgba(56,189,248,0.05) 0%,transparent 70%)", filter:"blur(40px)" }}/>
        <div style={{ position:"absolute", bottom:-100, left:-100, width:280, height:280, borderRadius:"50%", background:"radial-gradient(circle,rgba(167,139,250,0.05) 0%,transparent 70%)", filter:"blur(40px)" }}/>
      </div>

      {/* ── HEADER ── */}
      <div style={{ position:"sticky", top:0, zIndex:20, background:"rgba(5,11,21,0.96)", backdropFilter:"blur(14px)", borderBottom:"1px solid rgba(255,255,255,0.07)" }}>
        <div style={{ maxWidth:1400, margin:"0 auto", padding:"13px 18px", display:"flex", justifyContent:"space-between", alignItems:"center", gap:16, flexWrap:"wrap" }}>

          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <div style={{ width:40, height:40, borderRadius:12, background:"linear-gradient(135deg,#0891b2,#155e75)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, flexShrink:0 }}>🚑</div>
            <div>
              <p style={{ margin:0, fontSize:13, fontWeight:900, color:"#f1f5f9", letterSpacing:"0.04em" }}>BITÁCORA SANITARIA</p>
              <p style={{ margin:0, fontSize:9, color:"#475569", letterSpacing:"0.08em" }}>DIR. PROVINCIAL DE SALUD DEL GUAYAS · SALUD MÓVIL</p>
            </div>
          </div>

          {/* Botones header — scroll horizontal en móvil */}
          <div style={{ overflowX:"auto", paddingBottom:2 }}>
            <div style={{ display:"flex", gap:8, width:"max-content" }}>
              <button onClick={irHistorial} style={{ background:"rgba(56,189,248,0.12)", border:"1px solid rgba(56,189,248,0.3)", color:"#38bdf8", padding:"8px 14px", borderRadius:8, fontSize:10, fontWeight:700, cursor:"pointer", letterSpacing:"0.04em", whiteSpace:"nowrap" }}>📊 Historial</button>
              <button onClick={cerrarSesion} style={{ background:"rgba(239,68,68,0.12)", border:"1px solid rgba(239,68,68,0.3)", color:"#ef4444", padding:"8px 14px", borderRadius:8, fontSize:10, fontWeight:700, cursor:"pointer", letterSpacing:"0.04em", whiteSpace:"nowrap" }}>🔐 Salir</button>
            </div>
          </div>
        </div>
      </div>

      {/* ── CONTENIDO ── */}
      <div style={{ maxWidth:1400, margin:"0 auto", padding:"16px 18px 40px", position:"relative", zIndex:1 }}>

        {/* KPIs */}
        <div style={{ fontSize:9, color:"#475569", letterSpacing:"0.12em", fontWeight:700, marginBottom:10 }}>▸ RESUMEN GLOBAL</div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))", gap:10, marginBottom:22 }}>
          {[
            { label:"AMBULANCIAS CRÍTICAS", value:ambsAlta,          color:"#ef4444" },
            { label:"ÍTEMS FALTANTES",      value:totalFaltantes,    color:"#f59e0b" },
            { label:"VENCIDOS",             value:totalVencidos,     color:"#fb7185" },
            { label:"ALERTAS ACTIVAS",      value:alertas.length,    color:"#a78bfa" },
          ].map(k => (
            <div key={k.label} style={{ background:"linear-gradient(135deg,rgba(15,23,42,0.95),rgba(13,20,36,0.95))", border:`1px solid ${k.color}25`, borderRadius:14, padding:"14px 16px", position:"relative", overflow:"hidden" }}>
              <div style={{ position:"absolute", top:0, right:0, width:50, height:50, borderRadius:"0 14px 0 50px", background:`${k.color}10` }}/>
              <p style={{ margin:0, fontSize:8, color:"#64748b", letterSpacing:"0.1em", fontWeight:700 }}>{k.label}</p>
              <p style={{ margin:"6px 0 0", fontSize:26, fontWeight:900, color:k.color, lineHeight:1 }}>{k.value}</p>
            </div>
          ))}
        </div>

        {/* Alertas caducidad */}
        {alertas.length > 0 && (
          <>
            <div style={{ fontSize:9, color:"#475569", letterSpacing:"0.12em", fontWeight:700, marginBottom:10 }}>▸ ALERTAS DE CADUCIDAD</div>
            <div style={{ display:"flex", flexDirection:"column", gap:7, marginBottom:22 }}>
              {alertas.map((al, i) => {
                const ac = ALERTA_COLOR[al.estado as keyof typeof ALERTA_COLOR] || ALERTA_COLOR["PREVENTIVO"]
                return (
                  <div key={i} style={{ background:ac.bg, border:`1px solid ${ac.border}`, borderRadius:10, padding:"10px 14px", display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:8 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                      <div style={{ width:7, height:7, borderRadius:"50%", background:ac.c, flexShrink:0, boxShadow:`0 0 5px ${ac.c}` }}/>
                      <div>
                        <span style={{ fontSize:11, fontWeight:700, color:"#f1f5f9" }}>{al.nombre}</span>
                        <span style={{ fontSize:9, color:"#64748b", marginLeft:8 }}>· {al.ambulancia}</span>
                      </div>
                    </div>
                    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                      <span style={{ background:ac.bg, border:`1px solid ${ac.border}`, color:ac.c, fontSize:8, fontWeight:700, padding:"2px 8px", borderRadius:4 }}>{al.estado}</span>
                      <span style={{ fontSize:9, color:ac.c, fontWeight:700 }}>{al.dias <= 0 ? `${Math.abs(al.dias)}d vencido` : `${al.dias}d restantes`}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}

        {/* Prioridad operativa */}
        <div style={{ fontSize:9, color:"#475569", letterSpacing:"0.12em", fontWeight:700, marginBottom:10 }}>▸ PRIORIDAD OPERATIVA</div>
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          {resumen.map(a => {
            const pr     = PRIORIDAD[a.prioridad]
            const isOpen = expandido === a.nombre
            const grupos = agruparPorCategoria(a.faltantesDetalle)

            return (
              <div key={a.nombre} style={{ background:"rgba(11,17,32,0.96)", border:`1px solid ${isOpen ? pr.border : "rgba(255,255,255,0.07)"}`, borderLeft:`4px solid ${pr.c}`, borderRadius:14, overflow:"hidden", transition:"border-color 0.2s" }}>

                {/* Header card */}
                <div onClick={() => setExpandido(isOpen ? null : a.nombre)} style={{ padding:"14px 16px", display:"flex", justifyContent:"space-between", alignItems:"center", gap:10, flexWrap:"wrap", cursor:"pointer" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:10, flexWrap:"wrap" }}>
                    <div style={{ width:9, height:9, borderRadius:"50%", background:pr.c, flexShrink:0, boxShadow:`0 0 6px ${pr.c}` }}/>
                    <span style={{ fontSize:14, fontWeight:900, color:"#f1f5f9", letterSpacing:"0.05em" }}>{a.nombre}</span>
                    <span style={{ background:pr.bg, border:`1px solid ${pr.border}`, color:pr.c, fontSize:9, fontWeight:800, padding:"3px 9px", borderRadius:5, letterSpacing:"0.04em" }}>{pr.icon} {pr.label}</span>
                  </div>
                  <div style={{ display:"flex", alignItems:"center", gap:6, flexWrap:"wrap" }}>
                    {a.faltantes > 0 && <span style={{ background:"rgba(245,158,11,0.12)", border:"1px solid rgba(245,158,11,0.3)", color:"#f59e0b", fontSize:9, fontWeight:700, padding:"3px 9px", borderRadius:999 }}>❌ {a.faltantes}</span>}
                    {a.vencidos  > 0 && <span style={{ background:"rgba(239,68,68,0.12)",  border:"1px solid rgba(239,68,68,0.3)",  color:"#ef4444", fontSize:9, fontWeight:700, padding:"3px 9px", borderRadius:999 }}>🚨 {a.vencidos}</span>}
                    {a.criticos  > 0 && <span style={{ background:"rgba(250,204,21,0.1)",  border:"1px solid rgba(250,204,21,0.3)", color:"#facc15", fontSize:9, fontWeight:700, padding:"3px 9px", borderRadius:999 }}>⚠ {a.criticos}</span>}
                    <span style={{ color:"#334155", fontSize:12, transform:isOpen?"rotate(180deg)":"none", transition:"transform 0.2s", display:"inline-block" }}>▼</span>
                  </div>
                </div>

                {/* Barras progreso */}
                <div style={{ padding:"0 16px 14px", display:"flex", flexDirection:"column", gap:7 }}>
                  {[
                    { l:"TOTAL",          v:a.porcentaje, c:a.porcentaje>=80?"#22c55e":a.porcentaje>=50?"#f59e0b":"#ef4444" },
                    { l:"MEDICAMENTOS",   v:a.porcMed,    c:"#a78bfa" },
                    { l:"INSUMOS/EQUIP",  v:a.porcOtros,  c:"#38bdf8" },
                  ].map(b => (
                    <div key={b.l} style={{ display:"flex", alignItems:"center", gap:10 }}>
                      <span style={{ width:100, fontSize:8, color:"#475569", letterSpacing:"0.06em", fontWeight:700, flexShrink:0 }}>{b.l}</span>
                      <Barra pct={b.v} color={b.c}/>
                      <span style={{ width:36, textAlign:"right", color:b.c, fontSize:10, fontWeight:800, flexShrink:0 }}>{b.v}%</span>
                    </div>
                  ))}
                </div>

                {/* Detalle expandido */}
                {isOpen && (
                  <div style={{ borderTop:"1px solid rgba(255,255,255,0.06)", padding:"14px 16px", display:"flex", flexDirection:"column", gap:12 }}>

                    {/* Faltantes */}
                    {a.faltantesDetalle.length > 0 && (
                      <div style={{ background:"rgba(245,158,11,0.05)", border:"1px solid rgba(245,158,11,0.15)", borderRadius:12, padding:"12px 14px" }}>
                        <p style={{ margin:"0 0 10px", fontSize:10, fontWeight:900, color:"#f59e0b", letterSpacing:"0.08em" }}>📦 REABASTECER</p>
                        {Object.entries(grupos).map(([cat, items]: any) => (
                          <div key={cat}>
                            <p style={{ margin:"8px 0 6px", fontSize:8, color:"#64748b", letterSpacing:"0.1em", fontWeight:700 }}>{cat}</p>
                            {items.map((f: any, idx: number) => (
                              <div key={idx} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:10, flexWrap:"wrap", padding:"8px 0", borderBottom:"1px solid rgba(255,255,255,0.04)" }}>
                                <div>
                                  <p style={{ margin:0, fontSize:12, color:"#f1f5f9", fontWeight:600 }}>{f.nombre}</p>
                                  <p style={{ margin:"2px 0 0", fontSize:10, color:f.estado==="SIN STOCK"?"#ef4444":"#f59e0b", fontWeight:700 }}>
                                    {f.actual}/{f.minimo} · {f.estado}
                                  </p>
                                </div>
                                <button
                                  onClick={e => { e.stopPropagation(); abrirModal(f, "ABASTECER") }}
                                  style={{ background:"rgba(34,197,94,0.12)", border:"1px solid rgba(34,197,94,0.3)", color:"#22c55e", padding:"7px 12px", borderRadius:7, fontSize:9, fontWeight:700, cursor:"pointer", whiteSpace:"nowrap" }}>
                                  ➕ Abastecer
                                </button>
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Vencidos */}
                    {a.vencidosDetalle.length > 0 && (
                      <div style={{ background:"rgba(239,68,68,0.05)", border:"1px solid rgba(239,68,68,0.15)", borderRadius:12, padding:"12px 14px" }}>
                        <p style={{ margin:"0 0 10px", fontSize:10, fontWeight:900, color:"#ef4444", letterSpacing:"0.08em" }}>🚨 VENCIDOS — ACCIÓN REQUERIDA</p>
                        {a.vencidosDetalle.map((v: any, idx: number) => (
                          <div key={idx} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:10, flexWrap:"wrap", padding:"8px 0", borderBottom:"1px solid rgba(255,255,255,0.04)" }}>
                            <span style={{ fontSize:12, color:"#fca5a5", fontWeight:600 }}>{getNombre(v.inventario_items)}</span>
                            <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                              <button
                                onClick={e => { e.stopPropagation(); retirarItem(v) }}
                                style={{ background:"rgba(239,68,68,0.12)", border:"1px solid rgba(239,68,68,0.3)", color:"#ef4444", padding:"7px 10px", borderRadius:7, fontSize:9, fontWeight:700, cursor:"pointer" }}>
                                ❌ Retirar
                              </button>
                              <button
                                onClick={e => { e.stopPropagation(); abrirModal(v, "CAMBIO") }}
                                style={{ background:"rgba(56,189,248,0.12)", border:"1px solid rgba(56,189,248,0.3)", color:"#38bdf8", padding:"7px 10px", borderRadius:7, fontSize:9, fontWeight:700, cursor:"pointer" }}>
                                🔄 Cambio
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {a.faltantesDetalle.length === 0 && a.vencidosDetalle.length === 0 && (
                      <div style={{ textAlign:"center", padding:"20px 0" }}>
                        <span style={{ fontSize:26 }}>✅</span>
                        <p style={{ margin:"8px 0 0", fontSize:11, color:"#22c55e", fontWeight:700, letterSpacing:"0.06em" }}>INVENTARIO COMPLETO Y AL DÍA</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* ── MODAL ── */}
      {modal && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.88)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:50, padding:16, backdropFilter:"blur(6px)" }}>
          <div style={{ background:"linear-gradient(135deg,#0f172a,#0b1120)", border:"1px solid rgba(34,211,238,0.18)", borderRadius:18, padding:22, width:"100%", maxWidth:380 }}>

            <p style={{ margin:"0 0 4px", fontSize:13, fontWeight:900, color:"#f1f5f9", letterSpacing:"0.05em" }}>
              {modo === "CAMBIO" ? "🔄 CAMBIO DE ÍTEM" : "📦 ABASTECER"}
            </p>
            <p style={{ margin:"0 0 18px", fontSize:10, color:"#475569" }}>{itemSeleccionado?.nombre}</p>

            <label style={{ fontSize:8, color:"#475569", letterSpacing:"0.1em", fontWeight:700, display:"block", marginBottom:5 }}>CANTIDAD *</label>
            <input placeholder="Ej: 5" value={cantidad} onChange={e => setCantidad(e.target.value)} style={inp}/>

            <label style={{ fontSize:8, color:"#475569", letterSpacing:"0.1em", fontWeight:700, display:"block", marginBottom:5 }}>LOTE</label>
            <input placeholder="Ej: L2024-001" value={lote} onChange={e => setLote(e.target.value)} style={inp}/>

            <label style={{ fontSize:8, color:"#475569", letterSpacing:"0.1em", fontWeight:700, display:"block", marginBottom:5 }}>FECHA CADUCIDAD</label>
            <input type="date" value={fechaCaducidad} onChange={e => setFechaCaducidad(e.target.value)} style={inp}/>

            <div style={{ display:"flex", gap:10, marginTop:6 }}>
              <button
                disabled={guardando}
                onClick={guardar}
                style={{ flex:1, background:"rgba(34,197,94,0.12)", border:"1px solid rgba(34,197,94,0.35)", color:"#22c55e", padding:"11px", borderRadius:9, fontSize:11, fontWeight:700, cursor:guardando?"not-allowed":"pointer", opacity:guardando?0.5:1, letterSpacing:"0.03em" }}>
                {guardando ? "⏳ Guardando..." : "💾 Guardar"}
              </button>
              <button
                onClick={() => setModal(false)}
                style={{ flex:1, background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.3)", color:"#ef4444", padding:"11px", borderRadius:9, fontSize:11, fontWeight:700, cursor:"pointer" }}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
