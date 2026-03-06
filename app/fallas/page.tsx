"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function FallasPage(){

  const [ambulancia,setAmbulancia]=useState("");
  const [descripcion,setDescripcion]=useState("");
  const [imagen,setImagen]=useState<File | null>(null);

  async function enviar(){

    let url_imagen="";

    if(imagen){

      const nombre=Date.now()+"_"+imagen.name;

      const { data } = await supabase.storage
      .from("fallas-ambulancias")
      .upload(nombre,imagen);

      if(data){
        url_imagen=data.path;
      }

    }

    await supabase
    .from("reportes_fallas")
    .insert({
      ambulancia_id:ambulancia,
      descripcion:descripcion,
      imagen_url:url_imagen,
      usuario:"operador"
    });

    alert("Falla registrada");

  }

  return(

    <div style={{padding:40}}>

      <h1>Reporte de Falla Mecánica</h1>

      <input
      placeholder="ID Ambulancia"
      onChange={(e)=>setAmbulancia(e.target.value)}
      />

      <br/><br/>

      <textarea
      placeholder="Descripción del problema"
      onChange={(e)=>setDescripcion(e.target.value)}
      />

      <br/><br/>

      <input
      type="file"
      onChange={(e)=>setImagen(e.target.files?.[0] || null)}
      />

      <br/><br/>

      <button onClick={enviar}>
        Reportar Falla
      </button>

    </div>

  );

}
