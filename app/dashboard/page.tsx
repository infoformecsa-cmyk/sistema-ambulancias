"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { useRouter } from "next/navigation"

/* ── TIPOS ── */
type Ambulancia = {
  id: string
  codigo_operativo: string
  placa: string
  marca: string
  tipo: string
  kilometraje_actual: number
  kilometraje_mtto: number
  estado: string
  base_operativa: string
}

/* ── CONSTANTES ── */
const COLOR: Record<string, { text: string; bg: string; border: string }> = {
  operativa:      { text:"#4ade80", bg:"rgba(74,222,128,0.08)",  border:"rgba(74,222,128,0.25)"  },
  mantenimiento:  { text:"#fbbf24", bg:"rgba(251,191,36,0.08)",  border:"rgba(251,191,36,0.25)"  },
  "no operativa": { text:"#f87171", bg:"rgba(248,113,113,0.08)", border:"rgba(248,113,113,0.25)" },
}

const inputStyle: React.CSSProperties = {
  background:"rgba(56,189,248,0.08)",
  border:"1px solid rgba(56,189,248,0.3)",
  color:"white", padding:"5px 8px",
  borderRadius:5, fontSize:10,
  outline:"none", width:"90px",
  fontFamily:"inherit",
}

function pct(n: number, total: number) {
  return total > 0 ? Math.round((n / total) * 100) : 0
}

/* ── CARD KPI ── */
function KpiCard({ label, val, color, pctVal }: { label:string; val:number|string; color:string; pctVal?:number }) {
  return (
    <div style={{
      background:"linear-gradient(135deg,#0f172a,#0d1424)",
      border:`1px solid ${color}30`, borderRadius:10, padding:"14px 16px",
    }}>
      <p style={{ margin:0, fontSize:9, color:"#64748b", letterSpacing:"0.1em", fontWeight:700 }}>{label}</p>
      <div style={{ display:"flex", alignItems:"baseline", gap:8, marginTop:4 }}>
        <h2 style={{ margin:0, fontSize:26, fontWeight:800, color }}>{val}</h2>
        {pctVal !== undefined && (
          <span style={{ fontSize:11, color, opacity:0.7 }}>{pctVal}%</span>
        )}
      </div>
      {pctVal !== undefined && (
        <div style={{ height:3, background:"rgba(255,255,255,0.06)", borderRadius:2, marginTop:8, overflow:"hidden" }}>
          <div style={{ width:`${pctVal}%`, height:"100%", background:color, borderRadius:2 }} />
        </div>
      )}
    </div>
  )
}

