"use client"

export const dynamic = "force-dynamic"

import { useEffect, useState, useRef } from "react"
import type { CSSProperties } from "react"
import { supabase } from "@/lib/supabaseClient"

/* 🔥 SOLO CAMBIO AQUÍ */
const COLORES_KIT:any = {
celeste:"#8b5cf6",
azul:"#3b82f6",
rojo:"#ef4444",
amarillo:"#f59e0b"
}

const ORDEN = [
"lenceria","dispositivos","sondas","respiratorio",
"oxigeno","canalizacion","biomedicos","limpieza",
"curaciones","medicamentos","trauma","proteccion"
]

export default function Checklist(){

const [items,setItems] = useState<any[]>([])
const [kits,setKits] = useState<any[]>([])
const [ambulancias,setAmbulancias] = useState<any[]>([])

const [ambulancia,setAmbulancia] = useState("")
const [responsable,setResponsable] = useState("")

const [expandido,setExpandido] = useState<any>({})
const [datos,setDatos] = useState<any>({})
const [guardando,setGuardando] = useState(false)

const refAmbulancia = useRef<any>(null)
const refResponsable = useRef<any>(null)

/* ========================= */

useEffect(()=>{ cargar() },[])

useEffect(()=>{
if(ambulancia){ cargarBorrador() }
},[ambulancia])

async function cargar(){

const {data} = await supabase.from("inventario_items").select("*")
const {data:amb} = await supabase.from("ambulancias").select("*")

const limpio = (data || []).map(i => ({
...i,
categoria: (i.categoria || "").toLowerCase().trim()
}))

setItems(limpio.filter(i=>i.subcategoria!=="kit_parto"))
setKits(limpio.filter(i=>i.subcategoria==="kit_parto"))

const ordenadas = (amb || []).sort((a,b)=>
a.codigo_operativo.localeCompare(b.codigo_operativo,undefined,{numeric:true})
)

setAmbulancias(ordenadas)
}

/* 🔥 SOLO SE AÑADE ESTA LÍNEA */
async function cargarBorrador(){

const { data } = await supabase
.from("inventario_checklist")
.select("*")
.eq("ambulancia_id", ambulancia)
.eq("estado","BORRADOR")

if(!data || data.length === 0) return

const reconstruido:any = {}

data.forEach((d:any)=>{
if(!reconstruido[d.item_id]){
reconstruido[d.item_id] = []
}
reconstruido[d.item_id].push({
lote: d.lote,
cantidad: d.cantidad,
fecha: d.fecha_caducidad
})
})

setResponsable(data[0]?.responsable || "") // 🔥 NUEVO (no rompe nada)

setDatos(reconstruido)
}

/* ========================= */

function toggle(k:string){
setExpandido((p:any)=>({...p,[k]:!p[k]}))
}

function agregarLote(id:string){
const actual = datos[id] || []
setDatos({...datos,[id]:[...actual,{lote:"",cantidad:"",fecha:""}]})
}

function actualizar(id:string,i:number,campo:string,val:any){
const copia = [...(datos[id]||[])]
if(!copia[i]) copia[i] = {}
copia[i][campo]=val
setDatos({...datos,[id]:copia})
}

function getMin(i:any){
return i.cantidad_minima>0 ? i.cantidad_minima : "-"
}

/* ========================= */

function validarAntesFinalizar(){

if(!ambulancia){
alert("🚑 Debe seleccionar una ambulancia")
refAmbulancia.current?.focus()
return false
}

if(!responsable || responsable.trim() === ""){
alert("👤 Debe ingresar responsable")
refResponsable.current?.focus()
return false
}

return true
}

/* ========================= */
/* 🔥 SOLO ESTA FUNCIÓN CAMBIA */
/* ========================= */

async function guardar(tipo:"BORRADOR"|"FINALIZADO"){

if(tipo === "FINALIZADO"){
if(!validarAntesFinalizar()) return
}

setGuardando(true)

try{

/* 🔍 BUSCAR BORRADOR */
const { data: existente } = await supabase
.from("inventario_checklist")
.select("checklist_id")
.eq("ambulancia_id", ambulancia)
.eq("estado","BORRADOR")
.limit(1)

let checklistId = existente?.[0]?.checklist_id

/* 🧠 CREAR O REUTILIZAR */
if(!checklistId){
checklistId = crypto.randomUUID()
}else{
await supabase
.from("inventario_checklist")
.delete()
.eq("checklist_id", checklistId)
}

/* 💾 INSERTAR */
for(const itemId in datos){

const item = items.find(i=>i.id === itemId) || kits.find(k=>k.id === itemId)
const lotes = datos[itemId]

for(const l of lotes){

if(!l) continue

const cantidadNum = Number(l.cantidad || 0)
if(cantidadNum <= 0) continue

await supabase.from("inventario_checklist").insert({
checklist_id: checklistId,
ambulancia_id: ambulancia,
item_id: itemId,
nombre: item?.nombre,
lote: l.lote || null,
cantidad: cantidadNum,
fecha_caducidad: l.fecha || null,
fecha_registro: new Date().toISOString(),
responsable,
estado: tipo
})

}

}

/* 🔥 FINALIZAR SIN DUPLICAR */
if(tipo === "FINALIZADO"){
await supabase
.from("inventario_checklist")
.update({ estado:"FINALIZADO" })
.eq("checklist_id", checklistId)
}

alert(tipo === "FINALIZADO"
? "✅ Checklist FINALIZADO"
: "💾 Borrador guardado")

}catch(e){
console.error(e)
alert("❌ Error")
}

setGuardando(false)
}

/* ========================= */
/* TODO TU UI ORIGINAL SIN CAMBIOS */
/* ========================= */

return(

<div style={container}>

<div style={header}>

<h1 style={{fontSize:20}}>🚑 Checklist Clínico</h1>

<div style={panel}>

<select
ref={refAmbulancia}
value={ambulancia}
onChange={(e)=>setAmbulancia(e.target.value)}
style={input}
>
<option value="">Ambulancia</option>
{ambulancias.map(a=>(
<option key={a.id} value={a.id}>{a.codigo_operativo}</option>
))}
</select>

<input
ref={refResponsable}
placeholder="Responsable"
value={responsable}
onChange={(e)=>setResponsable(e.target.value)}
style={input}
/>

</div>
</div>

<h2 style={section}>🧬 Kits Obstétricos</h2>

<div style={grid}>
{["celeste","azul","amarillo","rojo"].map(color=>{

const grupo = kits.filter(k=>k.kit_color===color)
if(!grupo.length) return null

return(
<div key={color} style={cardKit(color)}>

<div onClick={()=>toggle(color)} style={catHeader}>
{color === "celeste" ? "DISPOSITIVO MÉDICO OBSTÉTRICO" : `KIT ${color.toUpperCase()}`}
</div>

{expandido[color] && grupo.map(k=>(

<div key={k.id} style={item}>

<div style={rowTop}>
<span>{k.nombre}</span>
<span style={badge}>Min {getMin(k)}</span>
</div>

<button style={btnAdd} onClick={()=>agregarLote(k.id)}>+ Lote</button>

{(datos[k.id]||[]).map((l:any,i:number)=>(

<div key={i} style={inputsRow}>
<input style={inputFull} placeholder="Lote" value={l.lote || ""}
onChange={e=>actualizar(k.id,i,"lote",e.target.value)}/>

<input style={inputFull} type="number" placeholder="Cantidad" value={l.cantidad || ""}
onChange={e=>actualizar(k.id,i,"cantidad",e.target.value)}/>

<input style={inputFull} type="date"
value={l.fecha || ""}
onChange={e=>actualizar(k.id,i,"fecha",e.target.value)}/>
</div>

))}

</div>

))}

</div>
)

})}
</div>

<h2 style={section}>📦 Checklist General</h2>

{ORDEN.map(cat=>{

const grupo = items.filter(i => i.categoria === cat)

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

<button style={btnAdd} onClick={()=>agregarLote(i.id)}>+ Lote</button>

{(datos[i.id]||[]).map((l:any,index:number)=>(

<div key={index} style={inputsRow}>
<input style={inputFull} placeholder="Lote" value={l.lote || ""}
onChange={e=>actualizar(i.id,index,"lote",e.target.value)}/>

<input style={inputFull} type="number" placeholder="Cantidad" value={l.cantidad || ""}
onChange={e=>actualizar(i.id,index,"cantidad",e.target.value)}/>

<input style={inputFull} type="date"
value={l.fecha || ""}
onChange={e=>actualizar(i.id,index,"fecha",e.target.value)}/>
</div>

))}

</div>

))}

</div>
)

})}

<div style={btnContainer}>
<button onClick={()=>guardar("BORRADOR")} style={btnWarning}>
💾 Borrador
</button>

<button onClick={()=>guardar("FINALIZADO")} style={btnPrimary}>
{guardando ? "Guardando..." : "Finalizar"}
</button>
</div>

</div>
)
}

/* ========================= */
/* ESTILOS (SIN CAMBIOS) */
/* ========================= */