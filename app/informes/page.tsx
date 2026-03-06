"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function Informes(){

const [ambulancia,setAmbulancia]=useState("");
const [titulo,setTitulo]=useState("");
const [descripcion,setDescripcion]=useState("");
const [archivo,setArchivo]=useState<File | null>(null);

async function subir(){

let url="";

if(archivo){

const nombre=Date.now()+"_"+archivo.name;

const {data}=await supabase.storage
.from("informes-mecanicos")
.upload(nombre,archivo);

if(data){
url=data.path;
}

}

await supabase
.from("informes_mecanicos")
.insert({

ambulancia_id:ambulancia,
titulo:titulo,
descripcion:descripcion,
archivo_pdf:url

});

alert("Informe cargado");

}

return(

<div style={{padding:40}}>

<h1>Subir Informe Mecánico</h1>

<input
placeholder="ID Ambulancia"
onChange={(e)=>setAmbulancia(e.target.value)}
/>

<br/><br/>

<input
placeholder="Título del informe"
onChange={(e)=>setTitulo(e.target.value)}
/>

<br/><br/>

<textarea
placeholder="Descripción"
onChange={(e)=>setDescripcion(e.target.value)}
/>

<br/><br/>

<input
type="file"
accept="application/pdf"
onChange={(e)=>setArchivo(e.target.files?.[0] || null)}
/>

<br/><br/>

<button onClick={subir}>
Subir Informe
</button>

</div>

)

}
