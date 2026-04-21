import React from "react";
import { useParams } from "react-router-dom";
import { useRole } from "@/contexts/RoleContext";
import { DEMO_DATA } from "@/lib/mecALocalStore";

export default function PresupuestoMecAPage() {
  const { id } = useParams<{ id: string }>();
  const { iniciativaId } = useRole();
  const resolvedId = id ?? iniciativaId ?? "demo-ini-senasa-2025";

  // Use hardcoded DEMO_DATA directly to prevent any Supabase calls
  const acts = DEMO_DATA.mec_a_actividades.filter(a => a.iniciativa_id === resolvedId);
  const prods = DEMO_DATA.mec_a_productos.filter(p => p.iniciativa_id === resolvedId);
  const res = DEMO_DATA.mec_a_resultados.filter(r => r.iniciativa_id === resolvedId);

  const arbol = acts.map(act => {
    const producto = prods.find(p => p.id === act.producto_id)!;
    const resultado = res.find(r => r.id === producto.resultado_id)!;
    return { ...act, producto, resultado };
  });

  const entregables = DEMO_DATA.mec_a_entregables_consultores.filter(
    e => e.iniciativa_id === resolvedId && e.estado_producto === "conforme" && e.pago_usd
  );
  const cm = DEMO_DATA.mec_a_contrapartida_monetaria.filter(c => c.iniciativa_id === resolvedId);
  const cnm = DEMO_DATA.mec_a_contrapartida_no_monetaria.filter(c => c.iniciativa_id === resolvedId);

  const resultadosUnique = [...new Map(arbol.map(a => [a.resultado.id, a.resultado])).values()].sort((a,b) => a.orden - b.orden);

  let totalPlanSeco = 0, totalEjecSeco = 0;
  let totalPlanCm = 0, totalEjecCm = 0;
  let totalPlanCnm = 0, totalEjecCnm = 0;

  return (
    <div className="space-y-5 pb-8">
      <div>
        <h1 className="text-lg font-bold">Seguimiento de Presupuesto</h1>
        <p className="text-sm text-muted-foreground">Monitoreo de ejecución financiera por actividad (solo lectura)</p>
      </div>

      <div className="overflow-x-auto rounded-lg border bg-card text-card-foreground shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground">Código</th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground">Descripción</th>
              <th className="px-3 py-2.5 text-right text-xs font-semibold text-muted-foreground">Plan. SECO</th>
              <th className="px-3 py-2.5 text-right text-xs font-semibold text-muted-foreground">Ejec. SECO</th>
              <th className="px-3 py-2.5 text-right text-xs font-semibold text-muted-foreground">Saldo SECO</th>
              <th className="px-3 py-2.5 text-right text-xs font-semibold text-muted-foreground">Plan. CM</th>
              <th className="px-3 py-2.5 text-right text-xs font-semibold text-muted-foreground">Ejec. CM</th>
              <th className="px-3 py-2.5 text-right text-xs font-semibold text-muted-foreground">Saldo CM</th>
              <th className="px-3 py-2.5 text-right text-xs font-semibold text-muted-foreground">Plan. CNM</th>
              <th className="px-3 py-2.5 text-right text-xs font-semibold text-muted-foreground">Ejec. CNM</th>
              <th className="px-3 py-2.5 text-right text-xs font-semibold text-muted-foreground">Saldo CNM</th>
            </tr>
          </thead>
          <tbody>
            {resultadosUnique.map(res => {
              const actsRes = arbol.filter(a => a.resultado.id === res.id).sort((a,b) => a.orden - b.orden);
              const productosUnique = [...new Map(actsRes.map(a => [a.producto.id, a.producto])).values()].sort((a,b) => a.orden - b.orden);

              return (
                <React.Fragment key={res.id}>
                  {/* Fila de Resultado */}
                  <tr className="bg-slate-100 dark:bg-slate-800/50">
                    <td className="px-3 py-2 font-mono text-xs font-semibold border-b">{res.numero}</td>
                    <td colSpan={10} className="px-3 py-2 text-xs font-semibold border-b">{res.nombre}</td>
                  </tr>

                  {productosUnique.map(prod => {
                    const actsProd = actsRes.filter(a => a.producto.id === prod.id);
                    return (
                      <React.Fragment key={prod.id}>
                        {/* Fila de Producto */}
                        <tr className="bg-slate-50 dark:bg-slate-900/50">
                          <td className="px-3 py-2 font-mono text-xs border-b pl-6">{prod.numero}</td>
                          <td colSpan={10} className="px-3 py-2 text-xs text-muted-foreground border-b">{prod.nombre}</td>
                        </tr>

                        {actsProd.map(act => {
                          const planSeco = act.seco_honorarios_usd + act.seco_viaticos_usd + act.seco_servicios_usd + act.seco_materiales_usd;
                          const ejecSeco = entregables.filter(e => e.actividad_id === act.id).reduce((sum, e) => sum + (e.pago_usd || 0), 0);
                          const saldoSeco = planSeco - ejecSeco;

                          const planCm = act.cm_honorarios_usd + act.cm_viaticos_usd + act.cm_servicios_usd + act.cm_materiales_usd;
                          const ejecCm = cm.filter(c => c.actividad_id === act.id).reduce((sum, c) => sum + (c.monto_usd || 0), 0);
                          const saldoCm = planCm - ejecCm;

                          const planCnm = act.cnm_total_usd;
                          const ejecCnm = cnm.filter(c => c.actividad_id === act.id).reduce((sum, c) => sum + (c.total_usd || 0), 0);
                          const saldoCnm = planCnm - ejecCnm;

                          totalPlanSeco += planSeco; totalEjecSeco += ejecSeco;
                          totalPlanCm += planCm; totalEjecCm += ejecCm;
                          totalPlanCnm += planCnm; totalEjecCnm += ejecCnm;

                          return (
                            <tr key={act.id} className="border-b last:border-0 hover:bg-muted/20">
                              <td className="px-3 py-2.5 font-mono text-[11px] text-muted-foreground pl-10">{act.codigo}</td>
                              <td className="px-3 py-2.5 text-[11px] max-w-[200px] truncate" title={act.descripcion}>{act.descripcion}</td>
                              
                              <td className="px-3 py-2.5 text-[11px] text-right font-mono">{planSeco > 0 ? planSeco.toLocaleString() : "—"}</td>
                              <td className="px-3 py-2.5 text-[11px] text-right font-mono">{ejecSeco > 0 ? ejecSeco.toLocaleString() : "—"}</td>
                              <td className={`px-3 py-2.5 text-[11px] text-right font-mono font-medium ${saldoSeco < 0 ? 'text-red-500' : ''}`}>{saldoSeco !== 0 ? saldoSeco.toLocaleString() : "—"}</td>

                              <td className="px-3 py-2.5 text-[11px] text-right font-mono bg-blue-50/30 dark:bg-blue-950/10">{planCm > 0 ? planCm.toLocaleString() : "—"}</td>
                              <td className="px-3 py-2.5 text-[11px] text-right font-mono bg-blue-50/30 dark:bg-blue-950/10">{ejecCm > 0 ? ejecCm.toLocaleString() : "—"}</td>
                              <td className={`px-3 py-2.5 text-[11px] text-right font-mono font-medium bg-blue-50/30 dark:bg-blue-950/10 ${saldoCm < 0 ? 'text-red-500' : ''}`}>{saldoCm !== 0 ? saldoCm.toLocaleString() : "—"}</td>

                              <td className="px-3 py-2.5 text-[11px] text-right font-mono bg-emerald-50/30 dark:bg-emerald-950/10">{planCnm > 0 ? planCnm.toLocaleString() : "—"}</td>
                              <td className="px-3 py-2.5 text-[11px] text-right font-mono bg-emerald-50/30 dark:bg-emerald-950/10">{ejecCnm > 0 ? ejecCnm.toLocaleString() : "—"}</td>
                              <td className={`px-3 py-2.5 text-[11px] text-right font-mono font-medium bg-emerald-50/30 dark:bg-emerald-950/10 ${saldoCnm < 0 ? 'text-red-500' : ''}`}>{saldoCnm !== 0 ? saldoCnm.toLocaleString() : "—"}</td>
                            </tr>
                          );
                        })}
                      </React.Fragment>
                    );
                  })}
                </React.Fragment>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-muted font-bold text-xs border-t-2">
              <td colSpan={2} className="px-3 py-3 text-right">TOTAL GENERAL (USD)</td>
              
              <td className="px-3 py-3 text-right font-mono">{totalPlanSeco.toLocaleString()}</td>
              <td className="px-3 py-3 text-right font-mono">{totalEjecSeco.toLocaleString()}</td>
              <td className="px-3 py-3 text-right font-mono text-primary">{(totalPlanSeco - totalEjecSeco).toLocaleString()}</td>
              
              <td className="px-3 py-3 text-right font-mono bg-blue-100/50 dark:bg-blue-900/20">{totalPlanCm.toLocaleString()}</td>
              <td className="px-3 py-3 text-right font-mono bg-blue-100/50 dark:bg-blue-900/20">{totalEjecCm.toLocaleString()}</td>
              <td className="px-3 py-3 text-right font-mono text-blue-700 dark:text-blue-400 bg-blue-100/50 dark:bg-blue-900/20">{(totalPlanCm - totalEjecCm).toLocaleString()}</td>
              
              <td className="px-3 py-3 text-right font-mono bg-emerald-100/50 dark:bg-emerald-900/20">{totalPlanCnm.toLocaleString()}</td>
              <td className="px-3 py-3 text-right font-mono bg-emerald-100/50 dark:bg-emerald-900/20">{totalEjecCnm.toLocaleString()}</td>
              <td className="px-3 py-3 text-right font-mono text-emerald-700 dark:text-emerald-400 bg-emerald-100/50 dark:bg-emerald-900/20">{(totalPlanCnm - totalEjecCnm).toLocaleString()}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
