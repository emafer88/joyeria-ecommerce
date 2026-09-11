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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
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
          nombre?: string
          updated_at?: string
        }
        Relationships: [
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
            foreignKeyName: "detalle_venta_id_pieza_fkey"
            columns: ["id_pieza"]
            isOneToOne: false
            referencedRelation: "piezas_inventario"
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
            foreignKeyName: "public_detalle_venta_id_venta_fkey"
            columns: ["id_venta"]
            isOneToOne: false
            referencedRelation: "ventas"
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
      empresa: {
        Row: {
          correo: string | null
          currency: string | null
          direccion_fiscal: string | null
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
          pie_pagina_ticket: string | null
          simbolo_moneda: string | null
          valor_impuesto: number | null
        }
        Insert: {
          correo?: string | null
          currency?: string | null
          direccion_fiscal?: string | null
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
          pie_pagina_ticket?: string | null
          simbolo_moneda?: string | null
          valor_impuesto?: number | null
        }
        Update: {
          correo?: string | null
          currency?: string | null
          direccion_fiscal?: string | null
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
            foreignKeyName: "public_kardex_id_usuario_fkey"
            columns: ["id_usuario"]
            isOneToOne: false
            referencedRelation: "usuarios"
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
            foreignKeyName: "movimientos_stock_id_producto_fkey"
            columns: ["id_producto"]
            isOneToOne: false
            referencedRelation: "productos"
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
          id_producto: number
          id_variante: number
          id_venta_reserva: number | null
          nota: string | null
          peso: number
          precio_venta: number
          sku: string
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
          id_producto: number
          id_variante: number
          id_venta_reserva?: number | null
          nota?: string | null
          peso: number
          precio_venta: number
          sku: string
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
          id_producto?: number
          id_variante?: number
          id_venta_reserva?: number | null
          nota?: string | null
          peso?: number
          precio_venta?: number
          sku?: string
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
            foreignKeyName: "piezas_inventario_id_variante_fkey"
            columns: ["id_variante"]
            isOneToOne: false
            referencedRelation: "producto_variantes"
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
      producto_imagenes: {
        Row: {
          created_at: string
          id: number
          id_producto: number
          orden: number
          path: string
          url: string
        }
        Insert: {
          created_at?: string
          id?: never
          id_producto: number
          orden?: number
          path: string
          url: string
        }
        Update: {
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
        ]
      }
      productos: {
        Row: {
          activo: boolean
          codigo_barras: string | null
          codigo_interno: string | null
          created_at: string
          descripcion: string | null
          es_joyeria: boolean
          id: number
          id_categoria: number | null
          id_empresa: number | null
          id_marca: number | null
          maneja_inventarios: boolean | null
          maneja_multiprecios: boolean | null
          nombre: string
          precio_compra: number | null
          precio_venta: number | null
          sevende_por: string | null
          updated_at: string
        }
        Insert: {
          activo?: boolean
          codigo_barras?: string | null
          codigo_interno?: string | null
          created_at?: string
          descripcion?: string | null
          es_joyeria?: boolean
          id?: number
          id_categoria?: number | null
          id_empresa?: number | null
          id_marca?: number | null
          maneja_inventarios?: boolean | null
          maneja_multiprecios?: boolean | null
          nombre: string
          precio_compra?: number | null
          precio_venta?: number | null
          sevende_por?: string | null
          updated_at?: string
        }
        Update: {
          activo?: boolean
          codigo_barras?: string | null
          codigo_interno?: string | null
          created_at?: string
          descripcion?: string | null
          es_joyeria?: boolean
          id?: number
          id_categoria?: number | null
          id_empresa?: number | null
          id_marca?: number | null
          maneja_inventarios?: boolean | null
          maneja_multiprecios?: boolean | null
          nombre?: string
          precio_compra?: number | null
          precio_venta?: number | null
          sevende_por?: string | null
          updated_at?: string
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
          id_producto: number | null
          stock: number | null
          stock_minimo: number | null
          ubicacion: string | null
        }
        Insert: {
          id?: number
          id_almacen: number
          id_producto?: number | null
          stock?: number | null
          stock_minimo?: number | null
          ubicacion?: string | null
        }
        Update: {
          id?: number
          id_almacen?: number
          id_producto?: number | null
          stock?: number | null
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
            foreignKeyName: "stock_id_producto_fkey"
            columns: ["id_producto"]
            isOneToOne: false
            referencedRelation: "productos"
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
      ventas: {
        Row: {
          cantidad_productos: number | null
          estado: string | null
          fecha: string
          id: number
          id_cierre_caja: number | null
          id_cliente: number | null
          id_empresa: number | null
          id_orden_externa: string | null
          id_sucursal: number | null
          id_usuario: number | null
          monto_total: number | null
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
          cantidad_productos?: number | null
          estado?: string | null
          fecha?: string
          id?: number
          id_cierre_caja?: number | null
          id_cliente?: number | null
          id_empresa?: number | null
          id_orden_externa?: string | null
          id_sucursal?: number | null
          id_usuario?: number | null
          monto_total?: number | null
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
          cantidad_productos?: number | null
          estado?: string | null
          fecha?: string
          id?: number
          id_cierre_caja?: number | null
          id_cliente?: number | null
          id_empresa?: number | null
          id_orden_externa?: string | null
          id_sucursal?: number | null
          id_usuario?: number | null
          monto_total?: number | null
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
      [_ in never]: never
    }
    Functions: {
      ajustar_pieza: {
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
          cantidad_productos: number | null
          estado: string | null
          fecha: string
          id: number
          id_cierre_caja: number | null
          id_cliente: number | null
          id_empresa: number | null
          id_orden_externa: string | null
          id_sucursal: number | null
          id_usuario: number | null
          monto_total: number | null
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
          id_producto: number
          id_variante: number
          id_venta_reserva: number | null
          nota: string | null
          peso: number
          precio_venta: number
          sku: string
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
          id_producto: number
          id_variante: number
          id_venta_reserva: number | null
          nota: string | null
          peso: number
          precio_venta: number
          sku: string
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "piezas_inventario"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      crear_producto_joyeria: {
        Args: {
          _descripcion: string
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
          cantidad_productos: number | null
          estado: string | null
          fecha: string
          id: number
          id_cierre_caja: number | null
          id_cliente: number | null
          id_empresa: number | null
          id_orden_externa: string | null
          id_sucursal: number | null
          id_usuario: number | null
          monto_total: number | null
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
      ecommerce_id_empresa: { Args: never; Returns: number }
      ecommerce_imagenes_producto: {
        Args: { _id_producto: number }
        Returns: {
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
      ecommerce_listar_banners: {
        Args: never
        Returns: {
          id: number
          imagen_url: string
          link_destino: string | null
          subtitulo: string | null
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
      ecommerce_listar_productos: {
        Args: {
          _buscador?: string
          _id_categoria?: number
          _id_etiqueta?: number
          _material?: string
          _pagina?: number
          _precio_max?: number
          _precio_min?: number
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
          marca: string | null
          nombre: string
          precio_oferta: number | null
          precio_venta: number
          total_count: number
          total_disponible: number
        }[]
      }
      ecommerce_mis_pedidos: {
        Args: never
        Returns: {
          cantidad_productos: number
          estado: string
          fecha: string
          id_orden_externa: string
          monto_total: number
          nro_comprobante: string
        }[]
      }
      ecommerce_piezas_disponibles: {
        Args: { _id_variante: number }
        Returns: {
          id_pieza: number
          peso: number
          precio_venta: number
          sku: string
          talla: string | null
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
          imagen_portada: string | null
          marca: string | null
          medidas: string | null
          nombre: string
          precio_oferta: number | null
          precio_venta: number
          tallas: string | null
          total_disponible: number | null
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
          _user_id: string
          _email?: string
          _nombre?: string
          _telefono?: string
        }
        Returns: number
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
      editarproductos: {
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
      generar_nro_comprobante: {
        Args: {
          _id_sucursal: number
          _id_tipo_comprobante: number
          _serie: string
        }
        Returns: string
      }
      incrementarstock: {
        Args: { _id: number; cantidad: number }
        Returns: undefined
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
      insertarproductos: {
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
      joyeria_ean13: {
        Args: { _id_empresa: number; _seq: number }
        Returns: string
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
          peso: number
          precio_venta: number
          producto: string
          pureza: string
          sku: string
          sku_prefijo: string
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
          id_marca: number | null
          imagen_portada: string
          maneja_inventarios: boolean
          maneja_multiprecios: boolean
          medidas: string | null
          nombre: string
          oferta_desde: string | null
          oferta_hasta: string | null
          p_compra: string
          p_venta: string
          precio_compra: number
          precio_oferta: number | null
          precio_venta: number
          sevende_por: string
          tallas: string | null
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
          cantidad_productos: number | null
          estado: string | null
          fecha: string
          id: number
          id_cierre_caja: number | null
          id_cliente: number | null
          id_empresa: number | null
          id_orden_externa: string | null
          id_sucursal: number | null
          id_usuario: number | null
          monto_total: number | null
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
