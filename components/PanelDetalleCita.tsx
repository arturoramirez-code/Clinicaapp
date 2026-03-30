'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { EMPRESA_ID } from '@/lib/config'

// ── Tipos ──────────────────────────────────────────────────────────────────

export interface CitaDetalle {
  id: string
  fecha_hora: string
  duracion_min: number
  estado: string
  precio_acordado: number | null
  notas_previas: string | null
  notas_post: string | null
  paciente_id: string
  dentista_id: string
  tratamiento_id: string | null
  paciente: {
    primer_nombre: string
    segundo_nombre: string | null
    primer_apellido: string
    segundo_apellido: string | null
    telefono: string | null
  } | null
  tratamiento: {
    nombre: string
    color: string | null
  } | null
  dentista: {
    nombre: string
    apellido: string | null
  } | null
}

// ── Helpers ────────────────────────────────────────────────────────────────

function nombreCompleto(p: CitaDetalle['paciente']): string {
  if (!p) return 'Paciente'
  return [p.primer_nombre, p.segundo_nombre, p.primer_apellido, p.segundo_apellido]
    .filter(Boolean).join(' ')
}

function formatearFechaHora(iso: string): string {
  const d = new Date(iso)
  const fecha = d.toLocaleDateString('es-GT', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })
  const hora  = d.toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit', hour12: true })
  return `${fecha} · ${hora}`
}

function formatearHora(iso: string): string {
  return new Date(iso).toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit', hour12: true })
}

const CONFIG_ESTADO: Record<string, { etiqueta: string; bg: string; color: string }> = {
  agendada:    { etiqueta: 'Agendada',    bg: '#fff8e8', color: '#7a5500' },
  confirmada:  { etiqueta: 'Confirmada',  bg: '#e8f4ff', color: '#0d3d6e' },
  en_curso:    { etiqueta: 'En curso',    bg: '#e8f4ff', color: '#1a6bbd' },
  completada:  { etiqueta: 'Completada',  bg: '#e8fff5', color: '#0a5535' },
  cancelada:   { etiqueta: 'Cancelada',   bg: '#fff0f0', color: '#7a1a1a' },
  no_asistio:  { etiqueta: 'No asistió',  bg: '#fff0f0', color: '#7a1a1a' },
  reprogramada:{ etiqueta: 'Reprogramada',bg: '#f5e8ff', color: '#5a1a8a' },
}

// ── Fila de detalle ────────────────────────────────────────────────────────

function FilaDetalle({ etiqueta, valor }: { etiqueta: string; valor?: string | null }) {
  return (
    <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
      <div style={{ fontSize: 12, fontWeight: 500, color: '#5a8ab0', width: 120, flexShrink: 0, paddingTop: 1 }}>
        {etiqueta}
      </div>
      <div style={{ fontSize: 14, color: '#0d3d6e', flex: 1 }}>{valor || '—'}</div>
    </div>
  )
}

// ── Componente principal ───────────────────────────────────────────────────

interface ItemInventarioBasico {
  id: string
  nombre: string
  stock_actual: number
  unidad_medida: string
}

