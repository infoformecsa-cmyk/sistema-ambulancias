"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Alerta = {
  id: number;
  ambulancia_id: string;
  mensaje: string;
  fecha: string;
};

export default function AlertasPage() {

  const [alertas, setAlertas] = useState<Alerta[]>([]);

  useEffect(() => {
    cargarAlertas();
  }, []);

  const cargarAlertas = async () => {

    const { data, error } = await supabase
      .from("alertas")
      .select("*")
      .order("fecha", { ascending: false });

    if (error) {
      console.error(error);
      return;
    }

    if (data) {
      setAlertas(data);
    }
  };

  return (
    <div style={{ padding: 40 }}>

      <h1>Alertas del Sistema</h1>

      {alertas.length === 0 && (
        <p>No hay alertas registradas.</p>
      )}

      {alertas.map((alerta) => (

        <div
          key={alerta.id}
          style={{
            border: "1px solid #ccc",
            padding: 10,
            marginTop: 10
          }}
        >

          <b>{alerta.ambulancia_id}</b>

          <p>{alerta.mensaje}</p>

          <small>{alerta.fecha}</small>

        </div>

      ))}

    </div>
  );
}