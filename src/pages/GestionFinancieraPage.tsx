import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { TabRemesas } from "@/components/finanzas/TabRemesas";
import { TabContratos } from "@/components/finanzas/TabContratos";
import { TabIGV } from "@/components/finanzas/TabIGV";
import { Banknote } from "lucide-react";

export interface EntidadOption {
  id: string;
  nombre_corto: string;
}

export default function GestionFinancieraPage() {
  const [entidades, setEntidades] = useState<EntidadOption[]>([]);

  useEffect(() => {
    (supabase as any)
      .from("entidades")
      .select("id, nombre_corto")
      .order("nombre_corto")
      .then(({ data }: any) => setEntidades(data || []));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Banknote className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">Gestión Financiera</h1>
      </div>

      <Tabs defaultValue="remesas" className="w-full">
        <TabsList className="grid w-full grid-cols-3 max-w-lg">
          <TabsTrigger value="remesas">Remesas</TabsTrigger>
          <TabsTrigger value="contratos">Contratos</TabsTrigger>
          <TabsTrigger value="igv">IGV</TabsTrigger>
        </TabsList>

        <TabsContent value="remesas">
          <TabRemesas entidades={entidades} />
        </TabsContent>
        <TabsContent value="contratos">
          <TabContratos entidades={entidades} />
        </TabsContent>
        <TabsContent value="igv">
          <TabIGV entidades={entidades} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
