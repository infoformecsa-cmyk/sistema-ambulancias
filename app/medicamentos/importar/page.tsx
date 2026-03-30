"use client"

import { useState } from "react"
import * as XLSX from "xlsx"
import { supabase } from "@/lib/supabaseClient"

export default function Importar(){

const [file,setFile] = useState<File | null>(null)
const [loading,setLoading] = useState(false)

/* 🔥 VALIDAR FECHA REAL */
function esFechaValida(anio:number, mes:number, dia:number){
const fecha = new Date(anio, mes - 1, dia)
return (
fecha.getFullYear() === anio &&
fecha.getMonth() === mes - 1 &&
fecha.getDate() === dia
)
}

/* 🔥 PARSER PRO */
function formatFecha(valor:any){

if(!valor) return null

/* número Excel */
if(typeof valor === "number"){
const utc_days = Math.floor(valor - 25569)
const utc_value = utc_days * 86400
const date = new Date(utc_value * 1000)
return date.toISOString().split("T")[0]
}

/* string */
if(typeof valor === "string"){

let clean = valor.trim()

clean = clean.replaceAll("/", "-")
clean = clean.replaceAll(".", "-")
clean = clean.replaceAll(",", "-")

const partes = clean.split("-")

if(partes.length === 3){

let [a,b,c] = partes

let dia:number, mes:number, anio:number

if(a.length === 4){
/* YYYY-MM-DD */
anio = Number(a)
mes = Number(b)
dia = Number(c)
}else{
/* DD-MM-YYYY */
dia = Number(a)
mes = Number(b)
anio = Number(c)
}

/* 🔥 VALIDACIÓN */
if(!esFechaValida(anio,mes,dia)){
console.warn("Fecha inválida detectada:", valor)

/* OPCIÓN: AJUSTAR AUTOMÁTICAMENTE */
const fecha = new Date(anio, mes - 1, dia)
return fecha.toISOString().split("T")[0]
}

return `${anio}-${String(mes).padStart(2,"0")}-${String(dia).padStart(2,"0")}`
}

return null
}

return null
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

/* HEADER */
let headerIndex = -1

for(let i=0;i<rows.length;i++){
const row = rows[i].map((c:any)=>String(c).toLowerCase())

if(row.some((c:string)=>c.includes("nombre"))){
headerIndex = i
break
}
}

if(headerIndex === -1){
alert("No se encontró encabezado válido")
setLoading(false)
return
}

const headers = rows[headerIndex].map((h:any)=>String(h).toLowerCase())

const findIndex = (keys:string[])=>{
return headers.findIndex((h:string)=>
keys.some(k=>h.includes(k))
)
}

const idxNombre = findIndex(["nombre"])
const idxConcentracion = findIndex(["concentracion"])
const idxPresentacion = findIndex(["presentacion"])
const idxLote = findIndex(["lote"])
const idxFecha = findIndex(["caducidad","fecha"])
const idxCantidad = findIndex(["cantidad","stock"])

if(idxNombre === -1){
alert("No se encontró columna nombre")
setLoading(false)
return
}

/* DATA */
const registros = rows.slice(headerIndex + 1)
.map((row:any)=>{

const nombre = row[idxNombre]
if(!nombre) return null

return {
nombre: String(nombre),

concentracion: idxConcentracion !== -1 ? row[idxConcentracion] : null,

presentacion: idxPresentacion !== -1 ? row[idxPresentacion] : null,

lote: idxLote !== -1 ? row[idxLote] : null,

fecha_caducidad: formatFecha(idxFecha !== -1 ? row[idxFecha] : null),

cantidad: Number(idxCantidad !== -1 ? row[idxCantidad] : 0),

ubicacion: "BODEGA"
}

})
.filter(Boolean)

if(registros.length === 0){
alert("No hay datos válidos")
setLoading(false)
return
}

const { error } = await supabase
.from("medicamentos")
.insert(registros)

if(error){
console.error(error)
alert("Error: " + error.message)
}else{
alert(`Importación completada 💊 (${registros.length} registros)`)
}

}catch(err){
console.error(err)
alert("Error procesando archivo")
}

setLoading(false)
}

return(
<div style={{padding:40}}>

<h1>💊 Importar Medicamentos</h1>

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