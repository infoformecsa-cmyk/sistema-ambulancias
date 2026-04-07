'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function Dashboard() {

const router = useRouter()

const [personal, setPersonal] = useState<any[]>([])
const [archivos, setArchivos] = useState<any[]>([])
const [ambulanciasDB, setAmbulanciasDB] = useState<any[]>([]) // 🔥 NUEVO
const [editando, setEditando] = useState<any>(null)
const [nuevo, setNuevo] = useState(false)
const [loading, setLoading] = useState(true)

const [formNuevo, setFormNuevo] = useState<any>({
nombre:"",
tipo:"ambulancia",
guardia:"G1",
ambulancia_codigo:""
})

/* 🎨 COLORES CONSOLA */
const COLORES_GUARDIA:any = {
G1: { nombre:"VERDE", color:"#22c55e" },
G2: { nombre:"MORADO", color:"#a855f7" },
G3: { nombre:"AMARILLO", color:"#eab308" },
G4: { nombre:"ROSA", color:"#ec4899" },
G5: { nombre:"AZUL", color:"#3b82f6" }
}

useEffect(()=>{ iniciar() },[])

const iniciar = async ()=>{
await fetchData()
setLoading(false)
}

const fetchData = async () => {

const { data: p } = await supabase.from('personal').select('*')
const { data: a } = await supabase
.from('archivos_asistencia')
.select('*')
.order('fecha',{ascending:false})

/* 🔥 TRAER AMBULANCIAS */
const { data: amb } = await supabase.from('ambulancias').select('id, codigo_operativo')

if(p) setPersonal(p)
if(a) setArchivos(a)
if(amb) setAmbulanciasDB(amb)
}

/* 🔥 CREAR */
const crearNuevo = async ()=>{

if(!formNuevo.nombre){
alert("Nombre requerido")
return
}

await supabase.from('personal').insert([{
nombre: formNuevo.nombre,
tipo: formNuevo.tipo,
guardia: formNuevo.guardia,
ambulancia_codigo: formNuevo.tipo==="ambulancia"
? formNuevo.ambulancia_codigo
: null,
estado:"Activo"
}])

setNuevo(false)
setFormNuevo({
nombre:"",
tipo:"ambulancia",
guardia:"G1",
ambulancia_codigo:""
})

fetchData()
}

const logout = ()=>{
localStorage.clear()
sessionStorage.clear()
router.replace('/')
}

/* 🔥 FILTROS LIMPIOS */
const getAmbulancia = (g:string)=>
personal.filter(p=>p.guardia===g && p.tipo==="ambulancia")

const getConsola = (g:string)=>
personal.filter(p=>p.guardia===g && p.tipo==="consola")

/* 🔥 AGRUPAR SOLO AMBULANCIAS */
const agruparPorAmbulancia = (data:any[])=>{

const grupos:any = {}

data.forEach(p=>{
const key = p.ambulancia_codigo || 'SIN UNIDAD'
if(!grupos[key]) grupos[key]=[]
grupos[key].push(p)
})

return Object.entries(grupos).sort((a:any,b:any)=>{
const numA = parseInt(a[0].replace(/\D/g,'')) || 999
const numB = parseInt(b[0].replace(/\D/g,'')) || 999
return numA - numB
})
}

/* 🔥 ALERTAS */
const alertas = personal.filter(
p => p.estado === 'Reposo Médico' || p.estado === 'Permiso'
)

/* 🔥 COLOR */
const colorEstado = (estado:string)=>{
switch (estado) {
case 'Activo': return 'bg-green-400'
case 'Vacaciones': return 'bg-yellow-400'
case 'Permiso': return 'bg-orange-400'
case 'Reposo Médico': return 'bg-red-500 animate-pulse'
default: return 'bg-gray-400'
}
}

if (loading) {
return (
<div className="min-h-screen flex items-center justify-center bg-black text-white">
🚑 Cargando sistema...
</div>
)
}

const guardias = ['G1','G2','G3','G4','G5']

