"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Ambulancia = {
  id: number;
  codigo: string;
  estado: string;
};

export default function AmbulanciasPage() {

  const [ambulancias, setAmbulancias] = useState<Ambulancia[]>([]);

  useEffect(() => {
    cargarAmbulancias();
  }, []);

  const cargarAmbulancias = async () => {

    const { data, error } = await supabase
      .from("ambulancias")
      .select("*")
      .order("codigo");

    if (error) {
      console.error(error);
      return;
    }

    if (data) {
      setAmbulancias(data);
    }
  };

  return (
    <div style={{ padding: 40 }}>

      <h1>Sistema de Control de Ambulancias</h1>

      <h2>Flota registrada</h2>

      <table border={1} cellPadding={10}>

        <thead>
          <tr>
            <th>Código</th>
            <th>Estado</th>
            <th>Acceso</th>
          </tr>
        </thead>

        <tbody>

          {ambulancias.map((a) => (

            <tr key={a.id}>
              <td>{a.codigo}</td>
              <td>{a.estado}</td>

              <td>
                <Link href={`/ambulancia/${a.codigo}`}>
                  Abrir ficha
                </Link>
              </td>
            </tr>

          ))}

        </tbody>

      </table>

    </div>
  );
}