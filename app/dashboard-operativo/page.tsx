'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function Dashboard() {

const router = useRouter()

const [personal, setPersonal] = useState<any[]>([])
const [archivos, setArchivos] = useState<any[]>([])
const [ambulancias, setAmbulancias] = useState<any[]>([])

const [editando, setEditando] = useState<any>(null)
const [nuevo, setNuevo] = useState(false)

const [nuevaAmbulancia, setNuevaAmbulancia] = useState(false)
const [codigoAmbulancia, setCodigoAmbulancia] = useState("")

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

/* 🔥 FETCH ROBUSTO */
const fetchData = async () => {

try{

const { data: p, error: errP } = await supabase.from('personal').select('*')

const { data: a, error: errA } = await supabase
.from('asistencia')
.select(`
id,
fecha,
archivo_url,
archivo_nombre,
personal(nombre)
`)
.order('fecha',{ascending:false})

const archivosAdaptados = (a || []).map((r:any)=>({
id: r.id,
nombre: r.personal?.nombre || 'SIN NOMBRE',
fecha: r.fecha,
archivo_url: r.archivo_url
}))

const { data: amb, error: errAmb } = await supabase
.from('ambulancias')
.select('codigo_operativo')
.order('codigo_operativo')

if(errP || errA || errAmb){
console.error(errP || errA || errAmb)
alert("Error cargando datos")
return
}

setPersonal(p || [])
setArchivos(archivosAdaptados || [])
setAmbulancias(amb || [])

}catch(e){
console.error(e)
alert("Error general en fetch")
}

}

/* 🔥 ELIMINAR */
const eliminar = async (id:number)=>{
if(!confirm("¿Eliminar registro?")) return

const { error } = await supabase.from('personal').delete().eq('id',id)

if(error){
alert("Error eliminando")
return
}

await fetchData()
}

/* 🔥 ACTUALIZAR */
const actualizar = async ()=>{
if(!editando) return

const { error } = await supabase.from('personal')
.update({
nombre: editando.nombre,
ambulancia_codigo: editando.ambulancia_codigo
})
.eq('id', editando.id)

if(error){
alert("Error actualizando")
return
}

setEditando(null)
await fetchData()
}

/* 🔥 CREAR NUEVO */
const crearNuevo = async ()=>{

if(!formNuevo.nombre){
alert("Nombre requerido")
return
}

if(formNuevo.tipo === "ambulancia" && !formNuevo.ambulancia_codigo){
alert("Debe seleccionar una ambulancia")
return
}

const { error } = await supabase.from('personal').insert([{
nombre: formNuevo.nombre,
tipo: formNuevo.tipo,
guardia: formNuevo.guardia,
ambulancia_codigo: formNuevo.tipo==="ambulancia"
? formNuevo.ambulancia_codigo
: null,
estado:"Activo"
}])

if(error){
alert("Error: " + error.message)
return
}

setNuevo(false)
setFormNuevo({
nombre:"",
tipo:"ambulancia",
guardia:"G1",
ambulancia_codigo:""
})

await fetchData()
}

const logout = ()=>{
localStorage.clear()
sessionStorage.clear()
router.replace('/')
}

const irHistorial = ()=>{
router.push('/dashboard-operativo/historial')
}

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
return Object.entries(grupos)
}

const alertas = personal.filter(
p => p.estado === 'Reposo Médico' || p.estado === 'Permiso'
)

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
<button onClick={fetchData} className="bg-blue-600 px-4 py-2 rounded-lg">🔄 Actualizar</button>
<button onClick={()=>setNuevo(true)} className="bg-green-600 px-4 py-2 rounded-lg">➕ Nuevo</button>
<button onClick={irHistorial} className="bg-cyan-600 px-4 py-2 rounded-lg">📊 Historial</button>
<button onClick={logout} className="bg-red-600 px-4 py-2 rounded-lg">🔐 Salir</button>
</div>
</div>

{/* CONTENIDO */}
<div className="grid grid-cols-3 gap-6">

<div className="col-span-2 grid grid-cols-2 gap-6">

{guardias.map((g)=>{

const ambulancias = agruparPorAmbulancia(getAmbulancia(g))
const consola = getConsola(g)

return(
<div key={g} className="bg-gray-900 p-5 rounded-xl">

<h2 className="text-xl mb-4 text-cyan-400">{g}</h2>

{ambulancias.map(([ambulancia,personas]:any)=>(
<div key={ambulancia} className="mb-4 border p-3 rounded">
<h3 className="text-cyan-300 mb-2">🚑 {ambulancia}</h3>

{personas.map((p:any)=>(
<div key={p.id} className="flex justify-between bg-black p-2 mb-2 rounded">
<p>{p.nombre}</p>
<button onClick={()=>eliminar(p.id)}>🗑️</button>
</div>
))}

</div>
))}

{consola.length > 0 && (
<div className="mt-3 border p-3 rounded">
{consola.map((p:any)=>(
<div key={p.id}>{p.nombre}</div>
))}
</div>
)}

</div>
)

})}

</div>

{/* PANEL DERECHO */}
<div className="space-y-6">
{archivos.map(a=>(
<div key={a.id} className="flex justify-between text-sm">
<span>{a.nombre}</span>
<a href={a.archivo_url} target="_blank">Ver</a>
</div>
))}
</div>

</div>

{/* MODALES */}
{nuevo && (
<div className="fixed inset-0 bg-black/80 flex items-center justify-center">
<div className="bg-gray-900 p-6 rounded">
<input
value={formNuevo.nombre}
onChange={(e)=>setFormNuevo({...formNuevo,nombre:e.target.value})}
/>
<button onClick={crearNuevo}>Guardar</button>
</div>
</div>
)}

{editando && (
<div className="fixed inset-0 bg-black/80 flex items-center justify-center">
<div className="bg-gray-900 p-6 rounded">
<input
value={editando.nombre}
onChange={(e)=>setEditando({...editando,nombre:e.target.value})}
/>
<button onClick={actualizar}>Guardar</button>
</div>
</div>
)}

</div>
)
}