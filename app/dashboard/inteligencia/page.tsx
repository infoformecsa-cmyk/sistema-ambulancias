"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"

/* ═══════════════════════════════════════════════════
   PLANES DE MANTENIMIENTO POR MARCA
   Fuente: IVECO Daily (PDF oficial), Mercedes Benz
   Sprinter, Toyota Hilux, Dodge Ram (fabricantes)
═══════════════════════════════════════════════════ */

type TareaMantenimiento = {
  descripcion: string
  sistema: string
  costo?: number
}

type IntervaloMtto = {
  km: number
  costoRep: number
  tareas: TareaMantenimiento[]
}

/* ── IVECO DAILY — extraído del PDF oficial ── */
const PLAN_IVECO: IntervaloMtto[] = [
  {
    km: 5000,
    costoRep: 363.61,
    tareas: [
      { descripcion:"Cambio de aceite de motor",              sistema:"MOTOR",   costo:73.44 },
      { descripcion:"Cambio de filtro de aceite",             sistema:"MOTOR",   costo:99.01 },
      { descripcion:"Cambio empaque tapón de cárter",         sistema:"MOTOR",   costo:3.01  },
      { descripcion:"Grasa líquida",                          sistema:"LUBRIC",  costo:13.15 },
      { descripcion:"Inspección frenos de estacionamiento",   sistema:"FRENOS"               },
      { descripcion:"Revisión nivel líquido de frenos",       sistema:"FRENOS"               },
      { descripcion:"Revisión nivel líquido de embrague",     sistema:"EMBRAGUE"             },
      { descripcion:"Verificar RPM mínimas y máximas",        sistema:"MOTOR"                },
      { descripcion:"Verificar tensión de bandas",            sistema:"MOTOR"                },
      { descripcion:"Revisar nivel líquido refrigerante",     sistema:"MOTOR"                },
      { descripcion:"Inspección eleva vidrios",               sistema:"CABINA"               },
      { descripcion:"Verificación A/C mandos",                sistema:"A/C"                  },
      { descripcion:"Verificar líquido limpiaparabrisas",     sistema:"CABINA"               },
      { descripcion:"Inspeccionar espejos retrovisores",      sistema:"CABINA"               },
      { descripcion:"Limpiar cerraduras de puertas",          sistema:"CABINA"               },
      { descripcion:"Revisión luces e indicadores",           sistema:"ELECTRICO"            },
    ],
  },
  {
    km: 10000,
    costoRep: 700.86,
    tareas: [
      { descripcion:"Cambio de aceite de motor",              sistema:"MOTOR",   costo:73.44 },
      { descripcion:"Cambio de filtro de aceite",             sistema:"MOTOR",   costo:99.01 },
      { descripcion:"Cambio de filtro de combustible",        sistema:"MOTOR",   costo:42.24 },
      { descripcion:"Cambio filtro separador de agua",        sistema:"MOTOR",   costo:50.22 },
      { descripcion:"Cambio empaque tapón de cárter",         sistema:"MOTOR",   costo:3.01  },
      { descripcion:"Alineación y balanceo / rotación",       sistema:"NEUMAT",  costo:74.80 },
      { descripcion:"Filtro A/C",                             sistema:"A/C",     costo:22.37 },
      { descripcion:"Grasa líquida",                          sistema:"LUBRIC",  costo:13.15 },
      { descripcion:"Limpieza y ajuste de frenos",            sistema:"FRENOS"               },
      { descripcion:"Drenar sedimentador filtro combustible", sistema:"MOTOR"                },
      { descripcion:"Inspección radiador y condensador",      sistema:"MOTOR"                },
      { descripcion:"Revisión árboles de transmisión",        sistema:"TRANSMIS"             },
      { descripcion:"Verificar amortiguadores",               sistema:"SUSPENS"              },
      { descripcion:"Reajustar suspensión",                   sistema:"SUSPENS"              },
      { descripcion:"Revisión estado de batería",             sistema:"ELECTRICO"            },
      { descripcion:"Reajuste neumáticos, presión y estado",  sistema:"NEUMAT"               },
    ],
  },
  {
    km: 20000,
    costoRep: 893.37,
    tareas: [
      { descripcion:"Cambio de aceite de motor",              sistema:"MOTOR",   costo:73.44  },
      { descripcion:"Cambio de filtro de aceite",             sistema:"MOTOR",   costo:99.01  },
      { descripcion:"Cambio filtro de aire de motor",         sistema:"MOTOR",   costo:104.62 },
      { descripcion:"Cambio de filtro de combustible",        sistema:"MOTOR",   costo:42.24  },
      { descripcion:"Cambio filtro separador de agua",        sistema:"MOTOR",   costo:50.22  },
      { descripcion:"Aceite diferencial 85W140 GL5",          sistema:"EJE",     costo:39.17  },
      { descripcion:"Aceite transmisión 75W80 GL4",           sistema:"TRANSMIS",costo:41.94  },
      { descripcion:"Cambio empaque tapón de cárter",         sistema:"MOTOR",   costo:3.01   },
      { descripcion:"Alineación y balanceo",                  sistema:"NEUMAT",  costo:74.80  },
      { descripcion:"Filtro A/C",                             sistema:"A/C",     costo:22.37  },
      { descripcion:"Grasa líquida",                          sistema:"LUBRIC",  costo:13.15  },
      { descripcion:"Inspección dirección y columna",         sistema:"DIRECC"               },
      { descripcion:"Inspección cañerías cremallera",         sistema:"DIRECC"               },
      { descripcion:"Verificar juego pedal freno y embrague", sistema:"FRENOS"               },
      { descripcion:"Inspección tubería de escape",           sistema:"MOTOR"                },
      { descripcion:"Cambio de aceite de transmisión",        sistema:"TRANSMIS"             },
      { descripcion:"Cambio de aceite de diferencial",        sistema:"EJE"                  },
    ],
  },
  {
    km: 40000,
    costoRep: 1104.60,
    tareas: [
      { descripcion:"Todo lo de 20.000 km",                   sistema:"GENERAL"              },
      { descripcion:"Cambio de refrigerante (3GL)",           sistema:"MOTOR",   costo:63.85  },
      { descripcion:"Líquido de frenos DOT 4",                sistema:"FRENOS",  costo:58.43  },
      { descripcion:"Aceite dirección DeXron II",             sistema:"DIRECC",  costo:38.95  },
      { descripcion:"Filtro blow by",                         sistema:"MOTOR",   costo:87.28  },
      { descripcion:"Limpiador de frenos",                    sistema:"FRENOS",  costo:14.69  },
      { descripcion:"Revisión visual turbocargador",          sistema:"MOTOR"                },
      { descripcion:"Inspección cañerías combustible",        sistema:"MOTOR"                },
    ],
  },
  {
    km: 80000,
    costoRep: 1212.49,
    tareas: [
      { descripcion:"Todo lo de 40.000 km",                   sistema:"GENERAL"              },
      { descripcion:"Cambio de bandas (todas)",               sistema:"MOTOR",   costo:107.89 },
      { descripcion:"Banda de accesorios",                    sistema:"MOTOR",   costo:35.84  },
      { descripcion:"Banda del A/C",                          sistema:"A/C",     costo:72.05  },
    ],
  },
]

