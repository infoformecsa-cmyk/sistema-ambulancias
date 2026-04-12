"use client"

export const dynamic = "force-dynamic"

import { useEffect, useState } from "react"
import type { CSSProperties } from "react"
import { supabase } from "@/lib/supabaseClient"

const COLORES_KIT:any = {
celeste:"#8b5cf6",
azul:"#3b82f6",
rojo:"#ef4444",
amarillo:"#f59e0b"
}

const NOMBRES_KIT:any = {
celeste:"DISPOSITIVO MÉDICO OBSTÉTRICO",
azul:"KIT AZUL",
rojo:"KIT ROJO",
amarillo:"KIT AMARILLO"
}

const ORDEN = [
"lenceria","dispositivos","sondas","respiratorio",
"oxigeno","canalizacion","biomedicos","limpieza",
"curaciones","medicamentos","trauma","proteccion"
]

export default function ChecklistSimple(){

const [items,setItems] = useState<any[]>([])
const [kits,setKits] = useState<any[]>([])
const [ambulancias,setAmbulancias] = useState<any[]>([])

const [ambulancia,setAmbulancia] = useState("")
const [responsable,setResponsable] = useState("")

const [expandido,setExpandido] = useState<any>({})
const [datos,setDatos] = useState<any>({})
const [guardando,setGuardando] = useState(false)

const [modal,setModal] = useState(false)
const [itemSel,setItemSel] = useState<any>(null)
const [cantidadAb,setCantidadAb] = useState("")
const [lote,setLote] = useState("")
const [fecha,setFecha] = useState("")
const [origen,setOrigen] = useState("")

useEffect(()=>{ cargar() },[])

async function cargar(){

const {data} = await supabase.from("inventario_items").select("*")
const {data:amb} = await supabase.from("ambulancias").select("*")

const limpio = (data || []).map(i => ({
...i,
categoria: (i.categoria || "").toLowerCase().trim()
}))

setKits(limpio.filter(i=>i.subcategoria==="kit_parto"))
setItems(limpio.filter(i=>i.subcategoria!=="kit_parto"))

const ordenadas = (amb || []).sort((a,b)=>
a.codigo_operativo.localeCompare(b.codigo_operativo,undefined,{numeric:true})
)

setAmbulancias(ordenadas)
}

function toggle(k:string){
setExpandido((p:any)=>({...p,[k]:!p[k]}))
}

function actualizarCantidad(id:string,val:any){
setDatos({...datos,[id]:val})
}

function getMin(i:any){
return i.cantidad_minima>0 ? i.cantidad_minima : "-"
}

/* ========================= */
/* VALIDACIONES */
/* ========================= */

function validarFinal(){

if(!ambulancia){
alert("🚑 Seleccione ambulancia")
return false
}

if(!responsable.trim()){
alert("👤 Ingrese responsable")
return false
}

return true
}

/* ========================= */
/* GUARDAR BORRADOR */
/* ========================= */

async function guardarBorrador(){

if(!ambulancia || !responsable.trim()){
alert("⚠️ Complete ambulancia y responsable")
return
}

for(const itemId in datos){

const cantidad = Number(datos[itemId] || 0)

await supabase.from("inventario_checklist").insert({
ambulancia_id: ambulancia,
item_id: itemId,
cantidad,
estado:"BORRADOR",
fecha_registro: new Date().toISOString(),
responsable
})

}

alert("💾 Borrador guardado")
}

/* ========================= */
/* FINALIZAR */
/* ========================= */

async function finalizar(){

if(!validarFinal()) return

setGuardando(true)

for(const itemId in datos){

const cantidad = Number(datos[itemId] || 0)
if(cantidad <= 0) continue

await supabase.from("inventario_checklist").insert({
ambulancia_id: ambulancia,
item_id: itemId,
cantidad,
estado:"FINALIZADO",
fecha_registro: new Date().toISOString(),
responsable
})

}

setDatos({})
setAmbulancia("")
setResponsable("")

alert("✅ Checklist finalizado")

setGuardando(false)
}

/* ========================= */
/* ABASTECER */
/* ========================= */

function abrirModal(item:any){
if(!ambulancia){
alert("Seleccione ambulancia primero")
return
}
setItemSel(item)
setModal(true)
}

async function guardarAbastecimiento(){

if(!cantidadAb || !lote || !fecha || !origen){
alert("Complete todos los campos")
return
}

await supabase.from("inventario_checklist").insert({
ambulancia_id: ambulancia,
item_id: itemSel.id,
cantidad: Number(cantidadAb),
lote,
fecha_caducidad: fecha,
origen,
estado:"ABASTECIMIENTO",
tipo_movimiento:"ABASTECIMIENTO",
fecha_registro: new Date().toISOString(),
responsable
})

alert("✅ Abastecimiento registrado")

setModal(false)
setCantidadAb("")
setLote("")
setFecha("")
setOrigen("")
}

/* ========================= */
/* UI */
/* ========================= */

return(

<div style={container}>

<h1 style={title}>🚑 Checklist Operativo</h1>

<div style={formTop}>
<select value={ambulancia} onChange={e=>setAmbulancia(e.target.value)} style={input}>
<option value="">Ambulancia</option>
{ambulancias.map(a=>(
<option key={a.id} value={a.id}>{a.codigo_operativo}</option>
))}
</select>

<input
placeholder="Responsable"
value={responsable}
onChange={(e)=>setResponsable(e.target.value)}
style={input}
/>
</div>

<h2 style={section}>🧬 Kits Obstétricos</h2>

{["celeste","azul","amarillo","rojo"].map(color=>{

const grupo = kits.filter(k=>k.kit_color===color)
if(!grupo.length) return null

return(
<div key={color} style={cardKit(color)}>

<div style={catHeader} onClick={()=>toggle(color)}>
{NOMBRES_KIT[color]}
</div>

{expandido[color] && grupo.map(k=>(

<div key={k.id} style={item}>

<div style={rowTop}>
<span>{k.nombre}</span>
<span style={badge}>Min {getMin(k)}</span>
</div>

<input
type="number"
placeholder="Cantidad"
value={datos[k.id] || ""}
onChange={e=>actualizarCantidad(k.id,e.target.value)}
style={input}
/>

<button onClick={()=>abrirModal(k)} style={btnAdd}>
➕ Abastecer
</button>

</div>

))}

</div>
)

})}

<h2 style={section}>📦 Checklist General</h2>

{ORDEN.map(cat=>{

const grupo = items.filter(i=>i.categoria===cat)

return(
<div key={cat} style={card}>

<div style={catHeader} onClick={()=>toggle(cat)}>
{cat.toUpperCase()}
</div>

{expandido[cat] && grupo.map(i=>(

<div key={i.id} style={item}>

<div style={rowTop}>
<span>{i.nombre}</span>
<span style={badge}>Min {getMin(i)}</span>
</div>

<input
type="number"
placeholder="Cantidad"
value={datos[i.id] || ""}
onChange={e=>actualizarCantidad(i.id,e.target.value)}
style={input}
/>

<button onClick={()=>abrirModal(i)} style={btnAdd}>
➕ Abastecer
</button>

</div>

))}

</div>
)

})}

<div style={btnContainer}>
<button onClick={guardarBorrador} style={btnWarning}>
💾 Guardar borrador
</button>

<button onClick={finalizar} style={btnPrimary}>
{guardando ? "Guardando..." : "📤 Finalizar"}
</button>
</div>

{modal && (
<div style={modalBg}>
<div style={modalBox}>

<h3>➕ Abastecer</h3>
<p>{itemSel?.nombre}</p>

<input placeholder="Cantidad" value={cantidadAb} onChange={e=>setCantidadAb(e.target.value)} style={input}/>
<input placeholder="Lote" value={lote} onChange={e=>setLote(e.target.value)} style={input}/>
<input type="date" value={fecha} onChange={e=>setFecha(e.target.value)} style={input}/>

<select value={origen} onChange={e=>setOrigen(e.target.value)} style={input}>
<option value="">Origen</option>
<option value="BODEGA">Bodega</option>
<option value="HOSPITAL">Hospital</option>
<option value="DONACION">Donación</option>
</select>

<button onClick={guardarAbastecimiento} style={btnPrimary}>Guardar</button>
<button onClick={()=>setModal(false)} style={btnCancelar}>Cancelar</button>

</div>
</div>
)}

</div>
)
}

