"use client"

import { useEffect, useState } from "react"
import type { CSSProperties } from "react"
import { supabase } from "@/lib/supabaseClient"

type Ambulancia = {
  id: string; codigo_operativo: string; placa: string; marca: string
  tipo: string; estado: string; kilometraje_actual: number
  kilometraje_mtto: number; base_operativa: string
}

type Evento = {
  id: string; ambulancia_id: string; estado: string; motivo: string
  tipo_mantenimiento: string | null; tipo_falla: string | null
  area: string[] | null; fecha_inicio: string; fecha_fin: string | null
  usuario: string | null; foto_url: string | null
}

const EC: Record<string,{ text:string; bg:string; border:string; dot:string; glow:string }> = {
  operativa:      { text:"#4ade80", bg:"rgba(74,222,128,0.08)",  border:"rgba(74,222,128,0.3)",  dot:"#4ade80", glow:"rgba(74,222,128,0.4)"  },
  mantenimiento:  { text:"#fbbf24", bg:"rgba(251,191,36,0.08)",  border:"rgba(251,191,36,0.3)",  dot:"#fbbf24", glow:"rgba(251,191,36,0.4)"  },
  "no operativa": { text:"#f87171", bg:"rgba(248,113,113,0.08)", border:"rgba(248,113,113,0.3)", dot:"#f87171", glow:"rgba(248,113,113,0.4)" },
}

const FC: Record<string,string> = {
  preventivo:"#38bdf8", correctivo:"#f87171",
  mecanico:"#fbbf24",   electrico:"#a78bfa", accidente:"#fb923c",
}

const AREAS = ["mecanico","electrico","aire acondicionado","carroceria","neumaticos","frenos"]

function fmt(iso:string){ return new Date(iso).toLocaleString("es-EC",{day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"}) }
function fmtShort(iso:string){ return new Date(iso).toLocaleDateString("es-EC",{day:"2-digit",month:"short",year:"numeric"}) }
function dur(ini:string,fin:string|null){ const h=Math.floor(((fin?new Date(fin).getTime():Date.now())-new Date(ini).getTime())/3600000); return h<24?`${h}h`:`${Math.floor(h/24)}d ${h%24}h` }

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:2 }}>
      <div style={{ height:1, flex:1, background:"rgba(255,255,255,0.06)" }}/>
      <span style={{ fontSize:9, color:"#334155", letterSpacing:"0.12em", fontWeight:700, whiteSpace:"nowrap" }}>{children}</span>
      <div style={{ height:1, flex:1, background:"rgba(255,255,255,0.06)" }}/>
    </div>
  )
}

function FotoUploader({ preview, onFile, onClear, compact=false }: {
  preview:string|null; onFile:(f:File)=>void; onClear:()=>void; compact?:boolean
}) {
  return (
    <div>
      <label style={{ fontSize:9, color:"#475569", letterSpacing:"0.1em", fontWeight:700, display:"block", marginBottom:5 }}>FOTO / EVIDENCIA</label>
      <label style={{ display:"block", border:"1px dashed rgba(255,255,255,0.1)", borderRadius:7, padding:compact?"10px":"14px", textAlign:"center", cursor:"pointer", background:"rgba(255,255,255,0.02)" }}>
        <input type="file" accept="image/*" style={{ display:"none" }} onChange={e=>{ const f=e.target.files?.[0]; if(f) onFile(f) }}/>
        {preview
          ? <img src={preview} alt="preview" style={{ maxWidth:"100%", maxHeight:compact?80:120, borderRadius:5, objectFit:"cover" }}/>
          : <><div style={{ fontSize:compact?18:22, marginBottom:3 }}>📷</div><p style={{ margin:0, fontSize:8, color:"#475569" }}>Toca para subir imagen</p></>
        }
      </label>
      {preview && (
        <button onClick={onClear} style={{ marginTop:4, background:"rgba(248,113,113,0.08)", border:"1px solid rgba(248,113,113,0.25)", color:"#f87171", padding:"3px 10px", borderRadius:4, fontSize:8, cursor:"pointer", width:"100%" }}>✕ Quitar foto</button>
      )}
    </div>
  )
}

type Props = {
  open: boolean; onClose: ()=>void; ambulanciaId: string|null
  ambulancias: Ambulancia[]; onSelectAmb: (id:string)=>void
  filtroTipo: "TODOS"|"ALFA"|"BRAVO"; setFiltroTipo: (f:"TODOS"|"ALFA"|"BRAVO")=>void
  onRefresh: ()=>void
}

