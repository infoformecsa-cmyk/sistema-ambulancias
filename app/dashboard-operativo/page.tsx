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

/* 🔥 NUEVO */
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
/* 🔥 NUEVO: CREAR AMBULANCIA */
const crearAmbulancia = async ()=>{

if(!formAmbulancia.codigo){
alert("Código requerido")
return
}

const { error } = await supabase
.from('ambulancias')
.insert([{
codigo_operativo: formAmbulancia.codigo,
estado: "ACTIVA",
guardia: formAmbulancia.guardia
}])

if(error){
console.error(error)
alert("Error al crear ambulancia")
return
}

alert("🚑 Ambulancia creada")

setNuevaAmbulancia(false)
setFormAmbulancia({codigo:"",guardia:"G1"})
}

/* ========================= */
/* 🔥 CREAR PERSONAL */
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

const eliminar = async (id:number)=>{
if(!confirm("¿Eliminar?")) return

await supabase.from('personal').delete().eq('id',id)
await fetchData()
}

/* ========================= */

const actualizarCampo = async (id:number, campo:string, valor:any)=>{
await supabase.from('personal').update({ [campo]: valor }).eq('id',id)
await fetchData()
}

/* ========================= */

const getAmbulancia = (g:string)=>
personal.filter(p=>p.guardia===g && p.tipo==="ambulancia")

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

const alertas = personal.filter(
p => p.estado === 'Reposo Médico' || p.estado === 'Permiso'
)

const colorEstado = (estado:string)=>{
switch (estado) {
case 'Activo': return 'bg-green-400'
case 'Reposo Médico': return 'bg-red-500'
default: return 'bg-gray-400'
}
}

if (loading) return <div className="bg-black text-white p-10">Cargando...</div>

const guardias = ['G1','G2','G3','G4','G5']

return(
<div className="min-h-screen bg-black text-white p-6">

{/* HEADER */}
<div className="flex justify-between items-center mb-6">

<h1 className="text-4xl font-extrabold text-cyan-400">
🚑 CONTROL OPERATIVO
</h1>

<div className="flex gap-3">

<button onClick={fetchData} className="bg-blue-600 px-4 py-2 rounded-lg">
🔄
</button>

<button onClick={()=>setNuevo(true)} className="bg-green-600 px-4 py-2 rounded-lg">
➕ Personal
</button>

{/* 🔥 NUEVO BOTON */}
<button onClick={()=>setNuevaAmbulancia(true)} className="bg-purple-600 px-4 py-2 rounded-lg">
🚑 Ambulancia
</button>

<button onClick={()=>router.replace('/')} className="bg-red-600 px-4 py-2 rounded-lg">
Salir
</button>

</div>
</div>

{/* CONTENIDO */}
<div className="grid grid-cols-2 gap-6">

{guardias.map((g)=>{

const ambulancias = agruparPorAmbulancia(getAmbulancia(g))

return(
<div key={g} className="bg-gray-900 p-5 rounded-xl">

<h2 className="text-xl mb-4 text-cyan-400">{g}</h2>

{ambulancias.map(([ambulancia,personas]:any)=>(
<div key={ambulancia} className="mb-4 border p-3 rounded">

<h3 className="text-cyan-300 mb-2">🚑 {ambulancia}</h3>

{personas.map((p:any)=>(
<div key={p.id} className="flex justify-between bg-black p-2 mb-2 rounded">

<p>{p.nombre}</p>

<div className="flex gap-2">

<button onClick={()=>setEditando(p)}>✏️</button>

<button onClick={()=>eliminar(p.id)}>🗑️</button>

</div>

</div>
))}

</div>
))}

</div>
)
})}

</div>

{/* ========================= */}
{/* MODAL NUEVA AMBULANCIA */}
{nuevaAmbulancia && (
<div className="fixed inset-0 bg-black/80 flex items-center justify-center">

<div className="bg-gray-900 p-6 rounded-xl w-80">

<h2 className="mb-4">Nueva Ambulancia</h2>

<input placeholder="ALFA 26"
className="w-full mb-2 p-2 bg-black border"
onChange={(e)=>setFormAmbulancia({...formAmbulancia,codigo:e.target.value})}
/>

<select className="w-full mb-2 p-2 bg-black border"
onChange={(e)=>setFormAmbulancia({...formAmbulancia,guardia:e.target.value})}>
<option>G1</option>
<option>G2</option>
<option>G3</option>
<option>G4</option>
<option>G5</option>
</select>

<div className="flex justify-between mt-4">

<button onClick={crearAmbulancia} className="bg-green-600 px-4 py-2 rounded">
Guardar
</button>

<button onClick={()=>setNuevaAmbulancia(false)} className="bg-red-600 px-4 py-2 rounded">
Cancelar
</button>

</div>

</div>
</div>
)}

</div>
)
}