/* ========================= */
/* ESTILOS */
/* ========================= */

const container: CSSProperties = {background:"#020617",color:"white",minHeight:"100vh",padding:"15px",maxWidth:"900px",margin:"0 auto"}
const title: CSSProperties = {fontSize:20,marginBottom:10}
const section: CSSProperties = {marginTop:20,marginBottom:10,fontWeight:"bold"}
const formTop: CSSProperties = {display:"flex",flexDirection:"column",gap:10,marginBottom:20}
const input: CSSProperties = {padding:"12px",borderRadius:10,background:"#1f2937",color:"white",border:"none",width:"100%"}
const card: CSSProperties = {background:"#111827",borderRadius:10,marginBottom:10}
const cardKit = (c:any): CSSProperties => ({background:"#111827",borderRadius:10,marginBottom:10,borderLeft:`6px solid ${COLORES_KIT[c]}`})
const catHeader: CSSProperties = {background:"#1f2937",padding:12,cursor:"pointer"}
const item: CSSProperties = {padding:12,borderBottom:"1px solid #1f2937"}
const rowTop: CSSProperties = {display:"flex",justifyContent:"space-between"}
const badge: CSSProperties = {background:"#16a34a",padding:"2px 6px",borderRadius:5,fontSize:10}
const btnAdd: CSSProperties = {marginTop:8,background:"#3b82f6",padding:"10px",border:"none",borderRadius:8,color:"white",width:"100%"}
const btnContainer: CSSProperties = {display:"flex",flexDirection:"column",gap:10,marginTop:20}
const btnPrimary: CSSProperties = {background:"#22c55e",padding:"14px",border:"none",borderRadius:10}
const btnWarning: CSSProperties = {background:"#f59e0b",padding:"14px",border:"none",borderRadius:10}
const btnCancelar: CSSProperties = {background:"#ef4444",padding:"12px",border:"none",borderRadius:8,marginTop:5}
const modalBg: CSSProperties = {position:"fixed",top:0,left:0,width:"100%",height:"100%",background:"rgba(0,0,0,0.6)",display:"flex",justifyContent:"center",alignItems:"center"}
const modalBox: CSSProperties = {background:"#111827",padding:20,borderRadius:10,width:"90%",maxWidth:"400px"}