"use client"

import { useEffect, useMemo, useState } from "react"
import type { CSSProperties } from "react"
import { supabase } from "@/lib/supabaseClient"
import { useRouter } from "next/navigation"

/* =========================================================
   TIPOS
========================================================= */

type ResumenType = {
  nombre:string
  faltantes:number
  criticos:number
  vencidos:number
  prioridad:"ALTA"|"MEDIA"|"OK"
  faltantesDetalle:any[]
  vencidosDetalle:any[]
  porcentaje:number
  porcMed:number
  porcOtros:number
}

type ModalMode = "ABASTECER" | "CAMBIO"

/* =========================================================
   CONFIG VISUAL
========================================================= */

const PRIORIDAD = {
  ALTA: {
    c:"#ef4444",
    bg:"rgba(239,68,68,0.10)",
    border:"rgba(239,68,68,0.35)",
    icon:"🚨",
    label:"ALTA",
  },

  MEDIA: {
    c:"#f59e0b",
    bg:"rgba(245,158,11,0.10)",
    border:"rgba(245,158,11,0.35)",
    icon:"⚠️",
    label:"MEDIA",
  },

  OK: {
    c:"#22c55e",
    bg:"rgba(34,197,94,0.10)",
    border:"rgba(34,197,94,0.35)",
    icon:"✅",
    label:"ÓPTIMO",
  },
}

const ALERTA = {
  VENCIDO:{
    c:"#ef4444",
    bg:"rgba(239,68,68,0.12)",
    border:"rgba(239,68,68,0.35)",
  },

  CRITICO:{
    c:"#f59e0b",
    bg:"rgba(245,158,11,0.12)",
    border:"rgba(245,158,11,0.35)",
  },

  PREVENTIVO:{
    c:"#38bdf8",
    bg:"rgba(56,189,248,0.12)",
    border:"rgba(56,189,248,0.35)",
  },
}

/* =========================================================
   COMPONENTES
========================================================= */

function Barra({
  pct,
  color,
}:{
  pct:number
  color:string
}){

  return(
    <div style={{
      flex:1,
      height:6,
      borderRadius:999,
      background:"rgba(255,255,255,0.06)",
      overflow:"hidden",
    }}>
      <div style={{
        width:`${pct}%`,
        height:"100%",
        background:color,
        borderRadius:999,
        transition:"0.4s",
      }}/>
    </div>
  )
}

/* =========================================================
   DASHBOARD
========================================================= */