export default function PanelDetalleCita({
  cita,
  onClose,
  onUpdate,
}: {
  cita: CitaDetalle
  onClose: () => void
  onUpdate: (citaActualizada: CitaDetalle) => void
}) {
  const router = useRouter()
  const [actualizando, setActualizando] = useState<string | null>(null)
  const [errorAccion, setErrorAccion]   = useState<string | null>(null)

  // ── Cobro existente ─────────────────────────────────────────────────
  // undefined = no verificado aún, null = verificado sin cobro, objeto = cobro encontrado
  const [cobroExistente, setCobroExistente] = useState<{ id: string; numero_cobro: number } | null | undefined>(undefined)

  useEffect(() => {
    if (cita.estado !== 'completada') { setCobroExistente(undefined); return }
    setCobroExistente(undefined)
    supabase
      .from('cobros')
      .select('id, numero_cobro')
      .eq('cita_id', cita.id)
      .eq('empresa_id', EMPRESA_ID)
      .neq('estado', 'anulado')
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        setCobroExistente(data as { id: string; numero_cobro: number } | null)
      })
  }, [cita.id, cita.estado])

  // ── Materiales usados ───────────────────────────────────────────────
  const [itemsInventario, setItemsInventario]     = useState<ItemInventarioBasico[]>([])
  const [itemSeleccionado, setItemSeleccionado]   = useState('')
  const [cantidadConsumo, setCantidadConsumo]     = useState<number>(1)
  const [registrandoConsumo, setRegistrandoConsumo] = useState(false)
  const [errorConsumo, setErrorConsumo]           = useState<string | null>(null)
  const [consumosRegistrados, setConsumosRegistrados] = useState<{ nombre: string; cantidad: number; unidad: string }[]>([])

  const mostrarMateriales = cita.estado === 'en_curso' || cita.estado === 'completada'

  useEffect(() => {
    if (!mostrarMateriales) return
    supabase
      .from('inventario_items')
      .select('id, nombre, stock_actual, unidad_medida')
      .eq('empresa_id', EMPRESA_ID)
      .eq('activo', true)
      .gt('stock_actual', 0)
      .order('nombre')
      .then(({ data }) => setItemsInventario((data as ItemInventarioBasico[]) ?? []))
  }, [mostrarMateriales])

  async function registrarConsumo() {
    if (!itemSeleccionado) { setErrorConsumo('Seleccione un ítem.'); return }
    if (cantidadConsumo <= 0) { setErrorConsumo('La cantidad debe ser mayor a cero.'); return }
    const item = itemsInventario.find((i) => i.id === itemSeleccionado)
    if (!item) return
    if (cantidadConsumo > item.stock_actual) {
      setErrorConsumo(`Stock insuficiente. Disponible: ${item.stock_actual} ${item.unidad_medida}.`)
      return
    }
    setErrorConsumo(null)
    setRegistrandoConsumo(true)
    try {
      const { error: err } = await supabase.rpc('clinica_mover_inventario', {
        p_empresa_id: EMPRESA_ID,
        p_item_id:    itemSeleccionado,
        p_tipo:       'consumo',
        p_cantidad:   cantidadConsumo,
        p_cita_id:    cita.id,
        p_motivo:     `Consumo en cita`,
        p_usuario_id: null,
      })
      if (err) throw err
      setConsumosRegistrados((prev) => [
        ...prev,
        { nombre: item.nombre, cantidad: cantidadConsumo, unidad: item.unidad_medida },
      ])
      // Actualizar stock en lista local
      setItemsInventario((prev) =>
        prev.map((i) => i.id === itemSeleccionado
          ? { ...i, stock_actual: i.stock_actual - cantidadConsumo }
          : i
        ).filter((i) => i.stock_actual > 0)
      )
      setItemSeleccionado('')
      setCantidadConsumo(1)
    } catch (e: unknown) {
      console.error('Error al registrar consumo:', e)
      setErrorConsumo(e instanceof Error ? e.message : 'Ocurrió un error. Por favor intente de nuevo.')
    } finally {
      setRegistrandoConsumo(false)
    }
  }

  const estadoConfig = CONFIG_ESTADO[cita.estado] ?? { etiqueta: cita.estado, bg: '#f0f7ff', color: '#0d3d6e' }

  const finHora = new Date(new Date(cita.fecha_hora).getTime() + cita.duracion_min * 60000)

  // ── Cambiar estado ──────────────────────────────────────────────────

  async function cambiarEstado(nuevoEstado: string) {
    setErrorAccion(null)
    setActualizando(nuevoEstado)
    try {
      const { data, error } = await supabase
        .from('citas')
        .update({ estado: nuevoEstado, actualizado_en: new Date().toISOString() })
        .eq('id', cita.id)
        .eq('empresa_id', EMPRESA_ID)
        .select(`
          id, fecha_hora, duracion_min, estado, precio_acordado, notas_previas, notas_post,
          paciente_id, dentista_id, tratamiento_id,
          paciente:pacientes!paciente_id(primer_nombre, segundo_nombre, primer_apellido, segundo_apellido, telefono),
          tratamiento:tratamiento_tipos!tratamiento_id(nombre, color),
          dentista:usuarios!dentista_id(nombre, apellido)
        `)
        .single()

      if (error) throw error
      onUpdate(data as unknown as CitaDetalle)
    } catch (err) {
      console.error('Error al actualizar estado de cita:', err)
      setErrorAccion('Ocurrió un error al actualizar. Por favor intente de nuevo.')
    } finally {
      setActualizando(null)
    }
  }

  // ── Botones de acción según estado ──────────────────────────────────

  const acciones: { label: string; estado: string; estilo: string }[] = []

  if (cita.estado === 'agendada') {
    acciones.push({ label: 'Confirmar', estado: 'confirmada', estilo: 'ct-btn-primary' })
    acciones.push({ label: 'Cancelar cita', estado: 'cancelada', estilo: 'ct-btn-danger' })
  }
  if (cita.estado === 'confirmada') {
    acciones.push({ label: 'Iniciar', estado: 'en_curso', estilo: 'ct-btn-primary' })
    acciones.push({ label: 'Cancelar cita', estado: 'cancelada', estilo: 'ct-btn-danger' })
  }
  if (cita.estado === 'en_curso') {
    acciones.push({ label: 'Completar', estado: 'completada', estilo: 'ct-btn-primary' })
  }

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 50,
        background: 'rgba(13,61,110,0.35)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        background: '#ffffff', borderRadius: 16,
        width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto',
        border: '0.5px solid #c5ddf5',
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px 16px',
          borderBottom: '0.5px solid #e0eef8',
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
          gap: 12,
        }}>
          <div>
            <h2 style={{ fontSize: 17, fontWeight: 600, color: '#0d3d6e', margin: '0 0 6px' }}>
              {nombreCompleto(cita.paciente)}
            </h2>
            <span style={{
              display: 'inline-block', padding: '3px 10px', borderRadius: 20,
              background: estadoConfig.bg, color: estadoConfig.color,
              fontSize: 12, fontWeight: 600,
            }}>
              {estadoConfig.etiqueta}
            </span>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 20, color: '#5a8ab0', lineHeight: 1, padding: 4, flexShrink: 0,
            }}
            aria-label="Cerrar"
          >
            ×
          </button>
        </div>

        {/* Color bar del tratamiento */}
        {cita.tratamiento?.color && (
          <div style={{ height: 3, background: cita.tratamiento.color }} />
        )}

        {/* Cuerpo */}
        <div style={{ padding: '20px 24px' }}>

          {/* Datos de la cita */}
          <FilaDetalle
            etiqueta="Tratamiento"
            valor={cita.tratamiento?.nombre ?? 'Sin especificar'}
          />
          <FilaDetalle
            etiqueta="Dentista"
            valor={cita.dentista
              ? `Dr(a). ${cita.dentista.nombre} ${cita.dentista.apellido ?? ''}`
              : '—'}
          />
          <FilaDetalle
            etiqueta="Fecha y hora"
            valor={formatearFechaHora(cita.fecha_hora)}
          />
          <FilaDetalle
            etiqueta="Horario"
            valor={`${formatearHora(cita.fecha_hora)} – ${formatearHora(finHora.toISOString())} (${cita.duracion_min} min)`}
          />
          {cita.precio_acordado != null && (
            <FilaDetalle
              etiqueta="Precio"
              valor={`Q ${Number(cita.precio_acordado).toLocaleString('es-GT', { minimumFractionDigits: 2 })}`}
            />
          )}
          {cita.paciente?.telefono && (
            <FilaDetalle etiqueta="Teléfono" valor={cita.paciente.telefono} />
          )}
          {cita.notas_previas && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: '#5a8ab0', marginBottom: 4 }}>
                Notas previas
              </div>
              <div style={{
                fontSize: 13, color: '#0d3d6e', background: '#f7faff',
                borderRadius: 8, padding: '8px 12px',
                border: '0.5px solid #e0eef8',
              }}>
                {cita.notas_previas}
              </div>
            </div>
          )}

          {/* Error de acción */}
          {errorAccion && (
            <div style={{
              background: '#fff0f0', border: '0.5px solid #e84040', borderRadius: 8,
              padding: '10px 14px', color: '#e84040', marginBottom: 16, fontSize: 13,
            }}>
              {errorAccion}
            </div>
          )}

          {/* Botones de acción */}
          {acciones.length > 0 && (
            <div style={{
              display: 'flex', gap: 8, flexWrap: 'wrap',
              paddingTop: 16, borderTop: '0.5px solid #e0eef8', marginTop: 4,
            }}>
              {acciones.map((accion) => (
                <button
                  key={accion.estado}
                  onClick={() => cambiarEstado(accion.estado)}
                  disabled={actualizando !== null}
                  className={`ct-btn ${accion.estilo === 'ct-btn-danger'
                    ? ''
                    : accion.estilo}`}
                  style={accion.estilo === 'ct-btn-danger' ? {
                    height: 40, padding: '0 20px', borderRadius: 8, fontSize: 14,
                    fontWeight: 500, cursor: 'pointer', border: '1px solid #e84040',
                    background: '#ffffff', color: '#e84040',
                    opacity: actualizando !== null ? 0.5 : 1,
                  } : {
                    opacity: actualizando !== null ? 0.5 : 1,
                  }}
                >
                  {actualizando === accion.estado ? 'Actualizando...' : accion.label}
                </button>
              ))}
            </div>
          )}

          {cita.estado === 'completada' && (
            <div style={{
              paddingTop: 16, borderTop: '0.5px solid #e0eef8', marginTop: 4,
              display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap',
            }}>
              {cobroExistente === undefined ? (
                <span style={{ fontSize: 13, color: '#5a8ab0' }}>Verificando...</span>
              ) : cobroExistente !== null ? (
                <>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '6px 12px', borderRadius: 8,
                    background: '#e8fff5', border: '0.5px solid #2ecc8a',
                    color: '#0a5535', fontSize: 13, fontWeight: 600,
                  }}>
                    ✓ Cobro registrado
                  </span>
                  <button
                    onClick={() => { router.push('/cobros'); onClose() }}
                    className="ct-btn ct-btn-secondary"
                    style={{ height: 36, fontSize: 13 }}
                  >
                    Ver cobro #{cobroExistente.numero_cobro}
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => {
                      router.push(`/cobros/nuevo?cita_id=${cita.id}&paciente_id=${cita.paciente_id}`)
                      onClose()
                    }}
                    className="ct-btn ct-btn-primary"
                  >
                    💳 Cobrar esta cita
                  </button>
                  <span style={{ fontSize: 12, color: '#5a8ab0' }}>
                    Registrar pago por los servicios prestados
                  </span>
                </>
              )}
            </div>
          )}

          {/* Materiales usados */}
          {mostrarMateriales && (
            <div style={{
              paddingTop: 16, borderTop: '0.5px solid #e0eef8', marginTop: 4,
            }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#0d3d6e', marginBottom: 12 }}>
                Materiales usados
              </div>

              {consumosRegistrados.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  {consumosRegistrados.map((c, i) => (
                    <div key={i} style={{
                      fontSize: 12, color: '#0a5535', background: '#e8fff5',
                      borderRadius: 6, padding: '4px 10px', marginBottom: 4,
                      border: '0.5px solid #2ecc8a', display: 'inline-block', marginRight: 6,
                    }}>
                      ✓ {c.cantidad} {c.unidad} de {c.nombre}
                    </div>
                  ))}
                </div>
              )}

              {errorConsumo && (
                <div style={{
                  background: '#fff0f0', border: '0.5px solid #e84040', borderRadius: 8,
                  padding: '8px 12px', color: '#e84040', fontSize: 12, marginBottom: 10,
                }}>
                  {errorConsumo}
                </div>
              )}

              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                <div style={{ flex: 2, minWidth: 160 }}>
                  <div style={{ fontSize: 12, fontWeight: 500, color: '#5a8ab0', marginBottom: 4 }}>Ítem</div>
                  <select
                    value={itemSeleccionado}
                    onChange={(e) => setItemSeleccionado(e.target.value)}
                    style={{
                      width: '100%', height: 36, padding: '0 10px', fontSize: 13,
                      border: '0.5px solid #c5ddf5', borderRadius: 8, background: '#fff',
                      color: itemSeleccionado ? '#0d3d6e' : '#5a8ab0', outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  >
                    <option value="">Seleccionar ítem...</option>
                    {itemsInventario.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.nombre} ({item.stock_actual} {item.unidad_medida})
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ width: 80 }}>
                  <div style={{ fontSize: 12, fontWeight: 500, color: '#5a8ab0', marginBottom: 4 }}>Cantidad</div>
                  <input
                    type="number" min={0.01} step={0.01} value={cantidadConsumo}
                    onChange={(e) => setCantidadConsumo(Math.max(0.01, Number(e.target.value)))}
                    style={{
                      width: '100%', height: 36, padding: '0 8px', fontSize: 13,
                      border: '0.5px solid #c5ddf5', borderRadius: 8, background: '#fff',
                      color: '#0d3d6e', outline: 'none', boxSizing: 'border-box',
                    }}
                  />
                </div>

                <button
                  onClick={registrarConsumo}
                  disabled={registrandoConsumo || !itemSeleccionado}
                  style={{
                    height: 36, padding: '0 14px', borderRadius: 8, fontSize: 13, fontWeight: 500,
                    background: '#1a6bbd', color: '#fff', border: 'none', cursor: 'pointer',
                    opacity: (registrandoConsumo || !itemSeleccionado) ? 0.5 : 1,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {registrandoConsumo ? 'Registrando...' : 'Registrar consumo'}
                </button>
              </div>
            </div>
          )}

          {(cita.estado === 'cancelada' || cita.estado === 'no_asistio') && (
            <div style={{
              fontSize: 13, color: '#5a8ab0', textAlign: 'center',
              paddingTop: 16, borderTop: '0.5px solid #e0eef8', marginTop: 4,
            }}>
              Esta cita está {CONFIG_ESTADO[cita.estado]?.etiqueta?.toLowerCase() ?? cita.estado} y no puede modificarse.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
