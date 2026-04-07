"use client"

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

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
const [nuevo, setNuevo] = useState(false)

const [formNuevo, setFormNuevo] = useState<any>({
nombre:"",
tipo:"ambulancia",
guardia:"G1",
ambulancia_codigo:""
})

useEffect(()=>{ fetchData() },[])

const fetchData = async () => {
const { data } = await supabase.from('personal').select('*')
if(data) setPersonal(data)
}

/* 🔥 CREAR */
const crearNuevo = async () => {

if(!formNuevo.nombre){
alert("Nombre requerido")
return
}

await supabase.from('personal').insert([{
nombre: formNuevo.nombre,
tipo: formNuevo.tipo,
guardia: formNuevo.guardia,
ambulancia_codigo: formNuevo.tipo === "ambulancia"
? formNuevo.ambulancia_codigo
: null,
estado:"Activo"
}])

setNuevo(false)
fetchData()
}

/* 🔥 ORDEN ALFA */
const ordenarAmbulancias = (a:string,b:string)=>{
const numA = parseInt((a || "").replace(/\D/g,'')) || 999
const numB = parseInt((b || "").replace(/\D/g,'')) || 999
return numA - numB
}

/* 🔥 FILTROS */
const getAmbulancias = (guardia:string)=>{
return personal.filter(p=>p.guardia===guardia && p.tipo==="ambulancia")
}

const getConsola = (guardia:string)=>{
return personal.filter(p=>p.guardia===guardia && p.tipo==="consola")
}

/* 🔥 AGRUPAR AMBULANCIAS */
const agruparAmbulancias = (data:any[])=>{
const grupos:any = {}

data.forEach(p=>{
const key = p.ambulancia_codigo || "SIN UNIDAD"
if(!grupos[key]) grupos[key]=[]
grupos[key].push(p)
})

return Object.keys(grupos)
.sort(ordenarAmbulancias)
.map(k=>({nombre:k, personas:grupos[k]}))
}

/* 🔥 COLOR ESTADO */
const colorEstado = (estado: string) => {
switch (estado) {
case 'Activo': return 'bg-green-400'
case 'Vacaciones': return 'bg-yellow-400'
case 'Permiso': return 'bg-orange-400'
case 'Reposo Médico': return 'bg-red-500'
default: return 'bg-gray-400'
}
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

<button onClick={()=>router.replace('/')} className="bg-red-600 px-4 py-2 rounded-lg">
🔐 Salir
</button>

</div>
</div>

{/* GRID */}
<div className="grid grid-cols-2 gap-6">

{guardias.map(g=>{

const ambulancias = agruparAmbulancias(getAmbulancias(g))
const consola = getConsola(g)

return(
<div key={g} className="bg-gray-900 p-4 rounded-xl">

<h2 className="text-cyan-400 mb-4">{g}</h2>

{/* 🚑 AMBULANCIAS */}
{ambulancias.map(grupo=>(
<div key={grupo.nombre} className="mb-4 border p-3 rounded">

<h3 className="text-cyan-300 mb-2">🚑 {grupo.nombre}</h3>

{grupo.personas.map((p:any)=>(
<div key={p.id} className="flex justify-between bg-black p-2 mb-2 rounded">

<span>{p.nombre}</span>

<div className="flex gap-2 items-center">
<div className={`w-3 h-3 rounded-full ${colorEstado(p.estado)}`} />
</div>

</div>
))}

</div>
))}

{/* 💻 CONSOLA */}
{consola.length > 0 && (
<div className="mt-4 border p-3 rounded">

<h3 style={{color:GRUPOS_COLORES[g].color}}>
💻 {GRUPOS_COLORES[g].nombre}
</h3>

{consola.map((p:any)=>(
<div key={p.id} className="flex justify-between bg-black p-2 mb-2 rounded">

<span>{p.nombre}</span>

<div className="flex gap-2 items-center">
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

{/* MODAL */}
{nuevo && (
<div className="fixed inset-0 bg-black/80 flex justify-center items-center">

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

<input placeholder="Unidad (solo ambulancia)"
className="w-full mb-2 p-2 bg-black border"
onChange={(e)=>setFormNuevo({...formNuevo,ambulancia_codigo:e.target.value})}
/>

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