export default function Dashboard(){

  const router = useRouter()

  const [loading,setLoading] = useState(true)

  const [alertas,setAlertas] = useState<any[]>([])
  const [resumen,setResumen] = useState<ResumenType[]>([])

  const [expandido,setExpandido] = useState<string | null>(null)

  const [modal,setModal] = useState(false)

  const [modo,setModo] = useState<ModalMode>("ABASTECER")

  const [itemSeleccionado,setItemSeleccionado] = useState<any>(null)

  const [cantidad,setCantidad] = useState("")
  const [lote,setLote] = useState("")
  const [fechaCaducidad,setFechaCaducidad] = useState("")

  const [guardando,setGuardando] = useState(false)

  /* ========================================================= */

  useEffect(()=>{
    init()
  },[])

  /* ========================================================= */

  async function init(){

    try{

      setLoading(true)

      await Promise.all([
        cargarAlertas(),
        calcularPrioridad(),
      ])

    }catch(error){
      console.error(error)
      alert("Error cargando dashboard")
    }
    finally{
      setLoading(false)
    }
  }

  /* ========================================================= */

  function getNombre(item:any){

    if(Array.isArray(item)){
      return item[0]?.nombre || "Item"
    }

    return item?.nombre || "Item"
  }

  /* ========================================================= */

  function agruparPorCategoria(lista:any[]){

    const grupos:Record<string,any[]> = {}

    lista.forEach(i=>{

      const cat = (i.categoria || "OTROS").toUpperCase()

      if(!grupos[cat]){
        grupos[cat] = []
      }

      grupos[cat].push(i)
    })

    return grupos
  }

  /* ========================================================= */

  async function cargarAlertas(){

    const { data,error } = await supabase
      .from("inventario_checklist")
      .select(`
        ambulancia_id,
        fecha_caducidad,
        inventario_items(nombre)
      `)
      .not("fecha_caducidad","is",null)

    if(error){
      console.error(error)
      return
    }

    const hoy = new Date()

    const procesado = (data || []).map((i:any)=>{

      const fecha = new Date(i.fecha_caducidad)

      const diff =
        (fecha.getTime() - hoy.getTime()) /
        (1000 * 60 * 60 * 24)

      let estado = "OK"

      if(diff <= 0){
        estado = "VENCIDO"
      }
      else if(diff <= 30){
        estado = "CRITICO"
      }
      else if(diff <= 90){
        estado = "PREVENTIVO"
      }

      return{
        ambulancia:i.ambulancia_id,
        nombre:getNombre(i.inventario_items),
        estado,
        dias:Math.round(diff),
      }
    })

    const filtrado =
      procesado.filter(i=>i.estado !== "OK")

    setAlertas(filtrado)
  }

  /* ========================================================= */

  async function calcularPrioridad(){

    const [
      { data:base },
      { data:checklist },
      { data:movimientos },
      { data:ambulancias },
    ] = await Promise.all([

      supabase
      .from("inventario_base")
      .select("item_id,nombre,cantidad_minima,categoria"),

      supabase
      .from("inventario_checklist")
      .select(`
        *,
        inventario_items(nombre,categoria)
      `)
      .neq("estado","RETIRADO"),

      supabase
      .from("inventario_movimientos")
      .select("*"),

      supabase
      .from("ambulancias")
      .select("id,codigo_operativo"),
    ])

    if(!base || !checklist || !movimientos || !ambulancias){
      return
    }

    const hoy = new Date()

    const resultado:ResumenType[] = ambulancias.map((a:any)=>{

      const stockMap:Record<string,number> = {}

      checklist
      .filter((i:any)=>
        String(i.ambulancia_id) === String(a.id)
      )
      .forEach((i:any)=>{

        const id = String(i.item_id)

        stockMap[id] =
          (stockMap[id] || 0) +
          Number(i.cantidad || 0)
      })

      movimientos
      .filter((m:any)=>
        String(m.ambulancia_id) === String(a.id)
      )
      .forEach((m:any)=>{

        const id = String(m.item_id)

        if(!stockMap[id]){
          stockMap[id] = 0
        }

        const cant = Number(m.cantidad || 0)

        if(m.tipo === "CONSUMO"){
          stockMap[id] -= cant
        }

        if(m.tipo === "INGRESO"){
          stockMap[id] += cant
        }

        if(stockMap[id] < 0){
          stockMap[id] = 0
        }
      })

      let faltantes = 0
      let criticos = 0
      let vencidos = 0

      let itemsOK = 0

      let totalMed = 0
      let okMed = 0

      let totalOtros = 0
      let okOtros = 0

      const faltantesDetalle:any[] = []
      const vencidosDetalle:any[] = []

      base.forEach((b:any)=>{

        const id = String(b.item_id)

        const actual =
          Number(stockMap[id] || 0)

        const minimo =
          Number(b.cantidad_minima || 0)

        const esMed =
          (b.categoria || "")
          .toLowerCase() === "medicamentos"

        if(esMed){

          totalMed++

          if(actual >= minimo){
            okMed++
          }

        }else{

          totalOtros++

          if(actual >= minimo){
            okOtros++
          }
        }

        if(actual >= minimo){

          itemsOK++

        }else{

          faltantes++

          faltantesDetalle.push({
            item_id:b.item_id,
            nombre:b.nombre,
            categoria:b.categoria,
            actual,
            minimo,
            estado:
              actual === 0
              ? "SIN STOCK"
              : "INCOMPLETO",
            ambulancia_id:a.id,
          })
        }
      })

      checklist
      .filter((i:any)=>
        String(i.ambulancia_id) === String(a.id)
      )
      .forEach((i:any)=>{

        if(!i.fecha_caducidad){
          return
        }

        const diff =
          (
            new Date(i.fecha_caducidad).getTime() -
            hoy.getTime()
          ) / (1000*60*60*24)

        if(diff <= 0){

          vencidos++

          vencidosDetalle.push(i)

        }else if(diff <= 30){

          criticos++
        }
      })

      let prioridad:"ALTA"|"MEDIA"|"OK" = "OK"

      if(vencidos > 0 || faltantes >= 5){
        prioridad = "ALTA"
      }
      else if(criticos > 0 || faltantes > 0){
        prioridad = "MEDIA"
      }

      const totalItems = base.length

      return{

        nombre:a.codigo_operativo,

        faltantes,
        criticos,
        vencidos,

        prioridad,

        faltantesDetalle,
        vencidosDetalle,

        porcentaje:
          totalItems > 0
          ? Math.round((itemsOK / totalItems) * 100)
          : 0,

        porcMed:
          totalMed > 0
          ? Math.round((okMed / totalMed) * 100)
          : 0,

        porcOtros:
          totalOtros > 0
          ? Math.round((okOtros / totalOtros) * 100)
          : 0,
      }
    })

    resultado.sort((a,b)=>
      a.nombre.localeCompare(
        b.nombre,
        undefined,
        { numeric:true }
      )
    )

    setResumen(resultado)
  }

  /* ========================================================= */

  function abrirModal(
    item:any,
    tipo:ModalMode
  ){

    setModo(tipo)

    setItemSeleccionado(item)

    setCantidad("")
    setLote("")
    setFechaCaducidad("")

    setModal(true)
  }

  /* ========================================================= */

  async function retirarItem(item:any){

    try{

      await supabase
      .from("inventario_checklist")
      .update({
        estado:"RETIRADO",
        cantidad:0,
      })
      .eq("id",item.id)

      await init()

    }catch(error){

      console.error(error)
      alert("Error retirando item")
    }
  }

  /* ========================================================= */

  async function guardar(){

    if(!itemSeleccionado){
      return
    }

    if(
      !cantidad ||
      Number(cantidad) <= 0
    ){
      alert("Cantidad inválida")
      return
    }

    try{

      setGuardando(true)

      if(modo === "CAMBIO"){
        await retirarItem(itemSeleccionado)
      }

      await supabase
      .from("inventario_checklist")
      .insert({

        ambulancia_id:
          itemSeleccionado.ambulancia_id,

        item_id:
          itemSeleccionado.item_id,

        cantidad:Number(cantidad),

        lote:
          lote.trim()
          ? lote
          : null,

        fecha_caducidad:
          fechaCaducidad.trim()
          ? fechaCaducidad
          : null,

        fecha_registro:
          new Date().toISOString(),

        estado:"ABASTECIMIENTO",
      })

      setModal(false)

      await init()

    }catch(error){

      console.error(error)
      alert("Error guardando")

    }finally{

      setGuardando(false)
    }
  }

  /* ========================================================= */

  function cerrarSesion(){

    localStorage.clear()

    router.replace("/")
  }

  /* ========================================================= */

  function irHistorial(){

    router.push("/inventario/historial")
  }

  /* ========================================================= */

  const totalFaltantes = useMemo(
    ()=> resumen.reduce((s,a)=>s+a.faltantes,0),
    [resumen]
  )

  const totalVencidos = useMemo(
    ()=> resumen.reduce((s,a)=>s+a.vencidos,0),
    [resumen]
  )

  const totalCriticos = useMemo(
    ()=> resumen.reduce((s,a)=>s+a.criticos,0),
    [resumen]
  )

  const ambsAlta = useMemo(
    ()=> resumen.filter(a=>a.prioridad==="ALTA").length,
    [resumen]
  )

  /* ========================================================= */

  if(loading){

    return(
      <div style={loadingStyle}>
        🚑 Cargando sistema EMS...
      </div>
    )
  }

  /* ========================================================= */

  return(

    <div style={container}>

      {/* Fondo */}
      <div style={bgDecor1}/>
      <div style={bgDecor2}/>

      {/* HEADER */}
      <div style={headerSticky}>

        <div style={headerRow}>

          <div style={{
            display:"flex",
            alignItems:"center",
            gap:12,
          }}>

            <div style={logoBox}>
              🚑
            </div>

            <div>
              <p style={title}>
                BITÁCORA SANITARIA
              </p>

              <p style={subtitle}>
                DIRECCIÓN PROVINCIAL DE SALUD DEL GUAYAS
              </p>
            </div>
          </div>

          <div style={headerButtons}>

            <button
              onClick={irHistorial}
              style={btnBlue}
            >
              📊 Historial
            </button>

            <button
              onClick={cerrarSesion}
              style={btnRed}
            >
              🔐 Salir
            </button>

          </div>
        </div>
      </div>

      {/* CONTENIDO */}
      <div style={content}>

        {/* KPIs */}
        <div style={sectionLabel}>
          ▸ RESUMEN GLOBAL
        </div>

        <div style={kpiGrid}>

          {[
            {
              label:"AMBULANCIAS CRÍTICAS",
              value:ambsAlta,
              color:"#ef4444",
            },

            {
              label:"ÍTEMS FALTANTES",
              value:totalFaltantes,
              color:"#f59e0b",
            },

            {
              label:"VENCIDOS",
              value:totalVencidos,
              color:"#fb7185",
            },

            {
              label:"ALERTAS ACTIVAS",
              value:alertas.length,
              color:"#a78bfa",
            },

          ].map(k=>(

            <div
              key={k.label}
              style={{
                ...kpiCard,
                border:`1px solid ${k.color}30`,
              }}
            >

              <p style={kpiLabel}>
                {k.label}
              </p>

              <h2 style={{
                margin:"6px 0 0",
                fontSize:28,
                color:k.color,
              }}>
                {k.value}
              </h2>
            </div>
          ))}
        </div>

        {/* ALERTAS */}
        {alertas.length > 0 && (

          <>
            <div style={sectionLabel}>
              ▸ ALERTAS DE CADUCIDAD
            </div>

            <div style={{
              display:"flex",
              flexDirection:"column",
              gap:8,
              marginBottom:20,
            }}>

              {alertas.map((al,i)=>{

                const ac =
                  ALERTA[
                    al.estado as keyof typeof ALERTA
                  ]

                return(

                  <div
                    key={i}
                    style={{
                      background:ac.bg,
                      border:`1px solid ${ac.border}`,
                      borderRadius:10,
                      padding:"10px 14px",
                    }}
                  >

                    <div style={{
                      display:"flex",
                      justifyContent:"space-between",
                      alignItems:"center",
                      gap:10,
                      flexWrap:"wrap",
                    }}>

                      <div>

                        <div style={{
                          fontWeight:700,
                          fontSize:13,
                        }}>
                          {al.nombre}
                        </div>

                        <div style={{
                          color:"#64748b",
                          fontSize:11,
                        }}>
                          {al.ambulancia}
                        </div>
                      </div>

                      <div style={{
                        display:"flex",
                        alignItems:"center",
                        gap:8,
                      }}>

                        <span style={{
                          color:ac.c,
                          fontSize:11,
                          fontWeight:800,
                        }}>
                          {al.estado}
                        </span>

                        <span style={{
                          color:ac.c,
                          fontSize:11,
                        }}>
                          {
                            al.dias <= 0
                            ? `${Math.abs(al.dias)}d vencido`
                            : `${al.dias}d`
                          }
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}

        {/* PRIORIDAD */}
        <div style={sectionLabel}>
          ▸ PRIORIDAD OPERATIVA
        </div>

        <div style={{
          display:"flex",
          flexDirection:"column",
          gap:12,
        }}>

          {resumen.map((a)=>{

            const pr =
              PRIORIDAD[a.prioridad]

            const isOpen =
              expandido === a.nombre

            const grupos =
              agruparPorCategoria(
                a.faltantesDetalle
              )

            return(

              <div
                key={a.nombre}
                style={{
                  background:"rgba(11,17,32,0.96)",
                  border:isOpen
                    ? `1px solid ${pr.border}`
                    : "1px solid rgba(255,255,255,0.07)",
                  borderLeft:`4px solid ${pr.c}`,
                  borderRadius:14,
                  overflow:"hidden",
                }}
              >

                {/* HEADER CARD */}
                <div
                  onClick={()=>
                    setExpandido(
                      isOpen
                      ? null
                      : a.nombre
                    )
                  }
                  style={cardHeader}
                >

                  <div style={{
                    display:"flex",
                    alignItems:"center",
                    gap:12,
                    flexWrap:"wrap",
                  }}>

                    <div style={{
                      width:10,
                      height:10,
                      borderRadius:"50%",
                      background:pr.c,
                    }}/>

                    <div style={{
                      fontWeight:900,
                      fontSize:15,
                    }}>
                      {a.nombre}
                    </div>

                    <div style={{
                      background:pr.bg,
                      border:`1px solid ${pr.border}`,
                      color:pr.c,
                      borderRadius:6,
                      padding:"4px 8px",
                      fontSize:10,
                      fontWeight:800,
                    }}>
                      {pr.icon} {pr.label}
                    </div>
                  </div>

                  <div style={{
                    display:"flex",
                    gap:6,
                    flexWrap:"wrap",
                  }}>

                    {a.faltantes > 0 && (
                      <span style={badgeOrange}>
                        ❌ {a.faltantes}
                      </span>
                    )}

                    {a.vencidos > 0 && (
                      <span style={badgeRed}>
                        🚨 {a.vencidos}
                      </span>
                    )}

                    {a.criticos > 0 && (
                      <span style={badgeYellow}>
                        ⚠ {a.criticos}
                      </span>
                    )}
                  </div>
                </div>

                {/* PROGRESOS */}
                <div style={{
                  padding:"0 16px 14px",
                  display:"flex",
                  flexDirection:"column",
                  gap:8,
                }}>

                  {[
                    {
                      l:"TOTAL",
                      v:a.porcentaje,
                      c:
                        a.porcentaje >= 80
                        ? "#22c55e"
                        : a.porcentaje >= 50
                        ? "#f59e0b"
                        : "#ef4444",
                    },

                    {
                      l:"MEDICAMENTOS",
                      v:a.porcMed,
                      c:"#a78bfa",
                    },

                    {
                      l:"INSUMOS",
                      v:a.porcOtros,
                      c:"#38bdf8",
                    },

                  ].map(b=>(

                    <div
                      key={b.l}
                      style={{
                        display:"flex",
                        alignItems:"center",
                        gap:10,
                      }}
                    >

                      <div style={{
                        width:100,
                        fontSize:10,
                        color:"#64748b",
                        fontWeight:700,
                      }}>
                        {b.l}
                      </div>

                      <Barra
                        pct={b.v}
                        color={b.c}
                      />

                      <div style={{
                        width:40,
                        textAlign:"right",
                        color:b.c,
                        fontSize:11,
                        fontWeight:800,
                      }}>
                        {b.v}%
                      </div>
                    </div>
                  ))}
                </div>

                {/* EXPANDIDO */}
                {isOpen && (

                  <div style={{
                    borderTop:"1px solid rgba(255,255,255,0.06)",
                    padding:16,
                    display:"flex",
                    flexDirection:"column",
                    gap:14,
                  }}>

                    {/* FALTANTES */}
                    {a.faltantesDetalle.length > 0 && (

                      <div style={boxOrange}>

                        <div style={boxTitleOrange}>
                          📦 REABASTECER
                        </div>

                        {Object.entries(grupos).map(([cat,items]:any)=>(

                          <div key={cat}>

                            <div style={catLabel}>
                              {cat}
                            </div>

                            {items.map((f:any,idx:number)=>(

                              <div
                                key={idx}
                                style={rowItem}
                              >

                                <div>

                                  <div style={itemName}>
                                    {f.nombre}
                                  </div>

                                  <div style={{
                                    color:
                                      f.estado === "SIN STOCK"
                                      ? "#ef4444"
                                      : "#f59e0b",

                                    fontSize:11,
                                    fontWeight:700,
                                  }}>
                                    {f.actual}/{f.minimo}
                                    {" · "}
                                    {f.estado}
                                  </div>
                                </div>

                                <button
                                  onClick={(e)=>{
                                    e.stopPropagation()
                                    abrirModal(f,"ABASTECER")
                                  }}
                                  style={btnGreen}
                                >
                                  ➕ Abastecer
                                </button>
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* VENCIDOS */}
                    {a.vencidosDetalle.length > 0 && (

                      <div style={boxRed}>

                        <div style={boxTitleRed}>
                          🚨 VENCIDOS
                        </div>

                        {a.vencidosDetalle.map((v:any,idx:number)=>(

                          <div
                            key={idx}
                            style={rowItem}
                          >

                            <div style={itemName}>
                              {
                                getNombre(
                                  v.inventario_items
                                )
                              }
                            </div>

                            <div style={{
                              display:"flex",
                              gap:6,
                              flexWrap:"wrap",
                            }}>

                              <button
                                onClick={(e)=>{
                                  e.stopPropagation()
                                  retirarItem(v)
                                }}
                                style={btnRed}
                              >
                                ❌ Retirar
                              </button>

                              <button
                                onClick={(e)=>{
                                  e.stopPropagation()
                                  abrirModal(v,"CAMBIO")
                                }}
                                style={btnBlue}
                              >
                                🔄 Cambio
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* MODAL */}
      {modal && (

        <div style={modalBg}>

          <div style={modalBox}>

            <div style={{
              fontWeight:900,
              fontSize:15,
              marginBottom:6,
            }}>
              {
                modo === "CAMBIO"
                ? "🔄 CAMBIO DE ÍTEM"
                : "📦 ABASTECER"
              }
            </div>

            <div style={{
              color:"#64748b",
              marginBottom:18,
              fontSize:12,
            }}>
              {itemSeleccionado?.nombre}
            </div>

            <input
              placeholder="Cantidad"
              value={cantidad}
              onChange={(e)=>
                setCantidad(e.target.value)
              }
              style={input}
            />

            <input
              placeholder="Lote"
              value={lote}
              onChange={(e)=>
                setLote(e.target.value)
              }
              style={input}
            />

            <input
              type="date"
              value={fechaCaducidad}
              onChange={(e)=>
                setFechaCaducidad(
                  e.target.value
                )
              }
              style={input}
            />

            <div style={{
              display:"flex",
              gap:10,
              marginTop:10,
            }}>

              <button
                disabled={guardando}
                onClick={guardar}
                style={{
                  ...btnGreen,
                  flex:1,
                  opacity:guardando ? 0.5 : 1,
                }}
              >
                {
                  guardando
                  ? "Guardando..."
                  : "💾 Guardar"
                }
              </button>

              <button
                onClick={()=>
                  setModal(false)
                }
                style={{
                  ...btnRed,
                  flex:1,
                }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* =========================================================
   ESTILOS
========================================================= */

const container:CSSProperties = {
  background:"#050b15",
  minHeight:"100vh",
  color:"white",
  fontFamily:"Inter, sans-serif",
  position:"relative",
}

const loadingStyle:CSSProperties = {
  minHeight:"100vh",
  background:"#050b15",
  color:"white",
  display:"flex",
  alignItems:"center",
  justifyContent:"center",
  fontSize:18,
  fontWeight:700,
}

const bgDecor1:CSSProperties = {
  position:"fixed",
  top:-100,
  right:-100,
  width:300,
  height:300,
  borderRadius:"50%",
  background:"rgba(56,189,248,0.06)",
  filter:"blur(80px)",
  pointerEvents:"none",
}

const bgDecor2:CSSProperties = {
  position:"fixed",
  bottom:-100,
  left:-100,
  width:300,
  height:300,
  borderRadius:"50%",
  background:"rgba(167,139,250,0.06)",
  filter:"blur(80px)",
  pointerEvents:"none",
}

const headerSticky:CSSProperties = {
  position:"sticky",
  top:0,
  zIndex:30,
  background:"rgba(5,11,21,0.92)",
  backdropFilter:"blur(14px)",
  borderBottom:"1px solid rgba(255,255,255,0.06)",
}

const headerRow:CSSProperties = {
  maxWidth:1400,
  margin:"0 auto",
  padding:"14px 18px",
  display:"flex",
  justifyContent:"space-between",
  alignItems:"center",
  gap:20,
  flexWrap:"wrap",
}

const logoBox:CSSProperties = {
  width:40,
  height:40,
  borderRadius:12,
  background:"linear-gradient(135deg,#0891b2,#155e75)",
  display:"flex",
  alignItems:"center",
  justifyContent:"center",
  fontSize:18,
}

const title:CSSProperties = {
  margin:0,
  fontWeight:900,
  letterSpacing:"0.04em",
}

const subtitle:CSSProperties = {
  margin:0,
  color:"#64748b",
  fontSize:11,
}

const headerButtons:CSSProperties = {
  display:"flex",
  gap:10,
  flexWrap:"wrap",
}

const content:CSSProperties = {
  maxWidth:1400,
  margin:"0 auto",
  padding:"18px",
}

const sectionLabel:CSSProperties = {
  color:"#64748b",
  fontSize:11,
  fontWeight:800,
  marginBottom:10,
  letterSpacing:"0.12em",
}

const kpiGrid:CSSProperties = {
  display:"grid",
  gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",
  gap:12,
  marginBottom:22,
}

const kpiCard:CSSProperties = {
  background:"linear-gradient(135deg,#0f172a,#111827)",
  borderRadius:16,
  padding:"18px",
}

const kpiLabel:CSSProperties = {
  margin:0,
  fontSize:11,
  color:"#64748b",
  fontWeight:700,
}

const cardHeader:CSSProperties = {
  padding:"16px",
  display:"flex",
  justifyContent:"space-between",
  alignItems:"center",
  gap:12,
  flexWrap:"wrap",
  cursor:"pointer",
}

const badgeOrange:CSSProperties = {
  background:"rgba(245,158,11,0.12)",
  border:"1px solid rgba(245,158,11,0.3)",
  color:"#f59e0b",
  borderRadius:999,
  padding:"4px 10px",
  fontSize:11,
  fontWeight:700,
}

const badgeRed:CSSProperties = {
  background:"rgba(239,68,68,0.12)",
  border:"1px solid rgba(239,68,68,0.3)",
  color:"#ef4444",
  borderRadius:999,
  padding:"4px 10px",
  fontSize:11,
  fontWeight:700,
}

const badgeYellow:CSSProperties = {
  background:"rgba(250,204,21,0.12)",
  border:"1px solid rgba(250,204,21,0.3)",
  color:"#facc15",
  borderRadius:999,
  padding:"4px 10px",
  fontSize:11,
  fontWeight:700,
}

const boxOrange:CSSProperties = {
  background:"rgba(245,158,11,0.05)",
  border:"1px solid rgba(245,158,11,0.15)",
  borderRadius:14,
  padding:14,
}

const boxRed:CSSProperties = {
  background:"rgba(239,68,68,0.05)",
  border:"1px solid rgba(239,68,68,0.15)",
  borderRadius:14,
  padding:14,
}

const boxTitleOrange:CSSProperties = {
  color:"#f59e0b",
  fontWeight:900,
  marginBottom:10,
  fontSize:12,
}

const boxTitleRed:CSSProperties = {
  color:"#ef4444",
  fontWeight:900,
  marginBottom:10,
  fontSize:12,
}

const catLabel:CSSProperties = {
  color:"#64748b",
  fontSize:11,
  fontWeight:800,
  marginBottom:8,
  marginTop:10,
}

const rowItem:CSSProperties = {
  display:"flex",
  justifyContent:"space-between",
  alignItems:"center",
  gap:12,
  flexWrap:"wrap",
  padding:"10px 0",
  borderBottom:"1px solid rgba(255,255,255,0.04)",
}

const itemName:CSSProperties = {
  fontSize:13,
  color:"#f1f5f9",
}

const btnBlue:CSSProperties = {
  background:"rgba(56,189,248,0.12)",
  border:"1px solid rgba(56,189,248,0.3)",
  color:"#38bdf8",
  padding:"8px 12px",
  borderRadius:8,
  fontWeight:700,
  cursor:"pointer",
}

const btnRed:CSSProperties = {
  background:"rgba(239,68,68,0.12)",
  border:"1px solid rgba(239,68,68,0.3)",
  color:"#ef4444",
  padding:"8px 12px",
  borderRadius:8,
  fontWeight:700,
  cursor:"pointer",
}

const btnGreen:CSSProperties = {
  background:"rgba(34,197,94,0.12)",
  border:"1px solid rgba(34,197,94,0.3)",
  color:"#22c55e",
  padding:"8px 12px",
  borderRadius:8,
  fontWeight:700,
  cursor:"pointer",
}

const modalBg:CSSProperties = {
  position:"fixed",
  inset:0,
  background:"rgba(0,0,0,0.85)",
  display:"flex",
  justifyContent:"center",
  alignItems:"center",
  padding:16,
  zIndex:999,
  backdropFilter:"blur(6px)",
}

const modalBox:CSSProperties = {
  width:"100%",
  maxWidth:400,
  background:"linear-gradient(135deg,#0f172a,#111827)",
  border:"1px solid rgba(56,189,248,0.15)",
  borderRadius:18,
  padding:20,
}

const input:CSSProperties = {
  width:"100%",
  boxSizing:"border-box",
  marginBottom:12,
  padding:"12px",
  borderRadius:10,
  border:"1px solid rgba(255,255,255,0.08)",
  background:"rgba(255,255,255,0.04)",
  color:"white",
  outline:"none",
}