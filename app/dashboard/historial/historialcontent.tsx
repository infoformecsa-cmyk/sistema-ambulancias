"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { useRouter } from "next/navigation"

/* ── TIPOS ── */
type Ambulancia = {
  id: string
  codigo_operativo: string
  placa: string
  tipo: string
  estado: string
  kilometraje_actual: number
  kilometraje_mtto: number
}

type Evento = {
  id: string
  ambulancia_id: string
  estado: string
  motivo: string
  tipo_falla: string | null
  fecha_inicio: string
  fecha_fin: string | null
  usuario: string | null
  foto_url: string | null
}

/* ── HELPERS ── */
const COLOR: Record<string, { text: string; bg: string; border: string; dot: string }> = {
  operativa:      { text:"#4ade80", bg:"rgba(74,222,128,0.08)",  border:"rgba(74,222,128,0.25)",  dot:"#4ade80" },
  mantenimiento:  { text:"#fbbf24", bg:"rgba(251,191,36,0.08)",  border:"rgba(251,191,36,0.25)",  dot:"#fbbf24" },
  "no operativa": { text:"#f87171", bg:"rgba(248,113,113,0.08)", border:"rgba(248,113,113,0.25)", dot:"#f87171" },
}

const FALLA_COLOR: Record<string, string> = {
  preventivo: "#38bdf8",
  correctivo: "#f87171",
  mecanico:   "#fbbf24",
  electrico:  "#a78bfa",
  accidente:  "#fb923c",
}

function fmt(iso: string) {
  return new Date(iso).toLocaleString("es-EC", {
    day:"2-digit", month:"short", year:"numeric",
    hour:"2-digit", minute:"2-digit",
  })
}

function duracion(ini: string, fin: string | null) {
  const h = Math.floor((
    (fin ? new Date(fin).getTime() : Date.now()) - new Date(ini).getTime()
  ) / (1000 * 60 * 60))
  return h < 24 ? `${h}h` : `${Math.floor(h/24)}d ${h%24}h`
}