/* ── MERCEDES BENZ SPRINTER ── */
const PLAN_MERCEDES: IntervaloMtto[] = [
  {
    km: 10000,
    costoRep: 320,
    tareas: [
      { descripcion:"Cambio aceite sintético y filtro (diesel)",sistema:"MOTOR"  },
      { descripcion:"Revisión nivel fluidos",                   sistema:"MOTOR"  },
      { descripcion:"Inspección frenos y rotación neumáticos",  sistema:"FRENOS" },
      { descripcion:"Revisión luces y señales",                 sistema:"ELECTRICO"},
    ],
  },
  {
    km: 20000,
    costoRep: 580,
    tareas: [
      { descripcion:"Service A — aceite + filtro + inspección general", sistema:"MOTOR" },
      { descripcion:"Reemplazo filtro combustible (diesel)",    sistema:"MOTOR"  },
      { descripcion:"Revisión transmisión (diesel)",           sistema:"TRANSMIS"},
      { descripcion:"Inspección suspensión delantera/trasera", sistema:"SUSPENS" },
    ],
  },
  {
    km: 40000,
    costoRep: 950,
    tareas: [
      { descripcion:"Service B completo",                       sistema:"MOTOR"   },
      { descripcion:"Reemplazo fluido de frenos",               sistema:"FRENOS"  },
      { descripcion:"Reemplazo filtro de cabina",               sistema:"A/C"     },
      { descripcion:"Inspección batería",                       sistema:"ELECTRICO"},
      { descripcion:"Aceite y filtro transmisión (diesel)",     sistema:"TRANSMIS" },
    ],
  },
  {
    km: 60000,
    costoRep: 1100,
    tareas: [
      { descripcion:"Revisión integral de sistemas",            sistema:"GENERAL"  },
      { descripcion:"Reemplazo filtro de aire del motor",       sistema:"MOTOR"    },
      { descripcion:"Reemplazo filtro combustible",             sistema:"MOTOR"    },
      { descripcion:"Inspección suspensión completa",           sistema:"SUSPENS"  },
      { descripcion:"Revisión dirección hidráulica",            sistema:"DIRECC"   },
    ],
  },
  {
    km: 120000,
    costoRep: 1800,
    tareas: [
      { descripcion:"Cambio bujías de precalentamiento (diesel)",sistema:"MOTOR"   },
      { descripcion:"Revisión turbocargador",                    sistema:"MOTOR"   },
      { descripcion:"Cambio refrigerante",                       sistema:"MOTOR"   },
      { descripcion:"Revisión completa chasis y carrocería",     sistema:"GENERAL" },
    ],
  },
]

/* ── TOYOTA HILUX ── */
const PLAN_TOYOTA: IntervaloMtto[] = [
  {
    km: 5000,
    costoRep: 180,
    tareas: [
      { descripcion:"Cambio aceite motor y filtro",             sistema:"MOTOR"    },
      { descripcion:"Inspección visual general",                sistema:"GENERAL"  },
      { descripcion:"Revisar nivel fluidos",                    sistema:"MOTOR"    },
    ],
  },
  {
    km: 10000,
    costoRep: 380,
    tareas: [
      { descripcion:"Cambio aceite y filtro",                   sistema:"MOTOR"    },
      { descripcion:"Rotación de neumáticos",                   sistema:"NEUMAT"   },
      { descripcion:"Inspección frenos",                        sistema:"FRENOS"   },
      { descripcion:"Revisión nivel dirección hidráulica",      sistema:"DIRECC"   },
      { descripcion:"Limpieza filtro de aire",                  sistema:"MOTOR"    },
    ],
  },
  {
    km: 20000,
    costoRep: 620,
    tareas: [
      { descripcion:"Cambio aceite y filtro motor",             sistema:"MOTOR"    },
      { descripcion:"Cambio filtro de combustible",             sistema:"MOTOR"    },
      { descripcion:"Cambio filtro de aire",                    sistema:"MOTOR"    },
      { descripcion:"Revisión sistema de embrague",             sistema:"EMBRAGUE" },
      { descripcion:"Inspección suspensión completa",           sistema:"SUSPENS"  },
      { descripcion:"Alineación y balanceo",                    sistema:"NEUMAT"   },
    ],
  },
  {
    km: 40000,
    costoRep: 980,
    tareas: [
      { descripcion:"Cambio aceite y filtro motor",             sistema:"MOTOR"    },
      { descripcion:"Cambio fluido de frenos",                  sistema:"FRENOS"   },
      { descripcion:"Cambio aceite diferencial delantero/trasero",sistema:"EJE"    },
      { descripcion:"Cambio aceite caja de transferencia",      sistema:"TRANSMIS" },
      { descripcion:"Revisión bujías (gasolina)",               sistema:"MOTOR"    },
      { descripcion:"Inspección correas accesorios",            sistema:"MOTOR"    },
    ],
  },
  {
    km: 80000,
    costoRep: 1400,
    tareas: [
      { descripcion:"Cambio correa de distribución",            sistema:"MOTOR"    },
      { descripcion:"Cambio bomba de agua",                     sistema:"MOTOR"    },
      { descripcion:"Cambio refrigerante",                      sistema:"MOTOR"    },
      { descripcion:"Cambio aceite transmisión automática",     sistema:"TRANSMIS" },
      { descripcion:"Revisión completa suspensión y dirección", sistema:"SUSPENS"  },
    ],
  },
]

