"use client"

import { useState, useEffect } from "react"
import * as XLSX from "xlsx"
import { supabase } from "@/lib/supabaseClient"

export default function ImportarBitacora(){

const [file,setFile] = useState<File | null>(null)
const [loading,setLoading] = useState(false)
const [ambulancias,setAmbulancias] = useState<any[]>([])
const [ambulanciaId,setAmbulanciaId] = useState("")

useEffect(()=>{
cargarAmbulancias()
},[])

async function cargarAmbulancias(){
const { data } = await supabase
.from("ambulancias")
.select("id,codigo_operativo")
.order("codigo_operativo")

setAmbulancias(data || [])
}

/* FECHA */
function parseFecha(valor:any){
if(!valor) return null

if(typeof valor === "number"){
const utc_days = Math.floor(valor - 25569)
const utc_value = utc_days * 86400
const date = new Date(utc_value * 1000)
return date.toISOString().split("T")[0]
}

if(typeof valor === "string"){
const clean = valor.replace(/\./g,"-").replace(/\//g,"-").trim()
const parts = clean.split("-")

if(parts.length === 3){
let [d,m,y] = parts
if(y.length === 2) y = "20"+y
if(Number(m) > 12 || Number(d) > 31) return null
return `${y}-${m.padStart(2,"0")}-${d.padStart(2,"0")}`
}
}

return null
}

async function procesar(){

if(!file){
alert("Seleccione archivo")
return
}

if(!ambulanciaId){
alert("Seleccione ambulancia")
return
}

setLoading(true)

try{

const data = await file.arrayBuffer()
const workbook = XLSX.read(data)

let registros:any[] = []

for(const sheetName of workbook.SheetNames){

const sheet = workbook.Sheets[sheetName]
const rows:any[] = XLSX.utils.sheet_to_json(sheet,{header:1})

let tipoActual = "GENERAL"

for(let i=0;i<rows.length;i++){

const rowLower = rows[i].map((c:any)=>String(c).toLowerCase())
const rowText = rowLower.join(" ")

if(rowText.includes("dispositivos")){
tipoActual = "DISPOSITIVO"
continue
}
if(rowText.includes("medicamentos")){
tipoActual = "MEDICAMENTO"
continue
}
if(rowText.includes("insumos")){
tipoActual = "INSUMO"
continue
}

let nombre = rows[i][0]
if(!nombre || typeof nombre !== "string") continue
if(nombre.toLowerCase().includes("descripcion")) continue

const lote = rows[i][1]
const fecha = parseFecha(rows[i][2])
const cantidad = rows[i][3]

registros.push({
nombre: nombre.trim(),
tipo: tipoActual,
lote: lote || null,
fecha_caducidad: fecha,
cantidad: Number(cantidad || 0),
ambulancia_id: ambulanciaId, // 🔥 CLAVE
estado: "OK"
})
}

}

const { error } = await supabase
.from("bitacora_items")
.upsert(registros,{
onConflict:"nombre,lote,fecha_caducidad,tipo,ambulancia_id",
ignoreDuplicates:true
})

if(error){
alert("Error: "+error.message)
}else{
alert(`Importado 🚑 (${registros.length})`)
}

}catch(err){
alert("Error procesando")
}

setLoading(false)
}

return(
<div style={{padding:40}}>

<h1>📋 Importar Bitácora por Ambulancia</h1>

<select
value={ambulanciaId}
onChange={(e)=>setAmbulanciaId(e.target.value)}
>
<option value="">Seleccione ambulancia</option>
{ambulancias.map(a=>(
<option key={a.id} value={a.id}>
{a.codigo_operativo}
</option>
))}
</select>

<br/><br/>

<input type="file" onChange={(e)=>setFile(e.target.files?.[0] || null)} />

<br/><br/>

<button onClick={procesar}>
{loading ? "Importando..." : "Importar"}
</button>

</div>
)
}