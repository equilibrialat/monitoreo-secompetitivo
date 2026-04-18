import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Inbox } from "lucide-react";
import { useRole } from "@/contexts/RoleContext";
import BandejaReasignaciones from "@/components/planificacion/BandejaReasignaciones";

export default function BandejaReasignacionesPage() {
  const { role } = useRole();

  const isCoordinador = role === "coordinador_regional";
  const isIvan = role === "coordinador_cadenas";

  if (!isCoordinador && !isIvan) {
    return (
      <div className="container mx-auto p-4 max-w-3xl">
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Esta vista está disponible para Coordinador Regional y Coordinador de Cadenas de Valor.
          </CardContent>
        </Card>
      </div>
    );
  }

  // Si el usuario es Coordinador Regional muestra una pestaña; Iván otra. Si es ambos por
  // testing/role-switch, muestra ambas.
  const defaultTab = isCoordinador ? "coordinador" : "ivan";

  return (
    <div className="container mx-auto p-4 max-w-4xl space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Inbox className="h-5 w-5 text-primary" />
            Solicitudes de reasignación presupuestal
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Revisa, aprueba o devuelve las solicitudes pendientes de las entidades.
          </p>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue={defaultTab}>
            <TabsList className="mb-3">
              {isCoordinador && (
                <TabsTrigger value="coordinador">Pendientes (Coordinador Regional)</TabsTrigger>
              )}
              {isIvan && (
                <TabsTrigger value="ivan">Pendientes (Cadenas de Valor)</TabsTrigger>
              )}
            </TabsList>
            {isCoordinador && (
              <TabsContent value="coordinador">
                <BandejaReasignaciones mode="coordinador" />
              </TabsContent>
            )}
            {isIvan && (
              <TabsContent value="ivan">
                <BandejaReasignaciones mode="ivan" />
              </TabsContent>
            )}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