/* ── CARD TIPO (ALFA / BRAVO) ── */
function TipoCard({ tipo, list, accent }: { tipo:string; list:Ambulancia[]; accent:string }) {
  const op    = list.filter(a => a.estado === "operativa").length
  const mtto  = list.filter(a => a.estado === "mantenimiento").length
  const fuera = list.filter(a => a.estado === "no operativa").length
  const total = list.length

  return (
    <div style={{
      background:"linear-gradient(135deg,#0f172a,#0d1424)",
      border:`1px solid ${accent}25`, borderRadius:10, padding:"14px 16px",
    }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
        <span style={{ fontSize:13, fontWeight:800, color:accent, letterSpacing:"0.08em" }}>🚑 TIPO {tipo}</span>
        <span style={{ fontSize:11, color:"#64748b" }}>{total} unidades</span>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:6 }}>
        {[
          { label:"Operativas", val:op,    color:"#4ade80" },
          { label:"Mtto",       val:mtto,  color:"#fbbf24" },
          { label:"No op.",     val:fuera, color:"#f87171" },
        ].map(k => (
          <div key={k.label} style={{ textAlign:"center" }}>
            <div style={{ fontSize:20, fontWeight:800, color:k.color }}>{k.val}</div>
            <div style={{ fontSize:9, color:"#475569", letterSpacing:"0.05em" }}>{k.label}</div>
            <div style={{ fontSize:10, color:k.color, opacity:0.7 }}>{pct(k.val,total)}%</div>
          </div>
        ))}
      </div>
      <div style={{ display:"flex", gap:2, marginTop:10, height:4, borderRadius:2, overflow:"hidden" }}>
        <div style={{ flex:op,    background:"#4ade80" }} />
        <div style={{ flex:mtto,  background:"#fbbf24" }} />
        <div style={{ flex:fuera, background:"#f87171" }} />
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════
   DASHBOARD PRINCIPAL
══════════════════════════════════════════ */
export default function Dashboard() {
  const router = useRouter()

  const [rol,          setRol]          = useState("")
  const [nombre,       setNombre]       = useState("")
  const [ambulancias,  setAmbulancias]  = useState<Ambulancia[]>([])
  const [alertas,      setAlertas]      = useState<any[]>([])
  const [horasMap,     setHorasMap]     = useState<Record<string,number>>({})
  const [editando,     setEditando]     = useState<string|null>(null)
  const [editData,     setEditData]     = useState<any>({})
  const [filtro,       setFiltro]       = useState<"TODOS"|"ALFA"|"BRAVO">("TODOS")
  const [hoveredRow,   setHoveredRow]   = useState<string|null>(null)

  /* ── AUTH ── */
  useEffect(() => {
    const r     = localStorage.getItem("rol")
    const n     = localStorage.getItem("nombre")
    const email = localStorage.getItem("email")

    if (!r) { router.push("/"); return }

    async function validarRol() {
      if (!email) { router.push("/"); return }
      const { data } = await supabase
        .from("usuarios").select("rol").eq("email", email).single()

      if (data?.rol !== "admin") {
        if (data?.rol === "supervisor") { router.push("/supervisor"); return }
        router.push("/"); return
      }
    }

    validarRol()
    if (r === "conductor") { router.push("/conductor"); return }

    setRol(r)
    setNombre(n || "")
    cargar()

    const intervalo = setInterval(cargar, 30000)
    return () => clearInterval(intervalo)
  }, [])

  /* ── CARGA ── */
  async function cargar() {
    const { data: amb  } = await supabase.from("ambulancias").select("*").order("codigo_operativo")
    const { data: alert} = await supabase.from("reportes_fallas").select("*").eq("estado","abierta").eq("criticidad","critica")
    const { data: hist } = await supabase.from("historial_operativo").select("*")

    const ambs  = (amb  || []) as Ambulancia[]
    const histo = hist || []

    setAmbulancias(ambs)
    setAlertas(alert || [])

    const mapa: Record<string,number> = {}
    ambs.forEach(a => {
      const eventos = histo.filter((h:any) => String(h.ambulancia_id) === String(a.id))
      let total = 0
      eventos.forEach((e:any) => {
        if (e.estado === "operativa") return
        const ini = new Date(e.fecha_inicio)
        const fin = e.fecha_fin ? new Date(e.fecha_fin) : new Date()
        if (isNaN(ini.getTime()) || isNaN(fin.getTime()) || fin < ini) return
        total += fin.getTime() - ini.getTime()
      })
      mapa[String(a.id)] = Math.floor(total / (1000*60*60))
    })
    setHorasMap(mapa)
  }

  /* ── ACCIONES ── */
  async function eliminarAmbulancia(id: string) {
    if (!confirm("¿Eliminar ambulancia?")) return
    await supabase.from("historial_operativo").delete().eq("ambulancia_id", id)
    await supabase.from("mantenimientos").delete().eq("ambulancia_id", id)
    await supabase.from("ambulancias").delete().eq("id", id)
    cargar()
  }

  async function guardarEdicion(id: string) {
    await supabase.from("ambulancias").update({
      codigo_operativo: editData.codigo_operativo,
      placa:            editData.placa,
      marca:            editData.marca,
      tipo:             editData.tipo,
    }).eq("id", id)
    setEditando(null)
    cargar()
  }

  function cerrarSesion() { localStorage.clear(); router.push("/") }

  /* ── KPIs ── */
  const alfas  = ambulancias.filter(a => a.tipo === "ALFA")
  const bravos = ambulancias.filter(a => a.tipo === "BRAVO")

  const total        = ambulancias.length
  const operativas   = ambulancias.filter(a => a.estado === "operativa").length
  const mantenimiento= ambulancias.filter(a => a.estado === "mantenimiento").length
  const fuera        = ambulancias.filter(a => a.estado === "no operativa").length
  const totalHoras   = Object.values(horasMap).reduce((a,b) => a+(b||0), 0)
  const promedioH    = total ? Math.round(totalHoras/total) : 0

  const mttoVencido  = ambulancias.filter(a => a.kilometraje_actual >= a.kilometraje_mtto)
  const mttoProximo  = ambulancias.filter(a => {
    const diff = a.kilometraje_mtto - a.kilometraje_actual
    return diff <= 400 && diff > 0
  })

  const visible = filtro === "ALFA" ? alfas : filtro === "BRAVO" ? bravos : ambulancias

  /* ══════════ RENDER ══════════ */
  return (
    <div style={{
      background:"#060a14", minHeight:"100vh", color:"white",
      fontFamily:"'IBM Plex Mono','Courier New',monospace", padding:28,
    }}>

      {/* ── HEADER ── */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:24 }}>
        <div>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <span style={{ fontSize:22 }}>🚑</span>
            <h1 style={{ margin:0, fontSize:20, fontWeight:800, letterSpacing:"0.05em", color:"#e2e8f0" }}>
              CENTRO DE CONTROL DE AMBULANCIAS
            </h1>
          </div>
          <p style={{ margin:"4px 0 0 32px", fontSize:11, color:"#475569", letterSpacing:"0.08em" }}>
            DIRECCIÓN PROVINCIAL DE SALUD DEL GUAYAS
          </p>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <span style={{ fontSize:11, color:"#64748b" }}>
            <b style={{ color:"#e2e8f0" }}>{nombre}</b> | {rol}
          </span>
          <button onClick={cerrarSesion} style={{
            background:"rgba(239,68,68,0.15)", border:"1px solid rgba(239,68,68,0.35)",
            color:"#f87171", padding:"7px 14px", borderRadius:6,
            fontSize:10, fontWeight:700, cursor:"pointer", letterSpacing:"0.05em",
          }}>🔐 Salir</button>
        </div>
      </div>

      {/* ── BOTONES NAV ── */}
      <div style={{ display:"flex", gap:8, marginBottom:20, flexWrap:"wrap" }}>
        {[
          { label:"+ Ambulancia",         path:"/dashboard/nueva-ambulancia",    color:"#1d4ed8" },
          { label:"Informe",              path:"/dashboard/informe-flota",       color:"#0f766e" },
          { label:"KM Diario",            path:"/inventario/kilometrajes",       color:"#0369a1" },
          { label:"🧠 Inteligencia",      path:"/dashboard/inteligencia",        color:"#7c3aed" },
        ].map(b => (
          <button key={b.label} onClick={() => router.push(b.path)} style={{
            background:b.color, color:"white", border:"none",
            padding:"9px 16px", borderRadius:7,
            fontSize:11, fontWeight:700, cursor:"pointer", letterSpacing:"0.03em",
          }}>{b.label}</button>
        ))}
      </div>

      {/* ── ALERTAS ── */}
      {mttoVencido.length > 0 && (
        <div style={{
          background:"rgba(127,29,29,0.5)", border:"1px solid rgba(239,68,68,0.4)",
          borderRadius:8, padding:"10px 16px", marginBottom:8, fontSize:12,
        }}>
          🚨 <b>Mantenimiento vencido:</b> {mttoVencido.map(a=>a.codigo_operativo).join(", ")}
        </div>
      )}
      {mttoProximo.length > 0 && (
        <div style={{
          background:"rgba(120,53,15,0.5)", border:"1px solid rgba(251,191,36,0.4)",
          borderRadius:8, padding:"10px 16px", marginBottom:20, fontSize:12,
        }}>
          ⚠️ <b>Próximo mantenimiento:</b> {mttoProximo.map(a=>a.codigo_operativo).join(", ")}
        </div>
      )}
      {alertas.length > 0 && (
        <div style={{
          background:"rgba(127,29,29,0.4)", border:"1px solid rgba(239,68,68,0.3)",
          borderRadius:8, padding:"10px 16px", marginBottom:20, fontSize:12,
        }}>
          🔴 <b>{alertas.length} falla(s) crítica(s) abiertas</b>
        </div>
      )}

      {/* ── KPI GENERAL ── */}
      <div style={{ marginBottom:6 }}>
        <span style={{ fontSize:10, color:"#475569", letterSpacing:"0.12em", fontWeight:700 }}>▸ FLOTA TOTAL</span>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))", gap:10, marginBottom:20 }}>
        <KpiCard label="OPERATIVAS"    val={operativas}    color="#4ade80" pctVal={pct(operativas,total)}    />
        <KpiCard label="MANTENIMIENTO" val={mantenimiento} color="#fbbf24" pctVal={pct(mantenimiento,total)} />
        <KpiCard label="NO OPERATIVAS" val={fuera}         color="#f87171" pctVal={pct(fuera,total)}         />
        <KpiCard label="DISPONIBILIDAD" val={pct(operativas,total)+"%"} color="#38bdf8" />
        <KpiCard label="HORAS FUERA"   val={totalHoras+"h"} color="#94a3b8" />
        <KpiCard label="PROMEDIO"      val={promedioH+"h"}  color="#64748b" />
      </div>

      {/* ── KPI ALFA / BRAVO ── */}
      <div style={{ marginBottom:6 }}>
        <span style={{ fontSize:10, color:"#475569", letterSpacing:"0.12em", fontWeight:700 }}>▸ POR TIPO DE UNIDAD</span>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:28 }}>
        <TipoCard tipo="ALFA"  list={alfas}  accent="#38bdf8" />
        <TipoCard tipo="BRAVO" list={bravos} accent="#a78bfa" />
      </div>

      {/* ── TABLA ── */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
        <span style={{ fontSize:10, color:"#475569", letterSpacing:"0.12em", fontWeight:700 }}>
          ▸ FLOTA — {visible.length} unidades
        </span>
        <div style={{ display:"flex", gap:6 }}>
          {(["TODOS","ALFA","BRAVO"] as const).map(f => (
            <button key={f} onClick={() => setFiltro(f)} style={{
              background: filtro===f ? "#1e3a5f" : "rgba(255,255,255,0.04)",
              border:`1px solid ${filtro===f ? "#38bdf8" : "rgba(255,255,255,0.08)"}`,
              color: filtro===f ? "#38bdf8" : "#64748b",
              padding:"6px 14px", borderRadius:6,
              fontSize:10, fontWeight:700, cursor:"pointer", letterSpacing:"0.06em",
            }}>{f}</button>
          ))}
        </div>
      </div>

      <div style={{
        background:"#0b1120", border:"1px solid rgba(255,255,255,0.07)",
        borderRadius:12, overflow:"hidden",
      }}>
        <table style={{ width:"100%", borderCollapse:"collapse", fontSize:11 }}>
          <thead>
            <tr style={{ background:"rgba(255,255,255,0.03)", borderBottom:"1px solid rgba(255,255,255,0.07)" }}>
              {["Estado","Código","Placa","Marca","Tipo","Base Operativa","KM Actual","Horas","Acciones"].map(h => (
                <th key={h} style={{
                  padding:"11px 14px", textAlign:"left",
                  fontSize:9, color:"#475569", letterSpacing:"0.1em", fontWeight:700,
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map((a, i) => {
              const c       = COLOR[a.estado] || COLOR["no operativa"]
              const isEdit  = editando === a.id
              const isHover = hoveredRow === a.id
              const horas   = horasMap[String(a.id)] || 0
              const kmAlerta  = a.kilometraje_actual >= a.kilometraje_mtto
              const kmProximo = !kmAlerta && (a.kilometraje_mtto - a.kilometraje_actual) <= 400

              return (
                <tr key={a.id}
                  onMouseEnter={() => setHoveredRow(a.id)}
                  onMouseLeave={() => setHoveredRow(null)}
                  style={{
                    borderBottom:"1px solid rgba(255,255,255,0.04)",
                    background: isEdit
                      ? "rgba(56,189,248,0.04)"
                      : isHover
                        ? "rgba(255,255,255,0.025)"
                        : i%2===0 ? "transparent" : "rgba(255,255,255,0.01)",
                    transition:"background 0.15s",
                  }}
                >
                  {/* Estado */}
                  <td style={{ padding:"10px 14px" }}>
                    <span style={{
                      background:c.bg, border:`1px solid ${c.border}`,
                      color:c.text, fontSize:9, fontWeight:700,
                      padding:"3px 9px", borderRadius:4,
                      letterSpacing:"0.05em", whiteSpace:"nowrap",
                    }}>{a.estado.toUpperCase()}</span>
                  </td>

                  {/* Código */}
                  <td style={{ padding:"10px 14px" }}>
                    {isEdit
                      ? <input value={editData.codigo_operativo||""} style={inputStyle}
                          onChange={e => setEditData({...editData, codigo_operativo:e.target.value})}/>
                      : <span style={{ fontWeight:800, color:"#e2e8f0" }}>{a.codigo_operativo}</span>
                    }
                  </td>

                  {/* Placa */}
                  <td style={{ padding:"10px 14px" }}>
                    {isEdit
                      ? <input value={editData.placa||""} style={inputStyle}
                          onChange={e => setEditData({...editData, placa:e.target.value})}/>
                      : <span style={{ color:"#94a3b8" }}>{a.placa}</span>
                    }
                  </td>

                  {/* Marca */}
                  <td style={{ padding:"10px 14px" }}>
                    {isEdit
                      ? <input value={editData.marca||""} style={inputStyle}
                          onChange={e => setEditData({...editData, marca:e.target.value})}/>
                      : <span style={{ color:"#94a3b8" }}>{a.marca||"—"}</span>
                    }
                  </td>

                  {/* Tipo */}
                  <td style={{ padding:"10px 14px" }}>
                    {isEdit
                      ? <select value={editData.tipo||""} style={inputStyle}
                          onChange={e => setEditData({...editData, tipo:e.target.value})}>
                          <option value="ALFA">ALFA</option>
                          <option value="BRAVO">BRAVO</option>
                        </select>
                      : <span style={{
                          background: a.tipo==="ALFA" ? "rgba(56,189,248,0.1)" : "rgba(167,139,250,0.1)",
                          color:      a.tipo==="ALFA" ? "#38bdf8" : "#a78bfa",
                          border:`1px solid ${a.tipo==="ALFA" ? "rgba(56,189,248,0.25)" : "rgba(167,139,250,0.25)"}`,
                          fontSize:9, fontWeight:800, padding:"2px 8px", borderRadius:4,
                        }}>{a.tipo}</span>
                    }
                  </td>

                  {/* Base Operativa */}
                  <td style={{ padding:"10px 14px", color:"#64748b", fontSize:10 }}>
                    {a.base_operativa || "—"}
                  </td>

                  {/* KM */}
                  <td style={{ padding:"10px 14px" }}>
                    <span style={{ color: kmAlerta ? "#f87171" : kmProximo ? "#fbbf24" : "#94a3b8" }}>
                      {a.kilometraje_actual?.toLocaleString()}
                    </span>
                    {kmAlerta  && <span style={{ fontSize:8, color:"#f87171", marginLeft:5 }}>⚠ VENCIDO</span>}
                    {kmProximo && <span style={{ fontSize:8, color:"#fbbf24", marginLeft:5 }}>↑ PRONTO</span>}
                  </td>

                  {/* Horas */}
                  <td style={{ padding:"10px 14px", color:"#64748b" }}>{horas}h</td>

                  {/* Acciones */}
                  <td style={{ padding:"10px 14px" }}>
                    {isEdit ? (
                      <div style={{ display:"flex", gap:6 }}>
                        <button onClick={() => guardarEdicion(a.id)} style={{
                          background:"rgba(74,222,128,0.15)", border:"1px solid rgba(74,222,128,0.4)",
                          color:"#4ade80", padding:"6px 14px", borderRadius:6,
                          fontSize:10, fontWeight:700, cursor:"pointer",
                        }}>💾 Guardar</button>
                        <button onClick={() => setEditando(null)} style={{
                          background:"rgba(248,113,113,0.1)", border:"1px solid rgba(248,113,113,0.3)",
                          color:"#f87171", padding:"6px 12px", borderRadius:6,
                          fontSize:10, fontWeight:700, cursor:"pointer",
                        }}>✕ Cancelar</button>
                      </div>
                    ) : (
                      <div style={{ display:"flex", gap:5, alignItems:"center" }}>
                        <button onClick={() => router.push(`/ambulancia/${a.id}`)} style={{
                          background:"rgba(56,189,248,0.12)", border:"1px solid rgba(56,189,248,0.3)",
                          color:"#38bdf8", padding:"6px 11px", borderRadius:6,
                          fontSize:10, fontWeight:700, cursor:"pointer", whiteSpace:"nowrap",
                        }}>📋 Ficha</button>

                        <button onClick={() => { setEditando(a.id); setEditData(a) }} style={{
                          background:"rgba(251,191,36,0.12)", border:"1px solid rgba(251,191,36,0.3)",
                          color:"#fbbf24", padding:"6px 11px", borderRadius:6,
                          fontSize:10, fontWeight:700, cursor:"pointer",
                        }}>✏️ Editar</button>

                        <button onClick={() => router.push(`/dashboard/historial?ambulancia=${a.id}`)} style={{
                          background:"rgba(74,222,128,0.1)", border:"1px solid rgba(74,222,128,0.25)",
                          color:"#4ade80", padding:"6px 11px", borderRadius:6,
                          fontSize:10, fontWeight:700, cursor:"pointer", whiteSpace:"nowrap",
                        }}>📊 Historial</button>

                        <button onClick={() => eliminarAmbulancia(a.id)} style={{
                          background:"rgba(239,68,68,0.12)", border:"1px solid rgba(239,68,68,0.3)",
                          color:"#f87171", padding:"6px 10px", borderRadius:6,
                          fontSize:12, cursor:"pointer",
                        }}>🗑</button>
                      </div>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* ── FOOTER ── */}
      <div style={{
        marginTop:16, display:"flex", justifyContent:"space-between",
        fontSize:9, color:"#1e293b",
      }}>
        <span>SISTEMA DE GESTIÓN DE FLOTA v2.0</span>
        <span>Actualización automática cada 30s</span>
      </div>

    </div>
  )
}