return (
<div className="min-h-screen bg-black text-white p-6">

{/* HEADER */}
<div className="flex justify-between items-center mb-6">

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

{/* ALERTAS */}
<div className="mb-6 bg-red-600 px-6 py-3 rounded-xl w-fit">
⚠ {alertas.length} ALERTAS
</div>

{/* CONTENIDO */}
<div className="grid grid-cols-3 gap-6">

{/* IZQUIERDA */}
<div className="col-span-2 grid grid-cols-2 gap-6">

{guardias.map((g)=>{

const ambulancias = agruparPorAmbulancia(getAmbulancia(g))
const consola = getConsola(g)

return(
<div key={g} className="bg-gray-900 p-5 rounded-xl">

<h2 className="text-xl mb-4 text-cyan-400">{g}</h2>

{/* 🚑 AMBULANCIAS */}
{ambulancias.map(([ambulancia,personas]:any)=>(
<div key={ambulancia} className="mb-4 border p-3 rounded">

<h3 className="text-cyan-300 mb-2">🚑 {ambulancia}</h3>

{personas.map((p:any)=>(
<div key={p.id} className="flex justify-between items-center bg-black p-2 mb-2 rounded">

<p className="text-sm font-semibold">{p.nombre}</p>

<div className="flex items-center gap-2">

<div className={`w-3 h-3 rounded-full ${colorEstado(p.estado)}`} />

<button onClick={()=>setEditando(p)}
className="text-xs bg-cyan-600 px-2 py-1 rounded">
✏️
</button>

<button onClick={()=>supabase.from('personal').delete().eq('id',p.id).then(fetchData)}
className="text-xs bg-red-600 px-2 py-1 rounded">
🗑️
</button>

<input
className="bg-black border text-xs px-1 w-16"
value={p.ambulancia_codigo || ''}
onChange={async (e)=>{
await supabase.from('personal')
.update({ambulancia_codigo:e.target.value})
.eq('id',p.id)
fetchData()
}}
/>

</div>

</div>
))}

</div>
))}

{/* 💻 CONSOLA */}
{consola.length>0 && (
<div className="mt-3 border border-green-500/40 p-3 rounded bg-black/40">

<h3 className="text-green-400 mb-2">
💻 CONSOLA
</h3>

{consola.map((p:any)=>(
<div key={p.id} className="flex justify-between bg-black p-2 mb-2 rounded">

<p className="text-sm">{p.nombre}</p>

<div className="flex items-center gap-2">
<div className={`w-3 h-3 rounded-full ${colorEstado(p.estado)}`} />
</div>

</div>
))}

</div>
)}

</div>
)
})}

</div>

{/* MODAL NUEVO */}
{nuevo && (
<div className="fixed inset-0 bg-black/80 flex items-center justify-center">

<div className="bg-gray-900 p-6 rounded-xl w-80">

<h2 className="mb-4">Nuevo funcionario</h2>

<input placeholder="Nombre"
className="w-full mb-2 p-2 bg-black border"
onChange={(e)=>setFormNuevo({...formNuevo,nombre:e.target.value})}
/>

<select className="w-full mb-2 p-2 bg-black border"
onChange={(e)=>setFormNuevo({...formNuevo,tipo:e.target.value})}>
<option value="ambulancia">Ambulancia</option>
<option value="consola">Consola</option>
</select>

<select className="w-full mb-2 p-2 bg-black border"
onChange={(e)=>setFormNuevo({...formNuevo,guardia:e.target.value})}>
<option>G1</option>
<option>G2</option>
<option>G3</option>
<option>G4</option>
<option>G5</option>
</select>

{/* 🚑 SELECT DINÁMICO */}
{formNuevo.tipo==="ambulancia" && (
<select
className="w-full mb-2 p-2 bg-black border"
onChange={(e)=>setFormNuevo({...formNuevo,ambulancia_codigo:e.target.value})}
>
<option value="">Seleccionar unidad</option>
{(ambulanciasDB || []).map((a:any)=>(
<option key={a.id} value={a.codigo_operativo}>
{a.codigo_operativo}
</option>
))}
</select>
)}

{/* 💻 COLOR AUTOMÁTICO */}
{formNuevo.tipo==="consola" && COLORES_GUARDIA[formNuevo.guardia] && (
<div
className="w-full mb-2 p-2 text-center font-bold rounded"
style={{
background: COLORES_GUARDIA[formNuevo.guardia].color,
color:"#000"
}}
>
💻 {COLORES_GUARDIA[formNuevo.guardia].nombre}
</div>
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

{/* MODAL EDITAR → intacto */}

</div>
)
}