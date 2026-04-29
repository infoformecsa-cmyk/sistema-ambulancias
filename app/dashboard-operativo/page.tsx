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

/* FETCH */
const fetchData = async () => {
try{

const { data: p } = await supabase.from('personal').select('*')

const { data: a } = await supabase
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

const { data: amb } = await supabase
.from('ambulancias')
.select('codigo_operativo')
.order('codigo_operativo')

setPersonal(p || [])
setArchivos(archivosAdaptados || [])
setAmbulancias(amb || [])

}catch(e){
console.error(e)
alert("Error general")
}
}

/* FUNCIONES */
const eliminar = async (id:number)=>{
if(!confirm("¿Eliminar?")) return
await supabase.from('personal').delete().eq('id',id)
await fetchData()
}

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

const crearNuevo = async ()=>{
if(!formNuevo.nombre) return alert("Nombre requerido")

await supabase.from('personal').insert([{
...formNuevo,
estado:"Activo"
}])

setNuevo(false)
await fetchData()
}

const crearAmbulancia = async ()=>{
if(!codigoAmbulancia) return
await supabase.from('ambulancias')
.insert([{ codigo_operativo: codigoAmbulancia }])

setCodigoAmbulancia("")
setNuevaAmbulancia(false)
await fetchData()
}

const logout = ()=>{
localStorage.clear()
router.replace('/')
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
return <div className="min-h-screen flex items-center justify-center bg-black text-white">🚑 Cargando...</div>
}

const guardias = ['G1','G2','G3','G4','G5']

return (
<div className="min-h-screen bg-black text-white p-6">

{/* HEADER */}
<div className="flex justify-between mb-6">
<h1 className="text-4xl text-cyan-400">🚑 CONTROL OPERATIVO</h1>

<div className="flex gap-3">
<button onClick={fetchData} className="bg-blue-600 px-4 py-2 rounded">🔄</button>
<button onClick={()=>setNuevo(true)} className="bg-green-600 px-4 py-2 rounded">➕</button>
<button onClick={()=>setNuevaAmbulancia(true)} className="bg-purple-600 px-4 py-2 rounded">🚑</button>
<button onClick={logout} className="bg-red-600 px-4 py-2 rounded">Salir</button>
</div>
</div>

{/* KPIs */}
<div className="grid grid-cols-4 gap-4 mb-6">
<div>Total: {personal.length}</div>
<div>Activos: {personal.filter(p=>p.estado==="Activo").length}</div>
<div>Alertas: {alertas.length}</div>
<div>Reportes: {archivos.length}</div>
</div>

{/* CONTENIDO */}
<div className="grid grid-cols-3 gap-6">

<div className="col-span-2 grid grid-cols-2 gap-6">

{guardias.map((g)=>{

const ambulancias = agruparPorAmbulancia(getAmbulancia(g))
const consola = getConsola(g)

return(
<div key={g} className="bg-gray-900 p-4 rounded">

<h2>{g}</h2>

{ambulancias.map(([ambulancia,personas]:any)=>(
<div key={ambulancia}>
<h3>{ambulancia}</h3>

{personas.map((p:any)=>(
<div key={p.id} className="flex justify-between">
<p>{p.nombre}</p>
<div>
<button onClick={()=>setEditando(p)}>✏️</button>
<button onClick={()=>eliminar(p.id)}>🗑️</button>
</div>
</div>
))}

</div>
))}

{consola.length > 0 && (
<div>
<h3>CONSOLA</h3>
{consola.map((p:any)=>(
<div key={p.id}>
{p.nombre}
</div>
))}
</div>
)}

</div>
)

})}

</div>

{/* PANEL DERECHO */}
<div>
<h2>Reportes</h2>

{archivos.map((a)=>(
<div key={a.id} className="flex justify-between">

<span>{a.nombre}</span>

<div className="flex gap-2">
<a href={a.archivo_url} target="_blank">Ver</a>
<a href={a.archivo_url} download>Descargar</a>
</div>

</div>
))}

</div>

</div>

{/* MODAL NUEVO */}
{nuevo && (
<div className="fixed inset-0 bg-black/80 flex justify-center items-center">
<div className="bg-gray-900 p-6">

<input
value={formNuevo.nombre}
onChange={(e)=>setFormNuevo({...formNuevo,nombre:e.target.value})}
/>

<button onClick={crearNuevo}>Guardar</button>

</div>
</div>
)}

{/* MODAL EDITAR */}
{editando && (
<div className="fixed inset-0 bg-black/80 flex justify-center items-center">
<div className="bg-gray-900 p-6">

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