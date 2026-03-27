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
          indicadores_vinculados: string[] | null
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
          indicadores_vinculados?: string[] | null
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
          indicadores_vinculados?: string[] | null
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
            foreignKeyName: "actividades_entidad_id_fkey"
            columns: ["entidad_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_entidad"
            referencedColumns: ["entidad_id"]
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
      config_gatillos_actividad: {
        Row: {
          aplica_mecanismo:
            | Database["public"]["Enums"]["mecanismo_tipo"][]
            | null
          aplica_tipo_entidad:
            | Database["public"]["Enums"]["tipo_entidad"][]
            | null
          campos_requeridos: string[] | null
          created_at: string | null
          formulario_label: string
          id: string
          tabla_destino: string
          tag: string
        }
        Insert: {
          aplica_mecanismo?:
            | Database["public"]["Enums"]["mecanismo_tipo"][]
            | null
          aplica_tipo_entidad?:
            | Database["public"]["Enums"]["tipo_entidad"][]
            | null
          campos_requeridos?: string[] | null
          created_at?: string | null
          formulario_label: string
          id?: string
          tabla_destino: string
          tag: string
        }
        Update: {
          aplica_mecanismo?:
            | Database["public"]["Enums"]["mecanismo_tipo"][]
            | null
          aplica_tipo_entidad?:
            | Database["public"]["Enums"]["tipo_entidad"][]
            | null
          campos_requeridos?: string[] | null
          created_at?: string | null
          formulario_label?: string
          id?: string
          tabla_destino?: string
          tag?: string
        }
        Relationships: []
      }
      config_indicadores_entidad: {
        Row: {
          activo: boolean | null
          created_at: string | null
          entidad_id: string
          frecuencia: Database["public"]["Enums"]["frecuencia_indicador"]
          id: string
          trama_codigo: string
          trama_nombre: string
        }
        Insert: {
          activo?: boolean | null
          created_at?: string | null
          entidad_id: string
          frecuencia: Database["public"]["Enums"]["frecuencia_indicador"]
          id?: string
          trama_codigo: string
          trama_nombre: string
        }
        Update: {
          activo?: boolean | null
          created_at?: string | null
          entidad_id?: string
          frecuencia?: Database["public"]["Enums"]["frecuencia_indicador"]
          id?: string
          trama_codigo?: string
          trama_nombre?: string
        }
        Relationships: [
          {
            foreignKeyName: "config_indicadores_entidad_entidad_id_fkey"
            columns: ["entidad_id"]
            isOneToOne: false
            referencedRelation: "entidades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "config_indicadores_entidad_entidad_id_fkey"
            columns: ["entidad_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_entidad"
            referencedColumns: ["entidad_id"]
          },
        ]
      }
      contratos: {
        Row: {
          actividad_id: string | null
          created_at: string | null
          entidad_id: string
          estado: Database["public"]["Enums"]["estado_contrato"] | null
          fecha_adjudicacion: string | null
          fecha_fin: string | null
          fecha_inicio: string | null
          fuente: Database["public"]["Enums"]["fuente_financiamiento"] | null
          id: string
          moneda: string | null
          monto: number | null
          nombre_contratado: string
          numero_contrato: string | null
          objeto: string | null
          registrado_por: string | null
          ruc_dni: string | null
          tipo: Database["public"]["Enums"]["tipo_contrato"]
          tipo_seleccion: string | null
          updated_at: string | null
        }
        Insert: {
          actividad_id?: string | null
          created_at?: string | null
          entidad_id: string
          estado?: Database["public"]["Enums"]["estado_contrato"] | null
          fecha_adjudicacion?: string | null
          fecha_fin?: string | null
          fecha_inicio?: string | null
          fuente?: Database["public"]["Enums"]["fuente_financiamiento"] | null
          id?: string
          moneda?: string | null
          monto?: number | null
          nombre_contratado: string
          numero_contrato?: string | null
          objeto?: string | null
          registrado_por?: string | null
          ruc_dni?: string | null
          tipo: Database["public"]["Enums"]["tipo_contrato"]
          tipo_seleccion?: string | null
          updated_at?: string | null
        }
        Update: {
          actividad_id?: string | null
          created_at?: string | null
          entidad_id?: string
          estado?: Database["public"]["Enums"]["estado_contrato"] | null
          fecha_adjudicacion?: string | null
          fecha_fin?: string | null
          fecha_inicio?: string | null
          fuente?: Database["public"]["Enums"]["fuente_financiamiento"] | null
          id?: string
          moneda?: string | null
          monto?: number | null
          nombre_contratado?: string
          numero_contrato?: string | null
          objeto?: string | null
          registrado_por?: string | null
          ruc_dni?: string | null
          tipo?: Database["public"]["Enums"]["tipo_contrato"]
          tipo_seleccion?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contratos_actividad_id_fkey"
            columns: ["actividad_id"]
            isOneToOne: false
            referencedRelation: "actividades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_entidad_id_fkey"
            columns: ["entidad_id"]
            isOneToOne: false
            referencedRelation: "entidades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_entidad_id_fkey"
            columns: ["entidad_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_entidad"
            referencedColumns: ["entidad_id"]
          },
          {
            foreignKeyName: "contratos_registrado_por_fkey"
            columns: ["registrado_por"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
        ]
      }
      desembolsos: {
        Row: {
          created_at: string | null
          entidad_id: string
          estado: string | null
          fecha_desembolso: string | null
          fecha_rendicion: string | null
          id: string
          monto_pen: number | null
          monto_usd: number
          numero_remesa: number
          observaciones: string | null
          tipo_cambio: number | null
          trimestre_vinculado: string | null
        }
        Insert: {
          created_at?: string | null
          entidad_id: string
          estado?: string | null
          fecha_desembolso?: string | null
          fecha_rendicion?: string | null
          id?: string
          monto_pen?: number | null
          monto_usd: number
          numero_remesa: number
          observaciones?: string | null
          tipo_cambio?: number | null
          trimestre_vinculado?: string | null
        }
        Update: {
          created_at?: string | null
          entidad_id?: string
          estado?: string | null
          fecha_desembolso?: string | null
          fecha_rendicion?: string | null
          id?: string
          monto_pen?: number | null
          monto_usd?: number
          numero_remesa?: number
          observaciones?: string | null
          tipo_cambio?: number | null
          trimestre_vinculado?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "desembolsos_entidad_id_fkey"
            columns: ["entidad_id"]
            isOneToOne: false
            referencedRelation: "entidades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "desembolsos_entidad_id_fkey"
            columns: ["entidad_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_entidad"
            referencedColumns: ["entidad_id"]
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
            foreignKeyName: "ejecucion_financiera_entidad_id_fkey"
            columns: ["entidad_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_entidad"
            referencedColumns: ["entidad_id"]
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
      escala_viaticos: {
        Row: {
          alimentacion: number
          alojamiento: number
          ciudad: string
          created_at: string | null
          departamento: string | null
          id: string
          transporte_local: number
          vigente: boolean | null
        }
        Insert: {
          alimentacion: number
          alojamiento: number
          ciudad: string
          created_at?: string | null
          departamento?: string | null
          id?: string
          transporte_local: number
          vigente?: boolean | null
        }
        Update: {
          alimentacion?: number
          alojamiento?: number
          ciudad?: string
          created_at?: string | null
          departamento?: string | null
          id?: string
          transporte_local?: number
          vigente?: boolean | null
        }
        Relationships: []
      }
      gestor_entidades: {
        Row: {
          created_at: string | null
          entidad_id: string
          gestor_id: string
          id: string
        }
        Insert: {
          created_at?: string | null
          entidad_id: string
          gestor_id: string
          id?: string
        }
        Update: {
          created_at?: string | null
          entidad_id?: string
          gestor_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gestor_entidades_entidad_id_fkey"
            columns: ["entidad_id"]
            isOneToOne: false
            referencedRelation: "entidades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gestor_entidades_entidad_id_fkey"
            columns: ["entidad_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_entidad"
            referencedColumns: ["entidad_id"]
          },
          {
            foreignKeyName: "gestor_entidades_gestor_id_fkey"
            columns: ["gestor_id"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
        ]
      }
      historial_cambios: {
        Row: {
          accion: string
          campo: string | null
          created_at: string | null
          id: string
          nombre_usuario: string | null
          observaciones: string | null
          registro_id: string
          tabla: string
          usuario_id: string | null
          valor_anterior: string | null
          valor_nuevo: string | null
        }
        Insert: {
          accion: string
          campo?: string | null
          created_at?: string | null
          id?: string
          nombre_usuario?: string | null
          observaciones?: string | null
          registro_id: string
          tabla: string
          usuario_id?: string | null
          valor_anterior?: string | null
          valor_nuevo?: string | null
        }
        Update: {
          accion?: string
          campo?: string | null
          created_at?: string | null
          id?: string
          nombre_usuario?: string | null
          observaciones?: string | null
          registro_id?: string
          tabla?: string
          usuario_id?: string | null
          valor_anterior?: string | null
          valor_nuevo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "historial_cambios_usuario_id_fkey"
            columns: ["usuario_id"]
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
            foreignKeyName: "indicadores_proyecto_entidad_id_fkey"
            columns: ["entidad_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_entidad"
            referencedColumns: ["entidad_id"]
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
      notificaciones: {
        Row: {
          asunto: string
          created_at: string | null
          destinatarios: Json
          entidad_destino_id: string | null
          id: string
          leido: boolean | null
          mensaje: string
          remitente_id: string | null
          tipo: string
        }
        Insert: {
          asunto: string
          created_at?: string | null
          destinatarios?: Json
          entidad_destino_id?: string | null
          id?: string
          leido?: boolean | null
          mensaje: string
          remitente_id?: string | null
          tipo: string
        }
        Update: {
          asunto?: string
          created_at?: string | null
          destinatarios?: Json
          entidad_destino_id?: string | null
          id?: string
          leido?: boolean | null
          mensaje?: string
          remitente_id?: string | null
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "notificaciones_entidad_destino_id_fkey"
            columns: ["entidad_destino_id"]
            isOneToOne: false
            referencedRelation: "entidades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notificaciones_entidad_destino_id_fkey"
            columns: ["entidad_destino_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_entidad"
            referencedColumns: ["entidad_id"]
          },
          {
            foreignKeyName: "notificaciones_remitente_id_fkey"
            columns: ["remitente_id"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
        ]
      }
      participantes_capacitacion: {
        Row: {
          apellidos: string
          aplico_aprendizaje: boolean | null
          cadena_valor: string | null
          capacitacion_id: string
          created_at: string | null
          entidad_id: string
          fecha_nacimiento: string | null
          genero: string | null
          id: string
          nombre_organizacion: string | null
          nombres: string
          num_documento: string
          pais_origen: string | null
          ruc_organizacion: string | null
          tipo_documento: string | null
          tipo_org_productiva: string | null
          tipo_organizacion: string | null
        }
        Insert: {
          apellidos: string
          aplico_aprendizaje?: boolean | null
          cadena_valor?: string | null
          capacitacion_id: string
          created_at?: string | null
          entidad_id: string
          fecha_nacimiento?: string | null
          genero?: string | null
          id?: string
          nombre_organizacion?: string | null
          nombres: string
          num_documento: string
          pais_origen?: string | null
          ruc_organizacion?: string | null
          tipo_documento?: string | null
          tipo_org_productiva?: string | null
          tipo_organizacion?: string | null
        }
        Update: {
          apellidos?: string
          aplico_aprendizaje?: boolean | null
          cadena_valor?: string | null
          capacitacion_id?: string
          created_at?: string | null
          entidad_id?: string
          fecha_nacimiento?: string | null
          genero?: string | null
          id?: string
          nombre_organizacion?: string | null
          nombres?: string
          num_documento?: string
          pais_origen?: string | null
          ruc_organizacion?: string | null
          tipo_documento?: string | null
          tipo_org_productiva?: string | null
          tipo_organizacion?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "participantes_capacitacion_capacitacion_id_fkey"
            columns: ["capacitacion_id"]
            isOneToOne: false
            referencedRelation: "registro_capacitaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "participantes_capacitacion_entidad_id_fkey"
            columns: ["entidad_id"]
            isOneToOne: false
            referencedRelation: "entidades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "participantes_capacitacion_entidad_id_fkey"
            columns: ["entidad_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_entidad"
            referencedColumns: ["entidad_id"]
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
          {
            foreignKeyName: "perfiles_entidad_id_fkey"
            columns: ["entidad_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_entidad"
            referencedColumns: ["entidad_id"]
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
            foreignKeyName: "productos_entidad_id_fkey"
            columns: ["entidad_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_entidad"
            referencedColumns: ["entidad_id"]
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
      reasignaciones: {
        Row: {
          aprobado_por: string | null
          created_at: string | null
          entidad_id: string
          estado: string | null
          fecha_aprobacion: string | null
          fecha_solicitud: string | null
          id: string
          motivo: string
          movimientos: Json
          observaciones: string | null
          solicitado_por: string | null
        }
        Insert: {
          aprobado_por?: string | null
          created_at?: string | null
          entidad_id: string
          estado?: string | null
          fecha_aprobacion?: string | null
          fecha_solicitud?: string | null
          id?: string
          motivo: string
          movimientos: Json
          observaciones?: string | null
          solicitado_por?: string | null
        }
        Update: {
          aprobado_por?: string | null
          created_at?: string | null
          entidad_id?: string
          estado?: string | null
          fecha_aprobacion?: string | null
          fecha_solicitud?: string | null
          id?: string
          motivo?: string
          movimientos?: Json
          observaciones?: string | null
          solicitado_por?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reasignaciones_aprobado_por_fkey"
            columns: ["aprobado_por"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reasignaciones_entidad_id_fkey"
            columns: ["entidad_id"]
            isOneToOne: false
            referencedRelation: "entidades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reasignaciones_entidad_id_fkey"
            columns: ["entidad_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_entidad"
            referencedColumns: ["entidad_id"]
          },
          {
            foreignKeyName: "reasignaciones_solicitado_por_fkey"
            columns: ["solicitado_por"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
        ]
      }
      registro_capacitaciones: {
        Row: {
          actividad_id: string
          created_at: string | null
          departamento: string | null
          entidad_id: string
          fecha_fin: string | null
          fecha_inicio: string | null
          id: string
          modalidad: string | null
          nombre_accion_formativa: string
          participantes_femenino: number | null
          participantes_masculino: number | null
          registro_mensual_id: string
          tema: string | null
          tipo_accion_formativa: string | null
          total_participantes: number | null
        }
        Insert: {
          actividad_id: string
          created_at?: string | null
          departamento?: string | null
          entidad_id: string
          fecha_fin?: string | null
          fecha_inicio?: string | null
          id?: string
          modalidad?: string | null
          nombre_accion_formativa: string
          participantes_femenino?: number | null
          participantes_masculino?: number | null
          registro_mensual_id: string
          tema?: string | null
          tipo_accion_formativa?: string | null
          total_participantes?: number | null
        }
        Update: {
          actividad_id?: string
          created_at?: string | null
          departamento?: string | null
          entidad_id?: string
          fecha_fin?: string | null
          fecha_inicio?: string | null
          id?: string
          modalidad?: string | null
          nombre_accion_formativa?: string
          participantes_femenino?: number | null
          participantes_masculino?: number | null
          registro_mensual_id?: string
          tema?: string | null
          tipo_accion_formativa?: string | null
          total_participantes?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "registro_capacitaciones_actividad_id_fkey"
            columns: ["actividad_id"]
            isOneToOne: false
            referencedRelation: "actividades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registro_capacitaciones_entidad_id_fkey"
            columns: ["entidad_id"]
            isOneToOne: false
            referencedRelation: "entidades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registro_capacitaciones_entidad_id_fkey"
            columns: ["entidad_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_entidad"
            referencedColumns: ["entidad_id"]
          },
          {
            foreignKeyName: "registro_capacitaciones_registro_mensual_id_fkey"
            columns: ["registro_mensual_id"]
            isOneToOne: false
            referencedRelation: "registros_mensuales"
            referencedColumns: ["id"]
          },
        ]
      }
      registro_certificacion_laboral: {
        Row: {
          apellidos: string
          aprobo: boolean | null
          cadena_valor: string | null
          ccl_evaluador: string | null
          created_at: string | null
          departamento: string | null
          departamento_ccl: string | null
          entidad_id: string
          estado_registro: Database["public"]["Enums"]["estado_registro"] | null
          fecha_aprobacion: string | null
          fecha_evaluacion: string | null
          fecha_nacimiento: string | null
          genero: string | null
          id: string
          nombre_organizacion: string | null
          nombres: string
          num_documento: string
          pais_origen: string | null
          perfil_ocupacional: string | null
          ruc_organizacion: string | null
          sede_ccl: string | null
          tipo_documento: string | null
        }
        Insert: {
          apellidos: string
          aprobo?: boolean | null
          cadena_valor?: string | null
          ccl_evaluador?: string | null
          created_at?: string | null
          departamento?: string | null
          departamento_ccl?: string | null
          entidad_id: string
          estado_registro?:
            | Database["public"]["Enums"]["estado_registro"]
            | null
          fecha_aprobacion?: string | null
          fecha_evaluacion?: string | null
          fecha_nacimiento?: string | null
          genero?: string | null
          id?: string
          nombre_organizacion?: string | null
          nombres: string
          num_documento: string
          pais_origen?: string | null
          perfil_ocupacional?: string | null
          ruc_organizacion?: string | null
          sede_ccl?: string | null
          tipo_documento?: string | null
        }
        Update: {
          apellidos?: string
          aprobo?: boolean | null
          cadena_valor?: string | null
          ccl_evaluador?: string | null
          created_at?: string | null
          departamento?: string | null
          departamento_ccl?: string | null
          entidad_id?: string
          estado_registro?:
            | Database["public"]["Enums"]["estado_registro"]
            | null
          fecha_aprobacion?: string | null
          fecha_evaluacion?: string | null
          fecha_nacimiento?: string | null
          genero?: string | null
          id?: string
          nombre_organizacion?: string | null
          nombres?: string
          num_documento?: string
          pais_origen?: string | null
          perfil_ocupacional?: string | null
          ruc_organizacion?: string | null
          sede_ccl?: string | null
          tipo_documento?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "registro_certificacion_laboral_entidad_id_fkey"
            columns: ["entidad_id"]
            isOneToOne: false
            referencedRelation: "entidades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registro_certificacion_laboral_entidad_id_fkey"
            columns: ["entidad_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_entidad"
            referencedColumns: ["entidad_id"]
          },
        ]
      }
      registro_financiamiento: {
        Row: {
          actividad_id: string
          created_at: string | null
          entidad_id: string
          fecha_desembolso: string | null
          fondo_instrumento: string
          id: string
          monto_la_libertad: number | null
          monto_piura: number | null
          monto_san_martin: number | null
          monto_total: number | null
          num_organizaciones_ll: number | null
          num_organizaciones_piura: number | null
          num_organizaciones_sm: number | null
          num_organizaciones_total: number | null
          registro_mensual_id: string
          tipo_financiamiento: string | null
          tipo_organizacion_financiada: string | null
        }
        Insert: {
          actividad_id: string
          created_at?: string | null
          entidad_id: string
          fecha_desembolso?: string | null
          fondo_instrumento: string
          id?: string
          monto_la_libertad?: number | null
          monto_piura?: number | null
          monto_san_martin?: number | null
          monto_total?: number | null
          num_organizaciones_ll?: number | null
          num_organizaciones_piura?: number | null
          num_organizaciones_sm?: number | null
          num_organizaciones_total?: number | null
          registro_mensual_id: string
          tipo_financiamiento?: string | null
          tipo_organizacion_financiada?: string | null
        }
        Update: {
          actividad_id?: string
          created_at?: string | null
          entidad_id?: string
          fecha_desembolso?: string | null
          fondo_instrumento?: string
          id?: string
          monto_la_libertad?: number | null
          monto_piura?: number | null
          monto_san_martin?: number | null
          monto_total?: number | null
          num_organizaciones_ll?: number | null
          num_organizaciones_piura?: number | null
          num_organizaciones_sm?: number | null
          num_organizaciones_total?: number | null
          registro_mensual_id?: string
          tipo_financiamiento?: string | null
          tipo_organizacion_financiada?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "registro_financiamiento_actividad_id_fkey"
            columns: ["actividad_id"]
            isOneToOne: false
            referencedRelation: "actividades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registro_financiamiento_entidad_id_fkey"
            columns: ["entidad_id"]
            isOneToOne: false
            referencedRelation: "entidades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registro_financiamiento_entidad_id_fkey"
            columns: ["entidad_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_entidad"
            referencedColumns: ["entidad_id"]
          },
          {
            foreignKeyName: "registro_financiamiento_registro_mensual_id_fkey"
            columns: ["registro_mensual_id"]
            isOneToOne: false
            referencedRelation: "registros_mensuales"
            referencedColumns: ["id"]
          },
        ]
      }
      registro_gei: {
        Row: {
          actividad_id: string
          cadena_valor: string | null
          categoria: string | null
          created_at: string | null
          entidad_id: string
          etapa_implementacion: string | null
          fecha_prog_culminacion: string | null
          id: string
          nombre_organizacion: string | null
          nombre_practica: string
          registro_mensual_id: string
          ruc_organizacion: string | null
          tipo_accion: string | null
        }
        Insert: {
          actividad_id: string
          cadena_valor?: string | null
          categoria?: string | null
          created_at?: string | null
          entidad_id: string
          etapa_implementacion?: string | null
          fecha_prog_culminacion?: string | null
          id?: string
          nombre_organizacion?: string | null
          nombre_practica: string
          registro_mensual_id: string
          ruc_organizacion?: string | null
          tipo_accion?: string | null
        }
        Update: {
          actividad_id?: string
          cadena_valor?: string | null
          categoria?: string | null
          created_at?: string | null
          entidad_id?: string
          etapa_implementacion?: string | null
          fecha_prog_culminacion?: string | null
          id?: string
          nombre_organizacion?: string | null
          nombre_practica?: string
          registro_mensual_id?: string
          ruc_organizacion?: string | null
          tipo_accion?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "registro_gei_actividad_id_fkey"
            columns: ["actividad_id"]
            isOneToOne: false
            referencedRelation: "actividades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registro_gei_entidad_id_fkey"
            columns: ["entidad_id"]
            isOneToOne: false
            referencedRelation: "entidades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registro_gei_entidad_id_fkey"
            columns: ["entidad_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_entidad"
            referencedColumns: ["entidad_id"]
          },
          {
            foreignKeyName: "registro_gei_registro_mensual_id_fkey"
            columns: ["registro_mensual_id"]
            isOneToOne: false
            referencedRelation: "registros_mensuales"
            referencedColumns: ["id"]
          },
        ]
      }
      registro_innovaciones: {
        Row: {
          actividad_id: string
          cadena_valor: string | null
          created_at: string | null
          digitalizacion_trazabilidad: boolean | null
          entidad_id: string
          id: string
          nombre_innovacion: string
          nombre_organizacion: string | null
          optimizacion_procesos: boolean | null
          optimizacion_recursos: boolean | null
          registro_mensual_id: string
          ruc_organizacion: string | null
          sostenibilidad_certificaciones: boolean | null
          tecnificacion_mecanizacion: boolean | null
          tipo_organizacion: string | null
          valor_agregado_calidad: boolean | null
        }
        Insert: {
          actividad_id: string
          cadena_valor?: string | null
          created_at?: string | null
          digitalizacion_trazabilidad?: boolean | null
          entidad_id: string
          id?: string
          nombre_innovacion: string
          nombre_organizacion?: string | null
          optimizacion_procesos?: boolean | null
          optimizacion_recursos?: boolean | null
          registro_mensual_id: string
          ruc_organizacion?: string | null
          sostenibilidad_certificaciones?: boolean | null
          tecnificacion_mecanizacion?: boolean | null
          tipo_organizacion?: string | null
          valor_agregado_calidad?: boolean | null
        }
        Update: {
          actividad_id?: string
          cadena_valor?: string | null
          created_at?: string | null
          digitalizacion_trazabilidad?: boolean | null
          entidad_id?: string
          id?: string
          nombre_innovacion?: string
          nombre_organizacion?: string | null
          optimizacion_procesos?: boolean | null
          optimizacion_recursos?: boolean | null
          registro_mensual_id?: string
          ruc_organizacion?: string | null
          sostenibilidad_certificaciones?: boolean | null
          tecnificacion_mecanizacion?: boolean | null
          tipo_organizacion?: string | null
          valor_agregado_calidad?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "registro_innovaciones_actividad_id_fkey"
            columns: ["actividad_id"]
            isOneToOne: false
            referencedRelation: "actividades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registro_innovaciones_entidad_id_fkey"
            columns: ["entidad_id"]
            isOneToOne: false
            referencedRelation: "entidades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registro_innovaciones_entidad_id_fkey"
            columns: ["entidad_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_entidad"
            referencedColumns: ["entidad_id"]
          },
          {
            foreignKeyName: "registro_innovaciones_registro_mensual_id_fkey"
            columns: ["registro_mensual_id"]
            isOneToOne: false
            referencedRelation: "registros_mensuales"
            referencedColumns: ["id"]
          },
        ]
      }
      registro_normativo: {
        Row: {
          actividad_id: string
          categoria_tramite: string | null
          contribucion: string | null
          created_at: string | null
          descripcion: string | null
          detalle_simplificado: string | null
          entidad_id: string
          estado: string
          fecha_aprobacion: string | null
          id: string
          monto_financiamiento: number | null
          nombre_documento: string
          numero_documento: string | null
          registro_mensual_id: string
          sectores_beneficiarios: string | null
          subtipo: string | null
          tipo_marco: string
        }
        Insert: {
          actividad_id: string
          categoria_tramite?: string | null
          contribucion?: string | null
          created_at?: string | null
          descripcion?: string | null
          detalle_simplificado?: string | null
          entidad_id: string
          estado: string
          fecha_aprobacion?: string | null
          id?: string
          monto_financiamiento?: number | null
          nombre_documento: string
          numero_documento?: string | null
          registro_mensual_id: string
          sectores_beneficiarios?: string | null
          subtipo?: string | null
          tipo_marco: string
        }
        Update: {
          actividad_id?: string
          categoria_tramite?: string | null
          contribucion?: string | null
          created_at?: string | null
          descripcion?: string | null
          detalle_simplificado?: string | null
          entidad_id?: string
          estado?: string
          fecha_aprobacion?: string | null
          id?: string
          monto_financiamiento?: number | null
          nombre_documento?: string
          numero_documento?: string | null
          registro_mensual_id?: string
          sectores_beneficiarios?: string | null
          subtipo?: string | null
          tipo_marco?: string
        }
        Relationships: [
          {
            foreignKeyName: "registro_normativo_actividad_id_fkey"
            columns: ["actividad_id"]
            isOneToOne: false
            referencedRelation: "actividades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registro_normativo_entidad_id_fkey"
            columns: ["entidad_id"]
            isOneToOne: false
            referencedRelation: "entidades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registro_normativo_entidad_id_fkey"
            columns: ["entidad_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_entidad"
            referencedColumns: ["entidad_id"]
          },
          {
            foreignKeyName: "registro_normativo_registro_mensual_id_fkey"
            columns: ["registro_mensual_id"]
            isOneToOne: false
            referencedRelation: "registros_mensuales"
            referencedColumns: ["id"]
          },
        ]
      }
      registro_nuevos_productos: {
        Row: {
          actividad_id: string
          cadena_valor: string | null
          created_at: string | null
          diferenciacion_origen: boolean | null
          entidad_id: string
          etapa_cadena_valor: string | null
          id: string
          incorpora_innovacion: boolean | null
          mejora_empaque: boolean | null
          nombre_organizacion: string | null
          nombre_producto: string
          registro_mensual_id: string
          ruc_organizacion: string | null
          tipo_organizacion: string | null
          tipo_procesamiento: string | null
          tipo_tecnologia: string | null
          transformacion_primario: boolean | null
        }
        Insert: {
          actividad_id: string
          cadena_valor?: string | null
          created_at?: string | null
          diferenciacion_origen?: boolean | null
          entidad_id: string
          etapa_cadena_valor?: string | null
          id?: string
          incorpora_innovacion?: boolean | null
          mejora_empaque?: boolean | null
          nombre_organizacion?: string | null
          nombre_producto: string
          registro_mensual_id: string
          ruc_organizacion?: string | null
          tipo_organizacion?: string | null
          tipo_procesamiento?: string | null
          tipo_tecnologia?: string | null
          transformacion_primario?: boolean | null
        }
        Update: {
          actividad_id?: string
          cadena_valor?: string | null
          created_at?: string | null
          diferenciacion_origen?: boolean | null
          entidad_id?: string
          etapa_cadena_valor?: string | null
          id?: string
          incorpora_innovacion?: boolean | null
          mejora_empaque?: boolean | null
          nombre_organizacion?: string | null
          nombre_producto?: string
          registro_mensual_id?: string
          ruc_organizacion?: string | null
          tipo_organizacion?: string | null
          tipo_procesamiento?: string | null
          tipo_tecnologia?: string | null
          transformacion_primario?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "registro_nuevos_productos_actividad_id_fkey"
            columns: ["actividad_id"]
            isOneToOne: false
            referencedRelation: "actividades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registro_nuevos_productos_entidad_id_fkey"
            columns: ["entidad_id"]
            isOneToOne: false
            referencedRelation: "entidades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registro_nuevos_productos_entidad_id_fkey"
            columns: ["entidad_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_entidad"
            referencedColumns: ["entidad_id"]
          },
          {
            foreignKeyName: "registro_nuevos_productos_registro_mensual_id_fkey"
            columns: ["registro_mensual_id"]
            isOneToOne: false
            referencedRelation: "registros_mensuales"
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
          compromisos: string | null
          descripcion_avance: string | null
          entidad_id: string
          estado: Database["public"]["Enums"]["estado_actividad"] | null
          estado_registro: Database["public"]["Enums"]["estado_registro"] | null
          fecha_ejecucion: string | null
          fecha_registro: string | null
          fecha_revision: string | null
          id: string
          limitaciones: string | null
          mes: number
          observaciones_revision: string | null
          prioridades_proximo_mes: string | null
          registrado_por: string | null
          revisado_por: string | null
          updated_at: string | null
        }
        Insert: {
          actividad_id: string
          anio: number
          avance_unidad_medida?: string | null
          avance_valor?: number | null
          compromisos?: string | null
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
          limitaciones?: string | null
          mes: number
          observaciones_revision?: string | null
          prioridades_proximo_mes?: string | null
          registrado_por?: string | null
          revisado_por?: string | null
          updated_at?: string | null
        }
        Update: {
          actividad_id?: string
          anio?: number
          avance_unidad_medida?: string | null
          avance_valor?: number | null
          compromisos?: string | null
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
          limitaciones?: string | null
          mes?: number
          observaciones_revision?: string | null
          prioridades_proximo_mes?: string | null
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
            foreignKeyName: "registros_mensuales_entidad_id_fkey"
            columns: ["entidad_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_entidad"
            referencedColumns: ["entidad_id"]
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
      reporte_comercial: {
        Row: {
          anio: number
          cadena_valor: string
          cooperativa_exportadora: string | null
          created_at: string | null
          entidad_id: string
          estado_registro: Database["public"]["Enums"]["estado_registro"] | null
          id: string
          kg_derivados: number | null
          kg_primarios: number | null
          kg_total: number | null
          mercados_destino_intl: string | null
          mercados_destino_nac: string | null
          nombre_organizacion: string
          nombre_partida: string | null
          observaciones: string | null
          partida_arancelaria: string | null
          region_origen: string | null
          ruc: string | null
          tipo: string | null
          validado_por: string | null
          valor_fob_derivados: number | null
          valor_fob_primarios: number | null
          valor_fob_total: number | null
          ventas_nac_derivados: number | null
          ventas_nac_primarios: number | null
          ventas_nac_total: number | null
          ventas_terceros_derivados: number | null
          ventas_terceros_primarios: number | null
          vol_nac_derivados: number | null
          vol_nac_primarios: number | null
          vol_terceros_derivados: number | null
          vol_terceros_primarios: number | null
        }
        Insert: {
          anio: number
          cadena_valor: string
          cooperativa_exportadora?: string | null
          created_at?: string | null
          entidad_id: string
          estado_registro?:
            | Database["public"]["Enums"]["estado_registro"]
            | null
          id?: string
          kg_derivados?: number | null
          kg_primarios?: number | null
          kg_total?: number | null
          mercados_destino_intl?: string | null
          mercados_destino_nac?: string | null
          nombre_organizacion: string
          nombre_partida?: string | null
          observaciones?: string | null
          partida_arancelaria?: string | null
          region_origen?: string | null
          ruc?: string | null
          tipo?: string | null
          validado_por?: string | null
          valor_fob_derivados?: number | null
          valor_fob_primarios?: number | null
          valor_fob_total?: number | null
          ventas_nac_derivados?: number | null
          ventas_nac_primarios?: number | null
          ventas_nac_total?: number | null
          ventas_terceros_derivados?: number | null
          ventas_terceros_primarios?: number | null
          vol_nac_derivados?: number | null
          vol_nac_primarios?: number | null
          vol_terceros_derivados?: number | null
          vol_terceros_primarios?: number | null
        }
        Update: {
          anio?: number
          cadena_valor?: string
          cooperativa_exportadora?: string | null
          created_at?: string | null
          entidad_id?: string
          estado_registro?:
            | Database["public"]["Enums"]["estado_registro"]
            | null
          id?: string
          kg_derivados?: number | null
          kg_primarios?: number | null
          kg_total?: number | null
          mercados_destino_intl?: string | null
          mercados_destino_nac?: string | null
          nombre_organizacion?: string
          nombre_partida?: string | null
          observaciones?: string | null
          partida_arancelaria?: string | null
          region_origen?: string | null
          ruc?: string | null
          tipo?: string | null
          validado_por?: string | null
          valor_fob_derivados?: number | null
          valor_fob_primarios?: number | null
          valor_fob_total?: number | null
          ventas_nac_derivados?: number | null
          ventas_nac_primarios?: number | null
          ventas_nac_total?: number | null
          ventas_terceros_derivados?: number | null
          ventas_terceros_primarios?: number | null
          vol_nac_derivados?: number | null
          vol_nac_primarios?: number | null
          vol_terceros_derivados?: number | null
          vol_terceros_primarios?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "reporte_comercial_entidad_id_fkey"
            columns: ["entidad_id"]
            isOneToOne: false
            referencedRelation: "entidades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reporte_comercial_entidad_id_fkey"
            columns: ["entidad_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_entidad"
            referencedColumns: ["entidad_id"]
          },
          {
            foreignKeyName: "reporte_comercial_validado_por_fkey"
            columns: ["validado_por"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reporte_diversificacion: {
        Row: {
          anio: number
          cadena_valor: string | null
          created_at: string | null
          cumple_criterio_1: boolean | null
          cumple_criterio_2: boolean | null
          cumple_criterio_3: boolean | null
          entidad_id: string
          estado_registro: Database["public"]["Enums"]["estado_registro"] | null
          fecha_adopcion: string | null
          fecha_primera_venta: string | null
          genero_representante: string | null
          id: string
          nombre_nuevo_producto: string | null
          nombre_organizacion: string
          nombre_proceso: string | null
          periodo: string
          resultado_esperado: string | null
          ruc: string | null
          tipo_criterio_1: string | null
          tipo_criterio_2: string | null
          tipo_criterio_3: string | null
          tipo_org_productiva: string | null
          tipo_organizacion: string | null
        }
        Insert: {
          anio: number
          cadena_valor?: string | null
          created_at?: string | null
          cumple_criterio_1?: boolean | null
          cumple_criterio_2?: boolean | null
          cumple_criterio_3?: boolean | null
          entidad_id: string
          estado_registro?:
            | Database["public"]["Enums"]["estado_registro"]
            | null
          fecha_adopcion?: string | null
          fecha_primera_venta?: string | null
          genero_representante?: string | null
          id?: string
          nombre_nuevo_producto?: string | null
          nombre_organizacion: string
          nombre_proceso?: string | null
          periodo: string
          resultado_esperado?: string | null
          ruc?: string | null
          tipo_criterio_1?: string | null
          tipo_criterio_2?: string | null
          tipo_criterio_3?: string | null
          tipo_org_productiva?: string | null
          tipo_organizacion?: string | null
        }
        Update: {
          anio?: number
          cadena_valor?: string | null
          created_at?: string | null
          cumple_criterio_1?: boolean | null
          cumple_criterio_2?: boolean | null
          cumple_criterio_3?: boolean | null
          entidad_id?: string
          estado_registro?:
            | Database["public"]["Enums"]["estado_registro"]
            | null
          fecha_adopcion?: string | null
          fecha_primera_venta?: string | null
          genero_representante?: string | null
          id?: string
          nombre_nuevo_producto?: string | null
          nombre_organizacion?: string
          nombre_proceso?: string | null
          periodo?: string
          resultado_esperado?: string | null
          ruc?: string | null
          tipo_criterio_1?: string | null
          tipo_criterio_2?: string | null
          tipo_criterio_3?: string | null
          tipo_org_productiva?: string | null
          tipo_organizacion?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reporte_diversificacion_entidad_id_fkey"
            columns: ["entidad_id"]
            isOneToOne: false
            referencedRelation: "entidades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reporte_diversificacion_entidad_id_fkey"
            columns: ["entidad_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_entidad"
            referencedColumns: ["entidad_id"]
          },
        ]
      }
      reporte_empleo: {
        Row: {
          anio: number
          cadena_valor: string
          created_at: string | null
          empleos_creados_agroindustria: number | null
          empleos_creados_femenino: number | null
          empleos_creados_manejo_finca: number | null
          empleos_creados_masculino: number | null
          empleos_creados_post_cosecha: number | null
          empleos_creados_total: number | null
          empleos_creados_turismo: number | null
          empleos_mejorados_agroindustria: number | null
          empleos_mejorados_femenino: number | null
          empleos_mejorados_manejo_finca: number | null
          empleos_mejorados_masculino: number | null
          empleos_mejorados_post_cosecha: number | null
          empleos_mejorados_total: number | null
          empleos_mejorados_turismo: number | null
          empleos_retenidos_agroindustria: number | null
          empleos_retenidos_femenino: number | null
          empleos_retenidos_manejo_finca: number | null
          empleos_retenidos_masculino: number | null
          empleos_retenidos_post_cosecha: number | null
          empleos_retenidos_total: number | null
          empleos_retenidos_turismo: number | null
          entidad_id: string
          estado_registro: Database["public"]["Enums"]["estado_registro"] | null
          fecha_validacion: string | null
          id: string
          ingreso_promedio_final: number | null
          ingreso_promedio_intermedia: number | null
          ingreso_promedio_lb: number | null
          periodo: string
          region_empleo_creado: string | null
          region_empleo_mejorado: string | null
          region_empleo_retenido: string | null
          temporada: string | null
          total_empleos: number | null
          validado_por: string | null
          variacion_ingresos: number | null
        }
        Insert: {
          anio: number
          cadena_valor: string
          created_at?: string | null
          empleos_creados_agroindustria?: number | null
          empleos_creados_femenino?: number | null
          empleos_creados_manejo_finca?: number | null
          empleos_creados_masculino?: number | null
          empleos_creados_post_cosecha?: number | null
          empleos_creados_total?: number | null
          empleos_creados_turismo?: number | null
          empleos_mejorados_agroindustria?: number | null
          empleos_mejorados_femenino?: number | null
          empleos_mejorados_manejo_finca?: number | null
          empleos_mejorados_masculino?: number | null
          empleos_mejorados_post_cosecha?: number | null
          empleos_mejorados_total?: number | null
          empleos_mejorados_turismo?: number | null
          empleos_retenidos_agroindustria?: number | null
          empleos_retenidos_femenino?: number | null
          empleos_retenidos_manejo_finca?: number | null
          empleos_retenidos_masculino?: number | null
          empleos_retenidos_post_cosecha?: number | null
          empleos_retenidos_total?: number | null
          empleos_retenidos_turismo?: number | null
          entidad_id: string
          estado_registro?:
            | Database["public"]["Enums"]["estado_registro"]
            | null
          fecha_validacion?: string | null
          id?: string
          ingreso_promedio_final?: number | null
          ingreso_promedio_intermedia?: number | null
          ingreso_promedio_lb?: number | null
          periodo: string
          region_empleo_creado?: string | null
          region_empleo_mejorado?: string | null
          region_empleo_retenido?: string | null
          temporada?: string | null
          total_empleos?: number | null
          validado_por?: string | null
          variacion_ingresos?: number | null
        }
        Update: {
          anio?: number
          cadena_valor?: string
          created_at?: string | null
          empleos_creados_agroindustria?: number | null
          empleos_creados_femenino?: number | null
          empleos_creados_manejo_finca?: number | null
          empleos_creados_masculino?: number | null
          empleos_creados_post_cosecha?: number | null
          empleos_creados_total?: number | null
          empleos_creados_turismo?: number | null
          empleos_mejorados_agroindustria?: number | null
          empleos_mejorados_femenino?: number | null
          empleos_mejorados_manejo_finca?: number | null
          empleos_mejorados_masculino?: number | null
          empleos_mejorados_post_cosecha?: number | null
          empleos_mejorados_total?: number | null
          empleos_mejorados_turismo?: number | null
          empleos_retenidos_agroindustria?: number | null
          empleos_retenidos_femenino?: number | null
          empleos_retenidos_manejo_finca?: number | null
          empleos_retenidos_masculino?: number | null
          empleos_retenidos_post_cosecha?: number | null
          empleos_retenidos_total?: number | null
          empleos_retenidos_turismo?: number | null
          entidad_id?: string
          estado_registro?:
            | Database["public"]["Enums"]["estado_registro"]
            | null
          fecha_validacion?: string | null
          id?: string
          ingreso_promedio_final?: number | null
          ingreso_promedio_intermedia?: number | null
          ingreso_promedio_lb?: number | null
          periodo?: string
          region_empleo_creado?: string | null
          region_empleo_mejorado?: string | null
          region_empleo_retenido?: string | null
          temporada?: string | null
          total_empleos?: number | null
          validado_por?: string | null
          variacion_ingresos?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "reporte_empleo_entidad_id_fkey"
            columns: ["entidad_id"]
            isOneToOne: false
            referencedRelation: "entidades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reporte_empleo_entidad_id_fkey"
            columns: ["entidad_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_entidad"
            referencedColumns: ["entidad_id"]
          },
          {
            foreignKeyName: "reporte_empleo_validado_por_fkey"
            columns: ["validado_por"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reporte_gobernanza: {
        Row: {
          acceso_mercado_financiamiento: boolean | null
          anio: number
          articulacion_representacion: boolean | null
          buenas_practicas_sostenibilidad: boolean | null
          cadena_valor: string | null
          created_at: string | null
          departamento: string | null
          entidad_id: string
          estado_registro: Database["public"]["Enums"]["estado_registro"] | null
          estructura_org_eficiente: boolean | null
          fort_institucional: boolean | null
          id: string
          nombre_organizacion: string
          periodo: string
          ruc: string | null
          tipo_org_productiva: string | null
          tipo_organizacion: string | null
        }
        Insert: {
          acceso_mercado_financiamiento?: boolean | null
          anio: number
          articulacion_representacion?: boolean | null
          buenas_practicas_sostenibilidad?: boolean | null
          cadena_valor?: string | null
          created_at?: string | null
          departamento?: string | null
          entidad_id: string
          estado_registro?:
            | Database["public"]["Enums"]["estado_registro"]
            | null
          estructura_org_eficiente?: boolean | null
          fort_institucional?: boolean | null
          id?: string
          nombre_organizacion: string
          periodo: string
          ruc?: string | null
          tipo_org_productiva?: string | null
          tipo_organizacion?: string | null
        }
        Update: {
          acceso_mercado_financiamiento?: boolean | null
          anio?: number
          articulacion_representacion?: boolean | null
          buenas_practicas_sostenibilidad?: boolean | null
          cadena_valor?: string | null
          created_at?: string | null
          departamento?: string | null
          entidad_id?: string
          estado_registro?:
            | Database["public"]["Enums"]["estado_registro"]
            | null
          estructura_org_eficiente?: boolean | null
          fort_institucional?: boolean | null
          id?: string
          nombre_organizacion?: string
          periodo?: string
          ruc?: string | null
          tipo_org_productiva?: string | null
          tipo_organizacion?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reporte_gobernanza_entidad_id_fkey"
            columns: ["entidad_id"]
            isOneToOne: false
            referencedRelation: "entidades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reporte_gobernanza_entidad_id_fkey"
            columns: ["entidad_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_entidad"
            referencedColumns: ["entidad_id"]
          },
        ]
      }
      reporte_nuevos_mercados: {
        Row: {
          acceso_mercado: string | null
          anio: number
          cadena_valor: string | null
          conclusion: string | null
          created_at: string | null
          departamento_destino: string | null
          dni_representante: string | null
          entidad_id: string
          estado_registro: Database["public"]["Enums"]["estado_registro"] | null
          fecha_primer_envio: string | null
          genero_representante: string | null
          id: string
          mes_primera_venta: string | null
          nombre_organizacion: string
          nombre_producto: string | null
          nombre_representante: string | null
          pais_destino: string | null
          periodo: string
          producto_nuevo_existente: string | null
          ruc: string | null
          tipo_mercado: string | null
          tipo_org_productiva: string | null
          tipo_organizacion: string | null
          tipo_producto: string | null
        }
        Insert: {
          acceso_mercado?: string | null
          anio: number
          cadena_valor?: string | null
          conclusion?: string | null
          created_at?: string | null
          departamento_destino?: string | null
          dni_representante?: string | null
          entidad_id: string
          estado_registro?:
            | Database["public"]["Enums"]["estado_registro"]
            | null
          fecha_primer_envio?: string | null
          genero_representante?: string | null
          id?: string
          mes_primera_venta?: string | null
          nombre_organizacion: string
          nombre_producto?: string | null
          nombre_representante?: string | null
          pais_destino?: string | null
          periodo: string
          producto_nuevo_existente?: string | null
          ruc?: string | null
          tipo_mercado?: string | null
          tipo_org_productiva?: string | null
          tipo_organizacion?: string | null
          tipo_producto?: string | null
        }
        Update: {
          acceso_mercado?: string | null
          anio?: number
          cadena_valor?: string | null
          conclusion?: string | null
          created_at?: string | null
          departamento_destino?: string | null
          dni_representante?: string | null
          entidad_id?: string
          estado_registro?:
            | Database["public"]["Enums"]["estado_registro"]
            | null
          fecha_primer_envio?: string | null
          genero_representante?: string | null
          id?: string
          mes_primera_venta?: string | null
          nombre_organizacion?: string
          nombre_producto?: string | null
          nombre_representante?: string | null
          pais_destino?: string | null
          periodo?: string
          producto_nuevo_existente?: string | null
          ruc?: string | null
          tipo_mercado?: string | null
          tipo_org_productiva?: string | null
          tipo_organizacion?: string | null
          tipo_producto?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reporte_nuevos_mercados_entidad_id_fkey"
            columns: ["entidad_id"]
            isOneToOne: false
            referencedRelation: "entidades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reporte_nuevos_mercados_entidad_id_fkey"
            columns: ["entidad_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_entidad"
            referencedColumns: ["entidad_id"]
          },
        ]
      }
      reporte_productividad: {
        Row: {
          anio: number
          cadena_valor: string
          created_at: string | null
          descarte_campo_tn: number | null
          descarte_proceso_tn: number | null
          entidad_id: string
          estado_registro: Database["public"]["Enums"]["estado_registro"] | null
          genero_productores: string | null
          id: string
          num_productores: number | null
          num_productores_femenino: number | null
          num_productores_masculino: number | null
          organizacion_productores: string | null
          produccion_campo_tn: number | null
          produccion_exportable_tn: number | null
          productividad_tn_ha: number | null
          region: string | null
          superficie_has: number | null
          total_descarte_tn: number | null
          validado_por: string | null
        }
        Insert: {
          anio: number
          cadena_valor: string
          created_at?: string | null
          descarte_campo_tn?: number | null
          descarte_proceso_tn?: number | null
          entidad_id: string
          estado_registro?:
            | Database["public"]["Enums"]["estado_registro"]
            | null
          genero_productores?: string | null
          id?: string
          num_productores?: number | null
          num_productores_femenino?: number | null
          num_productores_masculino?: number | null
          organizacion_productores?: string | null
          produccion_campo_tn?: number | null
          produccion_exportable_tn?: number | null
          productividad_tn_ha?: number | null
          region?: string | null
          superficie_has?: number | null
          total_descarte_tn?: number | null
          validado_por?: string | null
        }
        Update: {
          anio?: number
          cadena_valor?: string
          created_at?: string | null
          descarte_campo_tn?: number | null
          descarte_proceso_tn?: number | null
          entidad_id?: string
          estado_registro?:
            | Database["public"]["Enums"]["estado_registro"]
            | null
          genero_productores?: string | null
          id?: string
          num_productores?: number | null
          num_productores_femenino?: number | null
          num_productores_masculino?: number | null
          organizacion_productores?: string | null
          produccion_campo_tn?: number | null
          produccion_exportable_tn?: number | null
          productividad_tn_ha?: number | null
          region?: string | null
          superficie_has?: number | null
          total_descarte_tn?: number | null
          validado_por?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reporte_productividad_entidad_id_fkey"
            columns: ["entidad_id"]
            isOneToOne: false
            referencedRelation: "entidades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reporte_productividad_entidad_id_fkey"
            columns: ["entidad_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_entidad"
            referencedColumns: ["entidad_id"]
          },
          {
            foreignKeyName: "reporte_productividad_validado_por_fkey"
            columns: ["validado_por"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reporte_turismo_atractivos: {
        Row: {
          anio: number
          clasificacion: string | null
          codigo_atractivo: string | null
          created_at: string | null
          destino: string | null
          entidad_id: string
          estado_registro: Database["public"]["Enums"]["estado_registro"] | null
          id: string
          nombre_atractivo: string
          nombre_empresa: string | null
          periodo: string
          ruc_empresa: string | null
          tours_alta: number | null
          tours_baja: number | null
          ventas_alta: number | null
          ventas_baja: number | null
          visitantes_alta: number | null
          visitantes_baja: number | null
        }
        Insert: {
          anio: number
          clasificacion?: string | null
          codigo_atractivo?: string | null
          created_at?: string | null
          destino?: string | null
          entidad_id: string
          estado_registro?:
            | Database["public"]["Enums"]["estado_registro"]
            | null
          id?: string
          nombre_atractivo: string
          nombre_empresa?: string | null
          periodo: string
          ruc_empresa?: string | null
          tours_alta?: number | null
          tours_baja?: number | null
          ventas_alta?: number | null
          ventas_baja?: number | null
          visitantes_alta?: number | null
          visitantes_baja?: number | null
        }
        Update: {
          anio?: number
          clasificacion?: string | null
          codigo_atractivo?: string | null
          created_at?: string | null
          destino?: string | null
          entidad_id?: string
          estado_registro?:
            | Database["public"]["Enums"]["estado_registro"]
            | null
          id?: string
          nombre_atractivo?: string
          nombre_empresa?: string | null
          periodo?: string
          ruc_empresa?: string | null
          tours_alta?: number | null
          tours_baja?: number | null
          ventas_alta?: number | null
          ventas_baja?: number | null
          visitantes_alta?: number | null
          visitantes_baja?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "reporte_turismo_atractivos_entidad_id_fkey"
            columns: ["entidad_id"]
            isOneToOne: false
            referencedRelation: "entidades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reporte_turismo_atractivos_entidad_id_fkey"
            columns: ["entidad_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_entidad"
            referencedColumns: ["entidad_id"]
          },
        ]
      }
      reporte_turismo_ventas: {
        Row: {
          anio: number
          clasificacion: string | null
          created_at: string | null
          entidad_id: string
          estado_registro: Database["public"]["Enums"]["estado_registro"] | null
          id: string
          nombre_empresa: string
          periodo: string
          provincia: string | null
          region: string | null
          ruc: string | null
          tipo_empresa: string | null
          total_ventas: number | null
          ventas_alta_aventura: number | null
          ventas_alta_bienestar: number | null
          ventas_alta_biodiversidad: number | null
          ventas_alta_general: number | null
          ventas_alta_otros: number | null
          ventas_baja_aventura: number | null
          ventas_baja_bienestar: number | null
          ventas_baja_biodiversidad: number | null
          ventas_baja_general: number | null
          ventas_baja_otros: number | null
        }
        Insert: {
          anio: number
          clasificacion?: string | null
          created_at?: string | null
          entidad_id: string
          estado_registro?:
            | Database["public"]["Enums"]["estado_registro"]
            | null
          id?: string
          nombre_empresa: string
          periodo: string
          provincia?: string | null
          region?: string | null
          ruc?: string | null
          tipo_empresa?: string | null
          total_ventas?: number | null
          ventas_alta_aventura?: number | null
          ventas_alta_bienestar?: number | null
          ventas_alta_biodiversidad?: number | null
          ventas_alta_general?: number | null
          ventas_alta_otros?: number | null
          ventas_baja_aventura?: number | null
          ventas_baja_bienestar?: number | null
          ventas_baja_biodiversidad?: number | null
          ventas_baja_general?: number | null
          ventas_baja_otros?: number | null
        }
        Update: {
          anio?: number
          clasificacion?: string | null
          created_at?: string | null
          entidad_id?: string
          estado_registro?:
            | Database["public"]["Enums"]["estado_registro"]
            | null
          id?: string
          nombre_empresa?: string
          periodo?: string
          provincia?: string | null
          region?: string | null
          ruc?: string | null
          tipo_empresa?: string | null
          total_ventas?: number | null
          ventas_alta_aventura?: number | null
          ventas_alta_bienestar?: number | null
          ventas_alta_biodiversidad?: number | null
          ventas_alta_general?: number | null
          ventas_alta_otros?: number | null
          ventas_baja_aventura?: number | null
          ventas_baja_bienestar?: number | null
          ventas_baja_biodiversidad?: number | null
          ventas_baja_general?: number | null
          ventas_baja_otros?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "reporte_turismo_ventas_entidad_id_fkey"
            columns: ["entidad_id"]
            isOneToOne: false
            referencedRelation: "entidades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reporte_turismo_ventas_entidad_id_fkey"
            columns: ["entidad_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_entidad"
            referencedColumns: ["entidad_id"]
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
          {
            foreignKeyName: "resultados_entidad_id_fkey"
            columns: ["entidad_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_entidad"
            referencedColumns: ["entidad_id"]
          },
        ]
      }
      reuniones_seguimiento: {
        Row: {
          acuerdos: Json | null
          created_at: string | null
          entidad_id: string
          fecha: string
          id: string
          participantes: string | null
          proxima_reunion: string | null
          registrado_por: string | null
          temas_tratados: string | null
        }
        Insert: {
          acuerdos?: Json | null
          created_at?: string | null
          entidad_id: string
          fecha: string
          id?: string
          participantes?: string | null
          proxima_reunion?: string | null
          registrado_por?: string | null
          temas_tratados?: string | null
        }
        Update: {
          acuerdos?: Json | null
          created_at?: string | null
          entidad_id?: string
          fecha?: string
          id?: string
          participantes?: string | null
          proxima_reunion?: string | null
          registrado_por?: string | null
          temas_tratados?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reuniones_seguimiento_entidad_id_fkey"
            columns: ["entidad_id"]
            isOneToOne: false
            referencedRelation: "entidades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reuniones_seguimiento_entidad_id_fkey"
            columns: ["entidad_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_entidad"
            referencedColumns: ["entidad_id"]
          },
          {
            foreignKeyName: "reuniones_seguimiento_registrado_por_fkey"
            columns: ["registrado_por"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
        ]
      }
      viaticos: {
        Row: {
          actividad_id: string | null
          alimentacion_diaria: number | null
          alojamiento_diario: number | null
          created_at: string | null
          destino: string | null
          entidad_id: string
          estado: string | null
          fecha_liquidacion: string | null
          fecha_retorno: string | null
          fecha_salida: string | null
          id: string
          monto_liquidado: number | null
          monto_solicitado: number | null
          motivo: string | null
          nombre_viajero: string
          transporte_local: number | null
        }
        Insert: {
          actividad_id?: string | null
          alimentacion_diaria?: number | null
          alojamiento_diario?: number | null
          created_at?: string | null
          destino?: string | null
          entidad_id: string
          estado?: string | null
          fecha_liquidacion?: string | null
          fecha_retorno?: string | null
          fecha_salida?: string | null
          id?: string
          monto_liquidado?: number | null
          monto_solicitado?: number | null
          motivo?: string | null
          nombre_viajero: string
          transporte_local?: number | null
        }
        Update: {
          actividad_id?: string | null
          alimentacion_diaria?: number | null
          alojamiento_diario?: number | null
          created_at?: string | null
          destino?: string | null
          entidad_id?: string
          estado?: string | null
          fecha_liquidacion?: string | null
          fecha_retorno?: string | null
          fecha_salida?: string | null
          id?: string
          monto_liquidado?: number | null
          monto_solicitado?: number | null
          motivo?: string | null
          nombre_viajero?: string
          transporte_local?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "viaticos_actividad_id_fkey"
            columns: ["actividad_id"]
            isOneToOne: false
            referencedRelation: "actividades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "viaticos_entidad_id_fkey"
            columns: ["entidad_id"]
            isOneToOne: false
            referencedRelation: "entidades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "viaticos_entidad_id_fkey"
            columns: ["entidad_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_entidad"
            referencedColumns: ["entidad_id"]
          },
        ]
      }
    }
    Views: {
      v_dashboard_entidad: {
        Row: {
          actividades_completadas: number | null
          cadena_valor: string | null
          codigo: string | null
          desfases_tecnico_financiero: number | null
          ejecutado_cm_total: number | null
          ejecutado_cnm_total: number | null
          ejecutado_seco_total: number | null
          entidad_id: string | null
          mecanismo: Database["public"]["Enums"]["mecanismo_tipo"] | null
          nombre_corto: string | null
          pct_ejecucion_seco: number | null
          presupuesto_cm_total: number | null
          presupuesto_cnm_total: number | null
          presupuesto_seco_total: number | null
          region: string | null
          sobregiros_seco: number | null
          tipo_entidad: Database["public"]["Enums"]["tipo_entidad"] | null
          total_actividades: number | null
        }
        Relationships: []
      }
      v_trama_fisico_financiera: {
        Row: {
          actividad_hito: boolean | null
          aporte_contrapartida_monetaria_p: number | null
          aporte_contrapartida_no_monetaria_p: number | null
          c_actividad: string | null
          cod_producto: string | null
          cod_proy_e_iniciativa: string | null
          cod_resultado: string | null
          descripcion_de_avance: string | null
          ejecucion_presupuesto_cof_seco: number | null
          ejecucion_presupuesto_contrapartida_monetaria: number | null
          ejecucion_presupuesto_contrapartida_no_monetaria: number | null
          estado: Database["public"]["Enums"]["estado_actividad"] | null
          fecha_corte: string | null
          id_h2: string | null
          item: number | null
          mecanismo: Database["public"]["Enums"]["mecanismo_tipo"] | null
          medio_verificacion: string | null
          mes_anio_fin_prog: string | null
          mes_anio_inicio_prog: string | null
          meta: number | null
          n_actividad: string | null
          nombre_producto: string | null
          nombre_resultado: string | null
          pct_avance_cm: number | null
          pct_avance_cnm: number | null
          pct_avance_cof_seco: number | null
          presupuesto_cofinanc_seco_p: number | null
          presupuesto_total: number | null
          unidad_de_medida: string | null
          valor_de_avance: number | null
        }
        Relationships: []
      }
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
        | "gestor"
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
        "gestor",
      ],
      tipo_contrato: ["persona_natural", "persona_juridica"],
      tipo_entidad: ["mec_b_agro", "mec_b_turismo", "mec_b_mixto", "mec_a"],
    },
  },
} as const
