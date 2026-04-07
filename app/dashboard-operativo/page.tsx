"use client"

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

/* 🎨 COLORES CONSOLA */
const GRUPOS_COLORES:any = {
G1: { nombre:"VERDE", color:"#22c55e" },
G2: { nombre:"MORADO", color:"#a855f7" },
G3: { nombre:"AMARILLO", color:"#eab308" },
G4: { nombre:"ROSA", color:"#ec4899" },
G5: { nombre:"AZUL", color:"#3b82f6" }
}

export default function Dashboard() {

const router = useRouter()

const [personal, setPersonal] = useState<any[]>([])
const [archivos, setArchivos] = useState<any[]>([])
const [loading, setLoading] = useState(true)

const [editando, setEditando] = useState<any>(null)
const [nuevo, setNuevo] = useState(false)

const [formNuevo, setFormNuevo] = useState<any>({
nombre:"",
tipo:"ambulancia",
guardia:"G1",
ambulancia_codigo:""
})

useEffect(()=>{ iniciar() },[])

const iniciar = async ()=>{
await fetchData()
setLoading(false)
}

const fetchData = async () => {
const { data: p } = await supabase.from('personal').select('*')
const { data: a } = await supabase.from('archivos_asistencia').select('*')

if(p) setPersonal(p)
if(a) setArchivos(a)
}

const logout = () => {
localStorage.clear()
sessionStorage.clear()
router.replace('/')
}

/* 🔥 CREAR NUEVO */
const crearNuevo = async () => {

if(!formNuevo.nombre){
alert("Nombre requerido")
return
}

const { error } = await supabase.from('personal').insert([{
nombre: formNuevo.nombre,
tipo: formNuevo.tipo,
guardia: formNuevo.guardia,
ambulancia_codigo: formNuevo.tipo === "ambulancia"
? formNuevo.ambulancia_codigo
: null,
estado:"Activo"
}])

if(error){
console.error(error)
alert("Error al crear")
return
}

setNuevo(false)
setFormNuevo({
nombre:"",
tipo:"ambulancia",
guardia:"G1",
ambulancia_codigo:""
})

fetchData()
}

/* 🔥 AGRUPAR */
const agrupar = (data:any[])=>{

const grupos:any = {}

data.forEach(p=>{

let key = "SIN UNIDAD"

if(p.tipo === "consola"){
key = GRUPOS_COLORES[p.guardia]?.nombre || "CONSOLA"
}else{
key = p.ambulancia_codigo || "SIN UNIDAD"
}

if(!grupos[key]) grupos[key]=[]
grupos[key].push(p)

})

return grupos
}

/* 🔥 COLOR ESTADO */
const colorEstado = (estado: string) => {
switch (estado) {
case 'Activo': return 'bg-green-400'
case 'Vacaciones': return 'bg-yellow-400'
case 'Permiso': return 'bg-orange-400'
case 'Reposo Médico': return 'bg-red-500 animate-pulse'
default: return 'bg-gray-400'
}
}

if (loading) {
return <div className="min-h-screen flex items-center justify-center bg-black text-white">
🚑 Cargando sistema...
</div>
}

const guardias = ['G1','G2','G3','G4','G5']

return (
<div className="min-h-screen bg-black text-white p-6">

{/* HEADER */}
<div className="flex justify-between mb-6">

<h1 className="text-4xl font-extrabold text-cyan-400">
🚑 CONTROL OPERATIVO
</h1>

<div className="flex gap-3">

<button onClick={fetchData} className="bg-blue-600 px-4 py-2 rounded-lg">
🔄 Actualizar
</button>

<button onClick={()=>setNuevo(true)} className="bg-green-600 px-4 py-2 rounded-lg">
➕ Nuevo
</button>

<button onClick={logout} className="bg-red-600 px-4 py-2 rounded-lg">
🔐 Salir
</button>

</div>
</div>

{/* GRID */}
<div className="grid grid-cols-3 gap-6">

{/* IZQUIERDA */}
<div className="col-span-2 grid grid-cols-2 gap-6">

{guardias.map(g=>{

const data = personal.filter(p=>p.guardia===g)
const grupos = agrupar(data)

return(
<div key={g} className="bg-gray-900 p-4 rounded-xl">

<h2 className="text-cyan-400 mb-3">{g}</h2>

{Object.keys(grupos).map(key=>{

let color = "#38bdf8"

/* COLOR CONSOLA */
for(const k in GRUPOS_COLORES){
if(GRUPOS_COLORES[k].nombre === key){
color = GRUPOS_COLORES[k].color
}
}

return(
<div key={key} className="mb-3 border p-3 rounded">

<h3 style={{color}}>
{key.includes("VERDE") || key.includes("MORADO") || key.includes("AZUL")
? "💻"
: "🚑"} {key}
</h3>

{grupos[key].map((p:any)=>(
<div key={p.id} className="flex justify-between bg-black p-2 mb-2 rounded">

<span>{p.nombre}</span>

<div className="flex gap-2 items-center">

<div className={`w-3 h-3 rounded-full ${colorEstado(p.estado)}`} />

<button onClick={()=>setEditando(p)} className="bg-cyan-600 px-2 text-xs rounded">
✏️
</button>

<button onClick={()=>supabase.from('personal').delete().eq('id',p.id).then(fetchData)}
className="bg-red-600 px-2 text-xs rounded">
🗑️
</button>

</div>
</div>
))}

</div>
)
})}

</div>
)
})}

</div>

{/* DERECHA */}
<div className="space-y-6">

<div className="bg-red-900/40 p-4 rounded-xl">
<h2 className="text-red-400">⚠ Críticos</h2>

{personal.filter(p=>p.estado!=="Activo").map(p=>(
<div key={p.id} className="text-sm">{p.nombre}</div>
))}
</div>

<div className="bg-gray-900 p-4 rounded-xl">
<h2 className="text-blue-400">📁 Reportes</h2>

{archivos.map(a=>(
<div key={a.id} className="text-sm">{a.nombre}</div>
))}
</div>

</div>

</div>

{/* MODAL NUEVO */}
{nuevo && (
<div className="fixed inset-0 bg-black/80 flex justify-center items-center">

<div className="bg-gray-900 p-6 rounded-xl w-80">

<h2 className="mb-4">Nuevo funcionario</h2>

<input placeholder="Nombre"
className="w-full mb-2 p-2 bg-black border"
value={formNuevo.nombre}
onChange={(e)=>setFormNuevo({...formNuevo,nombre:e.target.value})}
/>

<select
className="w-full mb-2 p-2 bg-black border"
value={formNuevo.tipo}
onChange={(e)=>setFormNuevo({...formNuevo,tipo:e.target.value})}
>
<option value="ambulancia">Ambulancia</option>
<option value="consola">Consola</option>
</select>

<select
className="w-full mb-2 p-2 bg-black border"
value={formNuevo.guardia}
onChange={(e)=>setFormNuevo({...formNuevo,guardia:e.target.value})}
>
<option>G1</option>
<option>G2</option>
<option>G3</option>
<option>G4</option>
<option>G5</option>
</select>

{formNuevo.tipo==="ambulancia" && (
<input placeholder="Unidad (ej: ALFA 1)"
className="w-full mb-2 p-2 bg-black border"
value={formNuevo.ambulancia_codigo}
onChange={(e)=>setFormNuevo({...formNuevo,ambulancia_codigo:e.target.value})}
/>
)}

<div className="flex justify-between mt-4">

<button onClick={crearNuevo} className="bg-green-600 px-4 py-2 rounded">
Guardar
</button>

<button onClick={()=>setNuevo(false)} className="bg-red-600 px-4 py-2 rounded">
Cancelar
</button>

</div>

</div>
</div>
)}

</div>
)
}