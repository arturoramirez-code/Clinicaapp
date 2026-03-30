'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { EMPRESA_ID } from '@/lib/config'
import ModalNuevoItemInventario from '@/components/ModalNuevoItemInventario'
import ModalMovimientoInventario from '@/components/ModalMovimientoInventario'
import ModalHistorialMovimientos from '@/components/ModalHistorialMovimientos'

// ── Tipos ────────────────────────────────────────────────────────────────────

interface InventarioItem {
  id: string
  nombre: string
  descripcion: string | null
  categoria: string
  unidad_medida: string
  codigo: string | null
  stock_actual: number
  stock_minimo: number
  stock_maximo: number | null
  precio_costo: number | null
  actualizado_en: string
}

interface AlertaItem {
  id: string
  nombre: string
  categoria: string
  stock_actual: number
  stock_minimo: number
  unidad_medida: string
  estado_stock: 'agotado' | 'critico'
}

type FiltroTab = 'todos' | 'bajo_minimo'

// ── Helpers ──────────────────────────────────────────────────────────────────

const ETIQUETA_CATEGORIA: Record<string, string> = {
  material_dental: 'Material Dental',
  medicamento:     'Medicamento',
  instrumental:    'Instrumental',
  descartable:     'Descartable',
  limpieza:        'Limpieza',
  otro:            'Otro',
}

function calcularEstado(item: InventarioItem): 'ok' | 'critico' | 'agotado' {
  if (item.stock_actual === 0) return 'agotado'
  if (item.stock_actual <= item.stock_minimo) return 'critico'
  return 'ok'
}

function formatFecha(iso: string): string {
  return new Date(iso).toLocaleDateString('es-GT', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  })
}

// ── Badges ───────────────────────────────────────────────────────────────────

function BadgeEstadoStock({ estado }: { estado: 'ok' | 'critico' | 'agotado' }) {
  const cfg = {
    ok:      { bg: '#e8fff5', color: '#0a5535', label: 'OK'       },
    critico: { bg: '#fff8e8', color: '#7a5500', label: 'Crítico'  },
    agotado: { bg: '#fff0f0', color: '#e84040', label: 'Agotado'  },
  }[estado]
  return (
    <span style={{
      display: 'inline-block', padding: '2px 10px', borderRadius: 20,
      background: cfg.bg, color: cfg.color, fontSize: 12, fontWeight: 600,
    }}>
      {cfg.label}
    </span>
  )
}

// ── Barra de progreso de stock ────────────────────────────────────────────────

