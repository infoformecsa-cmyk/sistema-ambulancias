"use client"

import { useEffect, useState, useRef } from "react"
import type { CSSProperties } from "react"
import { supabase } from "@/lib/supabaseClient"
import { useRouter, useParams } from "next/navigation"

/* ══════════════════════════════════════════
   TIPOS
══════════════════════════════════════════ */
type Ambulancia = {
  id: string
  codigo_operativo: string
  placa: string
  marca: string
  tipo: string
  estado: string
  kilometraje_actual: number
  kilometraje_mtto: number
  base_operativa: string
}

type Evento = {
  id: string
  ambulancia_id: string
  estado: string
  motivo: string
  tipo_mantenimiento: string | null
  tipo_falla: string | null
  area: string[] | null
  fecha_inicio: string
  fecha_fin: string | null
  usuario: string | null
  foto_url: string | null
}

/* ══════════════════════════════════════════
   HELPERS
══════════════════════════════════════════ */
const ESTADO_COLOR: Record<string, { text: string; bg: string; border: string; dot: string; glow: string }> = {
  operativa:      { text:"#4ade80", bg:"rgba(74,222,128,0.08)",  border:"rgba(74,222,128,0.3)",  dot:"#4ade80", glow:"rgba(74,222,128,0.4)"  },
  mantenimiento:  { text:"#fbbf24", bg:"rgba(251,191,36,0.08)",  border:"rgba(251,191,36,0.3)",  dot:"#fbbf24", glow:"rgba(251,191,36,0.4)"  },
  "no operativa": { text:"#f87171", bg:"rgba(248,113,113,0.08)", border:"rgba(248,113,113,0.3)", dot:"#f87171", glow:"rgba(248,113,113,0.4)" },
}

const FALLA_COLOR: Record<string, string> = {
  preventivo:"#38bdf8", correctivo:"#f87171",
  mecanico:"#fbbf24",   electrico:"#a78bfa", accidente:"#fb923c",
}

const AREAS = ["mecanico","electrico","aire acondicionado","carroceria","neumaticos","frenos"]

function fmt(iso: string) {
  return new Date(iso).toLocaleString("es-EC", {
    day:"2-digit", month:"short", year:"numeric", hour:"2-digit", minute:"2-digit",
  })
}
function fmtShort(iso: string) {
  return new Date(iso).toLocaleDateString("es-EC", { day:"2-digit", month:"short", year:"numeric" })
}
function duracion(ini: string, fin: string | null) {
  const h = Math.floor(((fin ? new Date(fin).getTime() : Date.now()) - new Date(ini).getTime()) / 3600000)
  return h < 24 ? `${h}h` : `${Math.floor(h/24)}d ${h%24}h`
}

/* ══════════════════════════════════════════
   COMPONENTE DRAWER (panel flotante)
══════════════════════════════════════════ */
type DrawerProps = {
  open: boolean
  onClose: () => void
  ambulanciaId: string | null
  ambulancias: Ambulancia[]
  onSelectAmb: (id: string) => void
  filtroTipo: "TODOS" | "ALFA" | "BRAVO"
  setFiltroTipo: (f: "TODOS"|"ALFA"|"BRAVO") => void
}