/* ── DODGE RAM ── */
const PLAN_DODGE: IntervaloMtto[] = [
  {
    km: 5000,
    costoRep: 200,
    tareas: [
      { descripcion:"Cambio aceite y filtro",                   sistema:"MOTOR"    },
      { descripcion:"Inspección frenos y neumáticos",           sistema:"FRENOS"   },
      { descripcion:"Revisión nivel fluidos",                   sistema:"MOTOR"    },
    ],
  },
  {
    km: 10000,
    costoRep: 420,
    tareas: [
      { descripcion:"Cambio aceite y filtro",                   sistema:"MOTOR"    },
      { descripcion:"Rotación de neumáticos",                   sistema:"NEUMAT"   },
      { descripcion:"Inspección sistema de frenos",             sistema:"FRENOS"   },
      { descripcion:"Revisión batería y sistema eléctrico",     sistema:"ELECTRICO"},
      { descripcion:"Inspección suspensión delantera",          sistema:"SUSPENS"  },
    ],
  },
  {
    km: 30000,
    costoRep: 750,
    tareas: [
      { descripcion:"Cambio aceite y filtro motor",             sistema:"MOTOR"    },
      { descripcion:"Cambio filtro de aire",                    sistema:"MOTOR"    },
      { descripcion:"Cambio filtro de cabina",                  sistema:"A/C"      },
      { descripcion:"Inspección bujías",                        sistema:"MOTOR"    },
      { descripcion:"Revisión dirección y alineación",          sistema:"DIRECC"   },
    ],
  },
  {
    km: 60000,
    costoRep: 1200,
    tareas: [
      { descripcion:"Cambio fluido transmisión automática",     sistema:"TRANSMIS" },
      { descripcion:"Cambio fluido diferencial",                sistema:"EJE"      },
      { descripcion:"Cambio bujías (si gasolina)",              sistema:"MOTOR"    },
      { descripcion:"Cambio fluido dirección hidráulica",       sistema:"DIRECC"   },
      { descripcion:"Inspección completa chasis",               sistema:"GENERAL"  },
    ],
  },
  {
    km: 100000,
    costoRep: 1800,
    tareas: [
      { descripcion:"Revisión integral tren motriz",            sistema:"MOTOR"    },
      { descripcion:"Cambio refrigerante",                      sistema:"MOTOR"    },
      { descripcion:"Cambio correas accesorios",                sistema:"MOTOR"    },
      { descripcion:"Inspección inyectores",                    sistema:"MOTOR"    },
      { descripcion:"Revisión completa frenos",                 sistema:"FRENOS"   },
    ],
  },
]

const PLANES: Record<string, IntervaloMtto[]> = {
  IVECO:    PLAN_IVECO,
  MERCEDES: PLAN_MERCEDES,
  TOYOTA:   PLAN_TOYOTA,
  DODGE:    PLAN_DODGE,
}

/* ═══════════════════════════════════════════════
   COLORES Y HELPERS
═══════════════════════════════════════════════ */
const SISTEMA_COLOR: Record<string, { c: string; bg: string }> = {
  MOTOR:     { c:"#38bdf8", bg:"rgba(56,189,248,0.12)"  },
  FRENOS:    { c:"#f87171", bg:"rgba(248,113,113,0.12)" },
  TRANSMIS:  { c:"#a78bfa", bg:"rgba(167,139,250,0.12)" },
  SUSPENS:   { c:"#fbbf24", bg:"rgba(251,191,36,0.12)"  },
  ELECTRICO: { c:"#22d3ee", bg:"rgba(34,211,238,0.12)"  },
  "A/C":     { c:"#34d399", bg:"rgba(52,211,153,0.12)"  },
  DIRECC:    { c:"#fb923c", bg:"rgba(251,146,60,0.12)"  },
  NEUMAT:    { c:"#94a3b8", bg:"rgba(148,163,184,0.12)" },
  EJE:       { c:"#e879f9", bg:"rgba(232,121,249,0.12)" },
  EMBRAGUE:  { c:"#f472b6", bg:"rgba(244,114,182,0.12)" },
  LUBRIC:    { c:"#86efac", bg:"rgba(134,239,172,0.12)" },
  GENERAL:   { c:"#64748b", bg:"rgba(100,116,139,0.12)" },
  CABINA:    { c:"#67e8f9", bg:"rgba(103,232,249,0.12)" },
}

function getSistemaColor(s: string) {
  return SISTEMA_COLOR[s] || { c:"#94a3b8", bg:"rgba(148,163,184,0.1)" }
}