/* ══════════════════════════════════════════
   COMPONENTE PRINCIPAL
══════════════════════════════════════════ */
export default function HistorialContent() {
  const router = useRouter()

  /* ── state: listas ── */
  const [ambulancias,  setAmbulancias]  = useState<Ambulancia[]>([])
  const [eventos,      setEventos]      = useState<Evento[]>([])

  /* ── state: selección ── */
  const [ambulancia,   setAmbulancia]   = useState("")
  const [ambData,      setAmbData]      = useState<Ambulancia | null>(null)

  /* ── state: formulario ── */
  const [modo,         setModo]         = useState<"nuevo"|"editar">("nuevo")
  const [eventoSel,    setEventoSel]    = useState("")
  const [estado,       setEstado]       = useState("operativa")
  const [motivo,       setMotivo]       = useState("")
  const [tipoFalla,    setTipoFalla]    = useState("")
  const [fechaInicio,  setFechaInicio]  = useState("")
  const [fechaFin,     setFechaFin]     = useState("")
  const [fotoFile,     setFotoFile]     = useState<File | null>(null)
  const [fotoPreview,  setFotoPreview]  = useState<string | null>(null)

  /* ── state: UI ── */
  const [loading,      setLoading]      = useState(false)
  const [expanded,     setExpanded]     = useState<string | null>(null)
  const [fotoModal,    setFotoModal]    = useState<string | null>(null)

  /* ── INIT ── */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const amb = params.get("ambulancia")
    cargarAmbulancias().then(() => {
      if (amb) setAmbulancia(amb)
    })
  }, [])

  useEffect(() => {
    if (ambulancia) {
      cargarEventos()
      const found = ambulancias.find(a => String(a.id) === String(ambulancia))
      setAmbData(found || null)
    }
  }, [ambulancia, ambulancias])

  /* ── CARGA ── */
  async function cargarAmbulancias() {
    const { data } = await supabase
      .from("ambulancias")
      .select("id,codigo_operativo,placa,tipo,estado,kilometraje_actual,kilometraje_mtto")
      .order("codigo_operativo")
    setAmbulancias((data || []) as Ambulancia[])
  }

  async function cargarEventos() {
    if (!ambulancia) return
    const { data } = await supabase
      .from("historial_operativo")
      .select("*")
      .eq("ambulancia_id", ambulancia)
      .order("fecha_inicio", { ascending: false })
    setEventos((data || []) as Evento[])
  }

  /* ── SUBIR FOTO ── */
  async function subirFoto(): Promise<string | null> {
    if (!fotoFile) return null
    const ext  = fotoFile.name.split(".").pop()
    const path = `historial/${ambulancia}/${Date.now()}.${ext}`
    const { error } = await supabase.storage
      .from("fotos_historial")
      .upload(path, fotoFile)
    if (error) { console.error("Error subiendo foto:", error); return null }
    const { data } = supabase.storage.from("fotos_historial").getPublicUrl(path)
    return data.publicUrl
  }

  /* ── GUARDAR ── */
  async function guardar() {
    if (loading) return
    setLoading(true)

    if (!ambulancia)   { alert("Seleccione ambulancia");  setLoading(false); return }
    if (!fechaInicio)  { alert("Ingrese fecha inicio");   setLoading(false); return }
    if (estado !== "operativa" && !motivo) {
      alert("Debe ingresar motivo"); setLoading(false); return
    }

    const fotoUrl = await subirFoto()

    /* EDITAR */
    if (modo === "editar") {
      if (!eventoSel) { alert("Seleccione evento"); setLoading(false); return }
      const payload: any = {
        estado,
        motivo,
        tipo_falla:  tipoFalla || null,
        fecha_inicio: new Date(fechaInicio).toISOString(),
        fecha_fin:    fechaFin ? new Date(fechaFin).toISOString() : null,
      }
      if (fotoUrl) payload.foto_url = fotoUrl

      const { error } = await supabase
        .from("historial_operativo")
        .update(payload)
        .eq("id", eventoSel)

      if (error) alert("Error actualizando")
      else { alert("✅ Evento actualizado"); resetForm(); cargarEventos() }
      setLoading(false)
      return
    }

    /* NUEVO */
    const hoy = new Date().toISOString().split("T")[0]
    if (!fechaFin && fechaInicio === hoy) {
      await supabase
        .from("historial_operativo")
        .update({ fecha_fin: new Date().toISOString() })
        .eq("ambulancia_id", ambulancia)
        .is("fecha_fin", null)
    }

    const { error } = await supabase.from("historial_operativo").insert({
      ambulancia_id: ambulancia,
      estado,
      motivo,
      tipo_falla:   tipoFalla || null,
      fecha_inicio: new Date(fechaInicio).toISOString(),
      fecha_fin:    fechaFin ? new Date(fechaFin).toISOString() : null,
      usuario:      localStorage.getItem("nombre"),
      foto_url:     fotoUrl,
    })

    if (error) alert("Error guardando historial")
    else { alert("✅ Evento registrado"); resetForm(); cargarEventos() }
    setLoading(false)
  }

  /* ── ELIMINAR EVENTO ── */
  async function eliminarEvento(id: string) {
    if (!confirm("¿Eliminar este evento?")) return
    await supabase.from("historial_operativo").delete().eq("id", id)
    cargarEventos()
  }

  /* ── RESET ── */
  function resetForm() {
    setMotivo(""); setTipoFalla(""); setFechaInicio("")
    setFechaFin(""); setFotoFile(null); setFotoPreview(null)
    setEventoSel(""); setEstado("operativa")
  }

  /* ── SELECCIONAR EVENTO PARA EDITAR ── */
  function seleccionarEvento(id: string) {
    setEventoSel(id)
    const ev = eventos.find(e => String(e.id) === String(id))
    if (!ev) return
    setEstado(ev.estado)
    setMotivo(ev.motivo || "")
    setTipoFalla(ev.tipo_falla || "")
    setFechaInicio(ev.fecha_inicio?.split("T")[0] || "")
    setFechaFin(ev.fecha_fin?.split("T")[0] || "")
    setFotoPreview(ev.foto_url || null)
  }

  /* ── ESTILOS BASE ── */
  const inputSt: React.CSSProperties = {
    background:"rgba(255,255,255,0.04)",
    border:"1px solid rgba(255,255,255,0.1)",
    color:"white", padding:"9px 12px",
    borderRadius:7, fontSize:11,
    fontFamily:"inherit", outline:"none",
    width:"100%", boxSizing:"border-box",
  }

  const labelSt: React.CSSProperties = {
    fontSize:9, color:"#475569",
    letterSpacing:"0.1em", fontWeight:700,
    display:"block", marginBottom:5,
  }

  /* ── KPIs de la ambulancia seleccionada ── */
  const kmAlerta  = ambData && ambData.kilometraje_actual >= ambData.kilometraje_mtto
  const eventosTotal = eventos.length
  const eventosMtto  = eventos.filter(e => e.estado === "mantenimiento").length

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
            <span style={{ fontSize:20 }}>📋</span>
            <h1 style={{ margin:0, fontSize:18, fontWeight:800, letterSpacing:"0.05em", color:"#e2e8f0" }}>
              HISTORIAL OPERATIVO
            </h1>
          </div>
          <p style={{ margin:"4px 0 0 30px", fontSize:10, color:"#475569", letterSpacing:"0.08em" }}>
            {ambData
              ? `🚑 ${ambData.codigo_operativo} · ${ambData.placa} · ${ambData.tipo}`
              : "Seleccione una ambulancia"}
          </p>
        </div>
        <button onClick={() => router.push("/dashboard")} style={{
          background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)",
          color:"#94a3b8", padding:"8px 16px", borderRadius:7,
          fontSize:10, fontWeight:700, cursor:"pointer",
        }}>← Volver</button>
      </div>

      {/* ── KPI RÁPIDO ── */}
      {ambData && (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10, marginBottom:24 }}>
          {[
            {
              label:"ESTADO ACTUAL",
              val: ambData.estado.toUpperCase(),
              color: COLOR[ambData.estado]?.text || "#e2e8f0",
            },
            {
              label:"KM ACTUAL",
              val: ambData.kilometraje_actual?.toLocaleString() || "—",
              color: kmAlerta ? "#f87171" : "#e2e8f0",
            },
            {
              label:"PRÓX. MTTO",
              val: ambData.kilometraje_mtto
                ? `${ambData.kilometraje_mtto.toLocaleString()} KM`
                : "—",
              color:"#fbbf24",
            },
            {
              label:"EVENTOS REGISTRADOS",
              val: `${eventosTotal} total · ${eventosMtto} mtto`,
              color:"#38bdf8",
            },
          ].map(k => (
            <div key={k.label} style={{
              background:"linear-gradient(135deg,#0f172a,#0d1424)",
              border:`1px solid ${k.color}20`, borderRadius:10, padding:"12px 14px",
            }}>
              <p style={{ margin:0, fontSize:8, color:"#475569", letterSpacing:"0.1em", fontWeight:700 }}>{k.label}</p>
              <p style={{ margin:"5px 0 0", fontSize:13, fontWeight:800, color:k.color }}>{k.val}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── LAYOUT 2 COLUMNAS ── */}
      <div style={{ display:"grid", gridTemplateColumns:"380px 1fr", gap:20, alignItems:"start" }}>

        {/* ══ FORMULARIO ══ */}
        <div style={{
          background:"linear-gradient(160deg,#0f172a,#0b1120)",
          border:"1px solid rgba(255,255,255,0.07)",
          borderRadius:12, padding:20,
          position:"sticky", top:20,
        }}>
          {/* Tabs modo */}
          <div style={{ display:"flex", gap:6, marginBottom:18 }}>
            {(["nuevo","editar"] as const).map(m => (
              <button key={m} onClick={() => { setModo(m); resetForm() }} style={{
                flex:1,
                background: modo===m ? "rgba(34,211,238,0.12)" : "rgba(255,255,255,0.03)",
                border:`1px solid ${modo===m ? "rgba(34,211,238,0.4)" : "rgba(255,255,255,0.07)"}`,
                color: modo===m ? "#22d3ee" : "#475569",
                padding:"8px", borderRadius:7,
                fontSize:10, fontWeight:700, cursor:"pointer",
                textTransform:"uppercase",
              }}>
                {m === "nuevo" ? "➕ Nuevo" : "✏️ Editar"}
              </button>
            ))}
          </div>

          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>

            {/* Ambulancia */}
            <div>
              <label style={labelSt}>AMBULANCIA</label>
              <select
                value={ambulancia}
                onChange={e => setAmbulancia(e.target.value)}
                style={inputSt}
              >
                <option value="">Seleccione ambulancia</option>
                {ambulancias.map(a => (
                  <option key={a.id} value={a.id}>
                    {a.codigo_operativo} — {a.placa}
                  </option>
                ))}
              </select>
            </div>

            {/* Selector evento (solo editar) */}
            {modo === "editar" && (
              <div>
                <label style={labelSt}>EVENTO A EDITAR</label>
                <select
                  value={eventoSel}
                  onChange={e => seleccionarEvento(e.target.value)}
                  style={inputSt}
                >
                  <option value="">Seleccione evento</option>
                  {eventos.map(ev => (
                    <option key={ev.id} value={ev.id}>
                      {fmt(ev.fecha_inicio)} — {ev.estado}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Estado */}
            <div>
              <label style={labelSt}>ESTADO</label>
              <div style={{ display:"flex", gap:6 }}>
                {[
                  { val:"operativa",     label:"Operativa",    color:"#4ade80" },
                  { val:"mantenimiento", label:"Mtto",         color:"#fbbf24" },
                  { val:"no operativa",  label:"No operativa", color:"#f87171" },
                ].map(s => (
                  <button key={s.val} onClick={() => setEstado(s.val)} style={{
                    flex:1,
                    background: estado===s.val ? `${s.color}18` : "rgba(255,255,255,0.03)",
                    border:`1px solid ${estado===s.val ? s.color+"50" : "rgba(255,255,255,0.07)"}`,
                    color: estado===s.val ? s.color : "#475569",
                    padding:"7px 4px", borderRadius:6,
                    fontSize:9, fontWeight:700, cursor:"pointer",
                  }}>{s.label}</button>
                ))}
              </div>
            </div>

            {/* Tipo falla */}
            <div>
              <label style={labelSt}>TIPO DE FALLA</label>
              <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
                {["preventivo","correctivo","mecanico","electrico","accidente"].map(t => {
                  const fc = FALLA_COLOR[t]
                  return (
                    <button key={t} onClick={() => setTipoFalla(tipoFalla===t ? "" : t)} style={{
                      background: tipoFalla===t ? `${fc}18` : "rgba(255,255,255,0.03)",
                      border:`1px solid ${tipoFalla===t ? fc+"50" : "rgba(255,255,255,0.07)"}`,
                      color: tipoFalla===t ? fc : "#475569",
                      padding:"5px 9px", borderRadius:5,
                      fontSize:9, fontWeight:700, cursor:"pointer",
                      textTransform:"capitalize",
                    }}>{t}</button>
                  )
                })}
              </div>
            </div>

            {/* Motivo */}
            <div>
              <label style={labelSt}>MOTIVO / DETALLE</label>
              <textarea
                value={motivo}
                onChange={e => setMotivo(e.target.value)}
                placeholder="Describe el evento, falla o novedad..."
                style={{ ...inputSt, height:90, resize:"vertical" }}
              />
            </div>

            {/* Fechas */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
              <div>
                <label style={labelSt}>FECHA INICIO</label>
                <input type="date" value={fechaInicio}
                  onChange={e => setFechaInicio(e.target.value)} style={inputSt}/>
              </div>
              <div>
                <label style={labelSt}>FECHA FIN</label>
                <input type="date" value={fechaFin}
                  onChange={e => setFechaFin(e.target.value)} style={inputSt}/>
              </div>
            </div>

            {/* Foto */}
            <div>
              <label style={labelSt}>FOTO / EVIDENCIA</label>
              <label style={{
                display:"block",
                border:"1px dashed rgba(255,255,255,0.12)",
                borderRadius:8, padding:"14px",
                textAlign:"center", cursor:"pointer",
                background:"rgba(255,255,255,0.02)",
              }}>
                <input type="file" accept="image/*" style={{ display:"none" }}
                  onChange={e => {
                    const f = e.target.files?.[0] || null
                    setFotoFile(f)
                    if (f) setFotoPreview(URL.createObjectURL(f))
                  }}/>
                {fotoPreview ? (
                  <img src={fotoPreview} alt="preview"
                    style={{ maxWidth:"100%", maxHeight:120, borderRadius:6, objectFit:"cover" }}/>
                ) : (
                  <>
                    <div style={{ fontSize:24, marginBottom:4 }}>📷</div>
                    <p style={{ margin:0, fontSize:9, color:"#475569" }}>Toca para subir imagen</p>
                    <p style={{ margin:"3px 0 0", fontSize:8, color:"#334155" }}>JPG, PNG hasta 5MB</p>
                  </>
                )}
              </label>
              {fotoPreview && (
                <button onClick={() => { setFotoFile(null); setFotoPreview(null) }} style={{
                  marginTop:5, background:"rgba(248,113,113,0.1)",
                  border:"1px solid rgba(248,113,113,0.3)",
                  color:"#f87171", padding:"4px 10px", borderRadius:5,
                  fontSize:9, cursor:"pointer", width:"100%",
                }}>✕ Quitar foto</button>
              )}
            </div>

            {/* Guardar */}
            <button onClick={guardar} disabled={loading} style={{
              background: loading
                ? "rgba(255,255,255,0.05)"
                : "linear-gradient(135deg,#0891b2,#0e7490)",
              border:"none", color: loading ? "#475569" : "white",
              padding:"12px", borderRadius:8,
              fontSize:11, fontWeight:800,
              cursor: loading ? "not-allowed" : "pointer",
              letterSpacing:"0.05em", marginTop:4,
            }}>
              {loading ? "⏳ Guardando..." : "💾 GUARDAR EVENTO"}
            </button>
          </div>
        </div>

        {/* ══ TIMELINE ══ */}
        <div>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
            <span style={{ fontSize:10, color:"#475569", letterSpacing:"0.1em", fontWeight:700 }}>
              ▸ LÍNEA DE TIEMPO — {eventos.length} eventos
            </span>
            <span style={{ fontSize:9, color:"#334155" }}>más reciente arriba</span>
          </div>

          {eventos.length === 0 ? (
            <div style={{
              background:"rgba(255,255,255,0.02)",
              border:"1px dashed rgba(255,255,255,0.07)",
              borderRadius:10, padding:"40px",
              textAlign:"center", color:"#334155", fontSize:11,
            }}>
              {ambulancia
                ? "Sin eventos registrados para esta unidad"
                : "Seleccione una ambulancia para ver el historial"}
            </div>
          ) : (
            <div style={{ position:"relative" }}>
              {/* Línea vertical */}
              <div style={{
                position:"absolute", left:16, top:0, bottom:0,
                width:2, background:"rgba(255,255,255,0.05)",
              }}/>

              <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                {eventos.map((ev) => {
                  const c      = COLOR[ev.estado] || COLOR["no operativa"]
                  const isOpen = expanded === ev.id
                  const fc     = ev.tipo_falla ? FALLA_COLOR[ev.tipo_falla] : "#475569"
                  const activo = !ev.fecha_fin

                  return (
                    <div key={ev.id} style={{ display:"flex", gap:14, paddingLeft:4 }}>

                      {/* DOT */}
                      <div style={{ position:"relative", zIndex:1, flexShrink:0, marginTop:14 }}>
                        <div style={{
                          width:26, height:26, borderRadius:"50%",
                          background:c.bg, border:`2px solid ${c.dot}`,
                          display:"flex", alignItems:"center", justifyContent:"center",
                          boxShadow: activo ? `0 0 10px ${c.dot}60` : "none",
                        }}>
                          <div style={{ width:8, height:8, borderRadius:"50%", background:c.dot }}/>
                        </div>
                      </div>

                      {/* CARD */}
                      <div style={{
                        flex:1,
                        background: isOpen
                          ? "linear-gradient(135deg,#0f172a,#0d1a2a)"
                          : "rgba(255,255,255,0.02)",
                        border:`1px solid ${isOpen ? c.border : "rgba(255,255,255,0.06)"}`,
                        borderRadius:10, overflow:"hidden",
                        transition:"all 0.2s",
                      }}>

                        {/* Header card */}
                        <div
                          onClick={() => setExpanded(isOpen ? null : ev.id)}
                          style={{
                            padding:"12px 14px", cursor:"pointer",
                            display:"flex", justifyContent:"space-between", alignItems:"center",
                          }}
                        >
                          <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
                            <span style={{
                              background:c.bg, border:`1px solid ${c.border}`,
                              color:c.text, fontSize:9, fontWeight:700,
                              padding:"2px 8px", borderRadius:4, letterSpacing:"0.05em",
                            }}>{ev.estado.toUpperCase()}</span>

                            {ev.tipo_falla && (
                              <span style={{
                                background:`${fc}15`, border:`1px solid ${fc}40`,
                                color:fc, fontSize:9, fontWeight:700,
                                padding:"2px 8px", borderRadius:4, textTransform:"capitalize",
                              }}>{ev.tipo_falla}</span>
                            )}

                            {activo && (
                              <span style={{
                                background:"rgba(251,191,36,0.15)",
                                border:"1px solid rgba(251,191,36,0.4)",
                                color:"#fbbf24", fontSize:8, fontWeight:700,
                                padding:"2px 7px", borderRadius:4,
                              }}>● EN CURSO</span>
                            )}

                            {ev.foto_url && (
                              <span style={{ fontSize:9, color:"#475569" }}>📷</span>
                            )}
                          </div>

                          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                            <span style={{ fontSize:9, color:"#475569" }}>
                              {duracion(ev.fecha_inicio, ev.fecha_fin)}
                            </span>
                            <span style={{
                              color:"#334155", fontSize:10,
                              display:"inline-block",
                              transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                              transition:"transform 0.2s",
                            }}>▼</span>
                          </div>
                        </div>

                        {/* Fechas resumen */}
                        <div style={{ padding:"0 14px 10px", display:"flex", gap:16, flexWrap:"wrap" }}>
                          <span style={{ fontSize:9, color:"#475569" }}>
                            🕐 <span style={{ color:"#64748b" }}>{fmt(ev.fecha_inicio)}</span>
                          </span>
                          {ev.fecha_fin && (
                            <span style={{ fontSize:9, color:"#475569" }}>
                              🏁 <span style={{ color:"#64748b" }}>{fmt(ev.fecha_fin)}</span>
                            </span>
                          )}
                          {ev.usuario && (
                            <span style={{ fontSize:9, color:"#334155" }}>👤 {ev.usuario}</span>
                          )}
                        </div>

                        {/* DETALLE EXPANDIDO */}
                        {isOpen && (
                          <div style={{
                            borderTop:"1px solid rgba(255,255,255,0.06)",
                            padding:"14px",
                            display:"flex", flexDirection:"column", gap:14,
                          }}>

                            {/* Motivo */}
                            {ev.motivo && (
                              <div>
                                <p style={{ margin:"0 0 6px", fontSize:8, color:"#475569", letterSpacing:"0.1em", fontWeight:700 }}>
                                  MOTIVO / DETALLE
                                </p>
                                <p style={{ margin:0, fontSize:11, color:"#94a3b8", lineHeight:1.7 }}>
                                  {ev.motivo}
                                </p>
                              </div>
                            )}

                            {/* FOTO */}
                            {ev.foto_url ? (
                              <div>
                                <p style={{ margin:"0 0 8px", fontSize:8, color:"#475569", letterSpacing:"0.1em", fontWeight:700 }}>
                                  EVIDENCIA FOTOGRÁFICA
                                </p>
                                <div
                                  onClick={() => setFotoModal(ev.foto_url!)}
                                  style={{
                                    cursor:"zoom-in", borderRadius:8, overflow:"hidden",
                                    border:"1px solid rgba(255,255,255,0.1)",
                                    maxWidth:300, position:"relative", display:"inline-block",
                                  }}
                                >
                                  <img
                                    src={ev.foto_url}
                                    alt="evidencia"
                                    style={{ width:"100%", display:"block", objectFit:"cover", height:180 }}
                                    onError={e => {
                                      (e.target as HTMLImageElement).style.display = "none"
                                    }}
                                  />
                                </div>
                                <p style={{ margin:"5px 0 0", fontSize:8, color:"#334155" }}>
                                  Clic para ampliar
                                </p>
                              </div>
                            ) : (
                              <div style={{
                                border:"1px dashed rgba(255,255,255,0.07)",
                                borderRadius:7, padding:"10px",
                                textAlign:"center",
                              }}>
                                <span style={{ fontSize:9, color:"#334155" }}>📷 Sin evidencia fotográfica</span>
                              </div>
                            )}

                            {/* Acciones evento */}
                            <div style={{ display:"flex", gap:6, justifyContent:"flex-end" }}>
                              <button
                                onClick={() => {
                                  setModo("editar")
                                  seleccionarEvento(ev.id)
                                  window.scrollTo({ top:0, behavior:"smooth" })
                                }}
                                style={{
                                  background:"rgba(251,191,36,0.12)",
                                  border:"1px solid rgba(251,191,36,0.3)",
                                  color:"#fbbf24", padding:"6px 12px", borderRadius:6,
                                  fontSize:9, fontWeight:700, cursor:"pointer",
                                }}>✏️ Editar</button>
                              <button
                                onClick={() => eliminarEvento(ev.id)}
                                style={{
                                  background:"rgba(248,113,113,0.1)",
                                  border:"1px solid rgba(248,113,113,0.3)",
                                  color:"#f87171", padding:"6px 10px", borderRadius:6,
                                  fontSize:9, cursor:"pointer",
                                }}>🗑 Eliminar</button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── MODAL FOTO ── */}
      {fotoModal && (
        <div
          onClick={() => setFotoModal(null)}
          style={{
            position:"fixed", inset:0,
            background:"rgba(0,0,0,0.93)",
            display:"flex", alignItems:"center", justifyContent:"center",
            zIndex:100, cursor:"zoom-out",
          }}
        >
          <div style={{ position:"relative" }} onClick={e => e.stopPropagation()}>
            <img
              src={fotoModal}
              alt="evidencia ampliada"
              style={{
                maxWidth:"88vw", maxHeight:"88vh",
                borderRadius:10,
                border:"1px solid rgba(255,255,255,0.1)",
                objectFit:"contain", display:"block",
              }}
            />
            <button
              onClick={() => setFotoModal(null)}
              style={{
                position:"absolute", top:-14, right:-14,
                background:"rgba(248,113,113,0.2)",
                border:"1px solid rgba(248,113,113,0.4)",
                color:"#f87171", width:32, height:32,
                borderRadius:"50%", fontSize:14,
                cursor:"pointer", fontWeight:700,
              }}>✕</button>
          </div>
        </div>
      )}
    </div>
  )
}
