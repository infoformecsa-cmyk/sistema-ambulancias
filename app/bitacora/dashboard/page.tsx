"use client"

import { useEffect, useState } from "react"
import type { CSSProperties } from "react"
import { supabase } from "@/lib/supabaseClient"
import { useRouter } from "next/navigation"

export default function Dashboard(){

const router = useRouter()

const [alertas,setAlertas] = useState<any[]>([])
const [resumen,setResumen] = useState<any[]>([])
const [expandido,setExpandido] = useState<string | null>(null)

const [modal,setModal] = useState(false)
const [itemSeleccionado,setItemSeleccionado] = useState<any>(null)
const [cantidad,setCantidad] = useState("")
const [lote,setLote] = useState("")
const [fechaCaducidad,setFechaCaducidad] = useState("")
const [modo,setModo] = useState<"ABASTECER" | "CAMBIO">("ABASTECER")

const [loading,setLoading] = useState(true)

useEffect(()=>{ init() },[])

async function init(){
setLoading(true)
await cargarAlertas()
await calcularPrioridad()
setLoading(false)
}

/* ========================= */

function agruparPorCategoria(lista:any[]){
const grupos:any = {}
lista.forEach(i=>{
const cat = (i.categoria || "OTROS").toUpperCase()
if(!grupos[cat]) grupos[cat] = []
grupos[cat].push(i)
})
return grupos
}

/* ========================= */

async function calcularPrioridad(){

const { data: base } = await supabase
.from("inventario_base")
.select("item_id,nombre,cantidad_minima,categoria")

const { data: checklist } = await supabase
.from("inventario_checklist")
.select(`*,inventario_items (nombre,categoria)`)

const { data: ambulancias } = await supabase
.from("ambulancias")
.select("id,codigo_operativo")

if(!base || !checklist || !ambulancias) return

const resultado = ambulancias.map(a=>{

const items = checklist.filter(i=> String(i.ambulancia_id) === String(a.id))

const mapa:any = {}

items.forEach(i=>{
if(!mapa[i.item_id]){
mapa[i.item_id] = i
}else{
const actual = new Date(mapa[i.item_id].created_at)
const nuevo = new Date(i.created_at)
if(nuevo > actual){
mapa[i.item_id] = i
}
}
})

const ultimo:any[] = Object.values(mapa)

let faltantes = 0
let faltantesDetalle:any[] = []

let totalItems = base.length
let itemsOK = 0

let totalMed = 0, okMed = 0
let totalOtros = 0, okOtros = 0

base.forEach(b=>{
const encontrado = ultimo.find((i:any)=> String(i.item_id) === String(b.item_id))
const actual = encontrado?.cantidad || 0

const cat = (b.categoria || "").toLowerCase()
const esMed = cat === "medicamentos"

if(esMed){
totalMed++
if(actual >= b.cantidad_minima) okMed++
}else{
totalOtros++
if(actual >= b.cantidad_minima) okOtros++
}

if(actual >= b.cantidad_minima){
itemsOK++
}

if(actual < b.cantidad_minima){
faltantes++
faltantesDetalle.push({
item_id: b.item_id,
nombre: b.nombre,
categoria: b.categoria,
actual,
minimo: b.cantidad_minima,
ambulancia_id: a.id
})
}
})

const porcentaje = Math.round((itemsOK / totalItems) * 100)
const porcMed = totalMed > 0 ? Math.round((okMed / totalMed) * 100) : 0
const porcOtros = totalOtros > 0 ? Math.round((okOtros / totalOtros) * 100) : 0

return {
nombre: a.codigo_operativo,
faltantes,
criticos:0,
vencidos:0,
prioridad:"OK",
faltantesDetalle,
vencidosDetalle:[],
porcentaje,
porcMed,
porcOtros
}

})

setResumen(resultado)
}

/* ========================= */

function abrirModal(item:any){
setItemSeleccionado(item)
setCantidad("")
setLote("")
setFechaCaducidad("")
setModal(true)
}

/* ========================= */

async function guardar(){

if(!itemSeleccionado) return

await supabase.from("inventario_checklist").insert({
ambulancia_id: itemSeleccionado.ambulancia_id,
item_id: itemSeleccionado.item_id,
cantidad: Number(cantidad || 0),
lote: lote?.trim() ? lote : null,
fecha_caducidad: fechaCaducidad?.trim() ? fechaCaducidad : null,
fecha_registro: new Date().toISOString(),
estado: "ABASTECIMIENTO"
})

setModal(false)
await init()
}

/* ========================= */

function toggle(nombre:string){
setExpandido(expandido === nombre ? null : nombre)
}

function irHistorial(){
router.push("/inventario/historial")
}

/* ========================= */

return(

<div style={container}>

{/* 🔥 NUEVO HEADER PROFESIONAL */}
<div style={{marginBottom:15}}>
<h1 style={{fontSize:22,fontWeight:"bold"}}>
🚑 BITACORA SANITARIA - SALUD MOVIL
</h1>
<p style={{fontSize:14,opacity:0.7}}>
DIRECCION PROVINCIAL DE SALUD DEL GUAYAS
</p>
</div>

<div style={header}>
<div>
<h1>🚑 CENTRO DE CONTROL EMS</h1>
<p style={{opacity:0.7}}>Prioridad + abastecimiento inteligente</p>
</div>

<div style={{display:"flex",gap:10}}>
<button onClick={irHistorial} style={btn}>📊 Historial</button>
</div>
</div>

{resumen.map((a,i)=>(

<div key={i} style={{
background:"#7f1d1d",
padding:15,
marginBottom:10,
borderRadius:10
}}>

<div>📊 Abastecimiento: {a.porcentaje}% / 100%</div>

{/* 🔥 NUEVO */}
<div>💊 Medicamentos: {a.porcMed}%</div>
<div>🧰 Insumos/equipos: {a.porcOtros}%</div>

<div style={{marginTop:10}}>

<strong>📦 Reabastecer:</strong>

{Object.entries(agruparPorCategoria(a.faltantesDetalle)).map(([cat,items]:any)=>(
<div key={cat}>

<div style={{marginTop:8,fontWeight:"bold",opacity:0.8}}>
{cat}
</div>

{items.map((f:any,idx:number)=>(

<div key={idx} style={{display:"flex",justifyContent:"space-between"}}>

<div>- {f.nombre} → {f.actual}/{f.minimo}</div>

<button onClick={()=>abrirModal(f)} style={btn}>
➕ Abastecer
</button>

</div>

))}

</div>
))}

</div>

</div>
))}

{modal && (
<div style={modalBg}>
<div style={modalBox}>
<input value={cantidad} onChange={e=>setCantidad(e.target.value)} style={inputModal}/>
<button onClick={guardar} style={btn}>Guardar</button>
</div>
</div>
)}

</div>
)
}

/* ========================= */

const container: CSSProperties = {
background:"#020617",
color:"white",
minHeight:"100vh",
padding:30
}

const header: CSSProperties = {
display:"flex",
justifyContent:"space-between",
marginBottom:20
}

const btn: CSSProperties = {
background:"#1f2937",
color:"white",
padding:"6px 10px",
borderRadius:6,
border:"none"
}

const modalBg: CSSProperties = {
position:"fixed",
top:0,left:0,width:"100%",height:"100%",
background:"rgba(0,0,0,0.6)",
display:"flex",
justifyContent:"center",
alignItems:"center"
}

const modalBox: CSSProperties = {
background:"#111827",
padding:20,
borderRadius:10,
width:300
}

const inputModal: CSSProperties = {
width:"100%",
padding:"10px",
background:"#1f2937",
color:"white"
}