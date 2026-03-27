export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      actividades: {
        Row: {
          avance_operativo_pct: number | null
          codigo: string
          created_at: string | null
          ejecutado_cm_acum: number | null
          ejecutado_cnm_acum: number | null
          ejecutado_seco_acum: number | null
          entidad_id: string
          es_hito: boolean | null
          estado_actual: Database["public"]["Enums"]["estado_actividad"] | null
          fecha_fin_prog: string | null
          fecha_inicio_prog: string | null
          id: string
          medio_verificacion: string | null
          meta_unidad_medida: string | null
          meta_valor: number | null
          nombre: string
          orden: number | null
          presupuesto_contrapartida_monetaria: number | null
          presupuesto_contrapartida_no_monetaria: number | null
          presupuesto_seco: number | null
          producto_id: string
          supuestos: string | null
          tags: string[] | null
          updated_at: string | null
        }
        Insert: {
          avance_operativo_pct?: number | null
          codigo: string
          created_at?: string | null
          ejecutado_cm_acum?: number | null
          ejecutado_cnm_acum?: number | null
          ejecutado_seco_acum?: number | null
          entidad_id: string
          es_hito?: boolean | null
          estado_actual?: Database["public"]["Enums"]["estado_actividad"] | null
          fecha_fin_prog?: string | null
          fecha_inicio_prog?: string | null
          id?: string
          medio_verificacion?: string | null
          meta_unidad_medida?: string | null
          meta_valor?: number | null
          nombre: string
          orden?: number | null
          presupuesto_contrapartida_monetaria?: number | null
          presupuesto_contrapartida_no_monetaria?: number | null
          presupuesto_seco?: number | null
          producto_id: string
          supuestos?: string | null
          tags?: string[] | null
          updated_at?: string | null
        }
        Update: {
          avance_operativo_pct?: number | null
          codigo?: string
          created_at?: string | null
          ejecutado_cm_acum?: number | null
          ejecutado_cnm_acum?: number | null
          ejecutado_seco_acum?: number | null
          entidad_id?: string
          es_hito?: boolean | null
          estado_actual?: Database["public"]["Enums"]["estado_actividad"] | null
          fecha_fin_prog?: string | null
          fecha_inicio_prog?: string | null
          id?: string
          medio_verificacion?: string | null
          meta_unidad_medida?: string | null
          meta_valor?: number | null
          nombre?: string
          orden?: number | null
          presupuesto_contrapartida_monetaria?: number | null
          presupuesto_contrapartida_no_monetaria?: number | null
          presupuesto_seco?: number | null
          producto_id?: string
          supuestos?: string | null
          tags?: string[] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "actividades_entidad_id_fkey"
            columns: ["entidad_id"]
            isOneToOne: false
            referencedRelation: "entidades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "actividades_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
        ]
      }
      ejecucion_financiera: {
        Row: {
          actividad_id: string
          comprobante_ref: string | null
          created_at: string | null
          detalle_gasto: string | null
          entidad_aportante: string | null
          entidad_id: string
          fecha_gasto: string | null
          fuente: Database["public"]["Enums"]["fuente_financiamiento"]
          id: string
          incluye_igv: boolean | null
          moneda: string | null
          monto: number
          monto_igv: number | null
          monto_usd: number | null
          registro_mensual_id: string
          tipo_cambio: number | null
          tipo_gasto: string | null
          tipo_valorizacion: string | null
        }
        Insert: {
          actividad_id: string
          comprobante_ref?: string | null
          created_at?: string | null
          detalle_gasto?: string | null
          entidad_aportante?: string | null
          entidad_id: string
          fecha_gasto?: string | null
          fuente: Database["public"]["Enums"]["fuente_financiamiento"]
          id?: string
          incluye_igv?: boolean | null
          moneda?: string | null
          monto: number
          monto_igv?: number | null
          monto_usd?: number | null
          registro_mensual_id: string
          tipo_cambio?: number | null
          tipo_gasto?: string | null
          tipo_valorizacion?: string | null
        }
        Update: {
          actividad_id?: string
          comprobante_ref?: string | null
          created_at?: string | null
          detalle_gasto?: string | null
          entidad_aportante?: string | null
          entidad_id?: string
          fecha_gasto?: string | null
          fuente?: Database["public"]["Enums"]["fuente_financiamiento"]
          id?: string
          incluye_igv?: boolean | null
          moneda?: string | null
          monto?: number
          monto_igv?: number | null
          monto_usd?: number | null
          registro_mensual_id?: string
          tipo_cambio?: number | null
          tipo_gasto?: string | null
          tipo_valorizacion?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ejecucion_financiera_actividad_id_fkey"
            columns: ["actividad_id"]
            isOneToOne: false
            referencedRelation: "actividades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ejecucion_financiera_entidad_id_fkey"
            columns: ["entidad_id"]
            isOneToOne: false
            referencedRelation: "entidades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ejecucion_financiera_registro_mensual_id_fkey"
            columns: ["registro_mensual_id"]
            isOneToOne: false
            referencedRelation: "registros_mensuales"
            referencedColumns: ["id"]
          },
        ]
      }
      entidades: {
        Row: {
          activo: boolean | null
          cadena_valor: string | null
          codigo: string
          coordinador_regional_id: string | null
          created_at: string | null
          fecha_fin: string | null
          fecha_inicio: string | null
          id: string
          mecanismo: Database["public"]["Enums"]["mecanismo_tipo"]
          nombre_completo: string
          nombre_corto: string
          region: string | null
          tipo_entidad: Database["public"]["Enums"]["tipo_entidad"]
          titulo_proyecto: string | null
        }
        Insert: {
          activo?: boolean | null
          cadena_valor?: string | null
          codigo: string
          coordinador_regional_id?: string | null
          created_at?: string | null
          fecha_fin?: string | null
          fecha_inicio?: string | null
          id?: string
          mecanismo: Database["public"]["Enums"]["mecanismo_tipo"]
          nombre_completo: string
          nombre_corto: string
          region?: string | null
          tipo_entidad: Database["public"]["Enums"]["tipo_entidad"]
          titulo_proyecto?: string | null
        }
        Update: {
          activo?: boolean | null
          cadena_valor?: string | null
          codigo?: string
          coordinador_regional_id?: string | null
          created_at?: string | null
          fecha_fin?: string | null
          fecha_inicio?: string | null
          id?: string
          mecanismo?: Database["public"]["Enums"]["mecanismo_tipo"]
          nombre_completo?: string
          nombre_corto?: string
          region?: string | null
          tipo_entidad?: Database["public"]["Enums"]["tipo_entidad"]
          titulo_proyecto?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "entidades_coordinador_regional_id_fkey"
            columns: ["coordinador_regional_id"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
        ]
      }
      indicadores_proyecto: {
        Row: {
          codigo: string
          created_at: string | null
          entidad_id: string
          id: string
          linea_base: number | null
          medio_verificacion: string | null
          meta: number | null
          nivel: string
          nombre: string
          resultado_id: string | null
          standard_indicator_seco: string | null
          unidad_medida: string | null
        }
        Insert: {
          codigo: string
          created_at?: string | null
          entidad_id: string
          id?: string
          linea_base?: number | null
          medio_verificacion?: string | null
          meta?: number | null
          nivel: string
          nombre: string
          resultado_id?: string | null
          standard_indicator_seco?: string | null
          unidad_medida?: string | null
        }
        Update: {
          codigo?: string
          created_at?: string | null
          entidad_id?: string
          id?: string
          linea_base?: number | null
          medio_verificacion?: string | null
          meta?: number | null
          nivel?: string
          nombre?: string
          resultado_id?: string | null
          standard_indicator_seco?: string | null
          unidad_medida?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "indicadores_proyecto_entidad_id_fkey"
            columns: ["entidad_id"]
            isOneToOne: false
            referencedRelation: "entidades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "indicadores_proyecto_resultado_id_fkey"
            columns: ["resultado_id"]
            isOneToOne: false
            referencedRelation: "resultados"
            referencedColumns: ["id"]
          },
        ]
      }
      perfiles: {
        Row: {
          activo: boolean | null
          created_at: string | null
          email: string
          entidad_id: string | null
          id: string
          nombre_completo: string
          region: string | null
          rol: Database["public"]["Enums"]["rol_usuario"]
          updated_at: string | null
        }
        Insert: {
          activo?: boolean | null
          created_at?: string | null
          email: string
          entidad_id?: string | null
          id: string
          nombre_completo: string
          region?: string | null
          rol?: Database["public"]["Enums"]["rol_usuario"]
          updated_at?: string | null
        }
        Update: {
          activo?: boolean | null
          created_at?: string | null
          email?: string
          entidad_id?: string | null
          id?: string
          nombre_completo?: string
          region?: string | null
          rol?: Database["public"]["Enums"]["rol_usuario"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "perfiles_entidad_id_fkey"
            columns: ["entidad_id"]
            isOneToOne: false
            referencedRelation: "entidades"
            referencedColumns: ["id"]
          },
        ]
      }
      productos: {
        Row: {
          codigo: string
          created_at: string | null
          entidad_id: string
          id: string
          nombre: string
          orden: number | null
          resultado_id: string
        }
        Insert: {
          codigo: string
          created_at?: string | null
          entidad_id: string
          id?: string
          nombre: string
          orden?: number | null
          resultado_id: string
        }
        Update: {
          codigo?: string
          created_at?: string | null
          entidad_id?: string
          id?: string
          nombre?: string
          orden?: number | null
          resultado_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "productos_entidad_id_fkey"
            columns: ["entidad_id"]
            isOneToOne: false
            referencedRelation: "entidades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "productos_resultado_id_fkey"
            columns: ["resultado_id"]
            isOneToOne: false
            referencedRelation: "resultados"
            referencedColumns: ["id"]
          },
        ]
      }
      registros_mensuales: {
        Row: {
          actividad_id: string
          anio: number
          avance_unidad_medida: string | null
          avance_valor: number | null
          descripcion_avance: string | null
          entidad_id: string
          estado: Database["public"]["Enums"]["estado_actividad"] | null
          estado_registro: Database["public"]["Enums"]["estado_registro"] | null
          fecha_ejecucion: string | null
          fecha_registro: string | null
          fecha_revision: string | null
          id: string
          mes: number
          observaciones_revision: string | null
          registrado_por: string | null
          revisado_por: string | null
          updated_at: string | null
        }
        Insert: {
          actividad_id: string
          anio: number
          avance_unidad_medida?: string | null
          avance_valor?: number | null
          descripcion_avance?: string | null
          entidad_id: string
          estado?: Database["public"]["Enums"]["estado_actividad"] | null
          estado_registro?:
            | Database["public"]["Enums"]["estado_registro"]
            | null
          fecha_ejecucion?: string | null
          fecha_registro?: string | null
          fecha_revision?: string | null
          id?: string
          mes: number
          observaciones_revision?: string | null
          registrado_por?: string | null
          revisado_por?: string | null
          updated_at?: string | null
        }
        Update: {
          actividad_id?: string
          anio?: number
          avance_unidad_medida?: string | null
          avance_valor?: number | null
          descripcion_avance?: string | null
          entidad_id?: string
          estado?: Database["public"]["Enums"]["estado_actividad"] | null
          estado_registro?:
            | Database["public"]["Enums"]["estado_registro"]
            | null
          fecha_ejecucion?: string | null
          fecha_registro?: string | null
          fecha_revision?: string | null
          id?: string
          mes?: number
          observaciones_revision?: string | null
          registrado_por?: string | null
          revisado_por?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "registros_mensuales_actividad_id_fkey"
            columns: ["actividad_id"]
            isOneToOne: false
            referencedRelation: "actividades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registros_mensuales_entidad_id_fkey"
            columns: ["entidad_id"]
            isOneToOne: false
            referencedRelation: "entidades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registros_mensuales_registrado_por_fkey"
            columns: ["registrado_por"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registros_mensuales_revisado_por_fkey"
            columns: ["revisado_por"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
        ]
      }
      resultados: {
        Row: {
          codigo: string
          created_at: string | null
          entidad_id: string
          id: string
          nivel: string
          nombre: string
          orden: number | null
        }
        Insert: {
          codigo: string
          created_at?: string | null
          entidad_id: string
          id?: string
          nivel: string
          nombre: string
          orden?: number | null
        }
        Update: {
          codigo?: string
          created_at?: string | null
          entidad_id?: string
          id?: string
          nivel?: string
          nombre?: string
          orden?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "resultados_entidad_id_fkey"
            columns: ["entidad_id"]
            isOneToOne: false
            referencedRelation: "entidades"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      estado_actividad:
        | "no_iniciada"
        | "iniciado_1_35"
        | "en_proceso_36_65"
        | "proceso_avanzado_66_99"
        | "culminado_100"
      estado_contrato:
        | "en_proceso"
        | "adjudicado"
        | "vigente"
        | "finalizado"
        | "cancelado"
      estado_registro:
        | "borrador"
        | "enviado"
        | "en_revision_coordinador"
        | "en_revision_tecnica"
        | "en_revision_financiera"
        | "observado"
        | "aprobado"
      frecuencia_indicador:
        | "mensual"
        | "trimestral"
        | "semestral"
        | "anual"
        | "por_evento"
        | "por_campana"
      fuente_financiamiento:
        | "cofinanciamiento_seco"
        | "contrapartida_monetaria"
        | "contrapartida_no_monetaria"
      mecanismo_tipo: "A" | "B" | "C"
      rol_usuario:
        | "entidad"
        | "coordinador_regional"
        | "gestor_mec_a"
        | "coordinador_mec_b"
        | "monitoreo"
        | "administracion"
        | "direccion"
        | "admin_sistema"
      tipo_contrato: "persona_natural" | "persona_juridica"
      tipo_entidad: "mec_b_agro" | "mec_b_turismo" | "mec_b_mixto" | "mec_a"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      estado_actividad: [
        "no_iniciada",
        "iniciado_1_35",
        "en_proceso_36_65",
        "proceso_avanzado_66_99",
        "culminado_100",
      ],
      estado_contrato: [
        "en_proceso",
        "adjudicado",
        "vigente",
        "finalizado",
        "cancelado",
      ],
      estado_registro: [
        "borrador",
        "enviado",
        "en_revision_coordinador",
        "en_revision_tecnica",
        "en_revision_financiera",
        "observado",
        "aprobado",
      ],
      frecuencia_indicador: [
        "mensual",
        "trimestral",
        "semestral",
        "anual",
        "por_evento",
        "por_campana",
      ],
      fuente_financiamiento: [
        "cofinanciamiento_seco",
        "contrapartida_monetaria",
        "contrapartida_no_monetaria",
      ],
      mecanismo_tipo: ["A", "B", "C"],
      rol_usuario: [
        "entidad",
        "coordinador_regional",
        "gestor_mec_a",
        "coordinador_mec_b",
        "monitoreo",
        "administracion",
        "direccion",
        "admin_sistema",
      ],
      tipo_contrato: ["persona_natural", "persona_juridica"],
      tipo_entidad: ["mec_b_agro", "mec_b_turismo", "mec_b_mixto", "mec_a"],
    },
  },
} as const
