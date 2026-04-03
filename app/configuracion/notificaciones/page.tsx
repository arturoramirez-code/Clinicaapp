'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { EMPRESA_ID } from '@/lib/config'

// ── Tipos ──────────────────────────────────────────────────────────────────

interface ConfigNotificaciones {
  id: string | null
  empresa_id: string
  email_activo: boolean
  email_remitente_nombre: string
  enviar_confirmacion: boolean
  enviar_recordatorio_1: boolean
  enviar_recordatorio_2: boolean
  enviar_cancelacion: boolean
  enviar_reprogramacion: boolean
  horas_recordatorio_1: number
  horas_recordatorio_2: number
  whatsapp_activo: boolean
}

interface ResultadoRecordatorios {
  procesadas: number
  enviadas: number
  omitidas: number
}

// ── Defaults ───────────────────────────────────────────────────────────────

const CONFIG_DEFAULT: ConfigNotificaciones = {
  id: null,
  empresa_id: EMPRESA_ID,
  email_activo: false,
  email_remitente_nombre: '',
  enviar_confirmacion: true,
  enviar_recordatorio_1: true,
  enviar_recordatorio_2: false,
  enviar_cancelacion: true,
  enviar_reprogramacion: true,
  horas_recordatorio_1: 24,
  horas_recordatorio_2: 2,
  whatsapp_activo: false,
}

// ── Sub-componentes ────────────────────────────────────────────────────────

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: '#ffffff',
      border: '0.5px solid #c5ddf5',
      borderRadius: 12,
      padding: '20px 24px',
      marginBottom: 20,
    }}>
      <p style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 600, color: '#0d3d6e' }}>
        {titulo}
      </p>
      <div style={{ borderTop: '0.5px solid #e0eef8', paddingTop: 16 }}>
        {children}
      </div>
    </div>
  )
}

function FilaCheckbox({
  id,
  label,
  checked,
  onChange,
  children,
}: {
  id: string
  label: string
  checked: boolean
  onChange: (v: boolean) => void
  children?: React.ReactNode
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '10px 0',
      borderBottom: '0.5px solid #f0f7ff',
    }}>
      <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', flex: 1 }}>
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          style={{ width: 16, height: 16, accentColor: '#1a6bbd', cursor: 'pointer' }}
        />
        <span style={{ fontSize: 14, color: '#0d3d6e', fontWeight: 500 }}>{label}</span>
      </label>
      {children}
    </div>
  )
}

// ── Página ────────────────────────────────────────────────────────────────

