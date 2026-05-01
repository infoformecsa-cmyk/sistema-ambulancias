"use client"

import { useEffect, useState } from "react"
import type { CSSProperties } from "react"
import { supabase } from "@/lib/supabaseClient"
import { useRouter } from "next/navigation"

/* 🎨 MAPA VISUAL DE GRUPOS CONSOLA */
const GRUPOS_COLORES:any = {
  G1: { nombre:"GRUPO VERDE", color:"#22c55e" },
  G2: { nombre:"GRUPO MORADO", color:"#a855f7" },
  G3: { nombre:"GRUPO AMARILLO", color:"#eab308" },
  G4: { nombre:"GRUPO ROSA", color:"#ec4899" },
  G5: { nombre:"GRUPO AZUL", color:"#3b82f6" }
}

export default function Asistencia(){

  const router = useRouter()

  const [personal,setPersonal] = useState<any[]>([])
  const [agrupado,setAgrupado] = useState<any>({})
  const [ambulancias,setAmbulancias] = useState<any[]>([])

  const [tipo,setTipo] = useState("ambulancia")
  const [guardia,setGuardia] = useState("G1")
  const [turnoGlobal,setTurnoGlobal] = useState("24h")
  const [fecha,setFecha] = useState(new Date().toISOString().slice(0,10))

  const [registros,setRegistros] = useState<any>({})
  const [verExcel, setVerExcel] = useState(false)
  const [excelUrl, setExcelUrl] = useState("")

  useEffect(()=>{
    cargar()
  },[tipo,guardia])

  async function cargar(){

    const {data} = await supabase
      .from("personal")
      .select("*")
      .eq("tipo",tipo)
      .eq("guardia",guardia)

    setPersonal(data || [])

    const {data:amb} = await supabase
      .from("ambulancias")
      .select("id, codigo_operativo")

    setAmbulancias(amb || [])

    /* 🔥 FIX: AGRUPACIÓN CORRECTA */
    const grupo:any = {}

    ;(data || []).forEach((p:any)=>{

      let key = "SIN ASIGNAR"

      if(tipo === "consola"){
        key = GRUPOS_COLORES[p.guardia]?.nombre || "CONSOLA"
      }else{
        /* 🔥 CORRECCIÓN AQUÍ */
        key = p.ambulancia_codigo || "SIN ASIGNAR"
      }

      if(!grupo[key]) grupo[key] = []
      grupo[key].push(p)

    })

    setAgrupado(grupo)
    // 🔥 OBTENER ÚLTIMO EXCEL SUBIDO (DINÁMICO)
    const { data: listaArchivos, error: errorLista } = await supabase.storage
      .from("excel_turnos")
      .list("", {
        limit: 1,
        offset: 0,
        sortBy: { column: "created_at", order: "desc" }
      })

    if(errorLista){
      console.error("Error listando archivos:", errorLista)
    }else if(listaArchivos && listaArchivos.length > 0){

      const nombreArchivo = listaArchivos[0].name

      const { data: urlData } = supabase.storage
        .from("excel_turnos")
        .getPublicUrl(nombreArchivo)

      if(urlData?.publicUrl){
        setExcelUrl(urlData.publicUrl)
      }

    }
  }

  /* ========================= */
  /* 🔥 GUARDAR CON ARCHIVOS Y VALIDACIÓN DE DUPLICADOS */
  /* ========================= */

  async function guardar(){

    // 🔥 VALIDACIÓN: Verificar que hay registros
    const personasConRegistro = personal.filter(p => registros[p.id])

    if(personasConRegistro.length === 0){
      alert("⚠️ Debes seleccionar estado para al menos una persona")
      return
    }

    // 🔥 VALIDACIÓN: Verificar que todas tengan estado
    for(const p of personasConRegistro){
      const r = registros[p.id]
      if(!r.estado){
        alert(`❌ Falta estado en ${p.nombre}`)
        return
      }
    }

    const usuario = localStorage.getItem("email") || "admin"
    const errores: string[] = []
    let exitosos = 0

    for(const p of personasConRegistro){
      try {

        const r = registros[p.id]
        const turnoFinal = r.turno || turnoGlobal

        let horas = 0
        if(turnoFinal === "24h") horas = 24
        if(turnoFinal === "guardia_16h") horas = 16
        if(turnoFinal === "12h_dia") horas = 12
        if(turnoFinal === "12h_noche") horas = 12

        let archivo_url = null
        let archivo_nombre = null
        let archivo_tipo = null

        if(r.archivo){

          const file = r.archivo

          if(!file.type.includes("pdf") && !file.type.includes("image")){
            errores.push(`${p.nombre}: Solo se permiten PDF o imágenes`)
            continue
          }

          const nombreArchivo = `${p.id}_${Date.now()}_${file.name}`

          const { error: uploadError } = await supabase.storage
            .from("asistencia_docs")
            .upload(nombreArchivo, file)

          if(uploadError){
            console.error("Error upload:", uploadError)
            errores.push(`${p.nombre}: Error al subir archivo`)
            continue
          }

          const { data: urlData } = supabase.storage
            .from("asistencia_docs")
            .getPublicUrl(nombreArchivo)

          archivo_url = urlData.publicUrl
          archivo_nombre = file.name
          archivo_tipo = file.type
        }

        // 🔥 VERIFICACIÓN DE DUPLICADO: Buscar si ya existe registro para esta persona, fecha y turno
        const { data: existente } = await supabase
          .from("asistencia")
          .select("id, archivo_url, archivo_nombre, tipo_archivo, size_archivo")
          .eq("personal_id", p.id)
          .eq("fecha", fecha)
          .eq("turno", turnoFinal)
          .single()

        let error

        if(existente){
          // Si existe, actualiza el registro existente
          const { error: updateError } = await supabase
            .from("asistencia")
            .update({
              estado: r.estado,
              observacion: r.obs || "",
              usuario_registro: usuario,
              ubicacion_ambulancia: r.ubicacion || null,
              tipo_permiso: r.estado === "permiso" ? "permiso" : null,
              es_r2: r.es_r2 || false,
              origen_r2: r.ubicacion || null,
              horas,
              archivo_url: archivo_url || existente.archivo_url,  // Solo actualiza si hay nuevo archivo
              archivo_nombre: archivo_nombre || existente.archivo_nombre,
              tipo_archivo: archivo_tipo || existente.tipo_archivo,
              size_archivo: r.archivo?.size || existente.size_archivo
            })
            .eq("id", existente.id)

          error = updateError
        }else{
          // Si no existe, inserta nuevo
          const { error: insertError } = await supabase.from("asistencia").insert([{
            personal_id: p.id,
            fecha,
            estado: r.estado,
            observacion: r.obs || "",
            usuario_registro: usuario,
            ubicacion_ambulancia: r.ubicacion || null,
            tipo_permiso: r.estado === "permiso" ? "permiso" : null,
            es_r2: r.es_r2 || false,
            origen_r2: r.ubicacion || null,
            turno: turnoFinal,
            horas,
            archivo_url,
            archivo_nombre,
            tipo_archivo: archivo_tipo,
            size_archivo: r.archivo?.size || null
          }])

          error = insertError
        }

        if(error){
          console.error("Error:", error)
          errores.push(`${p.nombre}: ${error.message}`)
          continue
        }

        exitosos++

      } catch(err: any){
        console.error("Error general:", err)
        errores.push(`${p.nombre}: ${err.message}`)
      }
    }

    // 🔥 MOSTRAR RESULTADOS
    if(exitosos > 0){
      alert(`✅ ${exitosos} registro(s) guardado(s) o actualizado(s)`)
      setRegistros({})
    }

    if(errores.length > 0){
      alert(`❌ ${errores.length} error(es):\n${errores.join("\n")}`)
    }
  }

  /* ========================= */

  return(

    <div style={container}>

      <h1>👥 Control de Asistencia</h1>

      <h3 style={{opacity:0.7}}>
        Guardia: {guardia} | Turno: {turnoGlobal}
      </h3>

      <div style={filtros}>

        <select value={tipo} onChange={(e)=>setTipo(e.target.value)} style={input}>
          <option value="ambulancia">Ambulancias</option>
          <option value="consola">Consola</option>
        </select>

        <select value={guardia} onChange={(e)=>setGuardia(e.target.value)} style={input}>
          <option value="G1">Guardia 1</option>
          <option value="G2">Guardia 2</option>
          <option value="G3">Guardia 3</option>
          <option value="G4">Guardia 4</option>
          <option value="G5">Guardia 5</option>
        </select>

        <select value={turnoGlobal} onChange={(e)=>setTurnoGlobal(e.target.value)} style={input}>
          <option value="24h">24h</option>
          <option value="guardia_16h">16h</option>
          <option value="12h_dia">12 Día</option>
          <option value="12h_noche">12 Noche</option>
        </select>

        <input
          type="date"
          value={fecha}
          onChange={(e)=>setFecha(e.target.value)}
          style={input}
        />

        <button onClick={()=>router.push("/supervisor")} style={btn}>
          ⬅ Volver
        </button>
        <button onClick={()=>setVerExcel(true)} style={btn}>
          📊 Control mensual
        </button>

      </div>

      {Object.keys(agrupado).sort().map(grupoNombre=>{

        let colorGrupo = "#38bdf8"

        for(const key in GRUPOS_COLORES){
          if(GRUPOS_COLORES[key].nombre === grupoNombre){
            colorGrupo = GRUPOS_COLORES[key].color
          }
        }

        return(
          <div key={grupoNombre}>

            <h2 style={{
              color:colorGrupo,
              display:"flex",
              alignItems:"center",
              gap:10
            }}>
              {tipo === "consola" ? "💻" : "🚑"} {grupoNombre}
            </h2>

            {agrupado[grupoNombre].map((p:any)=>{

              const estado = registros[p.id]?.estado

              return(
                <div key={p.id} style={card}>

                  <div style={{display:"flex",justifyContent:"space-between"}}>

                    <h3>{p.nombre}</h3>

                    <select
                      onChange={(e)=>setRegistros({
                        ...registros,
                        [p.id]: {...registros[p.id], ubicacion:e.target.value}
                      })}
                      style={inputMini}
                    >
                      <option value="">Ubicación</option>
                      <option value="CONSOLA">CONSOLA</option>

                      {ambulancias.map(a=>(
                        <option key={a.id} value={a.codigo_operativo}>
                          {a.codigo_operativo}
                        </option>
                      ))}

                    </select>

                  </div>

                  <div style={estadoContainer}>

                    {["asistio","atraso","falta","permiso","vacaciones"].map(s=>(
                      <button
                        key={s}
                        onClick={()=>setRegistros({
                          ...registros,
                          [p.id]: {...registros[p.id], estado:s}
                        })}
                        style={{
                          ...estadoBtn,
                          background: estado === s ? colores[s] : "#1f2937"
                        }}
                      >
                        {s.toUpperCase()}
                      </button>
                    ))}

                    <label style={{fontSize:12}}>
                      <input
                        type="checkbox"
                        checked={registros[p.id]?.es_r2 || false}
                        onChange={(e)=>setRegistros({
                          ...registros,
                          [p.id]: {...registros[p.id], es_r2:e.target.checked}
                        })}
                      />
                      R2
                    </label>

                    <span style={{fontSize:12,opacity:0.7}}>Turno:</span>

                    <select
                      onChange={(e)=>setRegistros({
                        ...registros,
                        [p.id]: {...registros[p.id], turno:e.target.value}
                      })}
                      style={inputMini}
                    >
                      <option value="">Seleccionar</option>
                      <option value="24h">24h</option>
                      <option value="guardia_16h">16h</option>
                      <option value="12h_dia">12 Día</option>
                      <option value="12h_noche">12 Noche</option>
                    </select>

                  </div>

                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={(e)=>{
                      const file = e.target.files?.[0]
                      setRegistros({
                        ...registros,
                        [p.id]: {...registros[p.id], archivo:file}
                      })
                    }}
                    style={input}
                  />

                  <input
                    placeholder="Observación"
                    onChange={(e)=>setRegistros({
                      ...registros,
                      [p.id]: {...registros[p.id], obs:e.target.value}
                    })}
                    style={input}
                  />

                </div>
              )
            })}

          </div>
        )
      })}

      <button onClick={guardar} style={btnGuardar}>
        💾 Guardar Asistencia
      </button>
      {/* 🔥 MODAL CONTROL ASISTENCIA MENSUAL */}
      {verExcel && (
      <div style={{
        position:"fixed",
        top:0,
        left:0,
        width:"100%",
        height:"100%",
        background:"rgba(0,0,0,0.8)",
        display:"flex",
        justifyContent:"center",
        alignItems:"center",
        zIndex:999
        }}>
    
        <div style={{
          background:"#0f172a",
          padding:30,
          borderRadius:12,
          width:400,
          textAlign:"center"
          }}>

          <h2 style={{marginBottom:10}}>
          📊 Control de Asistencia Mensual
          </h2>

          <p style={{marginBottom:10, fontSize:12, opacity:0.6}}>
          Uso exclusivo para validación de turnos y vacaciones
          </p>

          <p style={{marginBottom:20}}>
          Archivo oficial de programación mensual: turnos (12h / 24h) y vacaciones del personal
          </p>

          {excelUrl ? (
            <a 
              href={excelUrl}
              target="_blank"
              style={{
                display:"inline-block",
                background:"#22c55e",
                padding:"10px 15px",
                borderRadius:8,
                color:"white",
                textDecoration:"none",
                marginBottom:20
              }}
            >
              ⬇ Descargar programación mensual
            </a>
          ) : (
            <p style={{color:"gray"}}>No hay archivo cargado</p>
         )}

            <div>
              <button 
                onClick={()=>setVerExcel(false)} 
                style={{
                  background:"#ef4444",
                  padding:"8px 15px",
                  borderRadius:8,
                  color:"white",
                  border:"none"
                }}
              >
                Cerrar
              </button>
            </div>

        </div>
     </div>
    )}

    </div>
  )
}