export default function FichaDrawer({ open, onClose, ambulanciaId, ambulancias, onSelectAmb, filtroTipo, setFiltroTipo, onRefresh }: Props) {
  const [tab,          setTab]          = useState<"info"|"estado"|"km"|"historial">("info")
  const [amb,          setAmb]          = useState<Ambulancia|null>(null)
  const [eventos,      setEventos]      = useState<Evento[]>([])
  const [estadoPend,   setEstadoPend]   = useState("operativa")
  const [motivoCambio, setMotivoCambio] = useState("")
  const [tipoMtto,     setTipoMtto]     = useState("")
  const [tipoFalla,    setTipoFalla]    = useState("")
  const [areas,        setAreas]        = useState<string[]>([])
  const [fotoFile,     setFotoFile]     = useState<File|null>(null)
  const [fotoPreview,  setFotoPreview]  = useState<string|null>(null)
  const [nuevoKm,      setNuevoKm]      = useState("")
  const [kmMtto,       setKmMtto]       = useState("")
  const [expanded,     setExpanded]     = useState<string|null>(null)
  const [fotoModal,    setFotoModal]    = useState<string|null>(null)
  const [modoHist,     setModoHist]     = useState<"nuevo"|"editar">("nuevo")
  const [eventoSel,    setEventoSel]    = useState("")
  const [hEstado,      setHEstado]      = useState("operativa")
  const [hMotivo,      setHMotivo]      = useState("")
  const [hTipoFalla,   setHTipoFalla]   = useState("")
  const [hFechaIni,    setHFechaIni]    = useState("")
  const [hFechaFin,    setHFechaFin]    = useState("")
  const [hFotoFile,    setHFotoFile]    = useState<File|null>(null)
  const [hFotoPreview, setHFotoPreview] = useState<string|null>(null)
  const [loading,      setLoading]      = useState(false)

  useEffect(() => {
    if (ambulanciaId) { cargarAmb(); cargarEventos(); setTab("info"); resetEstado(); resetHist() }
  }, [ambulanciaId])

  async function cargarAmb() {
    if (!ambulanciaId) return
    const { data } = await supabase.from("ambulancias").select("*").eq("id", ambulanciaId).single()
    if (data) { setAmb(data as Ambulancia); setEstadoPend(data.estado); setNuevoKm(String(data.kilometraje_actual||"")); setKmMtto(String(data.kilometraje_mtto||"")) }
  }

  async function cargarEventos() {
    if (!ambulanciaId) return
    const { data } = await supabase.from("historial_operativo").select("*").eq("ambulancia_id", ambulanciaId).order("fecha_inicio",{ascending:false})
    setEventos((data||[]) as Evento[])
  }

  async function subirFoto(file:File, prefix:string): Promise<string|null> {
    const ext  = file.name.split(".").pop()
    const path = `${prefix}/${ambulanciaId}/${Date.now()}.${ext}`
    const { error } = await supabase.storage.from("imagenes").upload(path, file)
    if (error) return null
    const { data } = supabase.storage.from("imagenes").getPublicUrl(path)
    return data.publicUrl
  }

  async function confirmarEstado() {
    if (!motivoCambio.trim()) { alert("Ingresa un motivo"); return }
    setLoading(true)
    try {
      let fotoUrl: string|null = null
      if (fotoFile) fotoUrl = await subirFoto(fotoFile, "estado")
      await supabase.from("ambulancias").update({ estado: estadoPend }).eq("id", ambulanciaId!)
      await supabase.from("historial_operativo").insert({
        ambulancia_id: ambulanciaId, estado: estadoPend,
        motivo: motivoCambio.trim(), tipo_mantenimiento: tipoMtto||null,
        tipo_falla: tipoFalla||null, area: areas.length?areas:null,
        foto_url: fotoUrl, fecha_inicio: new Date().toISOString(),
        usuario: localStorage.getItem("nombre"),
      })
      resetEstado(); await cargarAmb(); await cargarEventos(); onRefresh(); alert("✅ Estado actualizado")
    } catch(e) { alert("❌ Error") }
    setLoading(false)
  }

  async function actualizarKm() {
    if (!nuevoKm) return
    await supabase.from("ambulancias").update({ kilometraje_actual: Number(nuevoKm) }).eq("id", ambulanciaId!)
    await cargarAmb(); onRefresh(); alert("✅ KM actualizado")
  }

  async function guardarMtto() {
    if (!kmMtto) return
    await supabase.from("ambulancias").update({ kilometraje_mtto: Number(kmMtto) }).eq("id", ambulanciaId!)
    await cargarAmb(); onRefresh(); alert("✅ KM mantenimiento guardado")
  }

  async function guardarEvento() {
    if (!hFechaIni) { alert("Ingresa fecha inicio"); return }
    if (hEstado !== "operativa" && !hMotivo) { alert("Ingresa motivo"); return }
    setLoading(true)
    let fotoUrl: string|null = null
    if (hFotoFile) fotoUrl = await subirFoto(hFotoFile, "historial")
    if (modoHist === "editar" && eventoSel) {
      const payload: any = { estado:hEstado, motivo:hMotivo, tipo_falla:hTipoFalla||null, fecha_inicio:new Date(hFechaIni).toISOString(), fecha_fin:hFechaFin?new Date(hFechaFin).toISOString():null }
      if (fotoUrl) payload.foto_url = fotoUrl
      const { error } = await supabase.from("historial_operativo").update(payload).eq("id", eventoSel)
      if (error) alert("❌ Error actualizando"); else { alert("✅ Actualizado"); resetHist(); cargarEventos() }
    } else {
      const hoy = new Date().toISOString().split("T")[0]
      if (!hFechaFin && hFechaIni === hoy) await supabase.from("historial_operativo").update({fecha_fin:new Date().toISOString()}).eq("ambulancia_id",ambulanciaId!).is("fecha_fin",null)
      const { error } = await supabase.from("historial_operativo").insert({
        ambulancia_id:ambulanciaId, estado:hEstado, motivo:hMotivo, tipo_falla:hTipoFalla||null,
        fecha_inicio:new Date(hFechaIni).toISOString(), fecha_fin:hFechaFin?new Date(hFechaFin).toISOString():null,
        foto_url:fotoUrl, usuario:localStorage.getItem("nombre"),
      })
      if (error) alert("❌ Error guardando"); else { alert("✅ Registrado"); resetHist(); cargarEventos() }
    }
    setLoading(false)
  }

  async function eliminarEvento(id:string) {
    if (!confirm("¿Eliminar este evento?")) return
    await supabase.from("historial_operativo").delete().eq("id", id)
    cargarEventos()
  }

  function selEvento(id:string) {
    setEventoSel(id)
    const ev = eventos.find(e => String(e.id)===String(id))
    if (!ev) return
    setHEstado(ev.estado); setHMotivo(ev.motivo||""); setHTipoFalla(ev.tipo_falla||"")
    setHFechaIni(ev.fecha_inicio?.split("T")[0]||""); setHFechaFin(ev.fecha_fin?.split("T")[0]||"")
    setHFotoPreview(ev.foto_url||null)
  }

  function resetEstado() { setMotivoCambio(""); setTipoMtto(""); setTipoFalla(""); setAreas([]); setFotoFile(null); setFotoPreview(null) }
  function resetHist()   { setModoHist("nuevo"); setEventoSel(""); setHEstado("operativa"); setHMotivo(""); setHTipoFalla(""); setHFechaIni(""); setHFechaFin(""); setHFotoFile(null); setHFotoPreview(null) }

  const ambsFilt = ambulancias.filter(a => filtroTipo==="TODOS"?true:a.tipo===filtroTipo)
  const inp: CSSProperties = { background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.1)", color:"white", padding:"9px 12px", borderRadius:7, fontSize:11, fontFamily:"'IBM Plex Mono','Courier New',monospace", outline:"none", width:"100%", boxSizing:"border-box" }
  const lbl: CSSProperties = { fontSize:9, color:"#475569", letterSpacing:"0.1em", fontWeight:700, display:"block", marginBottom:5 }
  const ec = amb ? (EC[amb.estado]||EC["no operativa"]) : EC["no operativa"]
  const kmAlert = amb && amb.kilometraje_actual >= amb.kilometraje_mtto

  if (!open) return null

  return (
    <>
      <div onClick={onClose} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", backdropFilter:"blur(4px)", zIndex:40 }}/>
      <div style={{ position:"fixed", top:0, right:0, bottom:0, width:"min(95vw,960px)", background:"#060a14", borderLeft:"1px solid rgba(255,255,255,0.08)", zIndex:50, display:"flex", flexDirection:"column", fontFamily:"'IBM Plex Mono','Courier New',monospace", overflow:"hidden", boxShadow:"-24px 0 80px rgba(0,0,0,0.7)" }}>

        {/* HEADER */}
        <div style={{ padding:"14px 20px", borderBottom:"1px solid rgba(255,255,255,0.07)", background:"linear-gradient(135deg,#0b1120,#060a14)", flexShrink:0 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
            <div style={{ flex:1 }}>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
                <span style={{ fontSize:16 }}>🚑</span>
                <span style={{ fontSize:15, fontWeight:800, color:"#e2e8f0", letterSpacing:"0.05em" }}>FICHA OPERATIVA</span>
                {amb && <span style={{ background:ec.bg, border:`1px solid ${ec.border}`, color:ec.text, fontSize:8, fontWeight:700, padding:"2px 8px", borderRadius:3 }}>{amb.estado.toUpperCase()}</span>}
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:6, flexWrap:"wrap" }}>
                {(["TODOS","ALFA","BRAVO"] as const).map(f=>(
                  <button key={f} onClick={()=>setFiltroTipo(f)} style={{ background:filtroTipo===f?(f==="ALFA"?"rgba(56,189,248,0.15)":f==="BRAVO"?"rgba(167,139,250,0.15)":"rgba(255,255,255,0.08)"):"rgba(255,255,255,0.03)", border:`1px solid ${filtroTipo===f?(f==="ALFA"?"#38bdf8":f==="BRAVO"?"#a78bfa":"#64748b"):"rgba(255,255,255,0.07)"}`, color:filtroTipo===f?(f==="ALFA"?"#38bdf8":f==="BRAVO"?"#a78bfa":"#e2e8f0"):"#475569", padding:"3px 9px", borderRadius:4, fontSize:8, fontWeight:700, cursor:"pointer" }}>{f}</button>
                ))}
                <select value={ambulanciaId||""} onChange={e=>onSelectAmb(e.target.value)}
                  style={{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.1)", color:"white", padding:"4px 10px", borderRadius:5, fontSize:10, outline:"none", minWidth:190 }}>
                  <option value="">Seleccione ambulancia</option>
                  {ambsFilt.map(a=><option key={a.id} value={a.id}>{a.codigo_operativo} — {a.placa} ({a.tipo})</option>)}
                </select>
              </div>
            </div>
            <button onClick={onClose} style={{ background:"rgba(248,113,113,0.12)", border:"1px solid rgba(248,113,113,0.3)", color:"#f87171", width:30, height:30, borderRadius:"50%", fontSize:12, cursor:"pointer", fontWeight:700, flexShrink:0 }}>✕</button>
          </div>

          {amb && (
            <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:7, marginTop:10 }}>
              {[
                { l:"CÓDIGO",    v:amb.codigo_operativo,                        c:"#e2e8f0" },
                { l:"KM ACTUAL", v:amb.kilometraje_actual?.toLocaleString()||"—",c:kmAlert?"#f87171":"#e2e8f0" },
                { l:"PRÓX. MTTO",v:amb.kilometraje_mtto?`${amb.kilometraje_mtto.toLocaleString()} KM`:"—", c:"#fbbf24" },
                { l:"BASE",      v:amb.base_operativa||"—",                     c:"#64748b" },
              ].map(k=>(
                <div key={k.l} style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.06)", borderRadius:6, padding:"6px 10px" }}>
                  <p style={{ margin:0, fontSize:7, color:"#334155", letterSpacing:"0.08em", fontWeight:700 }}>{k.l}</p>
                  <p style={{ margin:"2px 0 0", fontSize:10, fontWeight:700, color:k.c, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{k.v}</p>
                </div>
              ))}
            </div>
          )}

          {amb && (
            <div style={{ display:"flex", gap:4, marginTop:10 }}>
              {[{k:"info",l:"ℹ️ Info"},{k:"estado",l:"🔄 Estado"},{k:"km",l:"📏 KM / Mtto"},{k:"historial",l:"📋 Historial"}].map(t=>(
                <button key={t.k} onClick={()=>setTab(t.k as any)} style={{ background:tab===t.k?"rgba(34,211,238,0.12)":"rgba(255,255,255,0.03)", border:`1px solid ${tab===t.k?"rgba(34,211,238,0.4)":"rgba(255,255,255,0.07)"}`, color:tab===t.k?"#22d3ee":"#475569", padding:"5px 13px", borderRadius:5, fontSize:9, fontWeight:700, cursor:"pointer" }}>{t.l}</button>
              ))}
            </div>
          )}
        </div>

        {/* CONTENIDO */}
        <div style={{ flex:1, overflowY:"auto", padding:20 }}>
          {!ambulanciaId && (
            <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", height:"100%", color:"#334155", gap:12 }}>
              <span style={{ fontSize:40 }}>🚑</span>
              <p style={{ fontSize:12, letterSpacing:"0.08em" }}>Seleccione una ambulancia para ver su ficha</p>
            </div>
          )}

          {/* INFO */}
          {amb && tab==="info" && (
            <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
              <SectionLabel>DATOS DE LA UNIDAD</SectionLabel>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                {[
                  { l:"Código Operativo", v:amb.codigo_operativo },
                  { l:"Placa",            v:amb.placa },
                  { l:"Marca",            v:amb.marca||"—" },
                  { l:"Tipo",             v:amb.tipo },
                  { l:"Base Operativa",   v:amb.base_operativa||"—" },
                  { l:"Estado Actual",    v:amb.estado, c:ec.text },
                  { l:"KM Actual",        v:amb.kilometraje_actual?.toLocaleString()||"—", c:kmAlert?"#f87171":undefined },
                  { l:"KM Próx. Mtto",    v:amb.kilometraje_mtto?.toLocaleString()||"—", c:"#fbbf24" },
                ].map(f=>(
                  <div key={f.l} style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.06)", borderRadius:8, padding:"10px 12px" }}>
                    <p style={{ margin:0, fontSize:8, color:"#334155", letterSpacing:"0.08em", fontWeight:700 }}>{f.l.toUpperCase()}</p>
                    <p style={{ margin:"4px 0 0", fontSize:12, fontWeight:700, color:(f as any).c||"#94a3b8" }}>{f.v}</p>
                  </div>
                ))}
              </div>
              {amb.kilometraje_mtto > 0 && (
                <div>
                  <SectionLabel>PROGRESO HACIA PRÓXIMO MANTENIMIENTO</SectionLabel>
                  <div style={{ background:"rgba(255,255,255,0.05)", borderRadius:4, height:8, overflow:"hidden", marginTop:6 }}>
                    <div style={{ width:`${Math.min((amb.kilometraje_actual/amb.kilometraje_mtto)*100,100)}%`, height:"100%", background:kmAlert?"linear-gradient(90deg,#f87171,#ef4444)":"linear-gradient(90deg,#22d3ee,#38bdf8)", borderRadius:4 }}/>
                  </div>
                  <div style={{ display:"flex", justifyContent:"space-between", marginTop:4 }}>
                    <span style={{ fontSize:9, color:"#475569" }}>0 KM</span>
                    <span style={{ fontSize:9, color:kmAlert?"#f87171":"#475569" }}>{kmAlert?"⚠ VENCIDO":`Faltan ${(amb.kilometraje_mtto-amb.kilometraje_actual).toLocaleString()} KM`}</span>
                    <span style={{ fontSize:9, color:"#475569" }}>{amb.kilometraje_mtto?.toLocaleString()} KM</span>
                  </div>
                </div>
              )}
              <div>
                <SectionLabel>RESUMEN DE EVENTOS</SectionLabel>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8, marginTop:6 }}>
                  {[
                    { l:"Total",        v:eventos.length,                                       c:"#38bdf8" },
                    { l:"Mtto",         v:eventos.filter(e=>e.estado==="mantenimiento").length,  c:"#fbbf24" },
                    { l:"No operativa", v:eventos.filter(e=>e.estado==="no operativa").length,   c:"#f87171" },
                  ].map(k=>(
                    <div key={k.l} style={{ background:`${k.c}08`, border:`1px solid ${k.c}20`, borderRadius:8, padding:"10px", textAlign:"center" }}>
                      <p style={{ margin:0, fontSize:9, color:"#475569" }}>{k.l}</p>
                      <p style={{ margin:"4px 0 0", fontSize:20, fontWeight:800, color:k.c }}>{k.v}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ESTADO */}
          {amb && tab==="estado" && (
            <div style={{ display:"flex", flexDirection:"column", gap:16, maxWidth:500 }}>
              <SectionLabel>CAMBIAR ESTADO DE LA UNIDAD</SectionLabel>
              <div style={{ background:ec.bg, border:`2px solid ${ec.border}`, borderRadius:10, padding:"12px 16px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                <span style={{ fontSize:10, color:"#475569", letterSpacing:"0.08em" }}>ESTADO ACTUAL</span>
                <span style={{ fontSize:14, fontWeight:800, color:ec.text, letterSpacing:"0.05em" }}>{amb.estado.toUpperCase()}</span>
              </div>
              <div>
                <label style={lbl}>NUEVO ESTADO</label>
                <div style={{ display:"flex", gap:8 }}>
                  {[{val:"operativa",label:"✅ Operativa",color:"#4ade80"},{val:"mantenimiento",label:"🔧 Mantenimiento",color:"#fbbf24"},{val:"no operativa",label:"🔴 No operativa",color:"#f87171"}].map(s=>(
                    <button key={s.val} onClick={()=>setEstadoPend(s.val)} style={{ flex:1, background:estadoPend===s.val?`${s.color}18`:"rgba(255,255,255,0.03)", border:`1px solid ${estadoPend===s.val?s.color+"60":"rgba(255,255,255,0.08)"}`, color:estadoPend===s.val?s.color:"#475569", padding:"10px 6px", borderRadius:7, fontSize:10, fontWeight:700, cursor:"pointer" }}>{s.label}</button>
                  ))}
                </div>
              </div>
              <div>
                <label style={lbl}>TIPO DE MANTENIMIENTO</label>
                <div style={{ display:"flex", gap:6 }}>
                  {["preventivo","correctivo"].map(t=>(
                    <button key={t} onClick={()=>setTipoMtto(tipoMtto===t?"":t)} style={{ background:tipoMtto===t?"rgba(56,189,248,0.15)":"rgba(255,255,255,0.03)", border:`1px solid ${tipoMtto===t?"#38bdf8":"rgba(255,255,255,0.08)"}`, color:tipoMtto===t?"#38bdf8":"#475569", padding:"6px 14px", borderRadius:5, fontSize:10, fontWeight:700, cursor:"pointer", textTransform:"capitalize" }}>{t}</button>
                  ))}
                </div>
              </div>
              <div>
                <label style={lbl}>TIPO DE FALLA</label>
                <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
                  {Object.entries(FC).map(([t,fc])=>(
                    <button key={t} onClick={()=>setTipoFalla(tipoFalla===t?"":t)} style={{ background:tipoFalla===t?`${fc}18`:"rgba(255,255,255,0.03)", border:`1px solid ${tipoFalla===t?fc+"50":"rgba(255,255,255,0.08)"}`, color:tipoFalla===t?fc:"#475569", padding:"5px 10px", borderRadius:5, fontSize:9, fontWeight:700, cursor:"pointer", textTransform:"capitalize" }}>{t}</button>
                  ))}
                </div>
              </div>
              <div>
                <label style={lbl}>ÁREA(S) AFECTADA(S)</label>
                <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                  {AREAS.map(a=>{
                    const active=areas.includes(a)
                    return (
                      <label key={a} style={{ display:"flex", alignItems:"center", gap:6, background:active?"rgba(167,139,250,0.12)":"rgba(255,255,255,0.03)", border:`1px solid ${active?"rgba(167,139,250,0.4)":"rgba(255,255,255,0.08)"}`, color:active?"#a78bfa":"#475569", padding:"5px 10px", borderRadius:5, cursor:"pointer", fontSize:9, fontWeight:700, textTransform:"capitalize" }}>
                        <input type="checkbox" checked={active} style={{ display:"none" }} onChange={e=>setAreas(e.target.checked?[...areas,a]:areas.filter(x=>x!==a))}/>
                        {active?"✓":"+"} {a}
                      </label>
                    )
                  })}
                </div>
              </div>
              <div>
                <label style={lbl}>MOTIVO / DETALLE *</label>
                <textarea value={motivoCambio} onChange={e=>setMotivoCambio(e.target.value)} placeholder="Describe el motivo del cambio de estado..." style={{ ...inp, height:90, resize:"vertical" as const }}/>
              </div>
              <FotoUploader preview={fotoPreview} onFile={f=>{setFotoFile(f);setFotoPreview(URL.createObjectURL(f))}} onClear={()=>{setFotoFile(null);setFotoPreview(null)}}/>
              <button onClick={confirmarEstado} disabled={loading} style={{ background:loading?"rgba(255,255,255,0.05)":"linear-gradient(135deg,#0891b2,#0e7490)", border:"none", color:loading?"#475569":"white", padding:"13px", borderRadius:8, fontSize:11, fontWeight:800, cursor:loading?"not-allowed":"pointer" }}>
                {loading?"⏳ Guardando...":"💾 CONFIRMAR CAMBIO DE ESTADO"}
              </button>
            </div>
          )}

          {/* KM */}
          {amb && tab==="km" && (
            <div style={{ display:"flex", flexDirection:"column", gap:20, maxWidth:400 }}>
              {[
                { title:"📏 ACTUALIZAR KILOMETRAJE ACTUAL", current:amb.kilometraje_actual, label:"NUEVO VALOR KM", val:nuevoKm, setVal:setNuevoKm, btnC:"#38bdf8", btnL:"Actualizar", action:actualizarKm },
                { title:"🛠 PROGRAMAR PRÓXIMO MANTENIMIENTO", current:amb.kilometraje_mtto, label:"KM PARA MANTENIMIENTO", val:kmMtto, setVal:setKmMtto, btnC:"#fbbf24", btnL:"Guardar", action:guardarMtto },
              ].map(s=>(
                <div key={s.title} style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:10, padding:16 }}>
                  <p style={{ margin:"0 0 4px", fontSize:8, color:"#475569", letterSpacing:"0.08em", fontWeight:700 }}>{s.title}</p>
                  <p style={{ margin:"0 0 14px", fontSize:22, fontWeight:800, color:"#e2e8f0" }}>{s.current?.toLocaleString()||"—"} KM</p>
                  <label style={lbl}>{s.label}</label>
                  <div style={{ display:"flex", gap:8 }}>
                    <input type="number" value={s.val} onChange={e=>s.setVal(e.target.value)} placeholder="Nuevo valor" style={{ ...inp, flex:1 }}/>
                    <button onClick={s.action} style={{ background:`${s.btnC}18`, border:`1px solid ${s.btnC}50`, color:s.btnC, padding:"9px 16px", borderRadius:7, fontSize:11, fontWeight:700, cursor:"pointer", whiteSpace:"nowrap" }}>{s.btnL}</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* HISTORIAL */}
          {amb && tab==="historial" && (
            <div style={{ display:"grid", gridTemplateColumns:"320px 1fr", gap:16, alignItems:"start" }}>
              <div style={{ background:"linear-gradient(160deg,#0f172a,#0b1120)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:10, padding:16, position:"sticky", top:0 }}>
                <div style={{ display:"flex", gap:5, marginBottom:14 }}>
                  {(["nuevo","editar"] as const).map(m=>(
                    <button key={m} onClick={()=>{setModoHist(m);resetHist()}} style={{ flex:1, background:modoHist===m?"rgba(34,211,238,0.12)":"rgba(255,255,255,0.03)", border:`1px solid ${modoHist===m?"rgba(34,211,238,0.4)":"rgba(255,255,255,0.07)"}`, color:modoHist===m?"#22d3ee":"#475569", padding:"7px", borderRadius:6, fontSize:9, fontWeight:700, cursor:"pointer", textTransform:"uppercase" }}>{m==="nuevo"?"➕ Nuevo":"✏️ Editar"}</button>
                  ))}
                </div>
                <div style={{ display:"flex", flexDirection:"column", gap:11 }}>
                  {modoHist==="editar" && (
                    <div>
                      <label style={lbl}>EVENTO A EDITAR</label>
                      <select value={eventoSel} onChange={e=>selEvento(e.target.value)} style={inp}>
                        <option value="">Seleccione evento</option>
                        {eventos.map(ev=><option key={ev.id} value={ev.id}>{fmtShort(ev.fecha_inicio)} — {ev.estado}</option>)}
                      </select>
                    </div>
                  )}
                  <div>
                    <label style={lbl}>ESTADO</label>
                    <div style={{ display:"flex", gap:5 }}>
                      {[{val:"operativa",c:"#4ade80",l:"Op."},{val:"mantenimiento",c:"#fbbf24",l:"Mtto"},{val:"no operativa",c:"#f87171",l:"No op."}].map(s=>(
                        <button key={s.val} onClick={()=>setHEstado(s.val)} style={{ flex:1, background:hEstado===s.val?`${s.c}18`:"rgba(255,255,255,0.03)", border:`1px solid ${hEstado===s.val?s.c+"50":"rgba(255,255,255,0.07)"}`, color:hEstado===s.val?s.c:"#475569", padding:"6px 3px", borderRadius:5, fontSize:9, fontWeight:700, cursor:"pointer" }}>{s.l}</button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label style={lbl}>TIPO DE FALLA</label>
                    <div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>
                      {Object.entries(FC).map(([t,fc])=>(
                        <button key={t} onClick={()=>setHTipoFalla(hTipoFalla===t?"":t)} style={{ background:hTipoFalla===t?`${fc}18`:"rgba(255,255,255,0.03)", border:`1px solid ${hTipoFalla===t?fc+"50":"rgba(255,255,255,0.07)"}`, color:hTipoFalla===t?fc:"#475569", padding:"4px 8px", borderRadius:4, fontSize:8, fontWeight:700, cursor:"pointer", textTransform:"capitalize" }}>{t}</button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label style={lbl}>MOTIVO</label>
                    <textarea value={hMotivo} onChange={e=>setHMotivo(e.target.value)} placeholder="Describe el evento..." style={{ ...inp, height:70, resize:"vertical" as const }}/>
                  </div>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6 }}>
                    <div><label style={lbl}>INICIO</label><input type="date" value={hFechaIni} onChange={e=>setHFechaIni(e.target.value)} style={inp}/></div>
                    <div><label style={lbl}>FIN</label><input type="date" value={hFechaFin} onChange={e=>setHFechaFin(e.target.value)} style={inp}/></div>
                  </div>
                  <FotoUploader compact preview={hFotoPreview} onFile={f=>{setHFotoFile(f);setHFotoPreview(URL.createObjectURL(f))}} onClear={()=>{setHFotoFile(null);setHFotoPreview(null)}}/>
                  <button onClick={guardarEvento} disabled={loading} style={{ background:loading?"rgba(255,255,255,0.05)":"linear-gradient(135deg,#0891b2,#0e7490)", border:"none", color:loading?"#475569":"white", padding:"10px", borderRadius:7, fontSize:10, fontWeight:800, cursor:loading?"not-allowed":"pointer" }}>
                    {loading?"⏳ Guardando...":"💾 GUARDAR EVENTO"}
                  </button>
                </div>
              </div>

              {/* Timeline */}
              <div>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
                  <span style={{ fontSize:9, color:"#475569", letterSpacing:"0.1em", fontWeight:700 }}>▸ LÍNEA DE TIEMPO — {eventos.length} eventos</span>
                  <span style={{ fontSize:8, color:"#334155" }}>más reciente arriba</span>
                </div>
                {eventos.length===0 ? (
                  <div style={{ border:"1px dashed rgba(255,255,255,0.07)", borderRadius:10, padding:30, textAlign:"center", color:"#334155", fontSize:11 }}>Sin eventos registrados</div>
                ) : (
                  <div style={{ position:"relative" }}>
                    <div style={{ position:"absolute", left:13, top:0, bottom:0, width:2, background:"rgba(255,255,255,0.05)" }}/>
                    <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                      {eventos.map(ev=>{
                        const c=EC[ev.estado]||EC["no operativa"], isOpen=expanded===ev.id;
                        const fc=ev.tipo_falla?FC[ev.tipo_falla]:"#475569", activo=!ev.fecha_fin;
                        return (
                          <div key={ev.id} style={{ display:"flex", gap:12, paddingLeft:2 }}>
                            <div style={{ position:"relative", zIndex:1, flexShrink:0, marginTop:12 }}>
                              <div style={{ width:24, height:24, borderRadius:"50%", background:c.bg, border:`2px solid ${c.dot}`, display:"flex", alignItems:"center", justifyContent:"center", boxShadow:activo?`0 0 8px ${c.glow}`:"none" }}>
                                <div style={{ width:7, height:7, borderRadius:"50%", background:c.dot }}/>
                              </div>
                            </div>
                            <div style={{ flex:1, background:isOpen?"linear-gradient(135deg,#0f172a,#0d1a2a)":"rgba(255,255,255,0.02)", border:`1px solid ${isOpen?c.border:"rgba(255,255,255,0.05)"}`, borderRadius:9, overflow:"hidden" }}>
                              <div onClick={()=>setExpanded(isOpen?null:ev.id)} style={{ padding:"10px 12px", cursor:"pointer", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                                <div style={{ display:"flex", alignItems:"center", gap:6, flexWrap:"wrap" }}>
                                  <span style={{ background:c.bg, border:`1px solid ${c.border}`, color:c.text, fontSize:8, fontWeight:700, padding:"2px 7px", borderRadius:3, letterSpacing:"0.05em" }}>{ev.estado.toUpperCase()}</span>
                                  {ev.tipo_falla && <span style={{ background:`${fc}15`, border:`1px solid ${fc}40`, color:fc, fontSize:8, fontWeight:700, padding:"2px 7px", borderRadius:3, textTransform:"capitalize" }}>{ev.tipo_falla}</span>}
                                  {activo && <span style={{ background:"rgba(251,191,36,0.15)", border:"1px solid rgba(251,191,36,0.4)", color:"#fbbf24", fontSize:7, fontWeight:700, padding:"2px 6px", borderRadius:3 }}>● EN CURSO</span>}
                                  {ev.foto_url && <span style={{ fontSize:9 }}>📷</span>}
                                </div>
                                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                                  <span style={{ fontSize:8, color:"#475569" }}>{dur(ev.fecha_inicio,ev.fecha_fin)}</span>
                                  <span style={{ color:"#334155", fontSize:9, display:"inline-block", transform:isOpen?"rotate(180deg)":"none", transition:"transform 0.2s" }}>▼</span>
                                </div>
                              </div>
                              <div style={{ padding:"0 12px 8px", display:"flex", gap:12, flexWrap:"wrap" }}>
                                <span style={{ fontSize:8, color:"#475569" }}>🕐 <span style={{color:"#64748b"}}>{fmt(ev.fecha_inicio)}</span></span>
                                {ev.fecha_fin && <span style={{ fontSize:8, color:"#475569" }}>🏁 <span style={{color:"#64748b"}}>{fmt(ev.fecha_fin)}</span></span>}
                                {ev.usuario && <span style={{ fontSize:8, color:"#334155" }}>👤 {ev.usuario}</span>}
                              </div>
                              {isOpen && (
                                <div style={{ borderTop:"1px solid rgba(255,255,255,0.05)", padding:"12px", display:"flex", flexDirection:"column", gap:10 }}>
                                  {ev.motivo && (
                                    <div>
                                      <p style={{ margin:"0 0 4px", fontSize:7, color:"#475569", letterSpacing:"0.1em", fontWeight:700 }}>MOTIVO</p>
                                      <p style={{ margin:0, fontSize:10, color:"#94a3b8", lineHeight:1.6 }}>{ev.motivo}</p>
                                    </div>
                                  )}
                                  {ev.area && Array.isArray(ev.area) && ev.area.length>0 && (
                                    <div>
                                      <p style={{ margin:"0 0 4px", fontSize:7, color:"#475569", letterSpacing:"0.1em", fontWeight:700 }}>ÁREAS</p>
                                      <div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>
                                        {ev.area.map(a=><span key={a} style={{ background:"rgba(167,139,250,0.1)", border:"1px solid rgba(167,139,250,0.25)", color:"#a78bfa", fontSize:8, padding:"2px 7px", borderRadius:3, textTransform:"capitalize" }}>{a}</span>)}
                                      </div>
                                    </div>
                                  )}
                                  {ev.foto_url ? (
                                    <div>
                                      <p style={{ margin:"0 0 6px", fontSize:7, color:"#475569", letterSpacing:"0.1em", fontWeight:700 }}>EVIDENCIA FOTOGRÁFICA</p>
                                      <div onClick={()=>setFotoModal(ev.foto_url!)} style={{ cursor:"zoom-in", borderRadius:6, overflow:"hidden", border:"1px solid rgba(255,255,255,0.1)", maxWidth:260, display:"inline-block" }}>
                                        <img src={ev.foto_url} alt="evidencia" style={{ width:"100%", display:"block", objectFit:"cover", height:150 }} onError={e=>{(e.target as HTMLImageElement).style.display="none"}}/>
                                      </div>
                                      <p style={{ margin:"4px 0 0", fontSize:7, color:"#334155" }}>Clic para ampliar</p>
                                    </div>
                                  ) : (
                                    <div style={{ border:"1px dashed rgba(255,255,255,0.06)", borderRadius:6, padding:8, textAlign:"center" }}>
                                      <span style={{ fontSize:8, color:"#334155" }}>📷 Sin evidencia fotográfica</span>
                                    </div>
                                  )}
                                  <div style={{ display:"flex", gap:5, justifyContent:"flex-end" }}>
                                    <button onClick={()=>{setModoHist("editar");selEvento(ev.id)}} style={{ background:"rgba(251,191,36,0.12)", border:"1px solid rgba(251,191,36,0.3)", color:"#fbbf24", padding:"5px 10px", borderRadius:5, fontSize:8, fontWeight:700, cursor:"pointer" }}>✏️ Editar</button>
                                    <button onClick={()=>eliminarEvento(ev.id)} style={{ background:"rgba(248,113,113,0.1)", border:"1px solid rgba(248,113,113,0.3)", color:"#f87171", padding:"5px 8px", borderRadius:5, fontSize:8, cursor:"pointer" }}>🗑</button>
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

      {fotoModal && (
        <div onClick={()=>setFotoModal(null)} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.95)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:200, cursor:"zoom-out" }}>
          <div style={{ position:"relative" }} onClick={e=>e.stopPropagation()}>
            <img src={fotoModal} alt="ampliada" style={{ maxWidth:"90vw", maxHeight:"90vh", borderRadius:10, border:"1px solid rgba(255,255,255,0.1)", objectFit:"contain", display:"block" }}/>
            <button onClick={()=>setFotoModal(null)} style={{ position:"absolute", top:-14, right:-14, background:"rgba(248,113,113,0.2)", border:"1px solid rgba(248,113,113,0.4)", color:"#f87171", width:30, height:30, borderRadius:"50%", fontSize:13, cursor:"pointer", fontWeight:700 }}>✕</button>
          </div>
        </div>
      )}
    </>
  )
}
