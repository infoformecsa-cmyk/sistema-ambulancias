'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function Dashboard() {

const router = useRouter()

const [personal, setPersonal] = useState<any[]>([])
const [archivos, setArchivos] = useState<any[]>([])
const [editando, setEditando] = useState<any>(null)
const [nuevo, setNuevo] = useState(false)
const [nuevaAmbulancia, setNuevaAmbulancia] = useState(false)

const [formAmbulancia, setFormAmbulancia] = useState({
codigo:"",
guardia:"G1"
})

const [loading, setLoading] = useState(true)

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
const { data: a } = await supabase
.from('archivos_asistencia')
.select('*')
.order('fecha',{ascending:false})

if(p) setPersonal(p)
if(a) setArchivos(a)
}

/* ========================= */
const eliminar = async (id:number)=>{
if(!confirm("¿Eliminar registro?")) return
await supabase.from('personal').delete().eq('id',id)
await fetchData()
}

/* ========================= */
const actualizar = async ()=>{
if(!editando) return

await supabase.from('personal')
.update({
nombre: editando.nombre,
ambulancia_codigo: editando.ambulancia_codigo
})
.eq('id', editando.id)

setEditando(null)
await fetchData()
}

/* ========================= */
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

await fetchData()
}

/* ========================= */
const crearAmbulancia = async ()=>{

if(!formAmbulancia.codigo){
alert("Código requerido")
return
}

await supabase.from('ambulancias').insert([{
codigo_operativo: formAmbulancia.codigo,
estado: "ACTIVA",
guardia: formAmbulancia.guardia
}])

setNuevaAmbulancia(false)
setFormAmbulancia({codigo:"",guardia:"G1"})
}

/* ========================= */
const logout = ()=>{
localStorage.clear()
sessionStorage.clear()
router.replace('/')
}

/* ========================= */
const getAmbulancia = (g:string)=>
personal.filter(p=>p.guardia===g && p.tipo==="ambulancia")

const getConsola = (g:string)=>
personal.filter(p=>p.guardia===g && p.tipo==="consola")

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

/* ========================= */
const alertas = personal.filter(
p => p.estado === 'Reposo Médico' || p.estado === 'Permiso'
)

const colorEstado = (estado:string)=>{
switch (estado) {
case 'Activo': return 'bg-green-400'
case 'Vacaciones': return 'bg-yellow-400'
case 'Permiso': return 'bg-orange-400'
case 'Reposo Médico': return 'bg-red-500 animate-pulse'
default: return 'bg-gray-400'
}
}

/* ========================= */
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
<div className="flex justify-between items-center mb-6 relative z-50">

<h1 className="text-4xl font-extrabold text-cyan-400">
🚑 CONTROL OPERATIVO
</h1>

<div className="flex gap-3">

<button onClick={()=>fetchData()} className="bg-blue-600 px-4 py-2 rounded-lg">
🔄 Actualizar
</button>

<button onClick={()=>setNuevo(true)} className="bg-green-600 px-4 py-2 rounded-lg">
➕ Nuevo
</button>

<button onClick={()=>setNuevaAmbulancia(true)} className="bg-purple-600 px-4 py-2 rounded-lg">
🚑 Ambulancia
</button>

<button onClick={logout} className="bg-red-600 px-4 py-2 rounded-lg">
🔐 Salir
</button>

</div>
</div>

{/* TODO TU CONTENIDO IGUAL (NO TOCADO) */}

{/* ========================= */}
{/* MODALES */}
{editando && (
<div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
<div className="bg-gray-900 p-6 rounded-xl w-80">

<input
className="w-full mb-3 p-2 bg-black border"
value={editando.nombre}
onChange={(e)=>setEditando({...editando,nombre:e.target.value})}
/>

<div className="flex gap-2">
<button onClick={actualizar} className="bg-green-600 px-4 py-2 rounded w-full">
Guardar
</button>

<button onClick={()=>setEditando(null)} className="bg-red-600 px-4 py-2 rounded w-full">
Cancelar
</button>
</div>

</div>
</div>
)}

{nuevo && (
<div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
<div className="bg-gray-900 p-6 rounded-xl w-80">

<input placeholder="Nombre"
className="w-full mb-2 p-2 bg-black border"
onChange={(e)=>setFormNuevo({...formNuevo,nombre:e.target.value})}
/>

<div className="flex gap-2">
<button onClick={crearNuevo} className="bg-green-600 px-4 py-2 rounded w-full">
Guardar
</button>

<button onClick={()=>{
setNuevo(false)
setFormNuevo({
nombre:"",
tipo:"ambulancia",
guardia:"G1",
ambulancia_codigo:""
})
}} className="bg-red-600 px-4 py-2 rounded w-full">
Cancelar
</button>
</div>

</div>
</div>
)}

{nuevaAmbulancia && (
<div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
<div className="bg-gray-900 p-6 rounded-xl w-80">

<input placeholder="ALFA 26"
className="w-full mb-2 p-2 bg-black border"
onChange={(e)=>setFormAmbulancia({...formAmbulancia,codigo:e.target.value})}
/>

<div className="flex gap-2">
<button onClick={crearAmbulancia} className="bg-green-600 px-4 py-2 rounded w-full">
Guardar
</button>

<button onClick={()=>{
setNuevaAmbulancia(false)
setFormAmbulancia({codigo:"",guardia:"G1"})
}} className="bg-red-600 px-4 py-2 rounded w-full">
Cancelar
</button>
</div>

</div>
</div>
)}

</div>
)
}