/* 🎨 ESTILOS (INTACTOS) */

const colores:any = {
  asistio:"#22c55e",
  atraso:"#eab308",
  falta:"#ef4444",
  permiso:"#3b82f6",
  vacaciones:"#a855f7"
}

const container: CSSProperties = {
  background:"#020617",
  color:"white",
  minHeight:"100vh",
  padding:30
}

const filtros: CSSProperties = {
  display:"flex",
  gap:10,
  marginBottom:20,
  flexWrap:"wrap"
}

const card: CSSProperties = {
  background:"#0f172a",
  padding:15,
  borderRadius:12,
  marginBottom:10,
  border:"1px solid #1e293b"
}

const estadoContainer: CSSProperties = {
  display:"flex",
  gap:8,
  marginTop:10,
  flexWrap:"wrap",
  alignItems:"center"
}

const estadoBtn: CSSProperties = {
  padding:"6px 10px",
  borderRadius:8,
  border:"none",
  color:"white",
  cursor:"pointer",
  fontSize:12
}

const input: CSSProperties = {
  padding:10,
  borderRadius:8,
  background:"#1f2937",
  color:"white",
  border:"none",
  marginTop:10
}

const inputMini: CSSProperties = {
  padding:6,
  borderRadius:6,
  background:"#1f2937",
  color:"white",
  border:"none"
}

const btn: CSSProperties = {
  background:"#2563eb",
  color:"white",
  padding:"10px 15px",
  borderRadius:8,
  border:"none"
}

const btnGuardar: CSSProperties = {
  marginTop:20,
  width:"100%",
  background:"#22c55e",
  padding:18,
  borderRadius:12,
  fontWeight:"bold",
  fontSize:16,
  border:"none"
}