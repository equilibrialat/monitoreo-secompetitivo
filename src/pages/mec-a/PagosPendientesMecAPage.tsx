import { TabPagosPendientesMecA } from "./PagosPendientesMecATab";

export default function PagosPendientesMecAPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-bold">Pagos Pendientes — Mecanismo A</h1>
        <p className="text-sm text-muted-foreground">Entregables de consultores aprobados pendientes de pago SECO</p>
      </div>
      <TabPagosPendientesMecA />
    </div>
  );
}
