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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      admin_notificacion_pedido_leida: {
        Row: {
          id_usuario: number
          id_venta: number
          leida_at: string
        }
        Insert: {
          id_usuario: number
          id_venta: number
          leida_at?: string
        }
        Update: {
          id_usuario?: number
          id_venta?: number
          leida_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_notificacion_pedido_leida_id_usuario_fkey"
            columns: ["id_usuario"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_notificacion_pedido_leida_id_venta_fkey"
            columns: ["id_venta"]
            isOneToOne: false
            referencedRelation: "ventas"
            referencedColumns: ["id"]
          },
        ]
      }
      almacen: {
        Row: {
          default: boolean | null
          delete: boolean | null
          fecha_creacion: string | null
          id: number
          id_sucursal: number
          nombre: string | null
        }
        Insert: {
          default?: boolean | null
          delete?: boolean | null
          fecha_creacion?: string | null
          id?: number
          id_sucursal: number
          nombre?: string | null
        }
        Update: {
          default?: boolean | null
          delete?: boolean | null
          fecha_creacion?: string | null
          id?: number
          id_sucursal?: number
          nombre?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "almacen_id_sucursal_fkey"
            columns: ["id_sucursal"]
            isOneToOne: false
            referencedRelation: "sucursales"
            referencedColumns: ["id"]
          },
        ]
      }
      asignacion_sucursal: {
        Row: {
          id: number
          id_caja: number | null
          id_sucursal: number
          id_usuario: number | null
        }
        Insert: {
          id?: number
          id_caja?: number | null
          id_sucursal: number
          id_usuario?: number | null
        }
        Update: {
          id?: number
          id_caja?: number | null
          id_sucursal?: number
          id_usuario?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "asignacion_sucursal_id_caja_fkey"
            columns: ["id_caja"]
            isOneToOne: false
            referencedRelation: "caja"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asignacion_sucursal_id_sucursal_fkey"
            columns: ["id_sucursal"]
            isOneToOne: false
            referencedRelation: "sucursales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asignacion_sucursal_id_usuario_fkey"
            columns: ["id_usuario"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      atributo_valores: {
        Row: {
          id: number
          id_atributo: number
          nombre: string
          orden: number
        }
        Insert: {
          id?: number
          id_atributo: number
          nombre: string
          orden?: number
        }
        Update: {
          id?: number
          id_atributo?: number
          nombre?: string
          orden?: number
        }
        Relationships: [
          {
            foreignKeyName: "atributo_valores_id_atributo_fkey"
            columns: ["id_atributo"]
            isOneToOne: false
            referencedRelation: "atributos"
            referencedColumns: ["id"]
          },
        ]
      }
      atributos: {
        Row: {
          created_at: string
          id: number
          id_empresa: number
          nombre: string
          orden: number
        }
        Insert: {
          created_at?: string
          id?: number
          id_empresa: number
          nombre: string
          orden?: number
        }
        Update: {
          created_at?: string
          id?: number
          id_empresa?: number
          nombre?: string
          orden?: number
        }
        Relationships: [
          {
            foreignKeyName: "atributos_id_empresa_fkey"
            columns: ["id_empresa"]
            isOneToOne: false
            referencedRelation: "empresa"
            referencedColumns: ["id"]
          },
        ]
      }
      banners: {
        Row: {
          activo: boolean
          created_at: string
          id: number
          id_empresa: number
          imagen_path: string
          imagen_url: string
          link_destino: string | null
          orden: number
          subtitulo: string | null
          titulo: string
          updated_at: string
        }
        Insert: {
          activo?: boolean
          created_at?: string
          id?: number
          id_empresa: number
          imagen_path: string
          imagen_url: string
          link_destino?: string | null
          orden?: number
          subtitulo?: string | null
          titulo: string
          updated_at?: string
        }
        Update: {
          activo?: boolean
          created_at?: string
          id?: number
          id_empresa?: number
          imagen_path?: string
          imagen_url?: string
          link_destino?: string | null
          orden?: number
          subtitulo?: string | null
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "banners_id_empresa_fkey"
            columns: ["id_empresa"]
            isOneToOne: false
            referencedRelation: "empresa"
            referencedColumns: ["id"]
          },
        ]
      }
      caja: {
        Row: {
          delete: boolean | null
          descripcion: string
          fecha_creacion: string | null
          id: number
          id_sucursal: number | null
          print: boolean | null
        }
        Insert: {
          delete?: boolean | null
          descripcion: string
          fecha_creacion?: string | null
          id?: number
          id_sucursal?: number | null
          print?: boolean | null
        }
        Update: {
          delete?: boolean | null
          descripcion?: string
          fecha_creacion?: string | null
          id?: number
          id_sucursal?: number | null
          print?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "caja_id_sucursal_fkey"
            columns: ["id_sucursal"]
            isOneToOne: false
            referencedRelation: "sucursales"
            referencedColumns: ["id"]
          },
        ]
      }
      categorias: {
        Row: {
          color: string | null
          created_at: string
          descripcion: string | null
          icono: string | null
          id: number
          id_empresa: number | null
          id_padre: number | null
          nombre: string
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          descripcion?: string | null
          icono?: string | null
          id?: number
          id_empresa?: number | null
          id_padre?: number | null
          nombre: string
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          descripcion?: string | null
          icono?: string | null
          id?: number
          id_empresa?: number | null
          id_padre?: number | null
          nombre?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "categorias_id_padre_fkey"
            columns: ["id_padre"]
            isOneToOne: false
            referencedRelation: "categorias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "public_categorias_id_empresa_fkey"
            columns: ["id_empresa"]
            isOneToOne: false
            referencedRelation: "empresa"
            referencedColumns: ["id"]
          },
        ]
      }
      cierrecaja: {
        Row: {
          diferencia_efectivo: number | null
          estado: number | null
          fechacierre: string | null
          fechainicio: string | null
          id: number
          id_caja: number | null
          id_usuario: number | null
          total_efectivo_calculado: number | null
          total_efectivo_real: number | null
        }
        Insert: {
          diferencia_efectivo?: number | null
          estado?: number | null
          fechacierre?: string | null
          fechainicio?: string | null
          id?: number
          id_caja?: number | null
          id_usuario?: number | null
          total_efectivo_calculado?: number | null
          total_efectivo_real?: number | null
        }
        Update: {
          diferencia_efectivo?: number | null
          estado?: number | null
          fechacierre?: string | null
          fechainicio?: string | null
          id?: number
          id_caja?: number | null
          id_usuario?: number | null
          total_efectivo_calculado?: number | null
          total_efectivo_real?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "cierrecaja_id_caja_fkey"
            columns: ["id_caja"]
            isOneToOne: false
            referencedRelation: "caja"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cierrecaja_id_usuario_fkey"
            columns: ["id_usuario"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      clave_intentos: {
        Row: {
          bloqueado_hasta: string | null
          fallos: number
          id_usuario: number
        }
        Insert: {
          bloqueado_hasta?: string | null
          fallos?: number
          id_usuario: number
        }
        Update: {
          bloqueado_hasta?: string | null
          fallos?: number
          id_usuario?: number
        }
        Relationships: [
          {
            foreignKeyName: "clave_intentos_id_usuario_fkey"
            columns: ["id_usuario"]
            isOneToOne: true
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      clientes_proveedores: {
        Row: {
          direccion: string | null
          email: string | null
          estado: string | null
          fecha_registro: string | null
          id: number
          id_empresa: number | null
          identificador_fiscal: string | null
          identificador_nacional: string | null
          nombres: string
          telefono: string | null
          tipo: string | null
        }
        Insert: {
          direccion?: string | null
          email?: string | null
          estado?: string | null
          fecha_registro?: string | null
          id?: number
          id_empresa?: number | null
          identificador_fiscal?: string | null
          identificador_nacional?: string | null
          nombres?: string
          telefono?: string | null
          tipo?: string | null
        }
        Update: {
          direccion?: string | null
          email?: string | null
          estado?: string | null
          fecha_registro?: string | null
          id?: number
          id_empresa?: number | null
          identificador_fiscal?: string | null
          identificador_nacional?: string | null
          nombres?: string
          telefono?: string | null
          tipo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "public_clientes_id_empresa_fkey"
            columns: ["id_empresa"]
            isOneToOne: false
            referencedRelation: "empresa"
            referencedColumns: ["id"]
          },
        ]
      }
      cp_mexico: {
        Row: {
          ciudad: string | null
          colonia: string
          cp: string
          estado: string
          id: number
          municipio: string
          tipo_asentamiento: string | null
          zona: string | null
        }
        Insert: {
          ciudad?: string | null
          colonia: string
          cp: string
          estado: string
          id?: never
          municipio: string
          tipo_asentamiento?: string | null
          zona?: string | null
        }
        Update: {
          ciudad?: string | null
          colonia?: string
          cp?: string
          estado?: string
          id?: never
          municipio?: string
          tipo_asentamiento?: string | null
          zona?: string | null
        }
        Relationships: []
      }
      detalle_venta: {
        Row: {
          cantidad: number | null
          descripcion: string | null
          estado: string | null
          id: number
          id_almacen: number | null
          id_combinacion: number | null
          id_pieza: number | null
          id_producto: number | null
          id_sucursal: number | null
          id_venta: number
          precio_compra: number | null
          precio_venta: number | null
          total: number | null
        }
        Insert: {
          cantidad?: number | null
          descripcion?: string | null
          estado?: string | null
          id?: number
          id_almacen?: number | null
          id_combinacion?: number | null
          id_pieza?: number | null
          id_producto?: number | null
          id_sucursal?: number | null
          id_venta: number
          precio_compra?: number | null
          precio_venta?: number | null
          total?: number | null
        }
        Update: {
          cantidad?: number | null
          descripcion?: string | null
          estado?: string | null
          id?: number
          id_almacen?: number | null
          id_combinacion?: number | null
          id_pieza?: number | null
          id_producto?: number | null
          id_sucursal?: number | null
          id_venta?: number
          precio_compra?: number | null
          precio_venta?: number | null
          total?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "detalle_venta_id_combinacion_fkey"
            columns: ["id_combinacion"]
            isOneToOne: false
            referencedRelation: "producto_combinaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "detalle_venta_id_pieza_fkey"
            columns: ["id_pieza"]
            isOneToOne: false
            referencedRelation: "piezas_inventario"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "detalle_venta_id_pieza_fkey"
            columns: ["id_pieza"]
            isOneToOne: false
            referencedRelation: "piezas_inventario_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "detalle_venta_id_sucursal_fkey"
            columns: ["id_sucursal"]
            isOneToOne: false
            referencedRelation: "sucursales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "public_detalle_venta_id_producto_fkey"
            columns: ["id_producto"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "public_detalle_venta_id_producto_fkey"
            columns: ["id_producto"]
            isOneToOne: false
            referencedRelation: "productos_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "public_detalle_venta_id_venta_fkey"
            columns: ["id_venta"]
            isOneToOne: false
            referencedRelation: "ventas"
            referencedColumns: ["id"]
          },
        ]
      }
      ecommerce_cliente_perfil: {
        Row: {
          created_at: string
          email: string | null
          id_cliente: number
          id_empresa: number
          nombre: string | null
          telefono: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id_cliente: number
          id_empresa: number
          nombre?: string | null
          telefono?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id_cliente?: number
          id_empresa?: number
          nombre?: string | null
          telefono?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ecommerce_cliente_perfil_id_cliente_fkey"
            columns: ["id_cliente"]
            isOneToOne: false
            referencedRelation: "clientes_proveedores"
            referencedColumns: ["id"]
          },
        ]
      }
      ecommerce_direccion: {
        Row: {
          calle: string
          colonia: string
          cp: string
          created_at: string
          destinatario: string
          entre_calles: string | null
          es_predeterminada: boolean
          estado: string
          etiqueta: string | null
          id: number
          lat: number | null
          lng: number | null
          municipio: string
          numero_exterior: string
          numero_interior: string | null
          referencias: string | null
          telefono: string
          updated_at: string
          user_id: string
        }
        Insert: {
          calle: string
          colonia: string
          cp: string
          created_at?: string
          destinatario: string
          entre_calles?: string | null
          es_predeterminada?: boolean
          estado: string
          etiqueta?: string | null
          id?: never
          lat?: number | null
          lng?: number | null
          municipio: string
          numero_exterior: string
          numero_interior?: string | null
          referencias?: string | null
          telefono: string
          updated_at?: string
          user_id: string
        }
        Update: {
          calle?: string
          colonia?: string
          cp?: string
          created_at?: string
          destinatario?: string
          entre_calles?: string | null
          es_predeterminada?: boolean
          estado?: string
          etiqueta?: string | null
          id?: never
          lat?: number | null
          lng?: number | null
          municipio?: string
          numero_exterior?: string
          numero_interior?: string | null
          referencias?: string | null
          telefono?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ecommerce_favorito: {
        Row: {
          created_at: string
          id_producto: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id_producto: number
          user_id?: string
        }
        Update: {
          created_at?: string
          id_producto?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ecommerce_favorito_id_producto_fkey"
            columns: ["id_producto"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ecommerce_favorito_id_producto_fkey"
            columns: ["id_producto"]
            isOneToOne: false
            referencedRelation: "productos_v"
            referencedColumns: ["id"]
          },
        ]
      }
      ecommerce_orden_envio: {
        Row: {
          calle: string
          colonia: string
          cp: string
          created_at: string
          destinatario: string
          email: string | null
          entre_calles: string | null
          estado: string
          id_orden_externa: string
          lat: number | null
          lng: number | null
          municipio: string
          numero_exterior: string
          numero_interior: string | null
          referencias: string | null
          telefono: string
          user_id: string | null
        }
        Insert: {
          calle: string
          colonia: string
          cp: string
          created_at?: string
          destinatario: string
          email?: string | null
          entre_calles?: string | null
          estado: string
          id_orden_externa: string
          lat?: number | null
          lng?: number | null
          municipio: string
          numero_exterior: string
          numero_interior?: string | null
          referencias?: string | null
          telefono: string
          user_id?: string | null
        }
        Update: {
          calle?: string
          colonia?: string
          cp?: string
          created_at?: string
          destinatario?: string
          email?: string | null
          entre_calles?: string | null
          estado?: string
          id_orden_externa?: string
          lat?: number | null
          lng?: number | null
          municipio?: string
          numero_exterior?: string
          numero_interior?: string | null
          referencias?: string | null
          telefono?: string
          user_id?: string | null
        }
        Relationships: []
      }
      ecommerce_orden_items: {
        Row: {
          cantidad: number
          created_at: string
          descripcion: string | null
          id: number
          id_almacen: number
          id_combinacion: number | null
          id_orden_externa: string
          id_producto: number
          origen: string
          precio_compra: number | null
          precio_venta: number
        }
        Insert: {
          cantidad: number
          created_at?: string
          descripcion?: string | null
          id?: never
          id_almacen: number
          id_combinacion?: number | null
          id_orden_externa: string
          id_producto: number
          origen: string
          precio_compra?: number | null
          precio_venta: number
        }
        Update: {
          cantidad?: number
          created_at?: string
          descripcion?: string | null
          id?: never
          id_almacen?: number
          id_combinacion?: number | null
          id_orden_externa?: string
          id_producto?: number
          origen?: string
          precio_compra?: number | null
          precio_venta?: number
        }
        Relationships: [
          {
            foreignKeyName: "ecommerce_orden_items_id_almacen_fkey"
            columns: ["id_almacen"]
            isOneToOne: false
            referencedRelation: "almacen"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ecommerce_orden_items_id_combinacion_fkey"
            columns: ["id_combinacion"]
            isOneToOne: false
            referencedRelation: "producto_combinaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ecommerce_orden_items_id_producto_fkey"
            columns: ["id_producto"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ecommerce_orden_items_id_producto_fkey"
            columns: ["id_producto"]
            isOneToOne: false
            referencedRelation: "productos_v"
            referencedColumns: ["id"]
          },
        ]
      }
      empresa: {
        Row: {
          apartado_anticipo_pct: number
          apartado_dias: number
          correo: string | null
          costo_envio: number
          currency: string | null
          direccion_fiscal: string | null
          diseno_tienda: Json
          funciones_apagadas: string[]
          id: number
          id_auth: string
          id_fiscal: string | null
          id_usuario: number | null
          impuesto: string | null
          iso: string | null
          logo: string | null
          nombre: string
          nombre_moneda: string | null
          pais: string | null
          paleta_admin: Json
          pie_pagina_ticket: string | null
          simbolo_moneda: string | null
          valor_impuesto: number | null
        }
        Insert: {
          apartado_anticipo_pct?: number
          apartado_dias?: number
          correo?: string | null
          costo_envio?: number
          currency?: string | null
          direccion_fiscal?: string | null
          diseno_tienda?: Json
          funciones_apagadas?: string[]
          id?: number
          id_auth?: string
          id_fiscal?: string | null
          id_usuario?: number | null
          impuesto?: string | null
          iso?: string | null
          logo?: string | null
          nombre?: string
          nombre_moneda?: string | null
          pais?: string | null
          paleta_admin?: Json
          pie_pagina_ticket?: string | null
          simbolo_moneda?: string | null
          valor_impuesto?: number | null
        }
        Update: {
          apartado_anticipo_pct?: number
          apartado_dias?: number
          correo?: string | null
          costo_envio?: number
          currency?: string | null
          direccion_fiscal?: string | null
          diseno_tienda?: Json
          funciones_apagadas?: string[]
          id?: number
          id_auth?: string
          id_fiscal?: string | null
          id_usuario?: number | null
          impuesto?: string | null
          iso?: string | null
          logo?: string | null
          nombre?: string
          nombre_moneda?: string | null
          pais?: string | null
          paleta_admin?: Json
          pie_pagina_ticket?: string | null
          simbolo_moneda?: string | null
          valor_impuesto?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "empresa_id_usuario_fkey"
            columns: ["id_usuario"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      etiquetas: {
        Row: {
          created_at: string
          id: number
          id_empresa: number
          nombre: string
        }
        Insert: {
          created_at?: string
          id?: number
          id_empresa: number
          nombre: string
        }
        Update: {
          created_at?: string
          id?: number
          id_empresa?: number
          nombre?: string
        }
        Relationships: [
          {
            foreignKeyName: "etiquetas_id_empresa_fkey"
            columns: ["id_empresa"]
            isOneToOne: false
            referencedRelation: "empresa"
            referencedColumns: ["id"]
          },
        ]
      }
      impresoras: {
        Row: {
          id: number
          id_caja: number
          ip_local: string | null
          name: string | null
          pc_name: string | null
          state: boolean | null
        }
        Insert: {
          id?: number
          id_caja: number
          ip_local?: string | null
          name?: string | null
          pc_name?: string | null
          state?: boolean | null
        }
        Update: {
          id?: number
          id_caja?: number
          ip_local?: string | null
          name?: string | null
          pc_name?: string | null
          state?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "impresoras_id_caja_fkey"
            columns: ["id_caja"]
            isOneToOne: false
            referencedRelation: "caja"
            referencedColumns: ["id"]
          },
        ]
      }
      kardex: {
        Row: {
          cantidad: number | null
          costo: number | null
          estado: string | null
          fecha: string
          habia: number | null
          hay: number | null
          id: number
          id_producto: number | null
          id_usuario: number | null
          motivo: string | null
          tipo: string | null
          total: number | null
        }
        Insert: {
          cantidad?: number | null
          costo?: number | null
          estado?: string | null
          fecha: string
          habia?: number | null
          hay?: number | null
          id?: number
          id_producto?: number | null
          id_usuario?: number | null
          motivo?: string | null
          tipo?: string | null
          total?: number | null
        }
        Update: {
          cantidad?: number | null
          costo?: number | null
          estado?: string | null
          fecha?: string
          habia?: number | null
          hay?: number | null
          id?: number
          id_producto?: number | null
          id_usuario?: number | null
          motivo?: string | null
          tipo?: string | null
          total?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "public_kardex_id_producto_fkey"
            columns: ["id_producto"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "public_kardex_id_producto_fkey"
            columns: ["id_producto"]
            isOneToOne: false
            referencedRelation: "productos_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "public_kardex_id_usuario_fkey"
            columns: ["id_usuario"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      licencia: {
        Row: {
          actualizado: string
          giro: string
          id: number
          mensaje_suspension: string | null
          plan: string
          suspendida: boolean
          url_proyecto: string | null
        }
        Insert: {
          actualizado?: string
          giro?: string
          id?: number
          mensaje_suspension?: string | null
          plan?: string
          suspendida?: boolean
          url_proyecto?: string | null
        }
        Update: {
          actualizado?: string
          giro?: string
          id?: number
          mensaje_suspension?: string | null
          plan?: string
          suspendida?: boolean
          url_proyecto?: string | null
        }
        Relationships: []
      }
      marca: {
        Row: {
          created_at: string
          id: number
          id_empresa: number
          nombre: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: number
          id_empresa: number
          nombre: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: number
          id_empresa?: number
          nombre?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "marca_id_empresa_fkey"
            columns: ["id_empresa"]
            isOneToOne: false
            referencedRelation: "empresa"
            referencedColumns: ["id"]
          },
        ]
      }
      metodos_pago: {
        Row: {
          delete_update: boolean | null
          icono: string | null
          id: number
          id_empresa: number | null
          nombre: string
          ver_nombre: boolean | null
        }
        Insert: {
          delete_update?: boolean | null
          icono?: string | null
          id?: number
          id_empresa?: number | null
          nombre: string
          ver_nombre?: boolean | null
        }
        Update: {
          delete_update?: boolean | null
          icono?: string | null
          id?: number
          id_empresa?: number | null
          nombre?: string
          ver_nombre?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "metodos_pago_id_empresa_fkey"
            columns: ["id_empresa"]
            isOneToOne: false
            referencedRelation: "empresa"
            referencedColumns: ["id"]
          },
        ]
      }
      ml_config_producto: {
        Row: {
          atributos: Json
          id_producto: number
          ml_category_id: string
          publicar: boolean
          updated_at: string
        }
        Insert: {
          atributos?: Json
          id_producto: number
          ml_category_id: string
          publicar?: boolean
          updated_at?: string
        }
        Update: {
          atributos?: Json
          id_producto?: number
          ml_category_id?: string
          publicar?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ml_config_producto_id_producto_fkey"
            columns: ["id_producto"]
            isOneToOne: true
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ml_config_producto_id_producto_fkey"
            columns: ["id_producto"]
            isOneToOne: true
            referencedRelation: "productos_v"
            referencedColumns: ["id"]
          },
        ]
      }
      ml_cuenta: {
        Row: {
          access_token: string
          expira_en: string
          id: number
          ml_user_id: number
          refresh_token: string
          updated_at: string
        }
        Insert: {
          access_token: string
          expira_en: string
          id?: number
          ml_user_id: number
          refresh_token: string
          updated_at?: string
        }
        Update: {
          access_token?: string
          expira_en?: string
          id?: number
          ml_user_id?: number
          refresh_token?: string
          updated_at?: string
        }
        Relationships: []
      }
      ml_oauth_estado: {
        Row: {
          creado_en: string
          id_auth: string
          state: string
          volver_a: string
        }
        Insert: {
          creado_en?: string
          id_auth: string
          state: string
          volver_a: string
        }
        Update: {
          creado_en?: string
          id_auth?: string
          state?: string
          volver_a?: string
        }
        Relationships: []
      }
      ml_ordenes: {
        Row: {
          comprador: string | null
          created_at: string
          estado_ml: string
          id_venta: number | null
          ml_order_id: number
          pack_id: number | null
          total: number | null
          ultimo_error: string | null
          updated_at: string
        }
        Insert: {
          comprador?: string | null
          created_at?: string
          estado_ml: string
          id_venta?: number | null
          ml_order_id: number
          pack_id?: number | null
          total?: number | null
          ultimo_error?: string | null
          updated_at?: string
        }
        Update: {
          comprador?: string | null
          created_at?: string
          estado_ml?: string
          id_venta?: number | null
          ml_order_id?: number
          pack_id?: number | null
          total?: number | null
          ultimo_error?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ml_ordenes_id_venta_fkey"
            columns: ["id_venta"]
            isOneToOne: false
            referencedRelation: "ventas"
            referencedColumns: ["id"]
          },
        ]
      }
      ml_publicaciones: {
        Row: {
          cantidad_publicada: number | null
          clave_grupo: string
          creando_desde: string | null
          created_at: string
          estado_ml: string | null
          id: number
          id_producto: number
          ml_item_id: string | null
          ml_user_product_id: string | null
          modelo: string
          precio_publicado: number | null
          sincronizado_en: string | null
          ultimo_error: string | null
          updated_at: string
        }
        Insert: {
          cantidad_publicada?: number | null
          clave_grupo: string
          creando_desde?: string | null
          created_at?: string
          estado_ml?: string | null
          id?: number
          id_producto: number
          ml_item_id?: string | null
          ml_user_product_id?: string | null
          modelo: string
          precio_publicado?: number | null
          sincronizado_en?: string | null
          ultimo_error?: string | null
          updated_at?: string
        }
        Update: {
          cantidad_publicada?: number | null
          clave_grupo?: string
          creando_desde?: string | null
          created_at?: string
          estado_ml?: string | null
          id?: number
          id_producto?: number
          ml_item_id?: string | null
          ml_user_product_id?: string | null
          modelo?: string
          precio_publicado?: number | null
          sincronizado_en?: string | null
          ultimo_error?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ml_publicaciones_id_producto_fkey"
            columns: ["id_producto"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ml_publicaciones_id_producto_fkey"
            columns: ["id_producto"]
            isOneToOne: false
            referencedRelation: "productos_v"
            referencedColumns: ["id"]
          },
        ]
      }
      modulos: {
        Row: {
          check: boolean | null
          descripcion: string | null
          etiquetas: string | null
          icono: string | null
          id: number
          link: string | null
          nombre: string
        }
        Insert: {
          check?: boolean | null
          descripcion?: string | null
          etiquetas?: string | null
          icono?: string | null
          id?: number
          link?: string | null
          nombre?: string
        }
        Update: {
          check?: boolean | null
          descripcion?: string | null
          etiquetas?: string | null
          icono?: string | null
          id?: number
          link?: string | null
          nombre?: string
        }
        Relationships: []
      }
      movimientos_caja: {
        Row: {
          descripcion: string | null
          fecha_movimiento: string
          id: number
          id_cierre_caja: number | null
          id_metodo_pago: number | null
          id_usuario: number | null
          id_ventas: number | null
          monto: number | null
          tipo_movimiento: string | null
          vuelto: number | null
        }
        Insert: {
          descripcion?: string | null
          fecha_movimiento?: string
          id?: number
          id_cierre_caja?: number | null
          id_metodo_pago?: number | null
          id_usuario?: number | null
          id_ventas?: number | null
          monto?: number | null
          tipo_movimiento?: string | null
          vuelto?: number | null
        }
        Update: {
          descripcion?: string | null
          fecha_movimiento?: string
          id?: number
          id_cierre_caja?: number | null
          id_metodo_pago?: number | null
          id_usuario?: number | null
          id_ventas?: number | null
          monto?: number | null
          tipo_movimiento?: string | null
          vuelto?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "movimientos_caja_id_cierre_caja_fkey"
            columns: ["id_cierre_caja"]
            isOneToOne: false
            referencedRelation: "cierrecaja"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimientos_caja_id_metodo_pago_fkey"
            columns: ["id_metodo_pago"]
            isOneToOne: false
            referencedRelation: "metodos_pago"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimientos_caja_id_usuario_fkey"
            columns: ["id_usuario"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimientos_caja_id_ventas_fkey"
            columns: ["id_ventas"]
            isOneToOne: false
            referencedRelation: "ventas"
            referencedColumns: ["id"]
          },
        ]
      }
      movimientos_piezas: {
        Row: {
          cantidad: number
          created_at: string
          estado_anterior: string | null
          estado_nuevo: string | null
          id: number
          id_empresa: number
          id_pieza: number
          id_referencia: number | null
          id_usuario: number | null
          notas: string | null
          referencia_tipo: string | null
          tipo: string
        }
        Insert: {
          cantidad?: number
          created_at?: string
          estado_anterior?: string | null
          estado_nuevo?: string | null
          id?: number
          id_empresa: number
          id_pieza: number
          id_referencia?: number | null
          id_usuario?: number | null
          notas?: string | null
          referencia_tipo?: string | null
          tipo: string
        }
        Update: {
          cantidad?: number
          created_at?: string
          estado_anterior?: string | null
          estado_nuevo?: string | null
          id?: number
          id_empresa?: number
          id_pieza?: number
          id_referencia?: number | null
          id_usuario?: number | null
          notas?: string | null
          referencia_tipo?: string | null
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "movimientos_piezas_id_empresa_fkey"
            columns: ["id_empresa"]
            isOneToOne: false
            referencedRelation: "empresa"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimientos_piezas_id_pieza_fkey"
            columns: ["id_pieza"]
            isOneToOne: false
            referencedRelation: "piezas_inventario"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimientos_piezas_id_pieza_fkey"
            columns: ["id_pieza"]
            isOneToOne: false
            referencedRelation: "piezas_inventario_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimientos_piezas_id_usuario_fkey"
            columns: ["id_usuario"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      movimientos_stock: {
        Row: {
          cantidad: number | null
          detalle: string | null
          fecha: string | null
          id: number
          id_almacen: number
          id_combinacion: number | null
          id_producto: number | null
          origen: string | null
          tipo_movimiento: string | null
        }
        Insert: {
          cantidad?: number | null
          detalle?: string | null
          fecha?: string | null
          id?: number
          id_almacen: number
          id_combinacion?: number | null
          id_producto?: number | null
          origen?: string | null
          tipo_movimiento?: string | null
        }
        Update: {
          cantidad?: number | null
          detalle?: string | null
          fecha?: string | null
          id?: number
          id_almacen?: number
          id_combinacion?: number | null
          id_producto?: number | null
          origen?: string | null
          tipo_movimiento?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "movimientos_stock_id_almacen_fkey"
            columns: ["id_almacen"]
            isOneToOne: false
            referencedRelation: "almacen"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimientos_stock_id_combinacion_fkey"
            columns: ["id_combinacion"]
            isOneToOne: false
            referencedRelation: "producto_combinaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimientos_stock_id_producto_fkey"
            columns: ["id_producto"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimientos_stock_id_producto_fkey"
            columns: ["id_producto"]
            isOneToOne: false
            referencedRelation: "productos_v"
            referencedColumns: ["id"]
          },
        ]
      }
      multiprecios: {
        Row: {
          cantidad: number | null
          id: number
          id_producto: number | null
          precio_venta: number
        }
        Insert: {
          cantidad?: number | null
          id?: number
          id_producto?: number | null
          precio_venta: number
        }
        Update: {
          cantidad?: number | null
          id?: number
          id_producto?: number | null
          precio_venta?: number
        }
        Relationships: [
          {
            foreignKeyName: "multiprecios_id_producto_fkey"
            columns: ["id_producto"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "multiprecios_id_producto_fkey"
            columns: ["id_producto"]
            isOneToOne: false
            referencedRelation: "productos_v"
            referencedColumns: ["id"]
          },
        ]
      }
      permisos: {
        Row: {
          id: number
          id_usuario: number
          idmodulo: number | null
        }
        Insert: {
          id?: number
          id_usuario: number
          idmodulo?: number | null
        }
        Update: {
          id?: number
          id_usuario?: number
          idmodulo?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "permisos_id_usuario_fkey"
            columns: ["id_usuario"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "permisos_idmodulo_fkey"
            columns: ["idmodulo"]
            isOneToOne: false
            referencedRelation: "modulos"
            referencedColumns: ["id"]
          },
        ]
      }
      permisos_dafault: {
        Row: {
          id: number
          id_modulo: number | null
          id_rol: number
        }
        Insert: {
          id?: number
          id_modulo?: number | null
          id_rol: number
        }
        Update: {
          id?: number
          id_modulo?: number | null
          id_rol?: number
        }
        Relationships: [
          {
            foreignKeyName: "permisos_dafault_id_modulo_fkey"
            columns: ["id_modulo"]
            isOneToOne: false
            referencedRelation: "modulos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "permisos_dafault_id_rol_fkey"
            columns: ["id_rol"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      piezas_inventario: {
        Row: {
          barcode: string
          costo: number
          created_at: string
          estado: string
          id: number
          id_almacen: number | null
          id_detalle_venta: number | null
          id_empresa: number
          id_grupo: number | null
          id_producto: number
          id_variante: number
          id_venta_reserva: number | null
          medidas: string | null
          nota: string | null
          peso: number
          precio_oferta: number | null
          precio_venta: number
          sku: string
          talla: string | null
          updated_at: string
        }
        Insert: {
          barcode: string
          costo?: number
          created_at?: string
          estado?: string
          id?: number
          id_almacen?: number | null
          id_detalle_venta?: number | null
          id_empresa: number
          id_grupo?: number | null
          id_producto: number
          id_variante: number
          id_venta_reserva?: number | null
          medidas?: string | null
          nota?: string | null
          peso: number
          precio_oferta?: number | null
          precio_venta: number
          sku: string
          talla?: string | null
          updated_at?: string
        }
        Update: {
          barcode?: string
          costo?: number
          created_at?: string
          estado?: string
          id?: number
          id_almacen?: number | null
          id_detalle_venta?: number | null
          id_empresa?: number
          id_grupo?: number | null
          id_producto?: number
          id_variante?: number
          id_venta_reserva?: number | null
          medidas?: string | null
          nota?: string | null
          peso?: number
          precio_oferta?: number | null
          precio_venta?: number
          sku?: string
          talla?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "piezas_inventario_id_almacen_fkey"
            columns: ["id_almacen"]
            isOneToOne: false
            referencedRelation: "almacen"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "piezas_inventario_id_detalle_venta_fkey"
            columns: ["id_detalle_venta"]
            isOneToOne: false
            referencedRelation: "detalle_venta"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "piezas_inventario_id_detalle_venta_fkey"
            columns: ["id_detalle_venta"]
            isOneToOne: false
            referencedRelation: "detalle_venta_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "piezas_inventario_id_empresa_fkey"
            columns: ["id_empresa"]
            isOneToOne: false
            referencedRelation: "empresa"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "piezas_inventario_id_producto_fkey"
            columns: ["id_producto"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "piezas_inventario_id_producto_fkey"
            columns: ["id_producto"]
            isOneToOne: false
            referencedRelation: "productos_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "piezas_inventario_id_variante_fkey"
            columns: ["id_variante"]
            isOneToOne: false
            referencedRelation: "producto_variantes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "piezas_inventario_id_variante_fkey"
            columns: ["id_variante"]
            isOneToOne: false
            referencedRelation: "producto_variantes_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "piezas_inventario_id_venta_reserva_fkey"
            columns: ["id_venta_reserva"]
            isOneToOne: false
            referencedRelation: "ventas"
            referencedColumns: ["id"]
          },
        ]
      }
      producto_atributos: {
        Row: {
          id_producto: number
          id_valor: number
        }
        Insert: {
          id_producto: number
          id_valor: number
        }
        Update: {
          id_producto?: number
          id_valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "producto_atributos_id_producto_fkey"
            columns: ["id_producto"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "producto_atributos_id_producto_fkey"
            columns: ["id_producto"]
            isOneToOne: false
            referencedRelation: "productos_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "producto_atributos_id_valor_fkey"
            columns: ["id_valor"]
            isOneToOne: false
            referencedRelation: "atributo_valores"
            referencedColumns: ["id"]
          },
        ]
      }
      producto_combinaciones: {
        Row: {
          activo: boolean
          codigo_barras: string | null
          color: string
          color_hex: string | null
          created_at: string
          id: number
          id_producto: number
          orden: number
          sku: string | null
          talla: string
        }
        Insert: {
          activo?: boolean
          codigo_barras?: string | null
          color?: string
          color_hex?: string | null
          created_at?: string
          id?: number
          id_producto: number
          orden?: number
          sku?: string | null
          talla?: string
        }
        Update: {
          activo?: boolean
          codigo_barras?: string | null
          color?: string
          color_hex?: string | null
          created_at?: string
          id?: number
          id_producto?: number
          orden?: number
          sku?: string | null
          talla?: string
        }
        Relationships: [
          {
            foreignKeyName: "producto_combinaciones_id_producto_fkey"
            columns: ["id_producto"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "producto_combinaciones_id_producto_fkey"
            columns: ["id_producto"]
            isOneToOne: false
            referencedRelation: "productos_v"
            referencedColumns: ["id"]
          },
        ]
      }
      producto_etiquetas: {
        Row: {
          id_etiqueta: number
          id_producto: number
        }
        Insert: {
          id_etiqueta: number
          id_producto: number
        }
        Update: {
          id_etiqueta?: number
          id_producto?: number
        }
        Relationships: [
          {
            foreignKeyName: "producto_etiquetas_id_etiqueta_fkey"
            columns: ["id_etiqueta"]
            isOneToOne: false
            referencedRelation: "etiquetas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "producto_etiquetas_id_producto_fkey"
            columns: ["id_producto"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "producto_etiquetas_id_producto_fkey"
            columns: ["id_producto"]
            isOneToOne: false
            referencedRelation: "productos_v"
            referencedColumns: ["id"]
          },
        ]
      }
      producto_imagenes: {
        Row: {
          color: string | null
          created_at: string
          id: number
          id_producto: number
          orden: number
          path: string
          url: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: never
          id_producto: number
          orden?: number
          path: string
          url: string
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: never
          id_producto?: number
          orden?: number
          path?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "producto_imagenes_id_producto_fkey"
            columns: ["id_producto"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "producto_imagenes_id_producto_fkey"
            columns: ["id_producto"]
            isOneToOne: false
            referencedRelation: "productos_v"
            referencedColumns: ["id"]
          },
        ]
      }
      producto_variante_imagenes: {
        Row: {
          created_at: string
          id: number
          id_variante: number
          orden: number
          path: string
          url: string
        }
        Insert: {
          created_at?: string
          id?: never
          id_variante: number
          orden?: number
          path: string
          url: string
        }
        Update: {
          created_at?: string
          id?: never
          id_variante?: number
          orden?: number
          path?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "producto_variante_imagenes_id_variante_fkey"
            columns: ["id_variante"]
            isOneToOne: false
            referencedRelation: "producto_variantes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "producto_variante_imagenes_id_variante_fkey"
            columns: ["id_variante"]
            isOneToOne: false
            referencedRelation: "producto_variantes_v"
            referencedColumns: ["id"]
          },
        ]
      }
      producto_variantes: {
        Row: {
          created_at: string
          id: number
          id_empresa: number
          id_producto: number
          material: string
          notas: string | null
          precio_compra_sugerido: number | null
          precio_venta_sugerido: number | null
          pureza: string | null
          sku_prefijo: string | null
          ultimo_correlativo: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: number
          id_empresa: number
          id_producto: number
          material: string
          notas?: string | null
          precio_compra_sugerido?: number | null
          precio_venta_sugerido?: number | null
          pureza?: string | null
          sku_prefijo?: string | null
          ultimo_correlativo?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: number
          id_empresa?: number
          id_producto?: number
          material?: string
          notas?: string | null
          precio_compra_sugerido?: number | null
          precio_venta_sugerido?: number | null
          pureza?: string | null
          sku_prefijo?: string | null
          ultimo_correlativo?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "producto_variantes_id_empresa_fkey"
            columns: ["id_empresa"]
            isOneToOne: false
            referencedRelation: "empresa"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "producto_variantes_id_producto_fkey"
            columns: ["id_producto"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "producto_variantes_id_producto_fkey"
            columns: ["id_producto"]
            isOneToOne: false
            referencedRelation: "productos_v"
            referencedColumns: ["id"]
          },
        ]
      }
      productos: {
        Row: {
          activo: boolean
          codigo_barras: string | null
          codigo_interno: string | null
          created_at: string
          descripcion: string | null
          destacado: boolean
          es_joyeria: boolean
          id: number
          id_categoria: number | null
          id_empresa: number | null
          id_marca: number | null
          maneja_inventarios: boolean | null
          maneja_multiprecios: boolean | null
          medidas: string | null
          nombre: string
          oferta_desde: string | null
          oferta_hasta: string | null
          permite_apartado: boolean
          precio_compra: number | null
          precio_oferta: number | null
          precio_venta: number | null
          sevende_por: string | null
          tallas: string | null
          updated_at: string
          visible_ecommerce: boolean
        }
        Insert: {
          activo?: boolean
          codigo_barras?: string | null
          codigo_interno?: string | null
          created_at?: string
          descripcion?: string | null
          destacado?: boolean
          es_joyeria?: boolean
          id?: number
          id_categoria?: number | null
          id_empresa?: number | null
          id_marca?: number | null
          maneja_inventarios?: boolean | null
          maneja_multiprecios?: boolean | null
          medidas?: string | null
          nombre: string
          oferta_desde?: string | null
          oferta_hasta?: string | null
          permite_apartado?: boolean
          precio_compra?: number | null
          precio_oferta?: number | null
          precio_venta?: number | null
          sevende_por?: string | null
          tallas?: string | null
          updated_at?: string
          visible_ecommerce?: boolean
        }
        Update: {
          activo?: boolean
          codigo_barras?: string | null
          codigo_interno?: string | null
          created_at?: string
          descripcion?: string | null
          destacado?: boolean
          es_joyeria?: boolean
          id?: number
          id_categoria?: number | null
          id_empresa?: number | null
          id_marca?: number | null
          maneja_inventarios?: boolean | null
          maneja_multiprecios?: boolean | null
          medidas?: string | null
          nombre?: string
          oferta_desde?: string | null
          oferta_hasta?: string | null
          permite_apartado?: boolean
          precio_compra?: number | null
          precio_oferta?: number | null
          precio_venta?: number | null
          sevende_por?: string | null
          tallas?: string | null
          updated_at?: string
          visible_ecommerce?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "public_productos_id_categoria_fkey"
            columns: ["id_categoria"]
            isOneToOne: false
            referencedRelation: "categorias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "public_productos_id_empresa_fkey"
            columns: ["id_empresa"]
            isOneToOne: false
            referencedRelation: "empresa"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          id: number
          nombre: string
        }
        Insert: {
          id?: number
          nombre: string
        }
        Update: {
          id?: number
          nombre?: string
        }
        Relationships: []
      }
      serializacion_comprobantes: {
        Row: {
          cantidad_numeros: number | null
          correlativo: number | null
          id: number
          id_tipo_comprobante: number
          por_default: boolean | null
          serie: string | null
          sucursal_id: number | null
        }
        Insert: {
          cantidad_numeros?: number | null
          correlativo?: number | null
          id?: number
          id_tipo_comprobante: number
          por_default?: boolean | null
          serie?: string | null
          sucursal_id?: number | null
        }
        Update: {
          cantidad_numeros?: number | null
          correlativo?: number | null
          id?: number
          id_tipo_comprobante?: number
          por_default?: boolean | null
          serie?: string | null
          sucursal_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "serializacion_comprobantes_id_tipo_comprobante_fkey"
            columns: ["id_tipo_comprobante"]
            isOneToOne: false
            referencedRelation: "tipo_comprobantes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "serializacion_comprobantes_sucursal_id_fkey"
            columns: ["sucursal_id"]
            isOneToOne: false
            referencedRelation: "sucursales"
            referencedColumns: ["id"]
          },
        ]
      }
      stock: {
        Row: {
          id: number
          id_almacen: number
          id_combinacion: number | null
          id_producto: number | null
          stock: number
          stock_minimo: number | null
          ubicacion: string | null
        }
        Insert: {
          id?: number
          id_almacen: number
          id_combinacion?: number | null
          id_producto?: number | null
          stock?: number
          stock_minimo?: number | null
          ubicacion?: string | null
        }
        Update: {
          id?: number
          id_almacen?: number
          id_combinacion?: number | null
          id_producto?: number | null
          stock?: number
          stock_minimo?: number | null
          ubicacion?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_id_almacen_fkey"
            columns: ["id_almacen"]
            isOneToOne: false
            referencedRelation: "almacen"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_id_combinacion_fkey"
            columns: ["id_combinacion"]
            isOneToOne: false
            referencedRelation: "producto_combinaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_id_producto_fkey"
            columns: ["id_producto"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_id_producto_fkey"
            columns: ["id_producto"]
            isOneToOne: false
            referencedRelation: "productos_v"
            referencedColumns: ["id"]
          },
        ]
      }
      sucursales: {
        Row: {
          delete: boolean | null
          direccion_fiscal: string | null
          id: number
          id_empresa: number | null
          nombre: string | null
        }
        Insert: {
          delete?: boolean | null
          direccion_fiscal?: string | null
          id?: number
          id_empresa?: number | null
          nombre?: string | null
        }
        Update: {
          delete?: boolean | null
          direccion_fiscal?: string | null
          id?: number
          id_empresa?: number | null
          nombre?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sucursales_id_empresa_fkey"
            columns: ["id_empresa"]
            isOneToOne: false
            referencedRelation: "empresa"
            referencedColumns: ["id"]
          },
        ]
      }
      tipo_comprobantes: {
        Row: {
          destino: string | null
          id: number
          nombre: string
        }
        Insert: {
          destino?: string | null
          id?: number
          nombre: string
        }
        Update: {
          destino?: string | null
          id?: number
          nombre?: string
        }
        Relationships: []
      }
      tipodocumento: {
        Row: {
          id: number
          id_empresa: number | null
          nombre: string
        }
        Insert: {
          id?: number
          id_empresa?: number | null
          nombre?: string
        }
        Update: {
          id?: number
          id_empresa?: number | null
          nombre?: string
        }
        Relationships: [
          {
            foreignKeyName: "tipodocumento_id_empresa_fkey"
            columns: ["id_empresa"]
            isOneToOne: false
            referencedRelation: "empresa"
            referencedColumns: ["id"]
          },
        ]
      }
      usuarios: {
        Row: {
          correo: string | null
          estado: string | null
          fecharegistro: string | null
          id: number
          id_auth: string | null
          id_rol: number | null
          id_tipodocumento: number | null
          nombres: string
          nro_doc: string | null
          telefono: string | null
          tema: string | null
        }
        Insert: {
          correo?: string | null
          estado?: string | null
          fecharegistro?: string | null
          id?: number
          id_auth?: string | null
          id_rol?: number | null
          id_tipodocumento?: number | null
          nombres?: string
          nro_doc?: string | null
          telefono?: string | null
          tema?: string | null
        }
        Update: {
          correo?: string | null
          estado?: string | null
          fecharegistro?: string | null
          id?: number
          id_auth?: string | null
          id_rol?: number | null
          id_tipodocumento?: number | null
          nombres?: string
          nro_doc?: string | null
          telefono?: string | null
          tema?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "usuarios_id_rol_fkey"
            columns: ["id_rol"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      usuarios_clave: {
        Row: {
          clave_cifrada: string
          id_usuario: number
          updated_at: string
        }
        Insert: {
          clave_cifrada: string
          id_usuario: number
          updated_at?: string
        }
        Update: {
          clave_cifrada?: string
          id_usuario?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "usuarios_clave_id_usuario_fkey"
            columns: ["id_usuario"]
            isOneToOne: true
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      ventas: {
        Row: {
          anulada_en: string | null
          anulada_por: number | null
          apartado_creado: string | null
          apartado_vence: string | null
          autorizada_por: number | null
          cantidad_productos: number | null
          estado: string | null
          estado_envio: string | null
          fecha: string
          id: number
          id_cierre_caja: number | null
          id_cliente: number | null
          id_empresa: number | null
          id_orden_externa: string | null
          id_sucursal: number | null
          id_usuario: number | null
          metodo_pago: string | null
          monto_total: number | null
          motivo_anulacion: string | null
          nro_comprobante: string | null
          origen: string
          pago_con: number | null
          referencia_tarjeta: string | null
          saldo: number | null
          sub_total: number | null
          total_impuestos: number | null
          valor_impuesto: number | null
          vuelto: number | null
        }
        Insert: {
          anulada_en?: string | null
          anulada_por?: number | null
          apartado_creado?: string | null
          apartado_vence?: string | null
          autorizada_por?: number | null
          cantidad_productos?: number | null
          estado?: string | null
          estado_envio?: string | null
          fecha?: string
          id?: number
          id_cierre_caja?: number | null
          id_cliente?: number | null
          id_empresa?: number | null
          id_orden_externa?: string | null
          id_sucursal?: number | null
          id_usuario?: number | null
          metodo_pago?: string | null
          monto_total?: number | null
          motivo_anulacion?: string | null
          nro_comprobante?: string | null
          origen?: string
          pago_con?: number | null
          referencia_tarjeta?: string | null
          saldo?: number | null
          sub_total?: number | null
          total_impuestos?: number | null
          valor_impuesto?: number | null
          vuelto?: number | null
        }
        Update: {
          anulada_en?: string | null
          anulada_por?: number | null
          apartado_creado?: string | null
          apartado_vence?: string | null
          autorizada_por?: number | null
          cantidad_productos?: number | null
          estado?: string | null
          estado_envio?: string | null
          fecha?: string
          id?: number
          id_cierre_caja?: number | null
          id_cliente?: number | null
          id_empresa?: number | null
          id_orden_externa?: string | null
          id_sucursal?: number | null
          id_usuario?: number | null
          metodo_pago?: string | null
          monto_total?: number | null
          motivo_anulacion?: string | null
          nro_comprobante?: string | null
          origen?: string
          pago_con?: number | null
          referencia_tarjeta?: string | null
          saldo?: number | null
          sub_total?: number | null
          total_impuestos?: number | null
          valor_impuesto?: number | null
          vuelto?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "public_ventas_id_cliente_fkey"
            columns: ["id_cliente"]
            isOneToOne: false
            referencedRelation: "clientes_proveedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ventas_anulada_por_fkey"
            columns: ["anulada_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ventas_autorizada_por_fkey"
            columns: ["autorizada_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ventas_id_cierre_caja_fkey"
            columns: ["id_cierre_caja"]
            isOneToOne: false
            referencedRelation: "cierrecaja"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ventas_id_usuario_fkey"
            columns: ["id_usuario"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      detalle_venta_v: {
        Row: {
          cantidad: number | null
          descripcion: string | null
          estado: string | null
          id: number | null
          id_almacen: number | null
          id_pieza: number | null
          id_producto: number | null
          id_sucursal: number | null
          id_venta: number | null
          precio_compra: number | null
          precio_venta: number | null
          total: number | null
        }
        Insert: {
          cantidad?: number | null
          descripcion?: string | null
          estado?: string | null
          id?: number | null
          id_almacen?: number | null
          id_pieza?: number | null
          id_producto?: number | null
          id_sucursal?: number | null
          id_venta?: number | null
          precio_compra?: never
          precio_venta?: number | null
          total?: number | null
        }
        Update: {
          cantidad?: number | null
          descripcion?: string | null
          estado?: string | null
          id?: number | null
          id_almacen?: number | null
          id_pieza?: number | null
          id_producto?: number | null
          id_sucursal?: number | null
          id_venta?: number | null
          precio_compra?: never
          precio_venta?: number | null
          total?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "detalle_venta_id_pieza_fkey"
            columns: ["id_pieza"]
            isOneToOne: false
            referencedRelation: "piezas_inventario"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "detalle_venta_id_pieza_fkey"
            columns: ["id_pieza"]
            isOneToOne: false
            referencedRelation: "piezas_inventario_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "detalle_venta_id_sucursal_fkey"
            columns: ["id_sucursal"]
            isOneToOne: false
            referencedRelation: "sucursales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "public_detalle_venta_id_producto_fkey"
            columns: ["id_producto"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "public_detalle_venta_id_producto_fkey"
            columns: ["id_producto"]
            isOneToOne: false
            referencedRelation: "productos_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "public_detalle_venta_id_venta_fkey"
            columns: ["id_venta"]
            isOneToOne: false
            referencedRelation: "ventas"
            referencedColumns: ["id"]
          },
        ]
      }
      piezas_inventario_v: {
        Row: {
          barcode: string | null
          costo: number | null
          created_at: string | null
          estado: string | null
          id: number | null
          id_almacen: number | null
          id_detalle_venta: number | null
          id_empresa: number | null
          id_grupo: number | null
          id_producto: number | null
          id_variante: number | null
          id_venta_reserva: number | null
          medidas: string | null
          nota: string | null
          peso: number | null
          precio_oferta: number | null
          precio_venta: number | null
          sku: string | null
          talla: string | null
          updated_at: string | null
        }
        Insert: {
          barcode?: string | null
          costo?: never
          created_at?: string | null
          estado?: string | null
          id?: number | null
          id_almacen?: number | null
          id_detalle_venta?: number | null
          id_empresa?: number | null
          id_grupo?: number | null
          id_producto?: number | null
          id_variante?: number | null
          id_venta_reserva?: number | null
          medidas?: string | null
          nota?: string | null
          peso?: number | null
          precio_oferta?: number | null
          precio_venta?: number | null
          sku?: string | null
          talla?: string | null
          updated_at?: string | null
        }
        Update: {
          barcode?: string | null
          costo?: never
          created_at?: string | null
          estado?: string | null
          id?: number | null
          id_almacen?: number | null
          id_detalle_venta?: number | null
          id_empresa?: number | null
          id_grupo?: number | null
          id_producto?: number | null
          id_variante?: number | null
          id_venta_reserva?: number | null
          medidas?: string | null
          nota?: string | null
          peso?: number | null
          precio_oferta?: number | null
          precio_venta?: number | null
          sku?: string | null
          talla?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "piezas_inventario_id_almacen_fkey"
            columns: ["id_almacen"]
            isOneToOne: false
            referencedRelation: "almacen"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "piezas_inventario_id_detalle_venta_fkey"
            columns: ["id_detalle_venta"]
            isOneToOne: false
            referencedRelation: "detalle_venta"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "piezas_inventario_id_detalle_venta_fkey"
            columns: ["id_detalle_venta"]
            isOneToOne: false
            referencedRelation: "detalle_venta_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "piezas_inventario_id_empresa_fkey"
            columns: ["id_empresa"]
            isOneToOne: false
            referencedRelation: "empresa"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "piezas_inventario_id_producto_fkey"
            columns: ["id_producto"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "piezas_inventario_id_producto_fkey"
            columns: ["id_producto"]
            isOneToOne: false
            referencedRelation: "productos_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "piezas_inventario_id_variante_fkey"
            columns: ["id_variante"]
            isOneToOne: false
            referencedRelation: "producto_variantes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "piezas_inventario_id_variante_fkey"
            columns: ["id_variante"]
            isOneToOne: false
            referencedRelation: "producto_variantes_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "piezas_inventario_id_venta_reserva_fkey"
            columns: ["id_venta_reserva"]
            isOneToOne: false
            referencedRelation: "ventas"
            referencedColumns: ["id"]
          },
        ]
      }
      producto_variantes_v: {
        Row: {
          created_at: string | null
          id: number | null
          id_empresa: number | null
          id_producto: number | null
          material: string | null
          notas: string | null
          precio_compra_sugerido: number | null
          precio_venta_sugerido: number | null
          pureza: string | null
          sku_prefijo: string | null
          ultimo_correlativo: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: number | null
          id_empresa?: number | null
          id_producto?: number | null
          material?: string | null
          notas?: string | null
          precio_compra_sugerido?: never
          precio_venta_sugerido?: number | null
          pureza?: string | null
          sku_prefijo?: string | null
          ultimo_correlativo?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: number | null
          id_empresa?: number | null
          id_producto?: number | null
          material?: string | null
          notas?: string | null
          precio_compra_sugerido?: never
          precio_venta_sugerido?: number | null
          pureza?: string | null
          sku_prefijo?: string | null
          ultimo_correlativo?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "producto_variantes_id_empresa_fkey"
            columns: ["id_empresa"]
            isOneToOne: false
            referencedRelation: "empresa"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "producto_variantes_id_producto_fkey"
            columns: ["id_producto"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "producto_variantes_id_producto_fkey"
            columns: ["id_producto"]
            isOneToOne: false
            referencedRelation: "productos_v"
            referencedColumns: ["id"]
          },
        ]
      }
      productos_v: {
        Row: {
          activo: boolean | null
          codigo_barras: string | null
          codigo_interno: string | null
          created_at: string | null
          descripcion: string | null
          destacado: boolean | null
          es_joyeria: boolean | null
          id: number | null
          id_categoria: number | null
          id_empresa: number | null
          id_marca: number | null
          maneja_inventarios: boolean | null
          maneja_multiprecios: boolean | null
          medidas: string | null
          nombre: string | null
          oferta_desde: string | null
          oferta_hasta: string | null
          permite_apartado: boolean | null
          precio_compra: number | null
          precio_oferta: number | null
          precio_venta: number | null
          sevende_por: string | null
          tallas: string | null
          updated_at: string | null
          visible_ecommerce: boolean | null
        }
        Insert: {
          activo?: boolean | null
          codigo_barras?: string | null
          codigo_interno?: string | null
          created_at?: string | null
          descripcion?: string | null
          destacado?: boolean | null
          es_joyeria?: boolean | null
          id?: number | null
          id_categoria?: number | null
          id_empresa?: number | null
          id_marca?: number | null
          maneja_inventarios?: boolean | null
          maneja_multiprecios?: boolean | null
          medidas?: string | null
          nombre?: string | null
          oferta_desde?: string | null
          oferta_hasta?: string | null
          permite_apartado?: boolean | null
          precio_compra?: never
          precio_oferta?: number | null
          precio_venta?: number | null
          sevende_por?: string | null
          tallas?: string | null
          updated_at?: string | null
          visible_ecommerce?: boolean | null
        }
        Update: {
          activo?: boolean | null
          codigo_barras?: string | null
          codigo_interno?: string | null
          created_at?: string | null
          descripcion?: string | null
          destacado?: boolean | null
          es_joyeria?: boolean | null
          id?: number | null
          id_categoria?: number | null
          id_empresa?: number | null
          id_marca?: number | null
          maneja_inventarios?: boolean | null
          maneja_multiprecios?: boolean | null
          medidas?: string | null
          nombre?: string | null
          oferta_desde?: string | null
          oferta_hasta?: string | null
          permite_apartado?: boolean | null
          precio_compra?: never
          precio_oferta?: number | null
          precio_venta?: number | null
          sevende_por?: string | null
          tallas?: string | null
          updated_at?: string | null
          visible_ecommerce?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "public_productos_id_categoria_fkey"
            columns: ["id_categoria"]
            isOneToOne: false
            referencedRelation: "categorias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "public_productos_id_empresa_fkey"
            columns: ["id_empresa"]
            isOneToOne: false
            referencedRelation: "empresa"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      abonar_apartado: {
        Args: {
          _fecha: string
          _id_cierre_caja: number
          _id_metodo_pago: number
          _id_venta: number
          _monto: number
        }
        Returns: {
          anulada_en: string | null
          anulada_por: number | null
          apartado_creado: string | null
          apartado_vence: string | null
          autorizada_por: number | null
          cantidad_productos: number | null
          estado: string | null
          estado_envio: string | null
          fecha: string
          id: number
          id_cierre_caja: number | null
          id_cliente: number | null
          id_empresa: number | null
          id_orden_externa: string | null
          id_sucursal: number | null
          id_usuario: number | null
          metodo_pago: string | null
          monto_total: number | null
          motivo_anulacion: string | null
          nro_comprobante: string | null
          origen: string
          pago_con: number | null
          referencia_tarjeta: string | null
          saldo: number | null
          sub_total: number | null
          total_impuestos: number | null
          valor_impuesto: number | null
          vuelto: number | null
        }[]
        SetofOptions: {
          from: "*"
          to: "ventas"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      admin_actualizar_estado_envio: {
        Args: { _estado_envio: string; _id_venta: number }
        Returns: undefined
      }
      admin_detalle_pedido_ecommerce: {
        Args: { _id_venta: number }
        Returns: {
          calle: string
          colonia: string
          cp: string
          destinatario: string
          email: string
          entre_calles: string
          estado: string
          items: Json
          municipio: string
          numero_exterior: string
          numero_interior: string
          referencias: string
          telefono: string
        }[]
      }
      admin_es_gerente: { Args: never; Returns: boolean }
      admin_es_personal: { Args: never; Returns: boolean }
      admin_es_superadmin: { Args: never; Returns: boolean }
      admin_exigir_gerente: { Args: never; Returns: undefined }
      admin_exigir_modulo: { Args: { ids: number[] }; Returns: undefined }
      admin_exigir_personal: { Args: never; Returns: undefined }
      admin_exigir_turno_abierto: {
        Args: { _id_cierre_caja: number }
        Returns: undefined
      }
      admin_guardar_diseno_tienda: {
        Args: { _diseno: Json; _id_empresa: number }
        Returns: undefined
      }
      admin_guardar_paleta: {
        Args: { _id_empresa: number; _paleta: Json }
        Returns: undefined
      }
      admin_listar_notificaciones_pedidos: {
        Args: never
        Returns: {
          destinatario: string
          fecha: string
          id: number
          monto_total: number
          nro_comprobante: string
        }[]
      }
      admin_listar_pedidos_ecommerce: {
        Args: never
        Returns: {
          destinatario: string
          email: string
          estado_envio: string
          fecha: string
          id: number
          metodo_pago: string
          monto_total: number
          nro_comprobante: string
          telefono: string
        }[]
      }
      admin_llave_clave: { Args: never; Returns: string }
      admin_marcar_notificacion_leida: {
        Args: { _id_venta: number }
        Returns: undefined
      }
      admin_puede_autorizar: { Args: { _id_usuario: number }; Returns: boolean }
      admin_restablecer_contrasena: {
        Args: { _id_usuario: number; _pass: string }
        Returns: undefined
      }
      admin_rol_actual: { Args: never; Returns: string }
      admin_tiene_modulo: { Args: { ids: number[] }; Returns: boolean }
      admin_usuario_actual: { Args: never; Returns: number }
      admin_ve_costos: { Args: never; Returns: boolean }
      admin_verificar_clave: {
        Args: { _clave: string }
        Returns: Record<string, unknown>
      }
      ajustar_pieza:
        | {
            Args: {
              _costo: number
              _id_empresa: number
              _id_pieza: number
              _id_usuario: number
              _nota: string
              _peso: number
              _precio_venta: number
            }
            Returns: undefined
          }
        | {
            Args: {
              _costo: number
              _id_empresa: number
              _id_pieza: number
              _id_usuario: number
              _nota: string
              _peso: number
              _precio_oferta?: number
              _precio_venta: number
              _quitar_oferta?: boolean
              _talla?: string
            }
            Returns: undefined
          }
        | {
            Args: {
              _costo: number
              _id_empresa: number
              _id_pieza: number
              _id_usuario: number
              _medidas?: string
              _nota: string
              _peso: number
              _precio_oferta?: number
              _precio_venta: number
              _quitar_oferta?: boolean
              _talla?: string
            }
            Returns: undefined
          }
      anular_venta: {
        Args: { _clave: string; _id_venta: number; _motivo: string }
        Returns: string
      }
      apartado_abonado: { Args: { _id_venta: number }; Returns: number }
      buscarproductos: {
        Args: { _id_empresa: number; buscador: string }
        Returns: {
          categoria: string
          codigo_barras: string
          codigo_interno: string
          id: number
          id_categoria: number
          id_empresa: number
          imagen_portada: string
          maneja_inventarios: boolean
          maneja_multiprecios: boolean
          nombre: string
          p_compra: string
          p_venta: string
          precio_compra: number
          precio_venta: number
          sevende_por: string
        }[]
      }
      buscarproductoslectora: {
        Args: { _id_empresa: number; buscador: string }
        Returns: {
          categoria: string
          codigo_barras: string
          codigo_interno: string
          id: number
          id_categoria: number
          id_empresa: number
          imagen_portada: string
          maneja_inventarios: boolean
          maneja_multiprecios: boolean
          nombre: string
          p_compra: string
          p_venta: string
          precio_compra: number
          precio_venta: number
          sevende_por: string
        }[]
      }
      buscarusuariosasignados: {
        Args: { _id_empresa: number; buscador: string }
        Returns: {
          caja: string
          email: string
          estadouser: string
          id_asignacion: number
          id_usuario: number
          rol: string
          sucursal: string
          usuario: string
        }[]
      }
      cancelar_apartado: {
        Args: {
          _clave: string
          _devolver: number
          _id_cierre_caja: number
          _id_venta: number
          _motivo: string
        }
        Returns: string
      }
      confirmar_venta: {
        Args: {
          _fecha: string
          _id_cliente: number
          _id_sucursal: number
          _id_tipo_comprobante: number
          _id_usuario: number
          _id_venta: number
          _monto_total: number
          _serie: string
          _vuelto: number
        }
        Returns: {
          anulada_en: string | null
          anulada_por: number | null
          apartado_creado: string | null
          apartado_vence: string | null
          autorizada_por: number | null
          cantidad_productos: number | null
          estado: string | null
          estado_envio: string | null
          fecha: string
          id: number
          id_cierre_caja: number | null
          id_cliente: number | null
          id_empresa: number | null
          id_orden_externa: string | null
          id_sucursal: number | null
          id_usuario: number | null
          metodo_pago: string | null
          monto_total: number | null
          motivo_anulacion: string | null
          nro_comprobante: string | null
          origen: string
          pago_con: number | null
          referencia_tarjeta: string | null
          saldo: number | null
          sub_total: number | null
          total_impuestos: number | null
          valor_impuesto: number | null
          vuelto: number | null
        }[]
        SetofOptions: {
          from: "*"
          to: "ventas"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      contarproductosporauth: { Args: { _id_auth: string }; Returns: number }
      crear_apartado: {
        Args: {
          _anticipo: number
          _fecha: string
          _id_cliente: number
          _id_metodo_pago: number
          _id_venta: number
        }
        Returns: {
          anulada_en: string | null
          anulada_por: number | null
          apartado_creado: string | null
          apartado_vence: string | null
          autorizada_por: number | null
          cantidad_productos: number | null
          estado: string | null
          estado_envio: string | null
          fecha: string
          id: number
          id_cierre_caja: number | null
          id_cliente: number | null
          id_empresa: number | null
          id_orden_externa: string | null
          id_sucursal: number | null
          id_usuario: number | null
          metodo_pago: string | null
          monto_total: number | null
          motivo_anulacion: string | null
          nro_comprobante: string | null
          origen: string
          pago_con: number | null
          referencia_tarjeta: string | null
          saldo: number | null
          sub_total: number | null
          total_impuestos: number | null
          valor_impuesto: number | null
          vuelto: number | null
        }[]
        SetofOptions: {
          from: "*"
          to: "ventas"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      crear_pieza: {
        Args: {
          _costo: number
          _id_almacen: number
          _id_empresa: number
          _id_usuario: number
          _id_variante: number
          _nota: string
          _peso: number
          _precio_venta: number
        }
        Returns: {
          barcode: string
          costo: number
          created_at: string
          estado: string
          id: number
          id_almacen: number | null
          id_detalle_venta: number | null
          id_empresa: number
          id_grupo: number | null
          id_producto: number
          id_variante: number
          id_venta_reserva: number | null
          medidas: string | null
          nota: string | null
          peso: number
          precio_oferta: number | null
          precio_venta: number
          sku: string
          talla: string | null
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "piezas_inventario"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      crear_piezas_masivo: {
        Args: {
          _id_almacen: number
          _id_empresa: number
          _id_usuario: number
          _id_variante: number
          _lineas: Json
        }
        Returns: {
          barcode: string
          costo: number
          created_at: string
          estado: string
          id: number
          id_almacen: number | null
          id_detalle_venta: number | null
          id_empresa: number
          id_grupo: number | null
          id_producto: number
          id_variante: number
          id_venta_reserva: number | null
          medidas: string | null
          nota: string | null
          peso: number
          precio_oferta: number | null
          precio_venta: number
          sku: string
          talla: string | null
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "piezas_inventario"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      crear_producto_joyeria:
        | {
            Args: {
              _descripcion: string
              _id_categoria: number
              _id_empresa: number
              _id_marca: number
              _nombre: string
            }
            Returns: number
          }
        | {
            Args: {
              _descripcion: string
              _destacado?: boolean
              _id_categoria: number
              _id_empresa: number
              _id_marca: number
              _nombre: string
            }
            Returns: number
          }
      crear_variante: {
        Args: {
          _id_empresa: number
          _id_producto: number
          _material: string
          _precio_compra_sugerido: number
          _precio_venta_sugerido: number
          _pureza: string
          _sku_prefijo: string
        }
        Returns: number
      }
      crear_venta_externa: {
        Args: {
          _canal: string
          _id_orden_externa: string
          _items: Json
          _venta: Json
        }
        Returns: {
          anulada_en: string | null
          anulada_por: number | null
          apartado_creado: string | null
          apartado_vence: string | null
          autorizada_por: number | null
          cantidad_productos: number | null
          estado: string | null
          estado_envio: string | null
          fecha: string
          id: number
          id_cierre_caja: number | null
          id_cliente: number | null
          id_empresa: number | null
          id_orden_externa: string | null
          id_sucursal: number | null
          id_usuario: number | null
          metodo_pago: string | null
          monto_total: number | null
          motivo_anulacion: string | null
          nro_comprobante: string | null
          origen: string
          pago_con: number | null
          referencia_tarjeta: string | null
          saldo: number | null
          sub_total: number | null
          total_impuestos: number | null
          valor_impuesto: number | null
          vuelto: number | null
        }[]
        SetofOptions: {
          from: "*"
          to: "ventas"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      crear_venta_externa_piezas: {
        Args: {
          _canal: string
          _id_orden_externa: string
          _id_tipo_comprobante: number
          _serie: string
        }
        Returns: {
          anulada_en: string | null
          anulada_por: number | null
          apartado_creado: string | null
          apartado_vence: string | null
          autorizada_por: number | null
          cantidad_productos: number | null
          estado: string | null
          estado_envio: string | null
          fecha: string
          id: number
          id_cierre_caja: number | null
          id_cliente: number | null
          id_empresa: number | null
          id_orden_externa: string | null
          id_sucursal: number | null
          id_usuario: number | null
          metodo_pago: string | null
          monto_total: number | null
          motivo_anulacion: string | null
          nro_comprobante: string | null
          origen: string
          pago_con: number | null
          referencia_tarjeta: string | null
          saldo: number | null
          sub_total: number | null
          total_impuestos: number | null
          valor_impuesto: number | null
          vuelto: number | null
        }[]
        SetofOptions: {
          from: "*"
          to: "ventas"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      crearcredencialesuser: {
        Args: { email: string; pass: string }
        Returns: string
      }
      dashboard_alertas_inventario: {
        Args: { _dias_sin_movimiento?: number; _id_empresa: number }
        Returns: {
          almacen: string
          existencias: number
          id_producto: number
          producto: string
          sevende_por: string
          stock_minimo: number
          tipo: string
          ultima_venta: string
          valor: number
        }[]
      }
      dashboard_cancelaciones: {
        Args: {
          _fecha_fin: string
          _fecha_inicio: string
          _id_empresa: number
          _zona?: string
        }
        Returns: {
          autorizo: string
          cancelada: string
          cancelo: string
          cliente: string
          fecha_venta: string
          id: number
          monto: number
          motivo: string
          nro_comprobante: string
          tipo: string
        }[]
      }
      dashboard_desglose_ventas: {
        Args: { _fecha_fin: string; _fecha_inicio: string; _id_empresa: number }
        Returns: Json
      }
      dashboard_detalle_productos: {
        Args: { _fecha_fin: string; _fecha_inicio: string; _id_empresa: number }
        Returns: {
          cantidad: number
          ganancia: number
          id_producto: number
          producto: string
          sevende_por: string
          total: number
        }[]
      }
      dashboard_detalle_ventas: {
        Args: { _fecha_fin: string; _fecha_inicio: string; _id_empresa: number }
        Returns: {
          articulos: number
          cajero: string
          cliente: string
          fecha: string
          id: number
          nro_comprobante: string
          origen: string
          total: number
        }[]
      }
      dashboard_joyeria_inventario: {
        Args: { _id_empresa: number }
        Returns: {
          gramos: number
          material: string
          piezas: number
          pureza: string
          valor: number
        }[]
      }
      dashboard_joyeria_ventas: {
        Args: { _fecha_fin: string; _fecha_inicio: string; _id_empresa: number }
        Returns: {
          ganancia: number
          gramos: number
          material: string
          piezas: number
          pureza: string
          total: number
        }[]
      }
      dashboard_ventas_por_hora: {
        Args: {
          _fecha_fin: string
          _fecha_inicio: string
          _id_empresa: number
          _zona?: string
        }
        Returns: {
          dia: number
          hora: number
          total: number
          ventas: number
        }[]
      }
      dashboardcajasporsucursalyventas: {
        Args: { _id_empresa: number }
        Returns: {
          caja_descripcion: string
          delete: boolean
          direccionfiscal: string
          estadocaja: number
          fecha_creacion: string
          idcaja: number
          idsucursal: number
          sucursal_nombre: string
          total_ventas: number
        }[]
      }
      dashboardsumarcantidaddetalleventa: {
        Args: { _fecha_fin: string; _fecha_inicio: string; _id_empresa: number }
        Returns: number
      }
      dashboardsumargananciadetalleventa: {
        Args: { _fecha_fin: string; _fecha_inicio: string; _id_empresa: number }
        Returns: number
      }
      dashboardsumarventaporempresa: {
        Args: { _fecha_fin: string; _fecha_inicio: string; _id_empresa: number }
        Returns: number
      }
      dashboardsumarventasporempresa: {
        Args: { _fecha_fin: string; _fecha_inicio: string; _id_empresa: number }
        Returns: number
      }
      dashboardsumarventasporempresaperiodoanterior: {
        Args: { _fecha_fin: string; _fecha_inicio: string; _id_empresa: number }
        Returns: number
      }
      dashboardtop5productosmasvendidos: {
        Args: { _fecha_fin: string; _fecha_inicio: string; _id_empresa: number }
        Returns: {
          id_producto: number
          nombre_producto: string
          porcentaje: number
          total_vendido: number
        }[]
      }
      dashboartotalventasconfechas: {
        Args: { _fecha_fin: string; _fecha_inicio: string; _id_empresa: number }
        Returns: {
          fecha: string
          total_ventas: number
        }[]
      }
      dashboartotalventasxmetodopago: {
        Args: { _fecha_fin: string; _fecha_inicio: string; _id_empresa: number }
        Returns: {
          fecha: string
          metodo_pago: string
          total_ventas: number
        }[]
      }
      devolver_pieza: {
        Args: {
          _destino: string
          _id_empresa: number
          _id_pieza: number
          _id_usuario: number
          _nota: string
        }
        Returns: undefined
      }
      ecommerce_actualizar_mi_telefono: {
        Args: { _telefono: string }
        Returns: undefined
      }
      ecommerce_buscar_cp: {
        Args: { _cp: string }
        Returns: {
          ciudad: string
          colonia: string
          estado: string
          municipio: string
          tipo_asentamiento: string
        }[]
      }
      ecommerce_catalogo: { Args: { _f?: Json }; Returns: Json }
      ecommerce_costo_envio: { Args: never; Returns: number }
      ecommerce_diseno: { Args: never; Returns: Json }
      ecommerce_id_empresa: { Args: never; Returns: number }
      ecommerce_imagenes_producto: {
        Args: { _id_producto: number }
        Returns: {
          color: string
          id: number
          orden: number
          url: string
        }[]
      }
      ecommerce_imagenes_variante: {
        Args: { _id_variante: number }
        Returns: {
          id: number
          orden: number
          url: string
        }[]
      }
      ecommerce_liberar_reservas_vencidas: {
        Args: { _minutos?: number }
        Returns: number
      }
      ecommerce_listar_banners: {
        Args: never
        Returns: {
          id: number
          imagen_url: string
          link_destino: string
          subtitulo: string
          titulo: string
        }[]
      }
      ecommerce_listar_categorias: {
        Args: never
        Returns: {
          color: string
          icono: string
          id: number
          nombre: string
        }[]
      }
      ecommerce_listar_etiquetas: {
        Args: never
        Returns: {
          id: number
          nombre: string
        }[]
      }
      ecommerce_listar_favoritos: {
        Args: never
        Returns: {
          categoria: string
          descripcion: string
          destacado: boolean
          es_joyeria: boolean
          etiquetas: string[]
          id: number
          id_categoria: number
          imagen_portada: string
          marca: string
          nombre: string
          precio_oferta: number
          precio_venta: number
          total_disponible: number
        }[]
      }
      ecommerce_listar_marcas: {
        Args: never
        Returns: {
          id: number
          nombre: string
        }[]
      }
      ecommerce_listar_materiales: {
        Args: never
        Returns: {
          material: string
        }[]
      }
      ecommerce_listar_productos: {
        Args: {
          _buscador?: string
          _id_categoria?: number
          _id_etiqueta?: number
          _id_marca?: number
          _material?: string
          _pagina?: number
          _peso_max?: number
          _peso_min?: number
          _precio_max?: number
          _precio_min?: number
          _solo_disponibles?: boolean
          _talla?: string
          _tam_pagina?: number
        }
        Returns: {
          categoria: string
          descripcion: string
          destacado: boolean
          es_joyeria: boolean
          etiquetas: string[]
          id: number
          id_categoria: number
          imagen_portada: string
          marca: string
          nombre: string
          precio_oferta: number
          precio_venta: number
          total_count: number
          total_disponible: number
        }[]
      }
      ecommerce_mi_perfil: {
        Args: never
        Returns: {
          email: string
          nombre: string
          telefono: string
        }[]
      }
      ecommerce_mis_pedidos: {
        Args: never
        Returns: {
          cantidad_productos: number
          estado: string
          estado_envio: string
          fecha: string
          id_orden_externa: string
          monto_total: number
          nro_comprobante: string
        }[]
      }
      ecommerce_piezas_disponibles: {
        Args: { _id_variante: number }
        Returns: {
          id_grupo: number
          id_pieza: number
          medidas: string
          peso: number
          precio_oferta: number
          precio_venta: number
          sku: string
          talla: string
        }[]
      }
      ecommerce_producto_atributos: {
        Args: { _id_producto: number }
        Returns: {
          atributo: string
          valores: string[]
        }[]
      }
      ecommerce_producto_combinaciones: {
        Args: { _id_producto: number }
        Returns: {
          color: string
          color_hex: string
          disponible: number
          id: number
          orden: number
          talla: string
        }[]
      }
      ecommerce_producto_detalle: {
        Args: { _id_producto: number }
        Returns: {
          categoria: string
          descripcion: string
          destacado: boolean
          es_joyeria: boolean
          etiquetas: string[]
          id: number
          id_categoria: number
          imagen_portada: string
          marca: string
          medidas: string
          nombre: string
          precio_oferta: number
          precio_venta: number
          tallas: string
          total_disponible: number
        }[]
      }
      ecommerce_variantes_disponibles: {
        Args: { _id_producto: number }
        Returns: {
          id_variante: number
          imagen_portada: string
          material: string
          piezas_disponibles: number
          precio_venta_sugerido: number
          pureza: string
          tallas_disponibles: string[]
        }[]
      }
      ecommerce_vincular_cliente: {
        Args: {
          _email?: string
          _nombre?: string
          _telefono?: string
          _user_id: string
        }
        Returns: number
      }
      editar_marca: {
        Args: { _id: number; _nombre: string }
        Returns: undefined
      }
      editarcantidaddv: {
        Args: { _cantidad: number; _id: number }
        Returns: undefined
      }
      editarcategorias: {
        Args: {
          _color: string
          _id: number
          _id_empresa: number
          _nombre: string
        }
        Returns: undefined
      }
      editarclientesproveedores: {
        Args: {
          _direccion: string
          _email: string
          _id: number
          _id_empresa: number
          _identificador_fiscal: string
          _identificador_nacional: string
          _nombres: string
          _telefono: string
          _tipo: string
        }
        Returns: undefined
      }
      editarmarca: {
        Args: { _id: number; _id_empresa: number; _nombre: string }
        Returns: undefined
      }
      editarproductos:
        | {
            Args: {
              _codigo_barras: string
              _codigo_interno: string
              _id: number
              _id_categoria: number
              _id_empresa: number
              _maneja_inventarios: boolean
              _nombre: string
              _precio_compra: number
              _precio_venta: number
              _sevende_por: string
            }
            Returns: undefined
          }
        | {
            Args: {
              _codigo_barras: string
              _codigo_interno: string
              _destacado?: boolean
              _id: number
              _id_categoria: number
              _id_empresa: number
              _maneja_inventarios: boolean
              _nombre: string
              _oferta_desde?: string
              _oferta_hasta?: string
              _precio_compra: number
              _precio_oferta?: number
              _precio_venta: number
              _sevende_por: string
            }
            Returns: undefined
          }
        | {
            Args: {
              _codigo_barras: string
              _codigo_interno: string
              _destacado?: boolean
              _id: number
              _id_categoria: number
              _id_empresa: number
              _id_marca?: number
              _maneja_inventarios: boolean
              _medidas?: string
              _nombre: string
              _oferta_desde?: string
              _oferta_hasta?: string
              _precio_compra: number
              _precio_oferta?: number
              _precio_venta: number
              _sevende_por: string
              _tallas?: string
            }
            Returns: undefined
          }
      eliminar_etiqueta: { Args: { _id: number }; Returns: undefined }
      eliminar_marca: { Args: { _id: number }; Returns: undefined }
      etiquetas_de_producto: {
        Args: { _id_producto: number }
        Returns: {
          id: number
          nombre: string
        }[]
      }
      generar_codigo_barras_combinacion: { Args: never; Returns: string }
      generar_nro_comprobante: {
        Args: {
          _id_sucursal: number
          _id_tipo_comprobante: number
          _serie: string
        }
        Returns: string
      }
      guardar_clave_autorizacion: {
        Args: { _clave: string }
        Returns: undefined
      }
      guardar_combinaciones_producto: {
        Args: {
          _combinaciones: Json
          _id_almacen: number
          _id_producto: number
        }
        Returns: undefined
      }
      incrementarstock: {
        Args: { _id: number; cantidad: number }
        Returns: undefined
      }
      insertar_etiqueta: {
        Args: { _id_empresa: number; _nombre: string }
        Returns: number
      }
      insertar_marca: {
        Args: { _id_empresa: number; _nombre: string }
        Returns: number
      }
      insertar_productos: { Args: never; Returns: undefined }
      insertarcategorias: {
        Args: {
          _color: string
          _icono: string
          _id_empresa: number
          _nombre: string
        }
        Returns: number
      }
      insertarclientesproveedores: {
        Args: {
          _direccion: string
          _email: string
          _id_empresa: number
          _identificador_fiscal: string
          _identificador_nacional: string
          _nombres: string
          _telefono: string
          _tipo: string
        }
        Returns: undefined
      }
      insertardetalleventa: {
        Args: {
          _cantidad: number
          _descripcion: string
          _id_almacen: number
          _id_producto: number
          _id_sucursal: number
          _id_venta: number
          _precio_compra: number
          _precio_venta: number
        }
        Returns: undefined
      }
      insertarmarca: {
        Args: { _id_empresa: number; _nombre: string }
        Returns: undefined
      }
      insertarproductos:
        | {
            Args: {
              _codigo_barras: string
              _codigo_interno: string
              _id_categoria: number
              _id_empresa: number
              _maneja_inventarios: boolean
              _maneja_multiprecios: boolean
              _nombre: string
              _precio_compra: number
              _precio_venta: number
              _sevende_por: string
            }
            Returns: number
          }
        | {
            Args: {
              _codigo_barras: string
              _codigo_interno: string
              _destacado?: boolean
              _id_categoria: number
              _id_empresa: number
              _maneja_inventarios: boolean
              _maneja_multiprecios: boolean
              _nombre: string
              _oferta_desde?: string
              _oferta_hasta?: string
              _precio_compra: number
              _precio_oferta?: number
              _precio_venta: number
              _sevende_por: string
            }
            Returns: number
          }
        | {
            Args: {
              _codigo_barras: string
              _codigo_interno: string
              _destacado?: boolean
              _id_categoria: number
              _id_empresa: number
              _id_marca?: number
              _maneja_inventarios: boolean
              _maneja_multiprecios: boolean
              _medidas?: string
              _nombre: string
              _oferta_desde?: string
              _oferta_hasta?: string
              _precio_compra: number
              _precio_oferta?: number
              _precio_venta: number
              _sevende_por: string
              _tallas?: string
            }
            Returns: number
          }
      joyeria_ean13: {
        Args: { _id_empresa: number; _seq: number }
        Returns: string
      }
      joyeria_grupo_pieza: {
        Args: {
          _excluir_id?: number
          _id_empresa: number
          _id_variante: number
          _medidas: string
          _peso: number
          _talla: string
        }
        Returns: number
      }
      joyeria_inventario_listado: {
        Args: { _id_empresa: number }
        Returns: {
          almacen: string
          barcode: string
          categoria: string
          costo: number
          created_at: string
          estado: string
          id_almacen: number
          id_categoria: number
          id_marca: number
          id_pieza: number
          id_producto: number
          id_variante: number
          material: string
          medidas: string
          peso: number
          precio_oferta: number
          precio_venta: number
          producto: string
          pureza: string
          sku: string
          sku_prefijo: string
          talla: string
        }[]
      }
      joyeria_movimientos_pieza: {
        Args: { _id_pieza: number }
        Returns: {
          cantidad: number
          created_at: string
          estado_anterior: string | null
          estado_nuevo: string | null
          id: number
          id_empresa: number
          id_pieza: number
          id_referencia: number | null
          id_usuario: number | null
          notas: string | null
          referencia_tipo: string | null
          tipo: string
        }[]
        SetofOptions: {
          from: "*"
          to: "movimientos_piezas"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      liberar_pieza: {
        Args: { _id_empresa: number; _id_pieza: number; _id_usuario: number }
        Returns: undefined
      }
      licencia_estado: { Args: never; Returns: Json }
      licencia_exigir: { Args: { _funcion: string }; Returns: undefined }
      licencia_giro: { Args: never; Returns: string }
      licencia_plan: { Args: never; Returns: string }
      licencia_suspendida: { Args: never; Returns: boolean }
      licencia_tiene: { Args: { _funcion: string }; Returns: boolean }
      licencia_url_funcion: { Args: { _nombre: string }; Returns: string }
      listar_etiquetas: {
        Args: { _id_empresa: number }
        Returns: {
          id: number
          nombre: string
        }[]
      }
      marcar_pieza: {
        Args: {
          _estado: string
          _id_empresa: number
          _id_pieza: number
          _id_usuario: number
          _nota: string
        }
        Returns: undefined
      }
      mi_clave_autorizacion: { Args: never; Returns: string }
      ml_admin_cuenta: {
        Args: never
        Returns: {
          expira_en: string
          ml_user_id: number
        }[]
      }
      ml_admin_disenos_sin_configurar: {
        Args: never
        Returns: {
          id_producto: number
          nombre: string
          piezas_disponibles: number
        }[]
      }
      ml_admin_exigir_personal: { Args: never; Returns: undefined }
      ml_admin_guardar_diseno: {
        Args: {
          _atributos: Json
          _id_producto: number
          _ml_category_id: string
          _publicar: boolean
        }
        Returns: undefined
      }
      ml_admin_iniciar_conexion: {
        Args: { _volver_a: string }
        Returns: string
      }
      ml_admin_listar_disenos: {
        Args: never
        Returns: {
          atributos: Json
          grupos_sospechosos: number
          id_producto: number
          ml_category_id: string
          nombre: string
          piezas_disponibles: number
          publicaciones_activas: number
          publicaciones_con_error: number
          publicar: boolean
          updated_at: string
        }[]
      }
      ml_admin_listar_ordenes: {
        Args: never
        Returns: {
          comprador: string
          created_at: string
          estado_ml: string
          estado_venta: string
          id_venta: number
          ml_order_id: number
          nro_comprobante: string
          pack_id: number
          total: number
          ultimo_error: string
          updated_at: string
        }[]
      }
      ml_admin_listar_publicaciones: {
        Args: never
        Returns: {
          cantidad_publicada: number
          estado_ml: string
          id: number
          id_producto: number
          ml_item_id: string
          modelo: string
          nombre: string
          precio_publicado: number
          sincronizado_en: string
          ultimo_error: string
        }[]
      }
      ml_admin_previsualizar: {
        Args: { _id_producto: number }
        Returns: {
          fotos: string[]
          id_variante: number
          peso: number
          piezas: number
          precio: number
          precio_minimo: number
          sospechoso: boolean
          talla: string
          titulo: string
          variante: string
        }[]
      }
      ml_admin_sincronizar: { Args: never; Returns: undefined }
      ml_anular_orden: {
        Args: { _id_empresa: number; _ml_order_id: number }
        Returns: string
      }
      ml_confirmar_orden: {
        Args: {
          _id_empresa: number
          _id_sucursal: number
          _id_tipo_comprobante: number
          _lineas: Json
          _metodo_pago: string
          _ml_order_id: number
          _monto_total: number
          _serie: string
        }
        Returns: number
      }
      ml_pedir_sincronizacion: { Args: { _body: Json }; Returns: undefined }
      ml_precios_minimos: {
        Args: { _id_producto: number }
        Returns: {
          id_variante: number
          precio_minimo: number
        }[]
      }
      ml_reclamar_grupo: {
        Args: {
          _clave_grupo: string
          _id_producto: number
          _modelo_base: string
        }
        Returns: string
      }
      mostrarcajasabiertasporempresa: {
        Args: { _id_empresa: number }
        Returns: {
          id_caja: number
          id_cierre_caja: number
          rol: string
          usuario: string
        }[]
      }
      mostrarcajasabiertasporsucursal: {
        Args: { _id_sucursal: number }
        Returns: {
          id_caja: number
          id_cierre_caja: number
          rol: string
          usuario: string
        }[]
      }
      mostrarcajasasignadas: {
        Args: { _id_usuario: number }
        Returns: {
          id: number
          id_caja: string
          id_sucursal: number
          sucursal_caja: string
        }[]
      }
      mostrarcierrecajaabierta: {
        Args: { _id_caja: number }
        Returns: {
          caja: string
          estado_cierre_caja: number
          fechacierre: string
          fechainicio: string
          id: number
          id_caja: number
          id_sucursal: number
          id_usuario: number
          roluser: string
          sucursal: string
          usuario: string
        }[]
      }
      mostrardetalleventa: {
        Args: { _id_venta: number }
        Returns: {
          cantidad: number
          estado: string
          id: number
          precio_venta: number
          producto: string
          total: number
        }[]
      }
      mostrarempresaxiduser: {
        Args: { _id_usuario: number }
        Returns: {
          result: Database["public"]["Tables"]["empresa"]["Row"]
        }[]
        SetofOptions: {
          from: "*"
          to: "empresa"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      mostrarmovimientoscajalive: {
        Args: { _id_empresa: number }
        Returns: {
          caja_nombre: string
          descripcion: string
          fecha_movimiento: string
          id: number
          monto: number
          sucursal_nombre: string
          tipo_movimiento: string
          usuario_nombre: string
        }[]
      }
      mostrarproductos: {
        Args: { _id_empresa: number }
        Returns: {
          categoria: string
          codigo_barras: string
          codigo_interno: string
          destacado: boolean
          id: number
          id_categoria: number
          id_empresa: number
          id_marca: number
          imagen_portada: string
          maneja_inventarios: boolean
          maneja_multiprecios: boolean
          medidas: string
          nombre: string
          oferta_desde: string
          oferta_hasta: string
          p_compra: string
          p_venta: string
          precio_compra: number
          precio_oferta: number
          precio_venta: number
          sevende_por: string
          tallas: string
        }[]
      }
      mostrarsucursalesasignadas: {
        Args: { _id_usuario: number }
        Returns: {
          id_asignacion_sucursal: number
          id_sucursal: number
          id_usuario: number
          sucursal: string
        }[]
      }
      mostrartop10productosmasvendidosxmonto: {
        Args: { _fecha_fin: string; _fecha_inicio: string; _id_empresa: number }
        Returns: {
          id_producto: number
          nombre_producto: string
          porcentaje: number
          total_vendido: number
        }[]
      }
      mostrartop5productosmasvendidosxcantidad: {
        Args: { _fecha_fin: string; _fecha_inicio: string; _id_empresa: number }
        Returns: {
          id_producto: number
          nombre_producto: string
          porcentaje: number
          total_vendido: number
        }[]
      }
      mostrarusuariosasignados: {
        Args: { _id_empresa: number }
        Returns: {
          caja: string
          email: string
          estadouser: string
          id_asignacion: number
          id_usuario: number
          rol: string
          sucursal: string
          usuario: string
        }[]
      }
      mostrarventasporsucursalfechas: {
        Args: {
          _fecha_fin: string
          _fecha_inicio: string
          _id_sucursal: number
        }
        Returns: {
          anulada_en: string | null
          anulada_por: number | null
          apartado_creado: string | null
          apartado_vence: string | null
          autorizada_por: number | null
          cantidad_productos: number | null
          estado: string | null
          estado_envio: string | null
          fecha: string
          id: number
          id_cierre_caja: number | null
          id_cliente: number | null
          id_empresa: number | null
          id_orden_externa: string | null
          id_sucursal: number | null
          id_usuario: number | null
          metodo_pago: string | null
          monto_total: number | null
          motivo_anulacion: string | null
          nro_comprobante: string | null
          origen: string
          pago_con: number | null
          referencia_tarjeta: string | null
          saldo: number | null
          sub_total: number | null
          total_impuestos: number | null
          valor_impuesto: number | null
          vuelto: number | null
        }[]
        SetofOptions: {
          from: "*"
          to: "ventas"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      obtenertotalescaja: {
        Args: { p_id_caja: number }
        Returns: {
          total_egresos: number
          total_ingresos: number
          total_ventas: number
          total_ventas_credito: number
          total_ventas_efectivo: number
          total_ventas_tarjeta: number
        }[]
      }
      pos_buscar_pieza: {
        Args: { _codigo: string; _id_empresa: number }
        Returns: {
          barcode: string
          categoria: string
          costo: number
          estado: string
          id_almacen: number
          id_pieza: number
          id_producto: number
          id_variante: number
          material: string
          peso: number
          precio_venta: number
          producto: string
          pureza: string
          sku: string
        }[]
      }
      pos_buscar_piezas_texto: {
        Args: { _buscador: string; _id_empresa: number }
        Returns: {
          barcode: string
          categoria: string
          costo: number
          estado: string
          id_almacen: number
          id_pieza: number
          id_producto: number
          id_variante: number
          material: string
          peso: number
          precio_venta: number
          producto: string
          pureza: string
          sku: string
        }[]
      }
      reducirstock: {
        Args: { _id: number; cantidad: number }
        Returns: undefined
      }
      report_stock_bajo_minimo: {
        Args: { _id_empresa: number; almacen_id?: number; sucursal_id?: number }
        Returns: {
          codigo_articulo: string
          descripcion_articulo: string
          precio_costo: number
          stock: number
          stock_minimo: number
          total: number
        }[]
      }
      report_stock_por_almacen_sucursal: {
        Args: { _id_empresa: number; almacen_id?: number; sucursal_id?: number }
        Returns: {
          codigo_articulo: string
          descripcion_articulo: string
          precio_costo: number
          stock: number
          total: number
        }[]
      }
      report_ventas_por_sucursal: {
        Args: {
          _id_empresa: number
          fecha_fin?: string
          fecha_inicio?: string
          sucursal_id?: number
        }
        Returns: {
          cajero: string
          cantidad_productos: number
          estado: string
          fecha: string
          id_cliente: number
          id_usuario: number
          id_venta: number
          monto_total: number
          pago_con: string
          saldo: number
          subtotal: number
          total_impuestos: number
        }[]
      }
      reservar_pieza: {
        Args: {
          _id_empresa: number
          _id_pieza: number
          _id_usuario: number
          _id_venta: number
        }
        Returns: undefined
      }
      ropa_inventario: {
        Args: { _id_empresa: number }
        Returns: {
          almacen: string
          categoria: string
          codigo_barras: string
          color: string
          color_hex: string
          creado: string
          id_almacen: number
          id_categoria: number
          id_combinacion: number
          id_producto: number
          id_stock: number
          imagen_portada: string
          marca: string
          orden: number
          precio_venta: number
          producto: string
          stock: number
          stock_minimo: number
          sucursal: string
          talla: string
        }[]
      }
      set_atributos_producto: {
        Args: { _id_producto: number; _ids_valor: number[] }
        Returns: undefined
      }
      set_etiquetas_producto: {
        Args: { _id_producto: number; _ids_etiquetas: number[] }
        Returns: undefined
      }
      setdefaultserializacion: {
        Args: { _id: number; _id_sucursal: number }
        Returns: undefined
      }
      sumarefectivosinventasmovcierrecaja: {
        Args: { _id_cierre_caja: number }
        Returns: {
          monto: number
          tipo_movimiento: string
        }[]
      }
      sumarnoefectivosinventasmovcierrecaja: {
        Args: { _id_cierre_caja: number }
        Returns: {
          metodo: string
          monto: number
          tipo_movimiento: string
        }[]
      }
      sumarventasmetodopagomovcierrecaja: {
        Args: { _id_cierre_caja: number }
        Returns: {
          metodo_pago: string
          monto: number
        }[]
      }
      sumarventasporempresa: {
        Args: { _fecha_fin: string; _fecha_inicio: string; _id_empresa: number }
        Returns: number
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const

