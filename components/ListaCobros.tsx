'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { EMPRESA_ID } from '@/lib/config'
import ModalCierreCaja from '@/components/ModalCierreCaja'

// ── Tipos ────────────────────────────────────────────────────────────────────

interface CobrosRow {
  id: string
  numero_cobro: number
  fecha_cobro: string
  subtotal: number
  descuento: number
  base_imponible: number
  iva_monto: number
  total: number
  metodo_pago: string
  referencia_pago: string | null
  numero_cuota: number | null
  total_cuotas: number | null
  estado: string
  fel_estado: string
  fel_uuid: string | null
  fel_numero: string | null
  paciente_id: string
  cita_id: string | null
  paciente: {
    primer_nombre: string
    primer_apellido: string
  } | null
  cobro_items: { descripcion: string }[]
}

type Tab = 'todos' | 'pendientes' | 'pagados' | 'anulados'

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatQ(n: number): string {
  return `Q ${Number(n).toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatFecha(iso: string): string {
  return new Date(iso + 'T12:00:00').toLocaleDateString('es-GT', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  })
}

function nombrePaciente(cobro: CobrosRow): string {
  if (!cobro.paciente) return '—'
  return `${cobro.paciente.primer_nombre} ${cobro.paciente.primer_apellido}`
}

function etiquetaMetodo(metodo: string): string {
  const mapa: Record<string, string> = {
    efectivo:        'Efectivo',
    tarjeta_credito: 'T. Crédito',
    tarjeta_debito:  'T. Débito',
    transferencia:   'Transferencia',
    cuota:           'Cuota',
  }
  return mapa[metodo] ?? metodo
}

// ── Badges ───────────────────────────────────────────────────────────────────

function BadgeEstado({ estado }: { estado: string }) {
  const cfg: Record<string, { bg: string; color: string; label: string }> = {
    pendiente: { bg: '#fff8e8', color: '#7a5500',  label: 'Pendiente' },
    pagado:    { bg: '#e8fff5', color: '#0a5535',  label: 'Pagado'    },
    anulado:   { bg: '#fff0f0', color: '#7a1a1a',  label: 'Anulado'   },
  }
  const c = cfg[estado] ?? { bg: '#f0f7ff', color: '#0d3d6e', label: estado }
  return (
    <span style={{
      display: 'inline-block', padding: '2px 10px', borderRadius: 20,
      background: c.bg, color: c.color, fontSize: 12, fontWeight: 600,
    }}>
      {c.label}
    </span>
  )
}

function BadgeFEL({ estado }: { estado: string }) {
  const cfg: Record<string, { bg: string; color: string; label: string }> = {
    pendiente: { bg: '#fff8e8', color: '#7a5500',  label: 'FEL pendiente' },
    emitida:   { bg: '#e8fff5', color: '#0a5535',  label: 'FEL emitida'   },
    anulada:   { bg: '#fff0f0', color: '#7a1a1a',  label: 'FEL anulada'   },
    error:     { bg: '#fff0f0', color: '#e84040',  label: 'FEL error'     },
  }
  const c = cfg[estado] ?? { bg: '#f0f7ff', color: '#5a8ab0', label: estado }
  return (
    <span style={{
      display: 'inline-block', padding: '2px 8px', borderRadius: 20,
      background: c.bg, color: c.color, fontSize: 11, fontWeight: 600,
    }}>
      {c.label}
    </span>
  )
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function ListaCobros() {
  const [cobros, setCobros]               = useState<CobrosRow[]>([])
  const [tab, setTab]                     = useState<Tab>('todos')
  const [cargando, setCargando]           = useState(true)
  const [error, setError]                 = useState<string | null>(null)
  const [emitiendo, setEmitiendo]         = useState<string | null>(null)
  const [toastMsg, setToastMsg]           = useState<string | null>(null)
  const [toastError, setToastError]       = useState<string | null>(null)
  const [mostrarCierreCaja, setMostrarCierreCaja] = useState(false)

  // ── Carga ─────────────────────────────────────────────────────────────

  const cargar = useCallback(async () => {
    setCargando(true)
    setError(null)
    try {
      const hoy = new Date().toISOString().split('T')[0]
      const { data, error: err } = await supabase
        .from('cobros')
        .select(`
          id, numero_cobro, fecha_cobro, subtotal, descuento,
          base_imponible, iva_monto, total, metodo_pago, referencia_pago,
          numero_cuota, total_cuotas, estado, fel_estado, fel_uuid, fel_numero,
          paciente_id, cita_id,
          paciente:pacientes!paciente_id(primer_nombre, primer_apellido),
          cobro_items(descripcion)
        `)
        .eq('empresa_id', EMPRESA_ID)
        .eq('fecha_cobro', hoy)
        .order('numero_cobro', { ascending: false })

      if (err) throw err
      setCobros((data as unknown as CobrosRow[]) ?? [])
    } catch (e) {
      console.error('Error al cargar cobros:', e)
      setError('Ocurrió un error al cargar los cobros. Por favor intente de nuevo.')
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => { cargar() }, [cargar])

  // ── FEL simulado ─────────────────────────────────────────────────────

  async function emitirFEL(cobro: CobrosRow) {
    setEmitiendo(cobro.id)
    setToastMsg(null)
    setToastError(null)
    try {
      const felUUID   = crypto.randomUUID()
      const felNumero = `FACT-2026-${String(cobro.numero_cobro).padStart(4, '0')}`
      const ahora     = new Date().toISOString()

      const { error: errUpdate } = await supabase
        .from('cobros')
        .update({
          fel_estado:    'emitida',
          fel_uuid:      felUUID,
          fel_numero:    felNumero,
          fel_fecha_cert: ahora,
          actualizado_en: ahora,
        })
        .eq('id', cobro.id)
        .eq('empresa_id', EMPRESA_ID)

      if (errUpdate) throw errUpdate

      // Log FEL
      await supabase.from('fel_log').insert({
        empresa_id:       EMPRESA_ID,
        cobro_id:         cobro.id,
        tipo_documento:   'FACT',
        accion:           'emitir',
        request_payload:  JSON.stringify({ cobro_id: cobro.id }),
        response_payload: JSON.stringify({ uuid: felUUID, numero: felNumero, ambiente: 'pruebas' }),
        http_status:      200,
        exitoso:          true,
      })

      setToastMsg(`Factura FEL emitida (ambiente pruebas) · ${felNumero}`)
      await cargar()
    } catch (e) {
      console.error('Error al emitir FEL:', e)
      setToastError('Error al emitir la factura FEL. Por favor intente de nuevo.')
    } finally {
      setEmitiendo(null)
    }
  }

  // ── Filtrado por tab ──────────────────────────────────────────────────

  const cobrosVisibles = cobros.filter((c) => {
    if (tab === 'pendientes') return c.estado === 'pendiente'
    if (tab === 'pagados')    return c.estado === 'pagado'
    if (tab === 'anulados')   return c.estado === 'anulado'
    return true
  })

  // ── Resumen del día ───────────────────────────────────────────────────

  const totalCobrado   = cobros.filter((c) => c.estado === 'pagado').reduce((s, c) => s + Number(c.total), 0)
  const countFacturas  = cobros.length
  const pendientesFEL  = cobros.filter((c) => c.fel_estado === 'pendiente' && c.estado === 'pagado').length

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <div>
      {/* Encabezado */}
      <div style={{
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        marginBottom: 24, flexWrap: 'wrap', gap: 12,
      }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 600, color: '#0d3d6e', margin: 0 }}>
            Cobros
          </h1>
          <div style={{ fontSize: 13, color: '#5a8ab0', marginTop: 4 }}>
            {new Date().toLocaleDateString('es-GT', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
              className="ct-btn ct-btn-secondary"
              onClick={() => setMostrarCierreCaja(true)}
            >
              🔒 Cierre de Caja
            </button>
          <Link href="/cobros/nuevo" className="ct-btn ct-btn-primary" style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              height: 40, padding: '0 20px', borderRadius: 8, fontSize: 14,
              fontWeight: 500, textDecoration: 'none', color: '#fff',
              background: '#1a6bbd', border: 'none', cursor: 'pointer',
            }}>
              + Nuevo Cobro
            </Link>
        </div>
      </div>

      {/* Toasts */}
      {toastMsg && (
        <div style={{
          background: '#e8fff5', border: '0.5px solid #2ecc8a', borderRadius: 8,
          padding: '10px 16px', color: '#0a5535', fontSize: 13, marginBottom: 16,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          {toastMsg}
          <button onClick={() => setToastMsg(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#0a5535', fontSize: 16 }}>×</button>
        </div>
      )}
      {toastError && (
        <div style={{
          background: '#fff0f0', border: '0.5px solid #e84040', borderRadius: 8,
          padding: '10px 16px', color: '#e84040', fontSize: 13, marginBottom: 16,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          {toastError}
          <button onClick={() => setToastError(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#e84040', fontSize: 16 }}>×</button>
        </div>
      )}

      {/* Tarjetas de resumen */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
        <div style={{
          background: '#f0f7ff', border: '0.5px solid #c5ddf5',
          borderRadius: 8, padding: 16,
        }}>
          <div style={{ fontSize: 12, color: '#5a8ab0', marginBottom: 4 }}>Total cobrado hoy</div>
          <div style={{ fontSize: 28, fontWeight: 600, color: '#0d3d6e' }}>{formatQ(totalCobrado)}</div>
        </div>
        <div style={{
          background: '#f0f7ff', border: '0.5px solid #c5ddf5',
          borderRadius: 8, padding: 16,
        }}>
          <div style={{ fontSize: 12, color: '#5a8ab0', marginBottom: 4 }}>Cobros del día</div>
          <div style={{ fontSize: 28, fontWeight: 600, color: '#0d3d6e' }}>{countFacturas}</div>
        </div>
        <div style={{
          background: pendientesFEL > 0 ? '#fff8e8' : '#f0f7ff',
          border: `0.5px solid ${pendientesFEL > 0 ? '#f0c040' : '#c5ddf5'}`,
          borderRadius: 8, padding: 16,
        }}>
          <div style={{ fontSize: 12, color: '#5a8ab0', marginBottom: 4 }}>Pendientes FEL</div>
          <div style={{ fontSize: 28, fontWeight: 600, color: pendientesFEL > 0 ? '#7a5500' : '#0d3d6e' }}>
            {pendientesFEL}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex', gap: 0, marginBottom: 16,
        borderBottom: '0.5px solid #e0eef8',
      }}>
        {([
          { id: 'todos',      label: `Todos (${cobros.length})` },
          { id: 'pendientes', label: `Pendientes (${cobros.filter(c => c.estado === 'pendiente').length})` },
          { id: 'pagados',    label: `Pagados (${cobros.filter(c => c.estado === 'pagado').length})` },
          { id: 'anulados',   label: `Anulados (${cobros.filter(c => c.estado === 'anulado').length})` },
        ] as { id: Tab; label: string }[]).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              padding: '10px 18px', background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 14, fontWeight: tab === t.id ? 600 : 400,
              color: tab === t.id ? '#1a6bbd' : '#5a8ab0',
              borderBottom: tab === t.id ? '2px solid #1a6bbd' : '2px solid transparent',
              marginBottom: -1,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Estado de carga / error */}
      {cargando && (
        <div style={{ padding: '32px 0', textAlign: 'center', color: '#5a8ab0', fontSize: 14 }}>
          Cargando cobros...
        </div>
      )}
      {error && (
        <div style={{
          background: '#fff0f0', border: '0.5px solid #e84040', borderRadius: 8,
          padding: '12px 16px', color: '#e84040', fontSize: 13,
        }}>
          {error}
        </div>
      )}

      {/* Tabla */}
      {!cargando && !error && (
        cobrosVisibles.length === 0 ? (
          <div style={{
            background: '#ffffff', border: '0.5px solid #e0eef8', borderRadius: 10,
            padding: '40px 24px', textAlign: 'center', color: '#5a8ab0', fontSize: 14,
          }}>
            No se encontraron cobros para hoy.
            {tab === 'todos' && (
              <div style={{ marginTop: 12 }}>
                <Link href="/cobros/nuevo" style={{
                  color: '#1a6bbd', fontWeight: 500, textDecoration: 'none',
                }}>
                  Registrar primer cobro del día →
                </Link>
              </div>
            )}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="ct-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Paciente</th>
                  <th>Descripción</th>
                  <th>Total</th>
                  <th>Método</th>
                  <th>Estado</th>
                  <th>FEL</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {cobrosVisibles.map((cobro) => (
                  <tr key={cobro.id}>
                    <td style={{ fontWeight: 600, color: '#0d3d6e', whiteSpace: 'nowrap' }}>
                      #{String(cobro.numero_cobro).padStart(4, '0')}
                    </td>
                    <td style={{ fontWeight: 500, color: '#0d3d6e', whiteSpace: 'nowrap' }}>
                      {nombrePaciente(cobro)}
                    </td>
                    <td style={{ color: '#5a8ab0', fontSize: 13, maxWidth: 220 }}>
                      {cobro.cobro_items?.map((i) => i.descripcion).join(', ') || '—'}
                      {cobro.numero_cuota && cobro.total_cuotas && (
                        <span style={{
                          marginLeft: 6, fontSize: 11, background: '#e8f4ff',
                          color: '#0d3d6e', padding: '1px 6px', borderRadius: 10,
                        }}>
                          Cuota {cobro.numero_cuota}/{cobro.total_cuotas}
                        </span>
                      )}
                    </td>
                    <td style={{ fontWeight: 600, color: '#0d3d6e', whiteSpace: 'nowrap' }}>
                      {formatQ(cobro.total)}
                    </td>
                    <td style={{ whiteSpace: 'nowrap', color: '#5a8ab0', fontSize: 13 }}>
                      {etiquetaMetodo(cobro.metodo_pago)}
                      {cobro.referencia_pago && (
                        <div style={{ fontSize: 11, color: '#c5ddf5' }}>{cobro.referencia_pago}</div>
                      )}
                    </td>
                    <td><BadgeEstado estado={cobro.estado} /></td>
                    <td><BadgeFEL estado={cobro.fel_estado} /></td>
                    <td>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        {cobro.estado === 'pagado' && cobro.fel_estado === 'pendiente' && (
                          <button
                            onClick={() => emitirFEL(cobro)}
                            disabled={emitiendo === cobro.id}
                            style={{
                              padding: '4px 10px', fontSize: 12, fontWeight: 500,
                              background: '#1a6bbd', color: '#fff', border: 'none',
                              borderRadius: 6, cursor: 'pointer',
                              opacity: emitiendo === cobro.id ? 0.6 : 1,
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {emitiendo === cobro.id ? 'Emitiendo...' : '📄 Emitir FEL'}
                          </button>
                        )}
                        {cobro.fel_numero && (
                          <span style={{ fontSize: 11, color: '#0a5535', fontWeight: 500 }}>
                            {cobro.fel_numero}
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* Modal cierre de caja */}
      {mostrarCierreCaja && (
        <ModalCierreCaja
          cobrosHoy={cobros}
          onClose={() => setMostrarCierreCaja(false)}
          onCerrado={() => { setMostrarCierreCaja(false); cargar() }}
        />
      )}
    </div>
  )
}
