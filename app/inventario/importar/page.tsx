"use client"

import { useState } from "react"
import * as XLSX from "xlsx"
import { supabase } from "@/lib/supabaseClient"

export default function Importar(){

const [file,setFile] = useState<File | null>(null)
const [loading,setLoading] = useState(false)

/* 🔥 CONVERTIR FECHA */
function excelDateToJSDate(serial:number){
const utc_days = Math.floor(serial - 25569)
const utc_value = utc_days * 86400
const date = new Date(utc_value * 1000)
return date.toISOString().split("T")[0]
}

async function procesar(){

if(!file){
alert("Seleccione archivo")
return
}

setLoading(true)

try{

const data = await file.arrayBuffer()
const workbook = XLSX.read(data)
const sheet = workbook.Sheets[workbook.SheetNames[0]]

const rows:any[] = XLSX.utils.sheet_to_json(sheet,{header:1})

if(rows.length === 0){
alert("Excel vacío")
setLoading(false)
return
}

/* 🔥 DETECTAR ENCABEZADO */
let headerRowIndex = -1

for(let i=0;i<rows.length;i++){
const row = rows[i].map((c:any)=>String(c).toLowerCase())

if(row.some((c:string)=>
c.includes("descripcion") ||
c.includes("dispositivo")
)){
headerRowIndex = i
break
}
}

if(headerRowIndex === -1){
alert("No se encontró fila de encabezados válida")
setLoading(false)
return
}

const headers = rows[headerRowIndex].map((h:any)=>String(h).toLowerCase())

const findIndex = (keywords:string[])=>{
return headers.findIndex((h:string)=>
keywords.some(k=>h.includes(k))
)
}

const idxNombre = findIndex(["descripcion","dispositivo"])
const idxStock = findIndex(["stock","saldo"])
const idxCodigo = findIndex(["codigo"])
const idxLote = findIndex(["lote"])
const idxFecha = findIndex(["caducidad","fecha"])

if(idxNombre === -1){
alert("No se encontró columna descripción")
setLoading(false)
return
}

/* 🔥 PROCESAR */
const registros = rows.slice(headerRowIndex + 1)
.map((row:any)=>{

const nombre = row[idxNombre]
if(!nombre) return null

let fecha = null
const rawFecha = row[idxFecha]

if(typeof rawFecha === "number"){
fecha = excelDateToJSDate(rawFecha)
}else if(typeof rawFecha === "string"){
fecha = rawFecha
}

return {
nombre: String(nombre),

codigo: idxCodigo !== -1 ? row[idxCodigo] : null,

cantidad: Number(row[idxStock] || 0),

lote: idxLote !== -1 ? row[idxLote] : null,

fecha_caducidad: fecha,

categoria: "DISPOSITIVOS",
estado: "activo",

stock_minimo: 0,
cantidad_base: 0,
tipo: "DISPOSITIVO",
ubicacion: "BODEGA"
}

})
.filter(Boolean)

if(registros.length === 0){
alert("No se detectaron datos válidos en el Excel")
setLoading(false)
return
}

/* 🔥 EVITAR DUPLICADOS */

// Obtener códigos existentes
const { data: existentes, error: errorConsulta } = await supabase
.from("inventario_items")
.select("codigo")

if(errorConsulta){
console.error("Error consultando existentes:", errorConsulta)
alert("Error validando duplicados")
setLoading(false)
return
}

// Crear set de códigos existentes
const codigosExistentes = new Set(
existentes
?.map((e:any)=>e.codigo)
.filter((c:any)=>c !== null)
)

// Separar nuevos vs duplicados
const nuevos = registros.filter((r:any)=>
r.codigo ? !codigosExistentes.has(r.codigo) : true
)

const duplicados = registros.length - nuevos.length

if(nuevos.length === 0){
alert(`Todos los registros ya existen (${duplicados} duplicados)`)
setLoading(false)
return
}

/* 🔥 INSERT SOLO NUEVOS */
const { error } = await supabase
.from("inventario_items")
.insert(nuevos)

if(error){
console.error("ERROR:", error)
alert("Error: " + JSON.stringify(error))
}else{
alert(
`Importación completada 🚑
Nuevos: ${nuevos.length}
Duplicados omitidos: ${duplicados}`
)
}

}catch(err){
console.error(err)
alert("Error procesando archivo")
}

setLoading(false)
}

return(
<div style={{padding:40}}>

<h1>📦 Importar Dispositivos</h1>

<input
type="file"
accept=".xlsx,.xls"
onChange={(e)=>setFile(e.target.files?.[0] || null)}
/>

<br/><br/>

<button onClick={procesar}>
{loading ? "Importando..." : "Importar"}
</button>

</div>
)
}