"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Ambulancia = {
  id: number;
  codigo: string;
  estado: string;
};

type Falla = {
  id: number;
  ambulancia_codigo: string;
  descripcion: string;
  criticidad: string;
  fecha: string;
};

type Alerta = {
  id: number;
  ambulancia_codigo: string;
  mensaje: string;
  atendida: boolean;
};

export default function ReportesPage() {

  const [ambulancias, setAmbulancias] = useState<Ambulancia[]>([]);
  const [fallas, setFallas] = useState<Falla[]>([]);
  const [alertas, setAlertas] = useState<Alerta[]>([]);

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {

    const { data: amb } = await supabase
      .from("ambulancias")
      .select("*");

    const { data: fallasData } = await supabase
      .from("informes_mecanicos")
      .select("*");

    const { data: alertasData } = await supabase
      .from("alertas")
      .select("*")
      .eq("atendida", false);

    if (amb) setAmbulancias(amb);
    if (fallasData) setFallas(fallasData);
    if (alertasData) setAlertas(alertasData);
  };

  return (

    <div style={{ padding: 40 }}>

      <h1>Reportes del sistema</h1>

      <h2>Ambulancias registradas</h2>

      <table border={1} cellPadding={10}>
        <thead>
          <tr>
            <th>Código</th>
            <th>Estado</th>
          </tr>
        </thead>

        <tbody>

          {ambulancias.map((a) => (
            <tr key={a.id}>
              <td>{a.codigo}</td>
              <td>{a.estado}</td>
            </tr>
          ))}

        </tbody>

      </table>

      <br />

      <h2>Fallas registradas</h2>

      <table border={1} cellPadding={10}>
        <thead>
          <tr>
            <th>Ambulancia</th>
            <th>Descripción</th>
            <th>Criticidad</th>
            <th>Fecha</th>
          </tr>
        </thead>

        <tbody>

          {fallas.map((f) => (
            <tr key={f.id}>
              <td>{f.ambulancia_codigo}</td>
              <td>{f.descripcion}</td>
              <td>{f.criticidad}</td>
              <td>{f.fecha}</td>
            </tr>
          ))}

        </tbody>

      </table>

      <br />

      <h2>Alertas pendientes</h2>

      <table border={1} cellPadding={10}>
        <thead>
          <tr>
            <th>Ambulancia</th>
            <th>Mensaje</th>
          </tr>
        </thead>

        <tbody>

          {alertas.map((a) => (
            <tr key={a.id}>
              <td>{a.ambulancia_codigo}</td>
              <td>{a.mensaje}</td>
            </tr>
          ))}

        </tbody>

      </table>

    </div>

  );
}