function detectarMarca(marca: string): string {
  const m = (marca || "").toUpperCase()
  if (m.includes("IVECO"))    return "IVECO"
  if (m.includes("MERCEDES")) return "MERCEDES"
  if (m.includes("TOYOTA"))   return "TOYOTA"
  if (m.includes("DODGE") || m.includes("RAM")) return "DODGE"
  return "IVECO" // default
}

function proximoMantenimiento(kmActual: number, marca: string): IntervaloMtto | null {
  const plan = PLANES[detectarMarca(marca)]
  if (!plan) return null
  return plan.find(p => p.km > kmActual) || null
}

function alertaNivel(kmActual: number, kmProximo: number): "critico" | "proximo" | "ok" {
  const diff = kmProximo - kmActual
  if (diff <= 0)    return "critico"
  if (diff <= 1000) return "proximo"
  return "ok"
}

/* ═══════════════════════════════════════════════
   TIPO
═══════════════════════════════════════════════ */
type AmbData = {
  id: string
  codigo: string
  marca: string
  kmActual: number
  fallas: string[]
  areas: string[]
}

/* ═══════════════════════════════════════════════
   COMPONENTE PRINCIPAL
═══════════════════════════════════════════════ */
export default function Inteligencia() {
  const router = useRouter()

  const [loading,     setLoading]     = useState(true)
  const [ambulancias, setAmbulancias] = useState<AmbData[]>([])
  const [alertas,     setAlertas]     = useState<any[]>([])
  const [ranking,     setRanking]     = useState<any[]>([])
  const [recurrentes, setRecurrentes] = useState<any[]>([])
  const [expandido,   setExpandido]   = useState<string | null>(null)
  const [tabActiva,   setTabActiva]   = useState<"prediccion"|"alertas"|"ranking">("prediccion")

  function normalizarArea(area: string): string | null {
    const a = (area || "").toLowerCase().trim()
    if (!a) return null
    if (a.includes("aire") || a.includes("ac"))  return "aire acondicionado"
    if (a.includes("elect"))                      return "electrico"
    if (a.includes("mec"))                        return "mecanico"
    if (a.includes("fren"))                       return "frenos"
    if (a.includes("motor"))                      return "motor"
    if (a.includes("suspen"))                     return "suspension"
    if (a.includes("transmis"))                   return "transmision"
    return a
  }

  useEffect(() => { cargar() }, [])

  async function cargar() {
    setLoading(true)

    const [{ data: historial }, { data: ambs }] = await Promise.all([
      supabase.from("historial_operativo").select("*,ambulancias(codigo_operativo,marca,kilometraje_actual)").order("fecha_inicio", { ascending: false }),
      supabase.from("ambulancias").select("id,codigo_operativo,marca,kilometraje_actual"),
    ])

    const lista = historial || []
    const ambsList = ambs || []

    /* ── Construir mapa de fallas por ambulancia ── */
    const fallaMap: Record<string, string[]> = {}
    const areaMap:  Record<string, string[]> = {}

    lista.forEach((r: any) => {
      const id = String(r.ambulancia_id)
      if (!fallaMap[id]) fallaMap[id] = []
      if (!areaMap[id])  areaMap[id]  = []
      if (r.tipo_falla) fallaMap[id].push(r.tipo_falla)
      const areas = Array.isArray(r.area) ? r.area : r.area ? [r.area] : []
      areas.forEach((a: string) => {
        const norm = normalizarArea(a)
        if (norm) areaMap[id].push(norm)
      })
    })

    const ambData: AmbData[] = ambsList.map((a: any) => ({
      id:       String(a.id),
      codigo:   a.codigo_operativo,
      marca:    a.marca || "IVECO",
      kmActual: Number(a.kilometraje_actual || 0),
      fallas:   fallaMap[String(a.id)] || [],
      areas:    areaMap[String(a.id)]  || [],
    }))

    setAmbulancias(ambData)
    procesarEstadisticas(lista)
    setLoading(false)
  }

  function procesarEstadisticas(lista: any[]) {
    const hoy = new Date()
    const hace30 = new Date(); hace30.setDate(hoy.getDate() - 30)

    const recientes = lista.filter(i => new Date(i.fecha_inicio) >= hace30)

    const registros: any[] = []
    recientes.forEach(r => {
      const areas = Array.isArray(r.area) ? r.area : r.area ? [r.area] : []
      areas.forEach((a: string) => {
        const norm = normalizarArea(a)
        if (norm) registros.push({ ...r, area_individual: norm })
      })
    })

    /* Alertas */
    const mapaA: any = {}
    registros.forEach(r => {
      const key = `${r.ambulancia_id}-${r.area_individual}`
      if (!mapaA[key]) mapaA[key] = { codigo:r.ambulancias?.codigo_operativo||r.ambulancia_id, area:r.area_individual, count:0 }
      mapaA[key].count++
    })
    setAlertas(Object.values(mapaA).filter((a: any) => a.count >= 2).sort((a: any, b: any) => b.count - a.count))

    /* Ranking áreas */
    const mapaR: any = {}
    registros.forEach(r => { mapaR[r.area_individual] = (mapaR[r.area_individual] || 0) + 1 })
    const total = registros.length || 1
    setRanking(Object.keys(mapaR).map(area => ({ area, valor: mapaR[area], porcentaje: Math.round((mapaR[area] / total) * 100) })).sort((a, b) => b.valor - a.valor))

    /* Recurrentes */
    const mapaRec: any = {}
    registros.forEach(r => {
      const key = r.ambulancias?.codigo_operativo || r.ambulancia_id
      if (!mapaRec[key]) mapaRec[key] = { codigo:key, total:0 }
      mapaRec[key].total++
    })
    setRecurrentes(Object.values(mapaRec).sort((a: any, b: any) => b.total - a.total))
  }

  /* ── COLORES NIVEL ALERTA ── */
  const NA = {
    critico: { c:"#dc2626", bg:"rgba(220,38,38,0.12)", border:"rgba(220,38,38,0.4)", label:"⚠ VENCIDO"  },
    proximo: { c:"#d97706", bg:"rgba(217,119,6,0.12)", border:"rgba(217,119,6,0.4)", label:"↑ PRÓXIMO"  },
    ok:      { c:"#22c55e", bg:"rgba(34,197,94,0.12)", border:"rgba(34,197,94,0.3)", label:"✓ AL DÍA"   },
  }

  if (loading) return (
    <div style={{ minHeight:"100vh", background:"#050b15", color:"white", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", fontFamily:"'Space Mono',monospace", gap:12 }}>
      <div style={{ width:40, height:40, borderRadius:12, background:"linear-gradient(135deg,#7c3aed,#4c1d95)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20 }}>🧠</div>
      <p style={{ color:"#a78bfa", fontSize:11, letterSpacing:"0.1em", fontWeight:700 }}>CARGANDO INTELIGENCIA...</p>
    </div>
  )

  return (
    <div style={{ background:"#050b15", minHeight:"100vh", color:"white", fontFamily:"'Space Mono','Courier New',monospace", position:"relative" }}>

      {/* Fondo */}
      <div style={{ position:"fixed", inset:0, pointerEvents:"none", zIndex:0, overflow:"hidden" }}>
        <div style={{ position:"absolute", top:-100, right:-80, width:350, height:350, borderRadius:"50%", background:"radial-gradient(circle,rgba(124,58,237,0.06) 0%,transparent 70%)", filter:"blur(40px)" }}/>
        <div style={{ position:"absolute", bottom:-80, left:-60, width:280, height:280, borderRadius:"50%", background:"radial-gradient(circle,rgba(34,211,238,0.04) 0%,transparent 70%)", filter:"blur(40px)" }}/>
      </div>

      {/* ── HEADER ── */}
      <div style={{ position:"sticky", top:0, zIndex:20, background:"rgba(5,11,21,0.97)", backdropFilter:"blur(14px)", borderBottom:"1px solid rgba(255,255,255,0.07)" }}>
        <div style={{ maxWidth:1300, margin:"0 auto", padding:"13px 18px", display:"flex", justifyContent:"space-between", alignItems:"center", gap:12, flexWrap:"wrap" }}>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <div style={{ width:38, height:38, borderRadius:10, background:"linear-gradient(135deg,#7c3aed,#4c1d95)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>🧠</div>
            <div>
              <p style={{ margin:0, fontSize:13, fontWeight:800, color:"#f1f5f9", letterSpacing:"0.04em" }}>INTELIGENCIA OPERATIVA</p>
              <p style={{ margin:0, fontSize:8, color:"#475569", letterSpacing:"0.08em" }}>PREDICCIÓN DE MANTENIMIENTO · ANÁLISIS DE FALLAS</p>
            </div>
          </div>
          <div style={{ display:"flex", gap:8 }}>
            <button onClick={cargar} style={{ background:"rgba(124,58,237,0.15)", border:"1px solid rgba(124,58,237,0.35)", color:"#a78bfa", padding:"7px 13px", borderRadius:7, fontSize:9, fontWeight:700, cursor:"pointer" }}>🔄 Actualizar</button>
            <button onClick={() => router.push("/dashboard")} style={{ background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)", color:"#94a3b8", padding:"7px 13px", borderRadius:7, fontSize:9, fontWeight:700, cursor:"pointer" }}>← Volver</button>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ maxWidth:1300, margin:"0 auto", padding:"0 18px 12px", display:"flex", gap:6 }}>
          {([
            { k:"prediccion", l:"🔮 Predicción Mtto."   },
            { k:"alertas",    l:"🚨 Alertas de Fallas"  },
            { k:"ranking",    l:"📊 Distribución"        },
          ] as const).map(t => (
            <button key={t.k} onClick={() => setTabActiva(t.k)} style={{
              background: tabActiva===t.k ? "rgba(124,58,237,0.15)" : "rgba(255,255,255,0.03)",
              border:     `1px solid ${tabActiva===t.k ? "rgba(124,58,237,0.4)" : "rgba(255,255,255,0.07)"}`,
              color:      tabActiva===t.k ? "#a78bfa" : "#475569",
              padding:"7px 14px", borderRadius:7, fontSize:9, fontWeight:700, cursor:"pointer", letterSpacing:"0.04em",
            }}>{t.l}</button>
          ))}
        </div>
      </div>

      <div style={{ maxWidth:1300, margin:"0 auto", padding:"16px 18px 40px", position:"relative", zIndex:1 }}>

        {/* ══════════ TAB: PREDICCIÓN ══════════ */}
        {tabActiva === "prediccion" && (
          <>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:14 }}>
              <div style={{ width:3, height:16, borderRadius:2, background:"#a78bfa" }}/>
              <span style={{ fontSize:10, color:"#e2e8f0", letterSpacing:"0.1em", fontWeight:800 }}>PREDICCIÓN DE MANTENIMIENTO POR AMBULANCIA</span>
            </div>

            {/* Banner info */}
            <div style={{ background:"rgba(124,58,237,0.06)", border:"1px solid rgba(124,58,237,0.18)", borderRadius:10, padding:"10px 14px", marginBottom:18, display:"flex", alignItems:"center", gap:9 }}>
              <span style={{ fontSize:14 }}>📋</span>
              <p style={{ margin:0, fontSize:9, color:"#64748b", lineHeight:1.6 }}>
                Basado en el <b style={{ color:"#a78bfa" }}>Plan Oficial IVECO Daily</b> (0–200k km), <b style={{ color:"#38bdf8" }}>Mercedes Benz Sprinter</b>, <b style={{ color:"#22c55e" }}>Toyota Hilux</b> y <b style={{ color:"#f97316" }}>Dodge RAM</b>.
                Las predicciones combinan el kilometraje actual con el historial de fallas registradas.
              </p>
            </div>

            <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
              {ambulancias.map(amb => {
                const marcaKey = detectarMarca(amb.marca)
                const proximo  = proximoMantenimiento(amb.kmActual, amb.marca)
                const nivel    = proximo ? alertaNivel(amb.kmActual, proximo.km) : "ok"
                const na       = NA[nivel]
                const isOpen   = expandido === amb.id
                const kmFalta  = proximo ? Math.max(0, proximo.km - amb.kmActual) : 0

                /* Sistemas con fallas históricas frecuentes */
                const sistemasFrecuentes: Record<string, number> = {}
                amb.areas.forEach(a => { sistemasFrecuentes[a] = (sistemasFrecuentes[a] || 0) + 1 })
                const topSistemas = Object.entries(sistemasFrecuentes).sort((a,b) => b[1]-a[1]).slice(0,3)

                /* Tareas del próximo mtto que coinciden con fallas históricas */
                const tareasRiesgo = proximo?.tareas.filter(t =>
                  amb.areas.some(a => t.sistema.toLowerCase().includes(a.toLowerCase().slice(0,5)) || a.toLowerCase().includes(t.sistema.toLowerCase().slice(0,5)))
                ) || []

                return (
                  <div key={amb.id} style={{ background:"rgba(11,17,32,0.97)", border:`1px solid ${isOpen ? na.border : "rgba(255,255,255,0.07)"}`, borderLeft:`4px solid ${na.c}`, borderRadius:14, overflow:"hidden", boxShadow:isOpen?`0 0 20px ${na.c}15`:"none" }}>

                    {/* Header */}
                    <div onClick={() => setExpandido(isOpen ? null : amb.id)} style={{ padding:"14px 18px", display:"flex", justifyContent:"space-between", alignItems:"center", gap:10, flexWrap:"wrap", cursor:"pointer" }}>
                      <div style={{ display:"flex", alignItems:"center", gap:12, flexWrap:"wrap" }}>
                        <div style={{ width:9, height:9, borderRadius:"50%", background:na.c, flexShrink:0, boxShadow:`0 0 7px ${na.c}` }}/>
                        <span style={{ fontSize:14, fontWeight:900, color:"#f1f5f9", letterSpacing:"0.05em" }}>🚑 {amb.codigo}</span>
                        <span style={{ background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)", color:"#64748b", fontSize:8, fontWeight:700, padding:"2px 8px", borderRadius:4 }}>{amb.marca.toUpperCase()}</span>
                        <span style={{ background:na.bg, border:`1px solid ${na.border}`, color:na.c, fontSize:9, fontWeight:700, padding:"3px 9px", borderRadius:5 }}>{na.label}</span>
                        {tareasRiesgo.length > 0 && (
                          <span style={{ background:"rgba(251,146,60,0.12)", border:"1px solid rgba(251,146,60,0.3)", color:"#fb923c", fontSize:8, fontWeight:700, padding:"2px 8px", borderRadius:4 }}>
                            ⚡ {tareasRiesgo.length} riesgos detectados
                          </span>
                        )}
                      </div>
                      <div style={{ display:"flex", alignItems:"center", gap:14 }}>
                        <div style={{ textAlign:"right" }}>
                          <p style={{ margin:0, fontSize:8, color:"#475569", letterSpacing:"0.08em" }}>KM ACTUAL</p>
                          <p style={{ margin:"2px 0 0", fontSize:14, fontWeight:800, color:"#f1f5f9" }}>{amb.kmActual.toLocaleString()}</p>
                        </div>
                        {proximo && (
                          <div style={{ textAlign:"right" }}>
                            <p style={{ margin:0, fontSize:8, color:"#475569", letterSpacing:"0.08em" }}>PRÓX. MTTO</p>
                            <p style={{ margin:"2px 0 0", fontSize:14, fontWeight:800, color:na.c }}>{proximo.km.toLocaleString()} km</p>
                          </div>
                        )}
                        <span style={{ color:"#334155", fontSize:14, transform:isOpen?"rotate(180deg)":"none", transition:"transform 0.2s", display:"inline-block" }}>▼</span>
                      </div>
                    </div>

                    {/* Barra progreso al próximo mtto */}
                    {proximo && (
                      <div style={{ padding:"0 18px 12px" }}>
                        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                          <span style={{ fontSize:8, color:"#475569", fontWeight:700, letterSpacing:"0.06em" }}>PROGRESO → PRÓXIMO MANTENIMIENTO ({proximo.km.toLocaleString()} km)</span>
                          <span style={{ fontSize:8, color:na.c, fontWeight:700 }}>
                            {nivel==="critico" ? "⚠ VENCIDO" : `Faltan ${kmFalta.toLocaleString()} km`}
                          </span>
                        </div>
                        <div style={{ background:"rgba(255,255,255,0.05)", borderRadius:999, height:7, overflow:"hidden" }}>
                          <div style={{ width:`${Math.min((amb.kmActual/proximo.km)*100,100)}%`, height:"100%", background:`linear-gradient(90deg,${na.c},${na.c}99)`, borderRadius:999, transition:"width 0.5s" }}/>
                        </div>
                        <div style={{ display:"flex", justifyContent:"space-between", marginTop:3 }}>
                          <span style={{ fontSize:7, color:"#334155" }}>0 km</span>
                          <span style={{ fontSize:7, color:"#334155" }}>{proximo.km.toLocaleString()} km · Costo estimado: <b style={{ color:"#fbbf24" }}>${proximo.costoRep.toLocaleString()}</b></span>
                        </div>
                      </div>
                    )}

                    {/* Expandido */}
                    {isOpen && proximo && (
                      <div style={{ borderTop:"1px solid rgba(255,255,255,0.06)", padding:"16px 18px", display:"flex", flexDirection:"column", gap:14 }}>

                        {/* Fallas históricas detectadas */}
                        {topSistemas.length > 0 && (
                          <div style={{ background:"rgba(251,146,60,0.05)", border:"1px solid rgba(251,146,60,0.15)", borderRadius:12, padding:"12px 14px" }}>
                            <p style={{ margin:"0 0 10px", fontSize:10, fontWeight:800, color:"#fb923c", letterSpacing:"0.06em" }}>⚡ SISTEMAS CON FALLAS HISTÓRICAS FRECUENTES</p>
                            <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                              {topSistemas.map(([sistema, count]) => {
                                const sc = getSistemaColor(sistema.toUpperCase())
                                return (
                                  <div key={sistema} style={{ background:sc.bg, border:`1px solid ${sc.c}30`, borderRadius:8, padding:"6px 12px", display:"flex", alignItems:"center", gap:6 }}>
                                    <span style={{ fontSize:10, fontWeight:700, color:sc.c, textTransform:"uppercase" }}>{sistema}</span>
                                    <span style={{ background:"rgba(255,255,255,0.08)", color:"#94a3b8", fontSize:9, fontWeight:700, padding:"1px 6px", borderRadius:10 }}>{count}x</span>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )}

                        {/* Tareas de riesgo elevado */}
                        {tareasRiesgo.length > 0 && (
                          <div style={{ background:"rgba(220,38,38,0.05)", border:"1px solid rgba(220,38,38,0.15)", borderRadius:12, padding:"12px 14px" }}>
                            <p style={{ margin:"0 0 10px", fontSize:10, fontWeight:800, color:"#ef4444", letterSpacing:"0.06em" }}>🔴 RIESGO ELEVADO — COINCIDENCIA CON HISTORIAL</p>
                            {tareasRiesgo.map((t, i) => {
                              const sc = getSistemaColor(t.sistema)
                              return (
                                <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"7px 0", borderBottom:"1px solid rgba(255,255,255,0.04)", flexWrap:"wrap", gap:8 }}>
                                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                                    <span style={{ background:sc.bg, color:sc.c, fontSize:8, fontWeight:700, padding:"2px 7px", borderRadius:4 }}>{t.sistema}</span>
                                    <span style={{ fontSize:11, color:"#f1f5f9" }}>{t.descripcion}</span>
                                  </div>
                                  {t.costo && <span style={{ fontSize:10, color:"#fbbf24", fontWeight:700 }}>${t.costo}</span>}
                                </div>
                              )
                            })}
                          </div>
                        )}

                        {/* Todas las tareas del próximo mtto */}
                        <div style={{ background:"rgba(34,211,238,0.04)", border:"1px solid rgba(34,211,238,0.12)", borderRadius:12, padding:"12px 14px" }}>
                          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
                            <p style={{ margin:0, fontSize:10, fontWeight:800, color:"#22d3ee", letterSpacing:"0.06em" }}>
                              📋 PLAN COMPLETO — {marcaKey} · {proximo.km.toLocaleString()} km
                            </p>
                            <span style={{ background:"rgba(251,191,36,0.12)", border:"1px solid rgba(251,191,36,0.3)", color:"#fbbf24", fontSize:9, fontWeight:700, padding:"3px 9px", borderRadius:5 }}>
                              Total: ${proximo.costoRep.toLocaleString()}
                            </span>
                          </div>

                          {/* Agrupar por sistema */}
                          {(() => {
                            const grupos: Record<string, TareaMantenimiento[]> = {}
                            proximo.tareas.forEach(t => {
                              if (!grupos[t.sistema]) grupos[t.sistema] = []
                              grupos[t.sistema].push(t)
                            })
                            return Object.entries(grupos).map(([sis, tareas]) => {
                              const sc = getSistemaColor(sis)
                              return (
                                <div key={sis} style={{ marginBottom:10 }}>
                                  <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:5 }}>
                                    <div style={{ width:3, height:12, borderRadius:2, background:sc.c }}/>
                                    <span style={{ fontSize:8, color:sc.c, fontWeight:700, letterSpacing:"0.08em" }}>{sis}</span>
                                  </div>
                                  {tareas.map((t, i) => (
                                    <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"5px 0 5px 9px", borderBottom:"1px solid rgba(255,255,255,0.03)", gap:8 }}>
                                      <span style={{ fontSize:10, color:"#cbd5e1" }}>{t.descripcion}</span>
                                      {t.costo
                                        ? <span style={{ fontSize:9, color:"#94a3b8", fontWeight:600, flexShrink:0 }}>${t.costo}</span>
                                        : <span style={{ fontSize:8, color:"#334155", flexShrink:0 }}>inspección</span>
                                      }
                                    </div>
                                  ))}
                                </div>
                              )
                            })
                          })()}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </>
        )}

        {/* ══════════ TAB: ALERTAS ══════════ */}
        {tabActiva === "alertas" && (
          <>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:14 }}>
              <div style={{ width:3, height:16, borderRadius:2, background:"#ef4444" }}/>
              <span style={{ fontSize:10, color:"#e2e8f0", letterSpacing:"0.1em", fontWeight:800 }}>ALERTAS CRÍTICAS — FALLAS RECURRENTES (ÚLTIMOS 30 DÍAS)</span>
            </div>

            {alertas.length === 0 ? (
              <div style={{ border:"1px dashed rgba(255,255,255,0.07)", borderRadius:12, padding:40, textAlign:"center" }}>
                <span style={{ fontSize:28 }}>✅</span>
                <p style={{ margin:"10px 0 0", fontSize:11, color:"#334155" }}>Sin alertas críticas en los últimos 30 días</p>
              </div>
            ) : alertas.map((a, i) => {
              const sc = getSistemaColor(a.area.toUpperCase())
              const urgente = a.count >= 4
              return (
                <div key={i} style={{ background:"rgba(11,17,32,0.97)", border:`1px solid ${urgente?"rgba(220,38,38,0.35)":"rgba(255,255,255,0.08)"}`, borderLeft:`4px solid ${urgente?"#dc2626":"#f59e0b"}`, borderRadius:11, padding:"13px 16px", marginBottom:8, display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:10 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                    <div style={{ width:8, height:8, borderRadius:"50%", background:urgente?"#dc2626":"#f59e0b", flexShrink:0, boxShadow:`0 0 6px ${urgente?"#dc2626":"#f59e0b"}` }}/>
                    <div>
                      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                        <span style={{ fontSize:12, fontWeight:800, color:"#f1f5f9" }}>🚑 {a.codigo}</span>
                        <span style={{ background:sc.bg, border:`1px solid ${sc.c}30`, color:sc.c, fontSize:8, fontWeight:700, padding:"2px 7px", borderRadius:4 }}>{a.area.toUpperCase()}</span>
                      </div>
                      <p style={{ margin:"3px 0 0", fontSize:9, color:"#475569" }}>{a.count} fallas registradas en 30 días</p>
                    </div>
                  </div>
                  <div style={{ background:urgente?"rgba(220,38,38,0.12)":"rgba(245,158,11,0.12)", border:`1px solid ${urgente?"rgba(220,38,38,0.3)":"rgba(245,158,11,0.3)"}`, color:urgente?"#ef4444":"#f59e0b", fontSize:12, fontWeight:900, padding:"6px 14px", borderRadius:8, minWidth:50, textAlign:"center" }}>
                    {a.count}×
                  </div>
                </div>
              )
            })}

            {/* Top unidades */}
            <div style={{ marginTop:24, display:"flex", alignItems:"center", gap:8, marginBottom:12 }}>
              <div style={{ width:3, height:16, borderRadius:2, background:"#38bdf8" }}/>
              <span style={{ fontSize:10, color:"#e2e8f0", letterSpacing:"0.1em", fontWeight:800 }}>UNIDADES CON MÁS FALLAS</span>
            </div>
            {recurrentes.slice(0, 8).map((r: any, i) => {
              const maxV = recurrentes[0]?.total || 1
              const pct  = Math.round((r.total / maxV) * 100)
              const color = i===0?"#fbbf24":i===1?"#94a3b8":i===2?"#cd7f32":"#38bdf8"
              return (
                <div key={i} style={{ background:"rgba(11,17,32,0.97)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:10, padding:"11px 14px", marginBottom:7 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                      <span style={{ fontSize:i<3?14:10, color }}>{i===0?"🥇":i===1?"🥈":i===2?"🥉":`${i+1}.`}</span>
                      <span style={{ fontSize:12, fontWeight:800, color:"#f1f5f9" }}>🚑 {r.codigo}</span>
                    </div>
                    <span style={{ fontSize:12, fontWeight:800, color }}>{r.total} fallas</span>
                  </div>
                  <div style={{ background:"rgba(255,255,255,0.05)", borderRadius:999, height:5, overflow:"hidden" }}>
                    <div style={{ width:`${pct}%`, height:"100%", background:`linear-gradient(90deg,${color},${color}88)`, borderRadius:999 }}/>
                  </div>
                </div>
              )
            })}
          </>
        )}

        {/* ══════════ TAB: RANKING ══════════ */}
        {tabActiva === "ranking" && (
          <>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:14 }}>
              <div style={{ width:3, height:16, borderRadius:2, background:"#22d3ee" }}/>
              <span style={{ fontSize:10, color:"#e2e8f0", letterSpacing:"0.1em", fontWeight:800 }}>DISTRIBUCIÓN DE FALLAS POR SISTEMA</span>
            </div>

            {ranking.length === 0 ? (
              <div style={{ border:"1px dashed rgba(255,255,255,0.07)", borderRadius:12, padding:40, textAlign:"center" }}>
                <span style={{ fontSize:28 }}>📊</span>
                <p style={{ margin:"10px 0 0", fontSize:11, color:"#334155" }}>Sin datos suficientes</p>
              </div>
            ) : ranking.map((r, i) => {
              const sc = getSistemaColor(r.area.toUpperCase())
              return (
                <div key={i} style={{ background:"rgba(11,17,32,0.97)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:11, padding:"12px 16px", marginBottom:8 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                      <span style={{ background:sc.bg, border:`1px solid ${sc.c}30`, color:sc.c, fontSize:9, fontWeight:700, padding:"3px 9px", borderRadius:5 }}>{r.area.toUpperCase()}</span>
                    </div>
                    <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                      <span style={{ fontSize:11, color:"#64748b" }}>{r.valor} casos</span>
                      <span style={{ fontSize:12, fontWeight:800, color:sc.c, minWidth:40, textAlign:"right" }}>{r.porcentaje}%</span>
                    </div>
                  </div>
                  <div style={{ background:"rgba(255,255,255,0.05)", borderRadius:999, height:7, overflow:"hidden" }}>
                    <div style={{ width:`${r.porcentaje}%`, height:"100%", background:`linear-gradient(90deg,${sc.c},${sc.c}88)`, borderRadius:999, transition:"width 0.5s" }}/>
                  </div>
                </div>
              )
            })}
          </>
        )}

        <div style={{ marginTop:24, textAlign:"center", fontSize:8, color:"#1e293b", letterSpacing:"0.08em" }}>
          🧠 SISTEMA EMS · INTELIGENCIA OPERATIVA
        </div>
      </div>
    </div>
  )
}
