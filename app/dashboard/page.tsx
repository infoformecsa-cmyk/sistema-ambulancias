"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { useRouter } from "next/navigation"
import FichaDrawer from "@/components/FichaDrawer"

type Ambulancia = {
  id: string; codigo_operativo: string; placa: string; marca: string
  tipo: string; kilometraje_actual: number; kilometraje_mtto: number
  estado: string; base_operativa: string
}

const EA: Record<string, { c: string; bg: string; border: string }> = {
  operativa:      { c:"#4ade80", bg:"rgba(74,222,128,0.08)",  border:"rgba(74,222,128,0.25)"  },
  mantenimiento:  { c:"#fbbf24", bg:"rgba(251,191,36,0.08)",  border:"rgba(251,191,36,0.25)"  },
  "no operativa": { c:"#f87171", bg:"rgba(248,113,113,0.08)", border:"rgba(248,113,113,0.25)" },
}

const inputStyle: React.CSSProperties = {
  background:"rgba(56,189,248,0.08)", border:"1px solid rgba(56,189,248,0.3)",
  color:"white", padding:"5px 8px", borderRadius:5, fontSize:10,
  outline:"none", width:"80px", fontFamily:"'Space Mono','Courier New',monospace",
}

function pct(n: number, t: number) { return t > 0 ? Math.round(n / t * 100) : 0 }

function StatCard({ label, value, color }: { label: string; value: any; color: string }) {
  return (
    <div style={{ background:'linear-gradient(135deg,rgba(15,23,42,0.9),rgba(13,20,36,0.9))', border:`1px solid ${color}22`, borderRadius:12, padding:'12px 14px', position:'relative', overflow:'hidden' }}>
      <div style={{ position:'absolute', top:0, right:0, width:50, height:50, borderRadius:'0 12px 0 50px', background:`${color}08` }}/>
      <p style={{ margin:0, fontSize:8, color:'#475569', letterSpacing:'0.12em', fontWeight:700 }}>{label}</p>
      <p style={{ margin:'5px 0 0', fontSize:22, fontWeight:900, color, lineHeight:1 }}>{value}</p>
    </div>
  )
}