export default function PaginaConfiguracionNotificaciones() {
  const [config, setConfig]             = useState<ConfigNotificaciones>(CONFIG_DEFAULT)
  const [cargando, setCargando]         = useState(true)
  const [guardando, setGuardando]       = useState(false)
  const [toastMsg, setToastMsg]         = useState<string | null>(null)
  const [toastError, setToastError]     = useState<string | null>(null)

  // Estado para disparar recordatorios manualmente
  const [disparando, setDisparando]         = useState(false)
  const [resultadoDisparo, setResultadoDisparo] = useState<ResultadoRecordatorios | null>(null)

  // ── Carga inicial ──────────────────────────────────────────────────────

  useEffect(() => {
    async function cargarConfig() {
      const { data, error } = await supabase
        .from('notificacion_config')
        .select('*')
        .eq('empresa_id', EMPRESA_ID)
        .single()

      if (error || !data) {
        // No existe — insertar fila con valores por defecto
        const { data: nueva, error: errInsert } = await supabase
          .from('notificacion_config')
          .insert({
            empresa_id:             EMPRESA_ID,
            email_activo:           false,
            email_remitente_nombre: '',
            enviar_confirmacion:    true,
            enviar_recordatorio_1:  true,
            enviar_recordatorio_2:  false,
            enviar_cancelacion:     true,
            enviar_reprogramacion:  true,
            horas_recordatorio_1:   24,
            horas_recordatorio_2:   2,
            whatsapp_activo:        false,
          })
          .select('*')
          .single()

        if (!errInsert && nueva) {
          setConfig(nueva as ConfigNotificaciones)
        }
      } else {
        setConfig(data as ConfigNotificaciones)
      }

      setCargando(false)
    }
    cargarConfig()
  }, [])

  // ── Helpers de cambio ──────────────────────────────────────────────────

  function cambiar<K extends keyof ConfigNotificaciones>(
    campo: K,
    valor: ConfigNotificaciones[K]
  ) {
    setConfig((prev) => ({ ...prev, [campo]: valor }))
  }

  // ── Guardar ────────────────────────────────────────────────────────────

  async function guardar() {
    setGuardando(true)
    setToastMsg(null)
    setToastError(null)

    const { error } = await supabase
      .from('notificacion_config')
      .upsert(
        {
          empresa_id:             EMPRESA_ID,
          email_activo:           config.email_activo,
          email_remitente_nombre: config.email_remitente_nombre.trim(),
          enviar_confirmacion:    config.enviar_confirmacion,
          enviar_recordatorio_1:  config.enviar_recordatorio_1,
          enviar_recordatorio_2:  config.enviar_recordatorio_2,
          enviar_cancelacion:     config.enviar_cancelacion,
          enviar_reprogramacion:  config.enviar_reprogramacion,
          horas_recordatorio_1:   config.horas_recordatorio_1,
          horas_recordatorio_2:   config.horas_recordatorio_2,
          whatsapp_activo:        config.whatsapp_activo,
          actualizado_en:         new Date().toISOString(),
        },
        { onConflict: 'empresa_id' }
      )

    setGuardando(false)

    if (error) {
      console.error('Error al guardar configuración:', error)
      setToastError('Ocurrió un error al guardar. Por favor intente de nuevo.')
    } else {
      setToastMsg('Configuración guardada correctamente.')
    }
  }

  // ── Disparar recordatorios ─────────────────────────────────────────────

  async function dispararRecordatorios() {
    setDisparando(true)
    setResultadoDisparo(null)
    setToastError(null)

    const cronSecret = process.env.NEXT_PUBLIC_CRON_SECRET ?? ''

    try {
      const respuesta = await fetch('/api/notificaciones/recordatorios', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-cron-secret': cronSecret,
        },
      })

      if (!respuesta.ok) {
        throw new Error(`Error ${respuesta.status}`)
      }

      const resultado = await respuesta.json() as ResultadoRecordatorios
      setResultadoDisparo(resultado)
    } catch (err) {
      console.error('Error al disparar recordatorios:', err)
      setToastError('Error al ejecutar los recordatorios. Verifique la consola.')
    } finally {
      setDisparando(false)
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────

  if (cargando) {
    return (
      <div style={{ padding: 32, color: '#5a8ab0', fontSize: 14 }}>
        Cargando configuración...
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 720 }}>

      {/* Breadcrumb */}
      <p style={{ fontSize: 13, color: '#5a8ab0', marginBottom: 8 }}>
        Configuración › Notificaciones
      </p>

      {/* Título */}
      <div style={{
        display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', marginBottom: 24, gap: 12,
      }}>
        <h1 style={{ fontSize: 24, fontWeight: 600, color: '#0d3d6e', margin: 0 }}>
          Notificaciones por correo
        </h1>
        <button
          onClick={guardar}
          disabled={guardando}
          className="ct-btn ct-btn-primary"
          style={{ opacity: guardando ? 0.6 : 1 }}
        >
          {guardando ? 'Guardando...' : 'Guardar configuración'}
        </button>
      </div>

      {/* Toasts */}
      {toastMsg && (
        <div style={{
          background: '#e8fff5', border: '0.5px solid #2ecc8a', borderRadius: 8,
          padding: '10px 16px', color: '#0a5535', fontSize: 13, marginBottom: 16,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          {toastMsg}
          <button
            onClick={() => setToastMsg(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#0a5535', fontSize: 16, lineHeight: 1 }}
          >×</button>
        </div>
      )}
      {toastError && (
        <div style={{
          background: '#fff0f0', border: '0.5px solid #e84040', borderRadius: 8,
          padding: '10px 16px', color: '#e84040', fontSize: 13, marginBottom: 16,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          {toastError}
          <button
            onClick={() => setToastError(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#e84040', fontSize: 16, lineHeight: 1 }}
          >×</button>
        </div>
      )}

      {/* ── Sección: Activar ── */}
      <Seccion titulo="Configuración general">

        {/* Toggle email_activo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
          <button
            type="button"
            role="switch"
            aria-checked={config.email_activo}
            onClick={() => cambiar('email_activo', !config.email_activo)}
            style={{
              width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer',
              background: config.email_activo ? '#1a6bbd' : '#c5ddf5',
              position: 'relative', transition: 'background 0.2s', flexShrink: 0,
            }}
          >
            <span style={{
              position: 'absolute', top: 3,
              left: config.email_activo ? 23 : 3,
              width: 18, height: 18, borderRadius: '50%', background: '#ffffff',
              transition: 'left 0.2s',
            }} />
          </button>
          <div>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#0d3d6e' }}>
              Activar notificaciones por correo
            </p>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: '#5a8ab0' }}>
              {config.email_activo
                ? 'Los correos se enviarán automáticamente al paciente.'
                : 'No se enviará ningún correo mientras esté desactivado.'}
            </p>
          </div>
        </div>

        {/* Toggle whatsapp_activo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
          <button
            type="button"
            role="switch"
            aria-checked={config.whatsapp_activo}
            onClick={() => cambiar('whatsapp_activo', !config.whatsapp_activo)}
            style={{
              width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer',
              background: config.whatsapp_activo ? '#25D366' : '#c5ddf5',
              position: 'relative', transition: 'background 0.2s', flexShrink: 0,
            }}
          >
            <span style={{
              position: 'absolute', top: 3,
              left: config.whatsapp_activo ? 23 : 3,
              width: 18, height: 18, borderRadius: '50%', background: '#ffffff',
              transition: 'left 0.2s',
            }} />
          </button>
          <div>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#0d3d6e' }}>
              Activar botones de WhatsApp
            </p>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: '#5a8ab0' }}>
              {config.whatsapp_activo
                ? 'Los botones de WhatsApp aparecerán en el detalle de cada cita.'
                : 'Los botones de WhatsApp estarán ocultos en el sistema.'}
            </p>
          </div>
        </div>

        {/* Nombre del remitente */}
        <div>
          <label
            htmlFor="email_remitente_nombre"
            style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#5a8ab0', marginBottom: 4 }}
          >
            Nombre del remitente
          </label>
          <input
            id="email_remitente_nombre"
            type="text"
            value={config.email_remitente_nombre}
            onChange={(e) => cambiar('email_remitente_nombre', e.target.value)}
            placeholder="Clínica Dental López"
            className="ct-input"
            style={{ maxWidth: 360 }}
          />
          <p style={{ margin: '4px 0 0', fontSize: 12, color: '#5a8ab0' }}>
            Aparecerá como remitente en los correos enviados al paciente.
          </p>
        </div>

      </Seccion>

      {/* ── Sección: Qué notificaciones enviar ── */}
      <Seccion titulo="¿Qué notificaciones enviar?">

        <FilaCheckbox
          id="enviar_confirmacion"
          label="Confirmación al agendar"
          checked={config.enviar_confirmacion}
          onChange={(v) => cambiar('enviar_confirmacion', v)}
        />

        <FilaCheckbox
          id="enviar_recordatorio_1"
          label="Recordatorio 1"
          checked={config.enviar_recordatorio_1}
          onChange={(v) => cambiar('enviar_recordatorio_1', v)}
        >
          {config.enviar_recordatorio_1 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
              <input
                type="number"
                min={1}
                max={168}
                value={config.horas_recordatorio_1}
                onChange={(e) =>
                  cambiar('horas_recordatorio_1', Math.max(1, parseInt(e.target.value) || 1))
                }
                style={{
                  width: 64, height: 32, padding: '0 8px', fontSize: 13,
                  border: '0.5px solid #c5ddf5', borderRadius: 8,
                  background: '#f0f7ff', color: '#0d3d6e', textAlign: 'center',
                  outline: 'none',
                }}
              />
              <span style={{ fontSize: 13, color: '#5a8ab0', whiteSpace: 'nowrap' }}>
                horas antes
              </span>
            </div>
          )}
        </FilaCheckbox>

        <FilaCheckbox
          id="enviar_recordatorio_2"
          label="Recordatorio 2"
          checked={config.enviar_recordatorio_2}
          onChange={(v) => cambiar('enviar_recordatorio_2', v)}
        >
          {config.enviar_recordatorio_2 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
              <input
                type="number"
                min={1}
                max={168}
                value={config.horas_recordatorio_2}
                onChange={(e) =>
                  cambiar('horas_recordatorio_2', Math.max(1, parseInt(e.target.value) || 1))
                }
                style={{
                  width: 64, height: 32, padding: '0 8px', fontSize: 13,
                  border: '0.5px solid #c5ddf5', borderRadius: 8,
                  background: '#f0f7ff', color: '#0d3d6e', textAlign: 'center',
                  outline: 'none',
                }}
              />
              <span style={{ fontSize: 13, color: '#5a8ab0', whiteSpace: 'nowrap' }}>
                horas antes
              </span>
            </div>
          )}
        </FilaCheckbox>

        <FilaCheckbox
          id="enviar_cancelacion"
          label="Cancelación de cita"
          checked={config.enviar_cancelacion}
          onChange={(v) => cambiar('enviar_cancelacion', v)}
        />

        <FilaCheckbox
          id="enviar_reprogramacion"
          label="Reprogramación de cita"
          checked={config.enviar_reprogramacion}
          onChange={(v) => cambiar('enviar_reprogramacion', v)}
        />

      </Seccion>

      {/* ── Sección: Disparar recordatorios ── */}
      <Seccion titulo="Disparar recordatorios">
        <p style={{ margin: '0 0 16px', fontSize: 13, color: '#5a8ab0', lineHeight: 1.6 }}>
          Ejecuta manualmente el proceso de recordatorios para todas las citas de las próximas 48 horas.
          Normalmente esto se realiza de forma automática mediante un cron job.
        </p>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <button
            onClick={dispararRecordatorios}
            disabled={disparando}
            className="ct-btn ct-btn-secondary"
            style={{ opacity: disparando ? 0.6 : 1 }}
          >
            {disparando ? 'Procesando...' : 'Enviar recordatorios pendientes'}
          </button>

          {resultadoDisparo && (
            <div style={{
              background: '#e8f4ff', border: '0.5px solid #c5ddf5', borderRadius: 8,
              padding: '8px 16px', fontSize: 13, color: '#0d3d6e',
            }}>
              Se procesaron <strong>{resultadoDisparo.procesadas}</strong> citas
              · Enviados: <strong style={{ color: '#0a5535' }}>{resultadoDisparo.enviadas}</strong>
              · Omitidos: <strong style={{ color: '#7a5500' }}>{resultadoDisparo.omitidas}</strong>
            </div>
          )}
        </div>
      </Seccion>

    </div>
  )
}
