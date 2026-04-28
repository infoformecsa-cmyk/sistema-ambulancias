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

/* 🔥 CREAR AMBULANCIA */
const crearAmbulancia = async ()=>{

if(!codigoAmbulancia){
alert("Ingrese código")
return
}

const { error } = await supabase
.from('ambulancias')
.insert([{ codigo_operativo: codigoAmbulancia }])

if(error){
alert("Error: " + error.message)
return
}

setCodigoAmbulancia("")
setNuevaAmbulancia(false)
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
<button onClick={fetchData} className="bg-blue-600 px-4 py-2 rounded-lg">🔄 Actualizar</button>
<button onClick={()=>setNuevo(true)} className="bg-green-600 px-4 py-2 rounded-lg">➕ Nuevo</button>
<button onClick={()=>setNuevaAmbulancia(true)} className="bg-purple-600 px-4 py-2 rounded-lg">🚑 Ambulancia</button>
<button onClick={irHistorial} className="bg-cyan-600 px-4 py-2 rounded-lg">📊 Historial</button>
<button onClick={logout} className="bg-red-600 px-4 py-2 rounded-lg">🔐 Salir</button>
</div>
</div>

{/* 🔥 MODAL NUEVO */}
{nuevo && (
<div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
<div className="bg-gray-900 p-6 rounded-xl w-80">
<h2 className="mb-4">Nuevo funcionario</h2>

<input className="w-full mb-2 p-2 bg-black border"
placeholder="Nombre"
value={formNuevo.nombre}
onChange={(e)=>setFormNuevo({...formNuevo,nombre:e.target.value})}
/>

<select className="w-full mb-2 p-2 bg-black border"
value={formNuevo.tipo}
onChange={(e)=>setFormNuevo({...formNuevo,tipo:e.target.value})}>
<option value="ambulancia">Ambulancia</option>
<option value="consola">Consola</option>
</select>

<select className="w-full mb-2 p-2 bg-black border"
value={formNuevo.guardia}
onChange={(e)=>setFormNuevo({...formNuevo,guardia:e.target.value})}>
<option value="G1">G1</option>
<option value="G2">G2</option>
<option value="G3">G3</option>
<option value="G4">G4</option>
<option value="G5">G5</option>
</select>

<select className="w-full mb-2 p-2 bg-black border"
value={formNuevo.ambulancia_codigo}
onChange={(e)=>setFormNuevo({...formNuevo,ambulancia_codigo:e.target.value})}>
<option value="">Seleccionar unidad</option>
{ambulancias.map((a:any)=>(
<option key={a.codigo_operativo} value={a.codigo_operativo}>
{a.codigo_operativo}
</option>
))}
</select>

<div className="flex justify-between mt-4">
<button onClick={crearNuevo} className="bg-green-600 px-4 py-2 rounded">Guardar</button>
<button onClick={()=>setNuevo(false)} className="bg-red-600 px-4 py-2 rounded">Cancelar</button>
</div>
</div>
</div>
)}

{/* 🔥 MODAL AMBULANCIA */}
{nuevaAmbulancia && (
<div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
<div className="bg-gray-900 p-6 rounded-xl w-80">
<h2 className="mb-4">Nueva ambulancia</h2>

<input
className="w-full mb-3 p-2 bg-black border"
placeholder="Código"
value={codigoAmbulancia}
onChange={(e)=>setCodigoAmbulancia(e.target.value)}
/>

<div className="flex justify-between">
<button onClick={crearAmbulancia} className="bg-green-600 px-4 py-2 rounded">Guardar</button>
<button onClick={()=>setNuevaAmbulancia(false)} className="bg-red-600 px-4 py-2 rounded">Cancelar</button>
</div>

</div>
</div>
)}

{/* 🔥 RESTO DE TU UI SIGUE IGUAL (NO TOCADO) */}

{/* 🔥 MODAL EDITAR */}
{editando && (
<div className="fixed inset-0 bg-black/80 flex items-center justify-center">
<div className="bg-gray-900 p-6 rounded-xl w-80">

<h2 className="mb-4">Editar</h2>

<input
className="w-full mb-3 p-2 bg-black border"
value={editando.nombre}
onChange={(e)=>setEditando({...editando,nombre:e.target.value})}
/>

<div className="flex justify-between">
<button onClick={actualizar} className="bg-green-600 px-4 py-2 rounded">Guardar</button>
<button onClick={()=>setEditando(null)} className="bg-red-600 px-4 py-2 rounded">Cancelar</button>
</div>

</div>
</div>
)}

</div>
)
}