function FichaDrawer({ open, onClose, ambulanciaId, ambulancias, onSelectAmb, filtroTipo, setFiltroTipo }: DrawerProps) {

  /* ── tabs ── */
  const [tab, setTab] = useState<"info"|"estado"|"km"|"historial">("info")

  /* ── datos ambulancia ── */
  const [amb, setAmb] = useState<Ambulancia | null>(null)
  const [eventos, setEventos] = useState<Evento[]>([])

  /* ── formulario estado ── */
  const [estadoPendiente, setEstadoPendiente] = useState("operativa")
  const [motivoCambio,    setMotivoCambio]    = useState("")
  const [tipoMtto,        setTipoMtto]        = useState("")
  const [tipoFalla,       setTipoFalla]        = useState("")
  const [areas,           setAreas]            = useState<string[]>([])
  const [fotoFile,        setFotoFile]         = useState<File | null>(null)
  const [fotoPreview,     setFotoPreview]      = useState<string | null>(null)

  /* ── formulario KM ── */
  const [nuevoKm, setNuevoKm] = useState("")
  const [kmMtto,  setKmMtto]  = useState("")

  /* ── historial UI ── */
  const [expanded,    setExpanded]    = useState<string | null>(null)
  const [fotoModal,   setFotoModal]   = useState<string | null>(null)
  const [modoHist,    setModoHist]    = useState<"nuevo"|"editar">("nuevo")
  const [eventoSel,   setEventoSel]   = useState("")
  const [hEstado,     setHEstado]     = useState("operativa")
  const [hMotivo,     setHMotivo]     = useState("")
  const [hTipoFalla,  setHTipoFalla]  = useState("")
  const [hFechaIni,   setHFechaIni]   = useState("")
  const [hFechaFin,   setHFechaFin]   = useState("")
  const [hFotoFile,   setHFotoFile]   = useState<File | null>(null)
  const [hFotoPreview,setHFotoPreview]= useState<string | null>(null)

  /* ── loading ── */
  const [loading, setLoading] = useState(false)

  /* ── cargar cuando cambia ambulanciaId ── */
  useEffect(() => {
    if (ambulanciaId) {
      cargarAmb()
      cargarEventos()
      setTab("info")
      resetEstadoForm()
      resetHistForm()
    }
  }, [ambulanciaId])

  async function cargarAmb() {
    if (!ambulanciaId) return
    const { data } = await supabase.from("ambulancias").select("*").eq("id", ambulanciaId).single()
    if (data) {
      setAmb(data as Ambulancia)
      setEstadoPendiente(data.estado)
      setNuevoKm(String(data.kilometraje_actual || ""))
      setKmMtto(String(data.kilometraje_mtto || ""))
    }
  }

  async function cargarEventos() {
    if (!ambulanciaId) return
    const { data } = await supabase
      .from("historial_operativo").select("*")
      .eq("ambulancia_id", ambulanciaId)
      .order("fecha_inicio", { ascending: false })
    setEventos((data || []) as Evento[])
  }

  /* ── subir foto ── */
  async function subirFoto(file: File, prefix: string): Promise<string | null> {
    const ext  = file.name.split(".").pop()
    const path = `${prefix}/${ambulanciaId}/${Date.now()}.${ext}`
    const { error } = await supabase.storage.from("imagenes").upload(path, file)
    if (error) { console.error(error); return null }
    const { data } = supabase.storage.from("imagenes").getPublicUrl(path)
    return data.publicUrl
  }

  /* ── CAMBIAR ESTADO ── */
  async function confirmarEstado() {
    if (!motivoCambio.trim()) { alert("Ingresa un motivo"); return }
    setLoading(true)
    try {
      let fotoUrl: string | null = null
      if (fotoFile) fotoUrl = await subirFoto(fotoFile, "estado")

      await supabase.from("ambulancias").update({ estado: estadoPendiente }).eq("id", ambulanciaId!)

      await supabase.from("historial_operativo").insert({
        ambulancia_id: ambulanciaId,
        estado: estadoPendiente,
        motivo: motivoCambio.trim(),
        tipo_mantenimiento: tipoMtto || null,
        tipo_falla: tipoFalla || null,
        area: areas.length ? areas : null,
        foto_url: fotoUrl,
        fecha_inicio: new Date().toISOString(),
        usuario: localStorage.getItem("nombre"),
      })

      resetEstadoForm()
      await cargarAmb()
      await cargarEventos()
      alert("✅ Estado actualizado")
    } catch(e) { console.error(e); alert("❌ Error") }
    setLoading(false)
  }

  /* ── ACTUALIZAR KM ── */
  async function actualizarKm() {
    if (!nuevoKm) return
    await supabase.from("ambulancias").update({ kilometraje_actual: Number(nuevoKm) }).eq("id", ambulanciaId!)
    await cargarAmb()
    alert("✅ KM actualizado")
  }

  async function guardarMtto() {
    if (!kmMtto) return
    await supabase.from("ambulancias").update({ kilometraje_mtto: Number(kmMtto) }).eq("id", ambulanciaId!)
    await cargarAmb()
    alert("✅ KM mantenimiento guardado")
  }

  /* ── GUARDAR EVENTO HISTORIAL ── */
  async function guardarEvento() {
    if (!hFechaIni) { alert("Ingresa fecha inicio"); return }
    if (hEstado !== "operativa" && !hMotivo) { alert("Ingresa motivo"); return }
    setLoading(true)

    let fotoUrl: string | null = null
    if (hFotoFile) fotoUrl = await subirFoto(hFotoFile, "historial")

    if (modoHist === "editar" && eventoSel) {
      const payload: any = {
        estado: hEstado, motivo: hMotivo,
        tipo_falla: hTipoFalla || null,
        fecha_inicio: new Date(hFechaIni).toISOString(),
        fecha_fin: hFechaFin ? new Date(hFechaFin).toISOString() : null,
      }
      if (fotoUrl) payload.foto_url = fotoUrl
      const { error } = await supabase.from("historial_operativo").update(payload).eq("id", eventoSel)
      if (error) alert("❌ Error actualizando")
      else { alert("✅ Evento actualizado"); resetHistForm(); cargarEventos() }
    } else {
      const hoy = new Date().toISOString().split("T")[0]
      if (!hFechaFin && hFechaIni === hoy) {
        await supabase.from("historial_operativo")
          .update({ fecha_fin: new Date().toISOString() })
          .eq("ambulancia_id", ambulanciaId!).is("fecha_fin", null)
      }
      const { error } = await supabase.from("historial_operativo").insert({
        ambulancia_id: ambulanciaId,
        estado: hEstado, motivo: hMotivo,
        tipo_falla: hTipoFalla || null,
        fecha_inicio: new Date(hFechaIni).toISOString(),
        fecha_fin: hFechaFin ? new Date(hFechaFin).toISOString() : null,
        foto_url: fotoUrl,
        usuario: localStorage.getItem("nombre"),
      })
      if (error) alert("❌ Error guardando")
      else { alert("✅ Evento registrado"); resetHistForm(); cargarEventos() }
    }
    setLoading(false)
  }

  async function eliminarEvento(id: string) {
    if (!confirm("¿Eliminar este evento?")) return
    await supabase.from("historial_operativo").delete().eq("id", id)
    cargarEventos()
  }

  function selEvento(id: string) {
    setEventoSel(id)
    const ev = eventos.find(e => String(e.id) === String(id))
    if (!ev) return
    setHEstado(ev.estado); setHMotivo(ev.motivo || "")
    setHTipoFalla(ev.tipo_falla || "")
    setHFechaIni(ev.fecha_inicio?.split("T")[0] || "")
    setHFechaFin(ev.fecha_fin?.split("T")[0] || "")
    setHFotoPreview(ev.foto_url || null)
  }

  function setHTipoFalla(v: string) { setHTipoFalla(v) }

  function resetEstadoForm() {
    setMotivoCambio(""); setTipoMtto(""); setTipoFalla("")
    setAreas([]); setFotoFile(null); setFotoPreview(null)
  }
  function resetHistForm() {
    setModoHist("nuevo"); setEventoSel(""); setHEstado("operativa")
    setHMotivo(""); setHTipoFalla(""); setHFechaIni(""); setHFechaFin("")
    setHFotoFile(null); setHFotoPreview(null)
  }

  /* ── listas filtradas ── */
  const ambsFiltradas = ambulancias.filter(a =>
    filtroTipo === "TODOS" ? true : a.tipo === filtroTipo
  )

  /* ── estilos reutilizables ── */
  const inp: CSSProperties = {
    background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.1)",
    color:"white", padding:"9px 12px", borderRadius:7, fontSize:11,
    fontFamily:"'IBM Plex Mono','Courier New',monospace", outline:"none",
    width:"100%", boxSizing:"border-box",
  }
  const lbl: CSSProperties = {
    fontSize:9, color:"#475569", letterSpacing:"0.1em",
    fontWeight:700, display:"block", marginBottom:5,
  }
  const ec = amb ? (ESTADO_COLOR[amb.estado] || ESTADO_COLOR["no operativa"]) : ESTADO_COLOR["no operativa"]
  const kmAlerta = amb && amb.kilometraje_actual >= amb.kilometraje_mtto

  if (!open) return null

  return (
    <>
      {/* OVERLAY */}
      <div
        onClick={onClose}
        style={{
          position:"fixed", inset:0,
          background:"rgba(0,0,0,0.7)",
          backdropFilter:"blur(4px)",
          zIndex:40,
        }}
      />

      {/* DRAWER */}
      <div style={{
        position:"fixed", top:0, right:0, bottom:0,
        width:"min(92vw, 980px)",
        background:"#060a14",
        borderLeft:"1px solid rgba(255,255,255,0.08)",
        zIndex:50,
        display:"flex", flexDirection:"column",
        fontFamily:"'IBM Plex Mono','Courier New',monospace",
        overflow:"hidden",
        boxShadow:"-20px 0 60px rgba(0,0,0,0.6)",
      }}>

        {/* ── HEADER DRAWER ── */}
        <div style={{
          padding:"16px 20px",
          borderBottom:"1px solid rgba(255,255,255,0.07)",
          background:"linear-gradient(135deg,#0b1120,#060a14)",
          flexShrink:0,
        }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
            <div>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
                <span style={{ fontSize:16 }}>🚑</span>
                <span style={{ fontSize:16, fontWeight:800, color:"#e2e8f0", letterSpacing:"0.05em" }}>
                  FICHA OPERATIVA
                </span>
                {amb && (
                  <span style={{
                    background:ec.bg, border:`1px solid ${ec.border}`,
                    color:ec.text, fontSize:9, fontWeight:700,
                    padding:"2px 8px", borderRadius:4, letterSpacing:"0.05em",
                  }}>{amb.estado.toUpperCase()}</span>
                )}
              </div>

              {/* Selector ambulancia */}
              <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
                {/* Filtro tipo */}
                {(["TODOS","ALFA","BRAVO"] as const).map(f => (
                  <button key={f} onClick={() => setFiltroTipo(f)} style={{
                    background: filtroTipo===f ? (f==="ALFA" ? "rgba(56,189,248,0.15)" : f==="BRAVO" ? "rgba(167,139,250,0.15)" : "rgba(255,255,255,0.08)") : "rgba(255,255,255,0.03)",
                    border:`1px solid ${filtroTipo===f ? (f==="ALFA" ? "#38bdf8" : f==="BRAVO" ? "#a78bfa" : "#64748b") : "rgba(255,255,255,0.08)"}`,
                    color: filtroTipo===f ? (f==="ALFA" ? "#38bdf8" : f==="BRAVO" ? "#a78bfa" : "#e2e8f0") : "#475569",
                    padding:"4px 10px", borderRadius:5,
                    fontSize:9, fontWeight:700, cursor:"pointer",
                  }}>{f}</button>
                ))}

                <select
                  value={ambulanciaId || ""}
                  onChange={e => onSelectAmb(e.target.value)}
                  style={{
                    ...inp, width:"auto", minWidth:200,
                    padding:"5px 10px", fontSize:11,
                  }}
                >
                  <option value="">Seleccione ambulancia</option>
                  {ambsFiltradas.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.codigo_operativo} — {a.placa} {a.tipo ? `(${a.tipo})` : ""}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button onClick={onClose} style={{
              background:"rgba(248,113,113,0.1)", border:"1px solid rgba(248,113,113,0.3)",
              color:"#f87171", width:32, height:32, borderRadius:"50%",
              fontSize:14, cursor:"pointer", fontWeight:700, flexShrink:0,
            }}>✕</button>
          </div>

          {/* KPIs rápidos */}
          {amb && (
            <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8, marginTop:12 }}>
              {[
                { label:"CÓDIGO",      val:amb.codigo_operativo,                         color:"#e2e8f0" },
                { label:"KM ACTUAL",   val:amb.kilometraje_actual?.toLocaleString()||"—", color: kmAlerta ? "#f87171" : "#e2e8f0" },
                { label:"PRÓX. MTTO",  val:amb.kilometraje_mtto ? `${amb.kilometraje_mtto.toLocaleString()} KM` : "—", color:"#fbbf24" },
                { label:"BASE",        val:amb.base_operativa||"—",                       color:"#64748b" },
              ].map(k => (
                <div key={k.label} style={{
                  background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.06)",
                  borderRadius:7, padding:"8px 10px",
                }}>
                  <p style={{ margin:0, fontSize:8, color:"#334155", letterSpacing:"0.1em", fontWeight:700 }}>{k.label}</p>
                  <p style={{ margin:"3px 0 0", fontSize:11, fontWeight:700, color:k.color, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{k.val}</p>
                </div>
              ))}
            </div>
          )}

          {/* TABS */}
          {amb && (
            <div style={{ display:"flex", gap:4, marginTop:12 }}>
              {[
                { key:"info",     label:"ℹ️ Info",      },
                { key:"estado",   label:"🔄 Estado",    },
                { key:"km",       label:"📏 KM / Mtto", },
                { key:"historial",label:"📋 Historial", },
              ].map(t => (
                <button key={t.key} onClick={() => setTab(t.key as any)} style={{
                  background: tab===t.key ? "rgba(34,211,238,0.12)" : "rgba(255,255,255,0.03)",
                  border:`1px solid ${tab===t.key ? "rgba(34,211,238,0.4)" : "rgba(255,255,255,0.07)"}`,
                  color: tab===t.key ? "#22d3ee" : "#475569",
                  padding:"6px 14px", borderRadius:6,
                  fontSize:10, fontWeight:700, cursor:"pointer",
                }}>{t.label}</button>
              ))}
            </div>
          )}
        </div>

        {/* ── CONTENIDO TABS ── */}
        <div style={{ flex:1, overflowY:"auto", padding:20 }}>

          {!ambulanciaId && (
            <div style={{
              display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
              height:"100%", color:"#334155", gap:12,
            }}>
              <span style={{ fontSize:40 }}>🚑</span>
              <p style={{ fontSize:12, letterSpacing:"0.08em" }}>Seleccione una ambulancia para ver su ficha</p>
            </div>
          )}

          {/* ══ TAB INFO ══ */}
          {amb && tab === "info" && (
            <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
              <SectionLabel>DATOS DE LA UNIDAD</SectionLabel>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                {[
                  { label:"Código Operativo", val:amb.codigo_operativo },
                  { label:"Placa",            val:amb.placa },
                  { label:"Marca",            val:amb.marca || "—" },
                  { label:"Tipo",             val:amb.tipo },
                  { label:"Base Operativa",   val:amb.base_operativa || "—" },
                  { label:"Estado Actual",    val:amb.estado, color:ec.text },
                  { label:"KM Actual",        val:amb.kilometraje_actual?.toLocaleString() || "—", color: kmAlerta ? "#f87171" : undefined },
                  { label:"KM Próx. Mtto",    val:amb.kilometraje_mtto?.toLocaleString() || "—", color:"#fbbf24" },
                ].map(f => (
                  <div key={f.label} style={{
                    background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.06)",
                    borderRadius:8, padding:"10px 12px",
                  }}>
                    <p style={{ margin:0, fontSize:8, color:"#334155", letterSpacing:"0.08em", fontWeight:700 }}>{f.label.toUpperCase()}</p>
                    <p style={{ margin:"4px 0 0", fontSize:12, fontWeight:700, color:(f as any).color || "#94a3b8" }}>{f.val}</p>
                  </div>
                ))}
              </div>

              {/* Barra KM */}
              {amb.kilometraje_mtto > 0 && (
                <div>
                  <SectionLabel>PROGRESO HACIA PRÓXIMO MANTENIMIENTO</SectionLabel>
                  <div style={{ background:"rgba(255,255,255,0.05)", borderRadius:4, height:8, overflow:"hidden", marginTop:6 }}>
                    <div style={{
                      width:`${Math.min((amb.kilometraje_actual / amb.kilometraje_mtto)*100,100)}%`,
                      height:"100%",
                      background: kmAlerta
                        ? "linear-gradient(90deg,#f87171,#ef4444)"
                        : "linear-gradient(90deg,#22d3ee,#38bdf8)",
                      borderRadius:4, transition:"width 0.5s",
                    }}/>
                  </div>
                  <div style={{ display:"flex", justifyContent:"space-between", marginTop:4 }}>
                    <span style={{ fontSize:9, color:"#475569" }}>0 KM</span>
                    <span style={{ fontSize:9, color: kmAlerta ? "#f87171" : "#475569" }}>
                      {kmAlerta ? "⚠ VENCIDO" : `Faltan ${(amb.kilometraje_mtto - amb.kilometraje_actual).toLocaleString()} KM`}
                    </span>
                    <span style={{ fontSize:9, color:"#475569" }}>{amb.kilometraje_mtto?.toLocaleString()} KM</span>
                  </div>
                </div>
              )}

              {/* Resumen historial */}
              <div>
                <SectionLabel>RESUMEN DE EVENTOS</SectionLabel>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8, marginTop:6 }}>
                  {[
                    { label:"Total",       val:eventos.length,                                         color:"#38bdf8" },
                    { label:"Mtto",        val:eventos.filter(e=>e.estado==="mantenimiento").length,    color:"#fbbf24" },
                    { label:"No operativa",val:eventos.filter(e=>e.estado==="no operativa").length,     color:"#f87171" },
                  ].map(k => (
                    <div key={k.label} style={{
                      background:`${k.color}08`, border:`1px solid ${k.color}20`,
                      borderRadius:8, padding:"10px", textAlign:"center",
                    }}>
                      <p style={{ margin:0, fontSize:9, color:"#475569" }}>{k.label}</p>
                      <p style={{ margin:"4px 0 0", fontSize:20, fontWeight:800, color:k.color }}>{k.val}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ══ TAB ESTADO ══ */}
          {amb && tab === "estado" && (
            <div style={{ display:"flex", flexDirection:"column", gap:16, maxWidth:500 }}>
              <SectionLabel>CAMBIAR ESTADO DE LA UNIDAD</SectionLabel>

              {/* Estado actual */}
              <div style={{
                background:ec.bg, border:`2px solid ${ec.border}`,
                borderRadius:10, padding:"12px 16px",
                display:"flex", alignItems:"center", justifyContent:"space-between",
              }}>
                <span style={{ fontSize:10, color:"#475569", letterSpacing:"0.08em" }}>ESTADO ACTUAL</span>
                <span style={{ fontSize:14, fontWeight:800, color:ec.text, letterSpacing:"0.05em" }}>
                  {amb.estado.toUpperCase()}
                </span>
              </div>

              {/* Botones estado */}
              <div>
                <label style={lbl}>NUEVO ESTADO</label>
                <div style={{ display:"flex", gap:8 }}>
                  {[
                    { val:"operativa",     label:"✅ Operativa",    color:"#4ade80" },
                    { val:"mantenimiento", label:"🔧 Mantenimiento", color:"#fbbf24" },
                    { val:"no operativa",  label:"🔴 No operativa", color:"#f87171" },
                  ].map(s => (
                    <button key={s.val} onClick={() => setEstadoPendiente(s.val)} style={{
                      flex:1,
                      background: estadoPendiente===s.val ? `${s.color}18` : "rgba(255,255,255,0.03)",
                      border:`1px solid ${estadoPendiente===s.val ? s.color+"60" : "rgba(255,255,255,0.08)"}`,
                      color: estadoPendiente===s.val ? s.color : "#475569",
                      padding:"10px 6px", borderRadius:7,
                      fontSize:10, fontWeight:700, cursor:"pointer",
                    }}>{s.label}</button>
                  ))}
                </div>
              </div>

              {/* Tipo mantenimiento */}
              <div>
                <label style={lbl}>TIPO DE MANTENIMIENTO</label>
                <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                  {["preventivo","correctivo"].map(t => (
                    <button key={t} onClick={() => setTipoMtto(tipoMtto===t?"":t)} style={{
                      background: tipoMtto===t ? "rgba(56,189,248,0.15)" : "rgba(255,255,255,0.03)",
                      border:`1px solid ${tipoMtto===t ? "#38bdf8" : "rgba(255,255,255,0.08)"}`,
                      color: tipoMtto===t ? "#38bdf8" : "#475569",
                      padding:"6px 12px", borderRadius:5,
                      fontSize:10, fontWeight:700, cursor:"pointer", textTransform:"capitalize",
                    }}>{t}</button>
                  ))}
                </div>
              </div>

              {/* Tipo falla */}
              <div>
                <label style={lbl}>TIPO DE FALLA</label>
                <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
                  {Object.entries(FALLA_COLOR).map(([t, fc]) => (
                    <button key={t} onClick={() => setTipoFalla(tipoFalla===t?"":t)} style={{
                      background: tipoFalla===t ? `${fc}18` : "rgba(255,255,255,0.03)",
                      border:`1px solid ${tipoFalla===t ? fc+"50" : "rgba(255,255,255,0.08)"}`,
                      color: tipoFalla===t ? fc : "#475569",
                      padding:"5px 10px", borderRadius:5,
                      fontSize:9, fontWeight:700, cursor:"pointer", textTransform:"capitalize",
                    }}>{t}</button>
                  ))}
                </div>
              </div>

              {/* Áreas */}
              <div>
                <label style={lbl}>ÁREA(S) AFECTADA(S)</label>
                <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                  {AREAS.map(a => {
                    const active = areas.includes(a)
                    return (
                      <label key={a} style={{
                        display:"flex", alignItems:"center", gap:6,
                        background: active ? "rgba(167,139,250,0.12)" : "rgba(255,255,255,0.03)",
                        border:`1px solid ${active ? "rgba(167,139,250,0.4)" : "rgba(255,255,255,0.08)"}`,
                        color: active ? "#a78bfa" : "#475569",
                        padding:"5px 10px", borderRadius:5, cursor:"pointer",
                        fontSize:9, fontWeight:700, textTransform:"capitalize",
                      }}>
                        <input type="checkbox" checked={active} style={{ display:"none" }}
                          onChange={e => setAreas(e.target.checked ? [...areas,a] : areas.filter(x=>x!==a))}/>
                        {active ? "✓" : "+"} {a}
                      </label>
                    )
                  })}
                </div>
              </div>

              {/* Motivo */}
              <div>
                <label style={lbl}>MOTIVO / DETALLE *</label>
                <textarea
                  value={motivoCambio}
                  onChange={e => setMotivoCambio(e.target.value)}
                  placeholder="Describe el motivo del cambio de estado..."
                  style={{ ...inp, height:90, resize:"vertical" as const }}
                />
              </div>

              {/* Foto */}
              <FotoUploader
                preview={fotoPreview}
                onFile={f => { setFotoFile(f); if(f) setFotoPreview(URL.createObjectURL(f)) }}
                onClear={() => { setFotoFile(null); setFotoPreview(null) }}
              />

              <button onClick={confirmarEstado} disabled={loading} style={{
                background: loading ? "rgba(255,255,255,0.05)" : "linear-gradient(135deg,#0891b2,#0e7490)",
                border:"none", color: loading ? "#475569" : "white",
                padding:"13px", borderRadius:8, fontSize:11, fontWeight:800,
                cursor: loading ? "not-allowed" : "pointer", letterSpacing:"0.05em",
              }}>
                {loading ? "⏳ Guardando..." : "💾 CONFIRMAR CAMBIO DE ESTADO"}
              </button>
            </div>
          )}

          {/* ══ TAB KM ══ */}
          {amb && tab === "km" && (
            <div style={{ display:"flex", flexDirection:"column", gap:20, maxWidth:400 }}>
              <div>
                <SectionLabel>📏 ACTUALIZAR KILOMETRAJE ACTUAL</SectionLabel>
                <div style={{
                  background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.07)",
                  borderRadius:10, padding:16, marginTop:8,
                }}>
                  <p style={{ margin:"0 0 4px", fontSize:9, color:"#475569", letterSpacing:"0.08em" }}>KM ACTUAL REGISTRADO</p>
                  <p style={{ margin:"0 0 14px", fontSize:22, fontWeight:800, color: kmAlerta ? "#f87171" : "#e2e8f0" }}>
                    {amb.kilometraje_actual?.toLocaleString()} KM
                  </p>
                  <label style={lbl}>NUEVO VALOR KM</label>
                  <div style={{ display:"flex", gap:8 }}>
                    <input type="number" value={nuevoKm} onChange={e=>setNuevoKm(e.target.value)}
                      placeholder="Ej: 71000" style={{ ...inp, flex:1 }}/>
                    <button onClick={actualizarKm} style={{
                      background:"rgba(56,189,248,0.15)", border:"1px solid rgba(56,189,248,0.4)",
                      color:"#38bdf8", padding:"9px 16px", borderRadius:7,
                      fontSize:11, fontWeight:700, cursor:"pointer", whiteSpace:"nowrap",
                    }}>Actualizar</button>
                  </div>
                </div>
              </div>

              <div>
                <SectionLabel>🛠 PROGRAMAR PRÓXIMO MANTENIMIENTO</SectionLabel>
                <div style={{
                  background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.07)",
                  borderRadius:10, padding:16, marginTop:8,
                }}>
                  <p style={{ margin:"0 0 4px", fontSize:9, color:"#475569", letterSpacing:"0.08em" }}>KM PRÓXIMO MTTO ACTUAL</p>
                  <p style={{ margin:"0 0 14px", fontSize:22, fontWeight:800, color:"#fbbf24" }}>
                    {amb.kilometraje_mtto?.toLocaleString() || "No definido"} {amb.kilometraje_mtto ? "KM" : ""}
                  </p>
                  <label style={lbl}>NUEVO KM PARA MANTENIMIENTO</label>
                  <div style={{ display:"flex", gap:8 }}>
                    <input type="number" value={kmMtto} onChange={e=>setKmMtto(e.target.value)}
                      placeholder="Ej: 75000" style={{ ...inp, flex:1 }}/>
                    <button onClick={guardarMtto} style={{
                      background:"rgba(251,191,36,0.15)", border:"1px solid rgba(251,191,36,0.4)",
                      color:"#fbbf24", padding:"9px 16px", borderRadius:7,
                      fontSize:11, fontWeight:700, cursor:"pointer", whiteSpace:"nowrap",
                    }}>Guardar</button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ══ TAB HISTORIAL ══ */}
          {amb && tab === "historial" && (
            <div style={{ display:"grid", gridTemplateColumns:"320px 1fr", gap:16, alignItems:"start" }}>

              {/* Formulario historial */}
              <div style={{
                background:"linear-gradient(160deg,#0f172a,#0b1120)",
                border:"1px solid rgba(255,255,255,0.07)",
                borderRadius:10, padding:16,
                position:"sticky", top:0,
              }}>
                <div style={{ display:"flex", gap:5, marginBottom:14 }}>
                  {(["nuevo","editar"] as const).map(m => (
                    <button key={m} onClick={() => { setModoHist(m); resetHistForm() }} style={{
                      flex:1,
                      background: modoHist===m ? "rgba(34,211,238,0.12)" : "rgba(255,255,255,0.03)",
                      border:`1px solid ${modoHist===m ? "rgba(34,211,238,0.4)" : "rgba(255,255,255,0.07)"}`,
                      color: modoHist===m ? "#22d3ee" : "#475569",
                      padding:"7px", borderRadius:6,
                      fontSize:9, fontWeight:700, cursor:"pointer", textTransform:"uppercase",
                    }}>{m==="nuevo" ? "➕ Nuevo" : "✏️ Editar"}</button>
                  ))}
                </div>

                <div style={{ display:"flex", flexDirection:"column", gap:11 }}>
                  {modoHist === "editar" && (
                    <div>
                      <label style={lbl}>EVENTO A EDITAR</label>
                      <select value={eventoSel} onChange={e=>selEvento(e.target.value)} style={inp}>
                        <option value="">Seleccione evento</option>
                        {eventos.map(ev => (
                          <option key={ev.id} value={ev.id}>
                            {fmtShort(ev.fecha_inicio)} — {ev.estado}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Estado */}
                  <div>
                    <label style={lbl}>ESTADO</label>
                    <div style={{ display:"flex", gap:5 }}>
                      {[
                        { val:"operativa",     c:"#4ade80", l:"Op." },
                        { val:"mantenimiento", c:"#fbbf24", l:"Mtto" },
                        { val:"no operativa",  c:"#f87171", l:"No op." },
                      ].map(s => (
                        <button key={s.val} onClick={() => setHEstado(s.val)} style={{
                          flex:1,
                          background: hEstado===s.val ? `${s.c}18` : "rgba(255,255,255,0.03)",
                          border:`1px solid ${hEstado===s.val ? s.c+"50" : "rgba(255,255,255,0.07)"}`,
                          color: hEstado===s.val ? s.c : "#475569",
                          padding:"6px 3px", borderRadius:5,
                          fontSize:9, fontWeight:700, cursor:"pointer",
                        }}>{s.l}</button>
                      ))}
                    </div>
                  </div>

                  {/* Tipo falla */}
                  <div>
                    <label style={lbl}>TIPO DE FALLA</label>
                    <div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>
                      {Object.entries(FALLA_COLOR).map(([t,fc]) => (
                        <button key={t} onClick={() => setHTipoFalla(hTipoFalla===t?"":t)} style={{
                          background: hTipoFalla===t ? `${fc}18` : "rgba(255,255,255,0.03)",
                          border:`1px solid ${hTipoFalla===t ? fc+"50" : "rgba(255,255,255,0.07)"}`,
                          color: hTipoFalla===t ? fc : "#475569",
                          padding:"4px 8px", borderRadius:4,
                          fontSize:8, fontWeight:700, cursor:"pointer", textTransform:"capitalize",
                        }}>{t}</button>
                      ))}
                    </div>
                  </div>

                  {/* Motivo */}
                  <div>
                    <label style={lbl}>MOTIVO</label>
                    <textarea value={hMotivo} onChange={e=>setHMotivo(e.target.value)}
                      placeholder="Describe el evento..."
                      style={{ ...inp, height:70, resize:"vertical" as const }}/>
                  </div>

                  {/* Fechas */}
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6 }}>
                    <div>
                      <label style={lbl}>INICIO</label>
                      <input type="date" value={hFechaIni} onChange={e=>setHFechaIni(e.target.value)} style={inp}/>
                    </div>
                    <div>
                      <label style={lbl}>FIN</label>
                      <input type="date" value={hFechaFin} onChange={e=>setHFechaFin(e.target.value)} style={inp}/>
                    </div>
                  </div>

                  {/* Foto */}
                  <FotoUploader
                    preview={hFotoPreview}
                    onFile={f => { setHFotoFile(f); if(f) setHFotoPreview(URL.createObjectURL(f)) }}
                    onClear={() => { setHFotoFile(null); setHFotoPreview(null) }}
                    compact
                  />

                  <button onClick={guardarEvento} disabled={loading} style={{
                    background: loading ? "rgba(255,255,255,0.05)" : "linear-gradient(135deg,#0891b2,#0e7490)",
                    border:"none", color: loading ? "#475569" : "white",
                    padding:"10px", borderRadius:7, fontSize:10, fontWeight:800,
                    cursor: loading ? "not-allowed" : "pointer",
                  }}>
                    {loading ? "⏳ Guardando..." : "💾 GUARDAR EVENTO"}
                  </button>
                </div>
              </div>

              {/* Timeline */}
              <div>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
                  <span style={{ fontSize:9, color:"#475569", letterSpacing:"0.1em", fontWeight:700 }}>
                    ▸ LÍNEA DE TIEMPO — {eventos.length} eventos
                  </span>
                  <span style={{ fontSize:8, color:"#334155" }}>más reciente arriba</span>
                </div>

                {eventos.length === 0 ? (
                  <div style={{
                    border:"1px dashed rgba(255,255,255,0.07)", borderRadius:10,
                    padding:30, textAlign:"center", color:"#334155", fontSize:11,
                  }}>Sin eventos registrados</div>
                ) : (
                  <div style={{ position:"relative" }}>
                    <div style={{
                      position:"absolute", left:13, top:0, bottom:0,
                      width:2, background:"rgba(255,255,255,0.05)",
                    }}/>
                    <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                      {eventos.map(ev => {
                        const c      = ESTADO_COLOR[ev.estado] || ESTADO_COLOR["no operativa"]
                        const isOpen = expanded === ev.id
                        const fc     = ev.tipo_falla ? FALLA_COLOR[ev.tipo_falla] : "#475569"
                        const activo = !ev.fecha_fin

                        return (
                          <div key={ev.id} style={{ display:"flex", gap:12, paddingLeft:2 }}>
                            {/* Dot */}
                            <div style={{ position:"relative", zIndex:1, flexShrink:0, marginTop:12 }}>
                              <div style={{
                                width:24, height:24, borderRadius:"50%",
                                background:c.bg, border:`2px solid ${c.dot}`,
                                display:"flex", alignItems:"center", justifyContent:"center",
                                boxShadow: activo ? `0 0 8px ${c.glow}` : "none",
                              }}>
                                <div style={{ width:7, height:7, borderRadius:"50%", background:c.dot }}/>
                              </div>
                            </div>

                            {/* Card */}
                            <div style={{
                              flex:1,
                              background: isOpen ? "linear-gradient(135deg,#0f172a,#0d1a2a)" : "rgba(255,255,255,0.02)",
                              border:`1px solid ${isOpen ? c.border : "rgba(255,255,255,0.05)"}`,
                              borderRadius:9, overflow:"hidden", transition:"all 0.2s",
                            }}>
                              {/* Header */}
                              <div onClick={() => setExpanded(isOpen?null:ev.id)}
                                style={{ padding:"10px 12px", cursor:"pointer", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                                <div style={{ display:"flex", alignItems:"center", gap:6, flexWrap:"wrap" }}>
                                  <span style={{
                                    background:c.bg, border:`1px solid ${c.border}`,
                                    color:c.text, fontSize:8, fontWeight:700,
                                    padding:"2px 7px", borderRadius:3, letterSpacing:"0.05em",
                                  }}>{ev.estado.toUpperCase()}</span>
                                  {ev.tipo_falla && (
                                    <span style={{
                                      background:`${fc}15`, border:`1px solid ${fc}40`,
                                      color:fc, fontSize:8, fontWeight:700,
                                      padding:"2px 7px", borderRadius:3, textTransform:"capitalize",
                                    }}>{ev.tipo_falla}</span>
                                  )}
                                  {activo && (
                                    <span style={{
                                      background:"rgba(251,191,36,0.15)", border:"1px solid rgba(251,191,36,0.4)",
                                      color:"#fbbf24", fontSize:7, fontWeight:700, padding:"2px 6px", borderRadius:3,
                                    }}>● EN CURSO</span>
                                  )}
                                  {ev.foto_url && <span style={{ fontSize:9 }}>📷</span>}
                                </div>
                                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                                  <span style={{ fontSize:8, color:"#475569" }}>{duracion(ev.fecha_inicio, ev.fecha_fin)}</span>
                                  <span style={{
                                    color:"#334155", fontSize:9, display:"inline-block",
                                    transform: isOpen ? "rotate(180deg)" : "none", transition:"transform 0.2s",
                                  }}>▼</span>
                                </div>
                              </div>

                              {/* Fechas */}
                              <div style={{ padding:"0 12px 8px", display:"flex", gap:12, flexWrap:"wrap" }}>
                                <span style={{ fontSize:8, color:"#475569" }}>
                                  🕐 <span style={{ color:"#64748b" }}>{fmt(ev.fecha_inicio)}</span>
                                </span>
                                {ev.fecha_fin && (
                                  <span style={{ fontSize:8, color:"#475569" }}>
                                    🏁 <span style={{ color:"#64748b" }}>{fmt(ev.fecha_fin)}</span>
                                  </span>
                                )}
                                {ev.usuario && <span style={{ fontSize:8, color:"#334155" }}>👤 {ev.usuario}</span>}
                              </div>

                              {/* Expandido */}
                              {isOpen && (
                                <div style={{
                                  borderTop:"1px solid rgba(255,255,255,0.05)",
                                  padding:"12px", display:"flex", flexDirection:"column", gap:10,
                                }}>
                                  {ev.motivo && (
                                    <div>
                                      <p style={{ margin:"0 0 4px", fontSize:7, color:"#475569", letterSpacing:"0.1em", fontWeight:700 }}>MOTIVO</p>
                                      <p style={{ margin:0, fontSize:10, color:"#94a3b8", lineHeight:1.6 }}>{ev.motivo}</p>
                                    </div>
                                  )}
                                  {ev.area && Array.isArray(ev.area) && ev.area.length > 0 && (
                                    <div>
                                      <p style={{ margin:"0 0 4px", fontSize:7, color:"#475569", letterSpacing:"0.1em", fontWeight:700 }}>ÁREAS</p>
                                      <div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>
                                        {ev.area.map(a => (
                                          <span key={a} style={{
                                            background:"rgba(167,139,250,0.1)", border:"1px solid rgba(167,139,250,0.25)",
                                            color:"#a78bfa", fontSize:8, padding:"2px 7px", borderRadius:3, textTransform:"capitalize",
                                          }}>{a}</span>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {/* FOTO con visor */}
                                  {ev.foto_url ? (
                                    <div>
                                      <p style={{ margin:"0 0 6px", fontSize:7, color:"#475569", letterSpacing:"0.1em", fontWeight:700 }}>EVIDENCIA FOTOGRÁFICA</p>
                                      <div onClick={() => setFotoModal(ev.foto_url!)} style={{
                                        cursor:"zoom-in", borderRadius:6, overflow:"hidden",
                                        border:"1px solid rgba(255,255,255,0.1)",
                                        maxWidth:260, display:"inline-block",
                                      }}>
                                        <img
                                          src={ev.foto_url}
                                          alt="evidencia"
                                          style={{ width:"100%", display:"block", objectFit:"cover", height:150 }}
                                          onError={e => { (e.target as HTMLImageElement).src = ""; (e.target as HTMLImageElement).style.display="none" }}
                                        />
                                      </div>
                                      <p style={{ margin:"4px 0 0", fontSize:7, color:"#334155" }}>Clic para ampliar</p>
                                    </div>
                                  ) : (
                                    <div style={{ border:"1px dashed rgba(255,255,255,0.06)", borderRadius:6, padding:"8px", textAlign:"center" }}>
                                      <span style={{ fontSize:8, color:"#334155" }}>📷 Sin evidencia fotográfica</span>
                                    </div>
                                  )}

                                  {/* Acciones */}
                                  <div style={{ display:"flex", gap:5, justifyContent:"flex-end" }}>
                                    <button onClick={() => {
                                      setModoHist("editar"); selEvento(ev.id)
                                    }} style={{
                                      background:"rgba(251,191,36,0.12)", border:"1px solid rgba(251,191,36,0.3)",
                                      color:"#fbbf24", padding:"5px 10px", borderRadius:5,
                                      fontSize:8, fontWeight:700, cursor:"pointer",
                                    }}>✏️ Editar</button>
                                    <button onClick={() => eliminarEvento(ev.id)} style={{
                                      background:"rgba(248,113,113,0.1)", border:"1px solid rgba(248,113,113,0.3)",
                                      color:"#f87171", padding:"5px 8px", borderRadius:5,
                                      fontSize:8, cursor:"pointer",
                                    }}>🗑</button>
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
          )}
        </div>
      </div>

      {/* MODAL FOTO */}
      {fotoModal && (
        <div onClick={() => setFotoModal(null)} style={{
          position:"fixed", inset:0, background:"rgba(0,0,0,0.95)",
          display:"flex", alignItems:"center", justifyContent:"center",
          zIndex:200, cursor:"zoom-out",
        }}>
          <div style={{ position:"relative" }} onClick={e => e.stopPropagation()}>
            <img src={fotoModal} alt="ampliada" style={{
              maxWidth:"90vw", maxHeight:"90vh", borderRadius:10,
              border:"1px solid rgba(255,255,255,0.1)", objectFit:"contain", display:"block",
            }}/>
            <button onClick={() => setFotoModal(null)} style={{
              position:"absolute", top:-14, right:-14,
              background:"rgba(248,113,113,0.2)", border:"1px solid rgba(248,113,113,0.4)",
              color:"#f87171", width:30, height:30, borderRadius:"50%",
              fontSize:13, cursor:"pointer", fontWeight:700,
            }}>✕</button>
          </div>
        </div>
      )}
    </>
  )
}

/* ══════════════════════════════════════════
   SUBCOMPONENTES
══════════════════════════════════════════ */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:2 }}>
      <div style={{ height:1, flex:1, background:"rgba(255,255,255,0.06)" }}/>
      <span style={{ fontSize:9, color:"#334155", letterSpacing:"0.12em", fontWeight:700, whiteSpace:"nowrap" }}>
        {children}
      </span>
      <div style={{ height:1, flex:1, background:"rgba(255,255,255,0.06)" }}/>
    </div>
  )
}

function FotoUploader({ preview, onFile, onClear, compact=false }: {
  preview: string|null; onFile:(f:File)=>void; onClear:()=>void; compact?:boolean
}) {
  return (
    <div>
      <label style={{
        fontSize:9, color:"#475569", letterSpacing:"0.1em",
        fontWeight:700, display:"block", marginBottom:5,
      }}>FOTO / EVIDENCIA</label>
      <label style={{
        display:"block",
        border:"1px dashed rgba(255,255,255,0.1)",
        borderRadius:7, padding: compact ? "10px" : "14px",
        textAlign:"center", cursor:"pointer",
        background:"rgba(255,255,255,0.02)",
      }}>
        <input type="file" accept="image/*" style={{ display:"none" }}
          onChange={e => { const f=e.target.files?.[0]; if(f) onFile(f) }}/>
        {preview ? (
          <img src={preview} alt="preview"
            style={{ maxWidth:"100%", maxHeight: compact?80:120, borderRadius:5, objectFit:"cover" }}/>
        ) : (
          <>
            <div style={{ fontSize: compact?18:22, marginBottom:3 }}>📷</div>
            <p style={{ margin:0, fontSize:8, color:"#475569" }}>Toca para subir imagen</p>
          </>
        )}
      </label>
      {preview && (
        <button onClick={onClear} style={{
          marginTop:4, background:"rgba(248,113,113,0.08)",
          border:"1px solid rgba(248,113,113,0.25)",
          color:"#f87171", padding:"3px 10px", borderRadius:4,
          fontSize:8, cursor:"pointer", width:"100%",
        }}>✕ Quitar foto</button>
      )}
    </div>
  )
}

/* ══════════════════════════════════════════
   PÁGINA PRINCIPAL — usa el drawer
══════════════════════════════════════════ */
export default function FichaAmbulancia() {
  const router   = useRouter()
  const params   = useParams()
  const id       = params?.id as string | undefined

  const [drawerOpen,    setDrawerOpen]    = useState(false)
  const [selectedAmb,   setSelectedAmb]   = useState<string | null>(id || null)
  const [ambulancias,   setAmbulancias]   = useState<Ambulancia[]>([])
  const [filtroTipo,    setFiltroTipo]    = useState<"TODOS"|"ALFA"|"BRAVO">("TODOS")

  useEffect(() => {
    cargarAmbulancias()
    if (id) { setSelectedAmb(id); setDrawerOpen(true) }
  }, [id])

  async function cargarAmbulancias() {
    const { data } = await supabase
      .from("ambulancias")
      .select("id,codigo_operativo,placa,marca,tipo,estado,kilometraje_actual,kilometraje_mtto,base_operativa")
      .order("codigo_operativo")
    setAmbulancias((data || []) as Ambulancia[])
  }

  function abrirFicha(ambId: string) {
    setSelectedAmb(ambId)
    setDrawerOpen(true)
  }

  const alfas  = ambulancias.filter(a => a.tipo === "ALFA")
  const bravos = ambulancias.filter(a => a.tipo === "BRAVO")
  const visible = filtroTipo==="ALFA" ? alfas : filtroTipo==="BRAVO" ? bravos : ambulancias

  const inp: CSSProperties = {
    background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.1)",
    color:"white", padding:"9px 12px", borderRadius:7, fontSize:11,
    fontFamily:"'IBM Plex Mono','Courier New',monospace", outline:"none",
    width:"100%", boxSizing:"border-box",
  }

  return (
    <div style={{
      background:"#060a14", minHeight:"100vh", color:"white",
      fontFamily:"'IBM Plex Mono','Courier New',monospace", padding:28,
    }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24 }}>
        <div>
          <h1 style={{ margin:0, fontSize:18, fontWeight:800, color:"#e2e8f0", letterSpacing:"0.05em" }}>
            🚑 GESTIÓN DE FLOTA
          </h1>
          <p style={{ margin:"4px 0 0", fontSize:10, color:"#475569", letterSpacing:"0.08em" }}>
            Selecciona una ambulancia para abrir su ficha completa
          </p>
        </div>
        <button onClick={() => router.push("/dashboard")} style={{
          background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)",
          color:"#94a3b8", padding:"8px 16px", borderRadius:7,
          fontSize:10, fontWeight:700, cursor:"pointer",
        }}>← Volver</button>
      </div>

      {/* Filtros */}
      <div style={{ display:"flex", gap:6, marginBottom:16 }}>
        {(["TODOS","ALFA","BRAVO"] as const).map(f => (
          <button key={f} onClick={() => setFiltroTipo(f)} style={{
            background: filtroTipo===f
              ? (f==="ALFA" ? "rgba(56,189,248,0.15)" : f==="BRAVO" ? "rgba(167,139,250,0.15)" : "rgba(255,255,255,0.08)")
              : "rgba(255,255,255,0.03)",
            border:`1px solid ${filtroTipo===f ? (f==="ALFA" ? "#38bdf8" : f==="BRAVO" ? "#a78bfa" : "#64748b") : "rgba(255,255,255,0.08)"}`,
            color: filtroTipo===f ? (f==="ALFA" ? "#38bdf8" : f==="BRAVO" ? "#a78bfa" : "#e2e8f0") : "#475569",
            padding:"7px 16px", borderRadius:7,
            fontSize:10, fontWeight:700, cursor:"pointer",
          }}>{f} {f!=="TODOS" && `(${f==="ALFA"?alfas.length:bravos.length})`}</button>
        ))}
      </div>

      {/* Tabla */}
      <div style={{
        background:"#0b1120", border:"1px solid rgba(255,255,255,0.07)",
        borderRadius:12, overflow:"hidden",
      }}>
        <table style={{ width:"100%", borderCollapse:"collapse", fontSize:11 }}>
          <thead>
            <tr style={{ background:"rgba(255,255,255,0.03)", borderBottom:"1px solid rgba(255,255,255,0.07)" }}>
              {["Estado","Código","Placa","Marca","Tipo","Base Operativa","KM","Ficha"].map(h => (
                <th key={h} style={{
                  padding:"10px 14px", textAlign:"left",
                  fontSize:9, color:"#475569", letterSpacing:"0.1em", fontWeight:700,
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map((a, i) => {
              const c = ESTADO_COLOR[a.estado] || ESTADO_COLOR["no operativa"]
              const kmAlert = a.kilometraje_actual >= a.kilometraje_mtto
              return (
                <tr key={a.id} style={{
                  borderBottom:"1px solid rgba(255,255,255,0.04)",
                  background: i%2===0 ? "transparent" : "rgba(255,255,255,0.01)",
                }}>
                  <td style={{ padding:"10px 14px" }}>
                    <span style={{
                      background:c.bg, border:`1px solid ${c.border}`,
                      color:c.text, fontSize:9, fontWeight:700,
                      padding:"2px 8px", borderRadius:4, letterSpacing:"0.05em",
                    }}>{a.estado.toUpperCase()}</span>
                  </td>
                  <td style={{ padding:"10px 14px", fontWeight:800, color:"#e2e8f0" }}>{a.codigo_operativo}</td>
                  <td style={{ padding:"10px 14px", color:"#94a3b8" }}>{a.placa}</td>
                  <td style={{ padding:"10px 14px", color:"#94a3b8" }}>{a.marca||"—"}</td>
                  <td style={{ padding:"10px 14px" }}>
                    <span style={{
                      background: a.tipo==="ALFA" ? "rgba(56,189,248,0.1)" : "rgba(167,139,250,0.1)",
                      color: a.tipo==="ALFA" ? "#38bdf8" : "#a78bfa",
                      border:`1px solid ${a.tipo==="ALFA" ? "rgba(56,189,248,0.25)" : "rgba(167,139,250,0.25)"}`,
                      fontSize:9, fontWeight:800, padding:"2px 8px", borderRadius:4,
                    }}>{a.tipo}</span>
                  </td>
                  <td style={{ padding:"10px 14px", color:"#64748b", fontSize:10 }}>{a.base_operativa||"—"}</td>
                  <td style={{ padding:"10px 14px" }}>
                    <span style={{ color: kmAlert ? "#f87171" : "#94a3b8", fontSize:11 }}>
                      {a.kilometraje_actual?.toLocaleString()}
                      {kmAlert && <span style={{ fontSize:8, marginLeft:4 }}>⚠</span>}
                    </span>
                  </td>
                  <td style={{ padding:"10px 14px" }}>
                    <button onClick={() => abrirFicha(a.id)} style={{
                      background:"linear-gradient(135deg,rgba(56,189,248,0.15),rgba(34,211,238,0.1))",
                      border:"1px solid rgba(56,189,248,0.35)",
                      color:"#38bdf8", padding:"7px 14px", borderRadius:7,
                      fontSize:10, fontWeight:700, cursor:"pointer",
                      letterSpacing:"0.03em", whiteSpace:"nowrap",
                    }}>📋 Ficha</button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* DRAWER */}
      <FichaDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        ambulanciaId={selectedAmb}
        ambulancias={ambulancias}
        onSelectAmb={id => setSelectedAmb(id)}
        filtroTipo={filtroTipo}
        setFiltroTipo={setFiltroTipo}
      />
    </div>
  )
}