"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { useRouter } from "next/navigation"

export default function DashboardInventario(){

const router = useRouter()

const [data,setData] = useState<any[]>([])
const [loading,setLoading] = useState(true)

const [editando,setEditando] = useState<string | null>(null)
const [editData,setEditData] = useState<any>({})

/* ========================= */
useEffect(()=>{
cargar()
},[])

/* ========================= */
async function cargar(){

const { data, error } = await supabase
.from("inventario_checklist")
.select(`
id,
cantidad,
tiene,
fecha_caducidad,
inventario_items(nombre,cantidad_base),
ambulancias(codigo_operativo)
`)
.order("created_at",{ascending:false})

if(error){
console.error(error)
setLoading(false)
return
}

setData(data || [])
setLoading(false)
}

/* ========================= */
/* 🔥 ELIMINAR */
/* ========================= */
async function eliminar(id:string){

const ok = confirm("¿Eliminar registro?")

if(!ok) return

await supabase
.from("inventario_checklist")
.delete()
.eq("id",id)

cargar()
}

/* ========================= */
/* ✏️ EDITAR */
/* ========================= */
async function guardarEdicion(id:string){

await supabase
.from("inventario_checklist")
.update({
cantidad: editData.cantidad,
tiene: editData.tiene,
fecha_caducidad: editData.fecha_caducidad
})
.eq("id",id)

setEditando(null)
cargar()
}

/* ========================= */
/* 🔐 CERRAR SESIÓN */
/* ========================= */
function cerrarSesion(){

localStorage.clear()
router.push("/")

}

/* ========================= */
/* PROCESAMIENTO */
/* ========================= */

const hoy = new Date()

let vencidos = 0
let proximos = 0
let faltantes = 0

const porAmbulancia: Record<string, number> = {}

data.forEach((r:any)=>{

const base = r.inventario_items?.cantidad_base || 0
const amb = r.ambulancias?.codigo_operativo || "Sin código"

if(!r.tiene || r.cantidad < base){
faltantes++
porAmbulancia[amb] = (porAmbulancia[amb] || 0) + 1
}

if(r.fecha_caducidad){
const diff = (new Date(r.fecha_caducidad).getTime() - hoy.getTime())/(1000*60*60*24)

if(diff <= 0){
vencidos++
porAmbulancia[amb] = (porAmbulancia[amb] || 0) + 1
}
else if(diff <= 30){
proximos++
}
}

})

const ranking = Object.entries(porAmbulancia)
.sort((a,b)=>b[1]-a[1])
.slice(0,5)

const total = data.length || 1
const salud = Math.max(0, 100 - Math.round((faltantes + vencidos)/total*100))

/* ========================= */
/* UI */
/* ========================= */

return(

<div style={{padding:30,fontFamily:"Arial"}}>

<h1>📊 Dashboard Gerencial de Inventario</h1>

<p><b>Panel operativo de control</b></p>

<button onClick={cerrarSesion} style={btnLogout}>
Cerrar sesión
</button>

<hr/>

{loading && <p>Cargando...</p>}

{/* KPI */}
<div style={{display:"flex",gap:20,flexWrap:"wrap"}}>

<div style={card}>
<h3>Estado general</h3>
<h1 style={{color:salud>80?"#16a34a":salud>50?"#f59e0b":"#dc2626"}}>
{salud}%
</h1>
</div>

<div style={card}>
<h3>🔴 Vencidos</h3>
<h2>{vencidos}</h2>
</div>

<div style={card}>
<h3>🟡 Próximos</h3>
<h2>{proximos}</h2>
</div>

<div style={card}>
<h3>⚠️ Faltantes</h3>
<h2>{faltantes}</h2>
</div>

</div>

<hr/>

{/* TABLA EDITABLE */}
<h2>📋 Registros</h2>

<table style={{width:"100%",borderCollapse:"collapse"}}>

<thead style={{background:"#111827",color:"white"}}>
<tr>
<th style={th}>Ambulancia</th>
<th style={th}>Item</th>
<th style={th}>Cantidad</th>
<th style={th}>Tiene</th>
<th style={th}>Caducidad</th>
<th style={th}>Acciones</th>
</tr>
</thead>

<tbody>

{data.map(r=>(

<tr key={r.id} style={{borderBottom:"1px solid #ddd"}}>

<td style={td}>{r.ambulancias?.codigo_operativo}</td>

<td style={td}>{r.inventario_items?.nombre}</td>

<td style={td}>
{editando===r.id
? <input type="number" value={editData.cantidad} onChange={(e)=>setEditData({...editData,cantidad:e.target.value})}/>
: r.cantidad}
</td>

<td style={td}>
{editando===r.id
? <input type="checkbox" checked={editData.tiene} onChange={(e)=>setEditData({...editData,tiene:e.target.checked})}/>
: (r.tiene ? "✔️" : "❌")}
</td>

<td style={td}>
{editando===r.id
? <input type="date" value={editData.fecha_caducidad || ""} onChange={(e)=>setEditData({...editData,fecha_caducidad:e.target.value})}/>
: (r.fecha_caducidad || "-")}
</td>

<td style={td}>

{editando===r.id ? (
<>
<button onClick={()=>guardarEdicion(r.id)}>💾</button>
<button onClick={()=>setEditando(null)}>❌</button>
</>
) : (
<>
<button onClick={()=>{
setEditando(r.id)
setEditData(r)
}}>
Editar
</button>

<button onClick={()=>eliminar(r.id)} style={btnDelete}>
Eliminar
</button>
</>
)}

</td>

</tr>

))}

</tbody>

</table>

<hr/>

{/* RANKING */}
<h2>🚨 Ambulancias con más problemas</h2>

<table style={{width:"100%",borderCollapse:"collapse"}}>

<thead style={{background:"#111827",color:"white"}}>
<tr>
<th style={th}>Ambulancia</th>
<th style={th}>Incidencias</th>
</tr>
</thead>

<tbody>

{ranking.map(([amb,cant])=>(
<tr key={amb}>
<td style={td}>{amb}</td>
<td style={td}>{cant}</td>
</tr>
))}

</tbody>

</table>

</div>
)
}

/* ========================= */
const card = {
padding:20,
border:"1px solid #ddd",
borderRadius:10,
minWidth:180
}

const th = {
padding:10,
textAlign:"left" as const
}

const td = {
padding:10
}

const btnDelete = {
background:"#dc2626",
color:"white",
padding:"5px 10px",
border:"none",
borderRadius:5
}

const btnLogout = {
background:"#111827",
color:"white",
padding:"10px 15px",
borderRadius:6,
border:"none",
marginBottom:10
}