function TipoCard({ tipo, list, accent }: { tipo: string; list: Ambulancia[]; accent: string }) {
  const op = list.filter(a => a.estado === "operativa").length
  const mt = list.filter(a => a.estado === "mantenimiento").length
  const fu = list.filter(a => a.estado === "no operativa").length
  const total = list.length
  return (
    <div style={{ background:'linear-gradient(135deg,rgba(15,23,42,0.9),rgba(13,20,36,0.9))', border:`1px solid ${accent}20`, borderRadius:12, padding:'12px 13px' }}>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
        <span style={{ fontSize:11, fontWeight:800, color:accent, letterSpacing:'0.05em' }}>🚑 TIPO {tipo}</span>
        <span style={{ fontSize:9, color:'#334155' }}>{total} u.</span>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:3, marginBottom:7 }}>
        {[{l:"Op.",v:op,c:"#4ade80"},{l:"Mtto",v:mt,c:"#fbbf24"},{l:"No op.",v:fu,c:"#f87171"}].map(k => (
          <div key={k.l} style={{ textAlign:'center' }}>
            <div style={{ fontSize:16, fontWeight:800, color:k.c }}>{k.v}</div>
            <div style={{ fontSize:7, color:'#334155' }}>{k.l}</div>
            <div style={{ fontSize:8, color:k.c, opacity:0.7 }}>{pct(k.v,total)}%</div>
          </div>
        ))}
      </div>
      <div style={{ display:'flex', gap:1, height:4, borderRadius:2, overflow:'hidden' }}>
        <div style={{ flex:op, background:'#4ade80' }}/><div style={{ flex:mt, background:'#fbbf24' }}/><div style={{ flex:fu, background:'#f87171' }}/>
      </div>
    </div>
  )
}

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
    const r = localStorage.getItem("rol"), n = localStorage.getItem("nombre"), email = localStorage.getItem("email")
    if (!r) { router.push("/"); return }
    async function validarRol() {
      if (!email) { router.push("/"); return }
      const { data } = await supabase.from("usuarios").select("rol").eq("email", email).single()
      if (data?.rol !== "admin") { if (data?.rol === "supervisor") { router.push("/supervisor"); return }; router.push("/"); return }
    }
    validarRol()
    if (r === "conductor") { router.push("/conductor"); return }
    setRol(r); setNombre(n || ""); cargar()
    const intervalo = setInterval(cargar, 30000)
    return () => clearInterval(intervalo)
  }, [])

  async function cargar() {
    const { data: amb } = await supabase.from("ambulancias").select("*").order("codigo_operativo")
    const { data: alert } = await supabase.from("reportes_fallas").select("*").eq("estado","abierta").eq("criticidad","critica")
    const { data: hist } = await supabase.from("historial_operativo").select("*")
    const ambs = (amb||[]) as Ambulancia[], histo = hist||[]
    setAmbulancias(ambs); setAlertas(alert||[])
    const mapa: Record<string,number> = {}
    ambs.forEach(a => {
      const eventos = histo.filter((h:any) => String(h.ambulancia_id)===String(a.id))
      let total = 0
      eventos.forEach((e:any) => {
        if (e.estado==="operativa") return
        const ini=new Date(e.fecha_inicio), fin=e.fecha_fin?new Date(e.fecha_fin):new Date()
        if (isNaN(ini.getTime())||isNaN(fin.getTime())||fin<ini) return
        total += fin.getTime()-ini.getTime()
      })
      mapa[String(a.id)] = Math.floor(total/(1000*60*60))
    })
    setHorasMap(mapa)
  }

  async function eliminarAmbulancia(id: string) {
    if (!confirm("¿Eliminar ambulancia?")) return
    await supabase.from("historial_operativo").delete().eq("ambulancia_id",id)
    await supabase.from("mantenimientos").delete().eq("ambulancia_id",id)
    await supabase.from("ambulancias").delete().eq("id",id)
    cargar()
  }

  async function guardarEdicion(id: string) {
    await supabase.from("ambulancias").update({ codigo_operativo:editData.codigo_operativo, placa:editData.placa, marca:editData.marca, tipo:editData.tipo }).eq("id",id)
    setEditando(null); cargar()
  }

  function cerrarSesion() { localStorage.clear(); router.push("/") }

  const alfas = ambulancias.filter(a => a.tipo==="ALFA")
  const bravos = ambulancias.filter(a => a.tipo==="BRAVO")
  const total = ambulancias.length
  const operativas = ambulancias.filter(a => a.estado==="operativa").length
  const mantenimiento = ambulancias.filter(a => a.estado==="mantenimiento").length
  const fuera = ambulancias.filter(a => a.estado==="no operativa").length
  const totalHoras = Object.values(horasMap).reduce((a,b)=>a+(b||0),0)
  const promedioH = total ? Math.round(totalHoras/total) : 0
  const mttoVencido = ambulancias.filter(a => a.kilometraje_actual>=a.kilometraje_mtto)
  const mttoProximo = ambulancias.filter(a => { const d=a.kilometraje_mtto-a.kilometraje_actual; return d<=400&&d>0 })
  const visible = filtro==="ALFA"?alfas:filtro==="BRAVO"?bravos:ambulancias

  return (
    <>
    <div style={{
      background:"#050b15", minHeight:"100vh", color:"white",
      fontFamily:"'Space Mono','Courier New',monospace",
      filter:drawerOpen?"blur(1px) brightness(0.4)":"none",
      transition:"filter 0.3s", pointerEvents:drawerOpen?"none":"auto",
      position:"relative",
    }}>

      {/* Fondo decorativo */}
      <div style={{ position:'fixed', top:0, left:0, right:0, bottom:0, pointerEvents:'none', zIndex:0, overflow:'hidden' }}>
        <div style={{ position:'absolute', top:-100, right:-80, width:350, height:350, borderRadius:'50%', background:'radial-gradient(circle,rgba(34,211,238,0.03) 0%,transparent 70%)' }}/>
        <div style={{ position:'absolute', bottom:100, left:-80, width:250, height:250, borderRadius:'50%', background:'radial-gradient(circle,rgba(167,139,250,0.03) 0%,transparent 70%)' }}/>
      </div>

      {/* ── HEADER ── */}
      <div style={{ position:'sticky', top:0, zIndex:20, background:'rgba(5,11,21,0.95)', backdropFilter:'blur(12px)', borderBottom:'1px solid rgba(255,255,255,0.06)', padding:'12px 16px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:32, height:32, borderRadius:9, background:'linear-gradient(135deg,#0891b2,#0e7490)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16 }}>🚑</div>
            <div>
              <p style={{ margin:0, fontSize:12, fontWeight:800, color:'#f1f5f9', letterSpacing:'0.04em' }}>CENTRO DE CONTROL</p>
              <p style={{ margin:0, fontSize:7, color:'#334155', letterSpacing:'0.08em' }}>DIR. PROVINCIAL DE SALUD DEL GUAYAS</p>
            </div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:7 }}>
            <span style={{ fontSize:9, color:'#334155', display:'none' }}>{nombre}</span>
            <button onClick={cerrarSesion} style={{ background:'rgba(239,68,68,0.12)', border:'1px solid rgba(239,68,68,0.25)', color:'#f87171', padding:'6px 11px', borderRadius:7, fontSize:9, fontWeight:700, cursor:'pointer', letterSpacing:'0.04em' }}>🔐 SALIR</button>
          </div>
        </div>

        {/* Botones nav */}
        <div style={{ overflowX:'auto', paddingBottom:2 }}>
          <div style={{ display:'flex', gap:7, width:'max-content' }}>
            {[
              { l:"+ Ambulancia",  path:"/dashboard/nueva-ambulancia", c:"rgba(29,78,216,0.15)",  bc:"rgba(29,78,216,0.35)",  tc:"#60a5fa" },
              { l:"Informe",       path:"/dashboard/informe-flota",    c:"rgba(15,118,110,0.15)", bc:"rgba(15,118,110,0.35)", tc:"#2dd4bf" },
              { l:"KM Diario",     path:"/inventario/kilometrajes",    c:"rgba(3,105,161,0.15)",  bc:"rgba(3,105,161,0.35)",  tc:"#38bdf8" },
              { l:"🧠 Inteligencia",path:"/dashboard/inteligencia",    c:"rgba(124,58,237,0.15)", bc:"rgba(124,58,237,0.35)", tc:"#a78bfa" },
            ].map(b => (
              <button key={b.l} onClick={() => router.push(b.path)} style={{ background:b.c, border:`1px solid ${b.bc}`, color:b.tc, padding:'8px 12px', borderRadius:8, fontSize:9, fontWeight:700, cursor:'pointer', whiteSpace:'nowrap', letterSpacing:'0.04em' }}>{b.l}</button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ padding:'14px 16px 30px', position:'relative', zIndex:1 }}>

        {/* Alertas */}
        {mttoVencido.length > 0 && (
          <div style={{ background:'linear-gradient(135deg,rgba(127,29,29,0.4),rgba(127,29,29,0.2))', border:'1px solid rgba(239,68,68,0.25)', borderRadius:10, padding:'9px 13px', marginBottom:8, fontSize:10 }}>
            🚨 <b style={{ color:'#fca5a5' }}>Mtto vencido:</b> <span style={{ color:'#94a3b8' }}>{mttoVencido.map(a=>a.codigo_operativo).join(", ")}</span>
          </div>
        )}
        {mttoProximo.length > 0 && (
          <div style={{ background:'linear-gradient(135deg,rgba(120,53,15,0.4),rgba(120,53,15,0.2))', border:'1px solid rgba(251,191,36,0.25)', borderRadius:10, padding:'9px 13px', marginBottom:8, fontSize:10 }}>
            ⚠️ <b style={{ color:'#fde68a' }}>Próximo mtto:</b> <span style={{ color:'#94a3b8' }}>{mttoProximo.map(a=>a.codigo_operativo).join(", ")}</span>
          </div>
        )}
        {alertas.length > 0 && (
          <div style={{ background:'linear-gradient(135deg,rgba(127,29,29,0.3),rgba(127,29,29,0.15))', border:'1px solid rgba(239,68,68,0.2)', borderRadius:10, padding:'9px 13px', marginBottom:14, fontSize:10 }}>
            🔴 <b style={{ color:'#fca5a5' }}>{alertas.length} falla(s) crítica(s) abiertas</b>
          </div>
        )}

        {/* KPIs */}
        <div style={{ marginBottom:6 }}><span style={{ fontSize:8, color:'#334155', letterSpacing:'0.12em', fontWeight:700 }}>▸ FLOTA TOTAL</span></div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:7, marginBottom:8 }}>
          <StatCard label="OPERATIVAS"    value={operativas}   color="#4ade80"/>
          <StatCard label="MANTENIMIENTO" value={mantenimiento} color="#fbbf24"/>
          <StatCard label="NO OPERATIVAS" value={fuera}         color="#f87171"/>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:7, marginBottom:18 }}>
          <StatCard label="DISPONIBILIDAD" value={pct(operativas,total)+"%"} color="#38bdf8"/>
          <StatCard label="HORAS FUERA"    value={totalHoras+"h"}            color="#94a3b8"/>
          <StatCard label="PROMEDIO"       value={promedioH+"h"}             color="#64748b"/>
        </div>

        {/* ALFA / BRAVO */}
        <div style={{ marginBottom:6 }}><span style={{ fontSize:8, color:'#334155', letterSpacing:'0.12em', fontWeight:700 }}>▸ POR TIPO DE UNIDAD</span></div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:20 }}>
          <TipoCard tipo="ALFA"  list={alfas}  accent="#38bdf8"/>
          <TipoCard tipo="BRAVO" list={bravos} accent="#a78bfa"/>
        </div>

        {/* Filtros tabla */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
          <span style={{ fontSize:8, color:'#334155', letterSpacing:'0.1em', fontWeight:700 }}>▸ FLOTA — {visible.length} unidades</span>
          <div style={{ display:'flex', gap:5 }}>
            {(["TODOS","ALFA","BRAVO"] as const).map(f => (
              <button key={f} onClick={() => setFiltro(f)} style={{ background:filtro===f?"rgba(34,211,238,0.12)":"rgba(255,255,255,0.03)", border:`1px solid ${filtro===f?"rgba(34,211,238,0.35)":"rgba(255,255,255,0.07)"}`, color:filtro===f?"#22d3ee":"#475569", padding:'5px 10px', borderRadius:6, fontSize:9, fontWeight:700, cursor:'pointer' }}>{f}</button>
            ))}
          </div>
        </div>

        {/* Tabla con scroll horizontal */}
        <div style={{ background:'rgba(11,17,32,0.9)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:12, overflowX:'auto', WebkitOverflowScrolling:'touch' as any }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:10, minWidth:580 }}>
            <thead>
              <tr style={{ background:'rgba(255,255,255,0.03)', borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
                {["Estado","Código","Placa","Marca","Tipo","Base Op.","KM","Horas","Acciones"].map(h => (
                  <th key={h} style={{ padding:'9px 10px', textAlign:'left', fontSize:8, color:'#334155', letterSpacing:'0.08em', fontWeight:700, whiteSpace:'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.map((a, i) => {
                const c = EA[a.estado]||EA["no operativa"]
                const isEdit = editando===a.id
                const isHover = hoveredRow===a.id
                const horas = horasMap[String(a.id)]||0
                const kmAlerta = a.kilometraje_actual>=a.kilometraje_mtto
                const kmProximo = !kmAlerta&&(a.kilometraje_mtto-a.kilometraje_actual)<=400
                return (
                  <tr key={a.id}
                    onMouseEnter={() => setHoveredRow(a.id)}
                    onMouseLeave={() => setHoveredRow(null)}
                    style={{ borderBottom:'1px solid rgba(255,255,255,0.04)', background:isEdit?"rgba(56,189,248,0.04)":isHover?"rgba(255,255,255,0.02)":i%2===0?"transparent":"rgba(255,255,255,0.01)", transition:'background 0.15s', borderLeft:kmAlerta?`2px solid #f87171`:kmProximo?`2px solid #fbbf24`:"2px solid transparent" }}
                  >
                    <td style={{ padding:'9px 10px' }}>
                      <span style={{ background:c.bg, border:`1px solid ${c.border}`, color:c.c, fontSize:8, fontWeight:700, padding:'2px 7px', borderRadius:4, whiteSpace:'nowrap' }}>{a.estado.toUpperCase()}</span>
                    </td>
                    <td style={{ padding:'9px 10px' }}>
                      {isEdit?<input value={editData.codigo_operativo||""} style={inputStyle} onChange={e=>setEditData({...editData,codigo_operativo:e.target.value})}/>:<span style={{ fontWeight:800, color:'#f1f5f9', whiteSpace:'nowrap' }}>{a.codigo_operativo}</span>}
                    </td>
                    <td style={{ padding:'9px 10px' }}>
                      {isEdit?<input value={editData.placa||""} style={inputStyle} onChange={e=>setEditData({...editData,placa:e.target.value})}/>:<span style={{ color:'#64748b' }}>{a.placa}</span>}
                    </td>
                    <td style={{ padding:'9px 10px' }}>
                      {isEdit?<input value={editData.marca||""} style={inputStyle} onChange={e=>setEditData({...editData,marca:e.target.value})}/>:<span style={{ color:'#64748b' }}>{a.marca||"—"}</span>}
                    </td>
                    <td style={{ padding:'9px 10px' }}>
                      {isEdit
                        ?<select value={editData.tipo||""} style={inputStyle} onChange={e=>setEditData({...editData,tipo:e.target.value})}><option value="ALFA">ALFA</option><option value="BRAVO">BRAVO</option></select>
                        :<span style={{ background:a.tipo==="ALFA"?"rgba(56,189,248,0.1)":"rgba(167,139,250,0.1)", color:a.tipo==="ALFA"?"#38bdf8":"#a78bfa", border:`1px solid ${a.tipo==="ALFA"?"rgba(56,189,248,0.2)":"rgba(167,139,250,0.2)"}`, fontSize:8, fontWeight:800, padding:'2px 7px', borderRadius:4 }}>{a.tipo}</span>}
                    </td>
                    <td style={{ padding:'9px 10px', color:'#475569', fontSize:9, maxWidth:90, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{a.base_operativa||"—"}</td>
                    <td style={{ padding:'9px 10px' }}>
                      <span style={{ color:kmAlerta?"#f87171":kmProximo?"#fbbf24":"#64748b", whiteSpace:'nowrap', fontWeight:kmAlerta||kmProximo?700:400 }}>{a.kilometraje_actual?.toLocaleString()}</span>
                      {kmAlerta&&<span style={{ fontSize:7, color:'#f87171', marginLeft:3 }}>⚠</span>}
                      {kmProximo&&<span style={{ fontSize:7, color:'#fbbf24', marginLeft:3 }}>↑</span>}
                    </td>
                    <td style={{ padding:'9px 10px', color:'#475569' }}>{horas}h</td>
                    <td style={{ padding:'9px 10px' }}>
                      {isEdit?(
                        <div style={{ display:'flex', gap:4 }}>
                          <button onClick={()=>guardarEdicion(a.id)} style={{ background:'rgba(74,222,128,0.12)', border:'1px solid rgba(74,222,128,0.3)', color:'#4ade80', padding:'5px 9px', borderRadius:5, fontSize:9, fontWeight:700, cursor:'pointer' }}>💾</button>
                          <button onClick={()=>setEditando(null)} style={{ background:'rgba(248,113,113,0.1)', border:'1px solid rgba(248,113,113,0.25)', color:'#f87171', padding:'5px 7px', borderRadius:5, fontSize:9, cursor:'pointer' }}>✕</button>
                        </div>
                      ):(
                        <div style={{ display:'flex', gap:4 }}>
                          <button onClick={()=>{ setDrawerAmbId(a.id); setDrawerOpen(true) }} style={{ background:'rgba(34,211,238,0.1)', border:'1px solid rgba(34,211,238,0.25)', color:'#22d3ee', padding:'5px 8px', borderRadius:5, fontSize:9, fontWeight:800, cursor:'pointer', whiteSpace:'nowrap' }}>📋</button>
                          <button onClick={()=>{ setEditando(a.id); setEditData(a) }} style={{ background:'rgba(251,191,36,0.1)', border:'1px solid rgba(251,191,36,0.25)', color:'#fbbf24', padding:'5px 8px', borderRadius:5, fontSize:9, cursor:'pointer' }}>✏️</button>
                          <button onClick={()=>eliminarAmbulancia(a.id)} style={{ background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.25)', color:'#f87171', padding:'5px 7px', borderRadius:5, fontSize:10, cursor:'pointer' }}>🗑</button>
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

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
