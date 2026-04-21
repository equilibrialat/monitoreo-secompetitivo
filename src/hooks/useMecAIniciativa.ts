import { useState, useEffect, useCallback } from "react";
import {
  fetchMecAIniciativa,
  fetchMecAResultados,
  fetchMecAProductos,
  fetchMecAActividades,
  type MecAIniciativa,
  type MecAResultado,
  type MecAProducto,
  type MecAActividad,
} from "@/lib/mecA";

export interface MecAArbolActividad extends MecAActividad {
  producto: MecAProducto;
  resultado: MecAResultado;
}

export interface MecAIniciativaCompleta {
  iniciativa: MecAIniciativa | null;
  resultados: MecAResultado[];
  productos: MecAProducto[];
  actividades: MecAActividad[];
  arbol: MecAArbolActividad[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useMecAIniciativa(iniciativaId: string | null): MecAIniciativaCompleta {
  const [iniciativa, setIniciativa] = useState<MecAIniciativa | null>(null);
  const [resultados, setResultados] = useState<MecAResultado[]>([]);
  const [productos, setProductos] = useState<MecAProducto[]>([]);
  const [actividades, setActividades] = useState<MecAActividad[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!iniciativaId) return;
    setLoading(true);
    setError(null);
    try {
      const [ini, res, prod, acts] = await Promise.all([
        fetchMecAIniciativa(iniciativaId),
        fetchMecAResultados(iniciativaId),
        fetchMecAProductos(iniciativaId),
        fetchMecAActividades(iniciativaId),
      ]);
      setIniciativa(ini);
      setResultados(res);
      setProductos(prod);
      setActividades(acts);
    } catch (e: any) {
      setError(e?.message ?? "Error cargando iniciativa");
    } finally {
      setLoading(false);
    }
  }, [iniciativaId]);

  useEffect(() => { load(); }, [load]);

  // Enrich activities with their product and result
  const arbol: MecAArbolActividad[] = actividades.map((act) => {
    const producto = productos.find((p) => p.id === act.producto_id)!;
    const resultado = resultados.find((r) => r.id === producto?.resultado_id)!;
    return { ...act, producto, resultado };
  });

  return { iniciativa, resultados, productos, actividades, arbol, loading, error, refresh: load };
}