function BarraStock({ item }: { item: InventarioItem }) {
  if (item.stock_minimo === 0 && !item.stock_maximo) {
    return <span style={{ fontSize: 13, fontWeight: 600, color: '#0d3d6e' }}>{item.stock_actual}</span>
  }
  const maximo = item.stock_maximo ?? item.stock_minimo * 4
  const porcentaje = Math.min((item.stock_actual / maximo) * 100, 100)
  const color = item.stock_actual === 0 ? '#e84040'
    : item.stock_actual <= item.stock_minimo ? '#f0c040'
    : '#2ecc8a'
  return (
    <div style={{ minWidth: 80 }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: '#0d3d6e', marginBottom: 3 }}>
        {item.stock_actual} <span style={{ fontWeight: 400, color: '#5a8ab0', fontSize: 11 }}>{item.unidad_medida}</span>
      </div>
      <div style={{ height: 5, background: '#e0eef8', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${porcentaje}%`, background: color, borderRadius: 3, transition: 'width 0.3s' }} />
      </div>
    </div>
  )
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function ListaInventario() {
  const [items, setItems]           = useState<InventarioItem[]>([])
  const [alertas, setAlertas]       = useState<AlertaItem[]>([])
  const [sucursalId, setSucursalId] = useState<string | null>(null)
  const [usuarioId, setUsuarioId]   = useState<string | null>(null)
  const [cargando, setCargando]     = useState(true)
  const [error, setError]           = useState<string | null>(null)

  // Filtros
  const [tab, setTab]                     = useState<FiltroTab>('todos')
  const [filtroCategoria, setFiltroCategoria] = useState('')
  const [busqueda, setBusqueda]           = useState('')

  // Modales
  const [modalNuevoItem, setModalNuevoItem]     = useState(false)
  const [modalMovimiento, setModalMovimiento]   = useState<{
    item: InventarioItem; tipo: 'entrada' | 'salida'
  } | null>(null)
  const [modalHistorial, setModalHistorial]     = useState<InventarioItem | null>(null)

  // Toast
  const [toast, setToast] = useState<string | null>(null)

  // ── Carga ───────────────────────────────────────────────────────────

  const cargar = useCallback(async () => {
    setCargando(true)
    setError(null)
    try {
      const [
        { data: itemsData, error: errItems },
        { data: alertasData },
        { data: suc },
        { data: usr },
      ] = await Promise.all([
        supabase
          .from('inventario_items')
          .select('id, nombre, descripcion, categoria, unidad_medida, codigo, stock_actual, stock_minimo, stock_maximo, precio_costo, actualizado_en')
          .eq('empresa_id', EMPRESA_ID)
          .eq('activo', true)
          .order('nombre'),
        supabase
          .from('v_alertas_inventario')
          .select('id, nombre, categoria, stock_actual, stock_minimo, unidad_medida, estado_stock')
          .eq('empresa_id', EMPRESA_ID),
        supabase.from('sucursales').select('id').eq('empresa_id', EMPRESA_ID).limit(1).single(),
        supabase.from('usuarios').select('id').eq('empresa_id', EMPRESA_ID).limit(1).single(),
      ])

      if (errItems) throw errItems
      setItems((itemsData as InventarioItem[]) ?? [])
      setAlertas((alertasData as AlertaItem[]) ?? [])
      if (suc) setSucursalId(suc.id)
      if (usr) setUsuarioId(usr.id)
    } catch (e) {
      console.error('Error al cargar inventario:', e)
      setError('Ocurrió un error al cargar el inventario. Por favor intente de nuevo.')
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => { cargar() }, [cargar])

  // ── Filtrado ─────────────────────────────────────────────────────────

  const itemsFiltrados = useMemo(() => {
    let lista = items
    if (tab === 'bajo_minimo') {
      lista = lista.filter((i) => calcularEstado(i) !== 'ok')
    }
    if (filtroCategoria) {
      lista = lista.filter((i) => i.categoria === filtroCategoria)
    }
    if (busqueda.trim()) {
      const q = busqueda.trim().toLowerCase()
      lista = lista.filter(
        (i) =>
          i.nombre.toLowerCase().includes(q) ||
          (i.codigo && i.codigo.toLowerCase().includes(q))
      )
    }
    return lista
  }, [items, tab, filtroCategoria, busqueda])

  const agotados = alertas.filter((a) => a.estado_stock === 'agotado').length
  const criticos = alertas.filter((a) => a.estado_stock === 'critico').length

  // ── Callbacks de modales ─────────────────────────────────────────────

  function alGuardarItem() {
    setModalNuevoItem(false)
    mostrarToast('Ítem agregado al inventario correctamente.')
    cargar()
  }

  function alGuardarMovimiento(nuevoStock: number) {
    if (!modalMovimiento) return
    const tipo = modalMovimiento.tipo
    setModalMovimiento(null)
    mostrarToast(`${tipo === 'entrada' ? 'Entrada' : 'Salida'} registrada. Stock actual: ${nuevoStock}.`)
    cargar()
  }

  function mostrarToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 5000)
  }

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <div>
      {/* Encabezado */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        marginBottom: 20, flexWrap: 'wrap', gap: 12,
      }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 600, color: '#0d3d6e', margin: '0 0 4px' }}>
            Inventario
          </h1>
          <div style={{ fontSize: 13, color: '#5a8ab0' }}>
            {items.length} {items.length === 1 ? 'ítem registrado' : 'ítems registrados'}
          </div>
        </div>
        <button
            onClick={() => setModalNuevoItem(true)}
            className="ct-btn ct-btn-primary"
          >
            + Nuevo Ítem
          </button>
      </div>

      {/* Banner de alertas */}
      {!cargando && (agotados > 0 || criticos > 0) && (
        <div style={{ marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {agotados > 0 && (
            <div style={{
              background: '#fff0f0', border: '0.5px solid #e84040', borderRadius: 8,
              padding: '10px 16px', color: '#e84040', fontSize: 13, fontWeight: 500,
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <span style={{ fontSize: 16 }}>🚫</span>
              <strong>{agotados} producto{agotados !== 1 ? 's' : ''} agotado{agotados !== 1 ? 's' : ''}</strong>
              {' — requiere reposición inmediata'}
            </div>
          )}
          {criticos > 0 && (
            <div style={{
              background: '#fff8e8', border: '0.5px solid #f0c040', borderRadius: 8,
              padding: '10px 16px', color: '#7a5500', fontSize: 13, fontWeight: 500,
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <span style={{ fontSize: 16 }}>⚠</span>
              <strong>{criticos} producto{criticos !== 1 ? 's' : ''} bajo mínimo</strong>
              {' — considere reabastecer pronto'}
            </div>
          )}
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div style={{
          background: '#e8fff5', border: '0.5px solid #2ecc8a', borderRadius: 8,
          padding: '10px 16px', color: '#0a5535', fontSize: 13, marginBottom: 16,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          {toast}
          <button onClick={() => setToast(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#0a5535', fontSize: 16 }}>×</button>
        </div>
      )}

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '0.5px solid #e0eef8' }}>
          {([
            { id: 'todos',       label: `Todos (${items.length})` },
            { id: 'bajo_minimo', label: `Bajo mínimo (${alertas.length})` },
          ] as { id: FiltroTab; label: string }[]).map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                padding: '8px 16px', background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 14, fontWeight: tab === t.id ? 600 : 400,
                color: tab === t.id ? '#1a6bbd' : '#5a8ab0',
                borderBottom: tab === t.id ? '2px solid #1a6bbd' : '2px solid transparent',
                marginBottom: -1, whiteSpace: 'nowrap',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Categoría */}
        <select
          value={filtroCategoria}
          onChange={(e) => setFiltroCategoria(e.target.value)}
          style={{
            height: 36, padding: '0 10px', fontSize: 13,
            border: '0.5px solid #c5ddf5', borderRadius: 8,
            background: '#ffffff', color: filtroCategoria ? '#0d3d6e' : '#5a8ab0',
            cursor: 'pointer', outline: 'none',
          }}
        >
          <option value="">Todas las categorías</option>
          {Object.entries(ETIQUETA_CATEGORIA).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>

        {/* Búsqueda */}
        <input
          type="text"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por nombre o código..."
          style={{
            height: 36, padding: '0 12px', fontSize: 13,
            border: '0.5px solid #c5ddf5', borderRadius: 8,
            background: '#ffffff', color: '#0d3d6e', outline: 'none', minWidth: 220,
          }}
        />
      </div>

      {/* Cargando / Error */}
      {cargando && (
        <div style={{ textAlign: 'center', padding: '48px 0', color: '#5a8ab0', fontSize: 14 }}>
          Cargando inventario...
        </div>
      )}
      {error && (
        <div style={{
          background: '#fff0f0', border: '0.5px solid #e84040', borderRadius: 8,
          padding: '12px 16px', color: '#e84040', fontSize: 13,
        }}>{error}</div>
      )}

      {/* Tabla */}
      {!cargando && !error && (
        itemsFiltrados.length === 0 ? (
          <div style={{
            background: '#ffffff', border: '0.5px solid #e0eef8', borderRadius: 12,
            padding: '48px 24px', textAlign: 'center', color: '#5a8ab0', fontSize: 14,
          }}>
            {items.length === 0
              ? 'No hay ítems registrados en el inventario. Agregue el primero con "+ Nuevo Ítem".'
              : 'No se encontraron ítems con los filtros seleccionados.'}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="ct-table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Categoría</th>
                  <th>Stock actual</th>
                  <th>Mínimo</th>
                  <th>Estado</th>
                  <th>Actualizado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {itemsFiltrados.map((item) => {
                  const estado = calcularEstado(item)
                  return (
                    <tr key={item.id}>
                      <td>
                        <div style={{ fontWeight: 600, color: '#0d3d6e' }}>{item.nombre}</div>
                        {item.codigo && (
                          <div style={{ fontSize: 11, color: '#c5ddf5', marginTop: 1 }}>{item.codigo}</div>
                        )}
                      </td>
                      <td style={{ fontSize: 13, color: '#5a8ab0', whiteSpace: 'nowrap' }}>
                        {ETIQUETA_CATEGORIA[item.categoria] ?? item.categoria}
                      </td>
                      <td><BarraStock item={item} /></td>
                      <td style={{ fontSize: 13, color: '#5a8ab0', whiteSpace: 'nowrap' }}>
                        {item.stock_minimo} {item.unidad_medida}
                      </td>
                      <td><BadgeEstadoStock estado={estado} /></td>
                      <td style={{ fontSize: 12, color: '#5a8ab0', whiteSpace: 'nowrap' }}>
                        {formatFecha(item.actualizado_en)}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          <button
                            onClick={() => setModalMovimiento({ item, tipo: 'entrada' })}
                            style={{
                              padding: '4px 9px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                              background: '#e8fff5', color: '#0a5535',
                              border: '0.5px solid #2ecc8a', borderRadius: 6, whiteSpace: 'nowrap',
                            }}
                          >
                            + Entrada
                          </button>
                          <button
                            onClick={() => setModalMovimiento({ item, tipo: 'salida' })}
                            style={{
                              padding: '4px 9px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                              background: '#fff0f0', color: '#e84040',
                              border: '0.5px solid #e84040', borderRadius: 6, whiteSpace: 'nowrap',
                            }}
                          >
                            − Salida
                          </button>
                          <button
                            onClick={() => setModalHistorial(item)}
                            style={{
                              padding: '4px 9px', fontSize: 12, cursor: 'pointer',
                              background: '#f0f7ff', color: '#1a6bbd',
                              border: '0.5px solid #c5ddf5', borderRadius: 6, whiteSpace: 'nowrap',
                            }}
                          >
                            📋 Historial
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* Modales */}
      {modalNuevoItem && sucursalId && (
        <ModalNuevoItemInventario
          sucursalId={sucursalId}
          onGuardado={alGuardarItem}
          onClose={() => setModalNuevoItem(false)}
        />
      )}

      {modalMovimiento && (
        <ModalMovimientoInventario
          item={modalMovimiento.item}
          tipoInicial={modalMovimiento.tipo}
          usuarioId={usuarioId}
          onGuardado={alGuardarMovimiento}
          onClose={() => setModalMovimiento(null)}
        />
      )}

      {modalHistorial && (
        <ModalHistorialMovimientos
          itemId={modalHistorial.id}
          itemNombre={modalHistorial.nombre}
          unidadMedida={modalHistorial.unidad_medida}
          onClose={() => setModalHistorial(null)}
        />
      )}
    </div>
  )
}
