'use client'

import { useState, useEffect, useRef, KeyboardEvent } from 'react'
import { supabase } from '@/lib/supabase'
import { EMPRESA_ID } from '@/lib/config'

// ── Tipos ──────────────────────────────────────────────────────────────────

interface Dentista {
  id: string
  nombre: string
  apellido: string | null
}

interface Tratamiento {
  id: string
  nombre: string
  duracion_min: number
  precio_base: number | null
  color: string | null
}

interface PacienteResultado {
  id: string
  primer_nombre: string
  segundo_nombre: string | null
  primer_apellido: string
  segundo_apellido: string | null
  dpi: string | null
}

interface DatosForm {
  dentista_id:      string
  tratamiento_id:   string
  fecha:            string
  hora:             string
  duracion_min:     string
  precio_acordado:  string
  notas_previas:    string
}

const ESTADO_FORM: DatosForm = {
  dentista_id:     '',
  tratamiento_id:  '',
  fecha:           '',
  hora:            '09:00',
  duracion_min:    '30',
  precio_acordado: '',
  notas_previas:   '',
}

// ── Helpers ────────────────────────────────────────────────────────────────

function nombrePaciente(p: PacienteResultado): string {
  return [p.primer_nombre, p.segundo_nombre, p.primer_apellido, p.segundo_apellido]
    .filter(Boolean).join(' ')
}

function generarHoras(): string[] {
  const horas: string[] = []
  for (let h = 8; h < 18; h++) {
    horas.push(`${String(h).padStart(2, '0')}:00`)
    horas.push(`${String(h).padStart(2, '0')}:30`)
  }
  return horas
}
const HORAS = generarHoras()

// ── Componente ─────────────────────────────────────────────────────────────

export default function ModalNuevaCita({
  onClose,
  onSuccess,
  pacientePrefijado,
  citaOrigenId,
}: {
  onClose: () => void
  onSuccess: () => void
  pacientePrefijado?: { id: string; nombre: string }
  citaOrigenId?: string
}) {
  const [dentistas, setDentistas]           = useState<Dentista[]>([])
  const [tratamientos, setTratamientos]     = useState<Tratamiento[]>([])
  const [sucursalId, setSucursalId]         = useState<string>('')
  const [datos, setDatos]                   = useState<DatosForm>(ESTADO_FORM)
  const [errores, setErrores]               = useState<Record<string, string>>({})
  const [guardando, setGuardando]           = useState(false)
  const [errorGeneral, setErrorGeneral]     = useState<string | null>(null)

  // Búsqueda de paciente — se omite si hay paciente pre-seleccionado
  const [busqueda, setBusqueda]             = useState(pacientePrefijado?.nombre ?? '')
  const [resultados, setResultados]         = useState<PacienteResultado[]>([])
  const [buscando, setBuscando]             = useState(false)
  const [mostrarResultados, setMostrarResultados] = useState(false)
  const [pacienteSeleccionado, setPacienteSeleccionado] = useState<PacienteResultado | null>(
    pacientePrefijado
      ? { id: pacientePrefijado.id, primer_nombre: pacientePrefijado.nombre,
          segundo_nombre: null, primer_apellido: '', segundo_apellido: null, dpi: null }
      : null
  )
  const busquedaRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inputBusquedaRef = useRef<HTMLInputElement>(null)

  // ── Carga inicial ─────────────────────────────────────────────────────

  useEffect(() => {
    async function cargarDatos() {
      const [resDentistas, resTratamientos, resSucursal] = await Promise.all([
        supabase.from('usuarios').select('id, nombre, apellido')
          .eq('empresa_id', EMPRESA_ID).eq('rol', 'dentista').eq('activo', true)
          .order('apellido'),
        supabase.from('tratamiento_tipos').select('id, nombre, duracion_min, precio_base, color')
          .eq('empresa_id', EMPRESA_ID).eq('activo', true).order('nombre'),
        supabase.from('sucursales').select('id')
          .eq('empresa_id', EMPRESA_ID).eq('activa', true).limit(1).single(),
      ])

      if (resDentistas.data)   setDentistas(resDentistas.data as Dentista[])
      if (resTratamientos.data) setTratamientos(resTratamientos.data as Tratamiento[])
      if (resSucursal.data)    setSucursalId(resSucursal.data.id)

      // Pre-seleccionar fecha de hoy
      setDatos((prev) => ({
        ...prev,
        fecha: new Date().toISOString().split('T')[0],
        dentista_id: resDentistas.data?.[0]?.id ?? '',
      }))
    }
    cargarDatos()
  }, [])

  // ── Búsqueda de paciente con debounce ─────────────────────────────────

  function manejarBusqueda(valor: string) {
    setBusqueda(valor)
    setPacienteSeleccionado(null)
    if (busquedaRef.current) clearTimeout(busquedaRef.current)

    if (!valor.trim()) {
      setResultados([])
      setMostrarResultados(false)
      return
    }

    busquedaRef.current = setTimeout(async () => {
      setBuscando(true)
      const termino = valor.trim()
      const { data } = await supabase
        .from('pacientes')
        .select('id, primer_nombre, segundo_nombre, primer_apellido, segundo_apellido, dpi')
        .eq('empresa_id', EMPRESA_ID)
        .or(
          `primer_nombre.ilike.%${termino}%,` +
          `primer_apellido.ilike.%${termino}%,` +
          `segundo_apellido.ilike.%${termino}%,` +
          `dpi.ilike.%${termino}%`
        )
        .limit(8)

      setBuscando(false)
      setResultados((data ?? []) as PacienteResultado[])
      setMostrarResultados(true)
    }, 300)
  }

  function seleccionarPaciente(p: PacienteResultado) {
    setPacienteSeleccionado(p)
    setBusqueda(nombrePaciente(p))
    setMostrarResultados(false)
    if (errores.paciente) setErrores((prev) => ({ ...prev, paciente: '' }))
  }

  // ── Cambios en el formulario ──────────────────────────────────────────

  function manejarCambio(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) {
    const { name, value } = e.target
    setDatos((prev) => ({ ...prev, [name]: value }))
    if (errores[name]) setErrores((prev) => ({ ...prev, [name]: '' }))

    // Auto-rellenar duración y precio al seleccionar tratamiento
    if (name === 'tratamiento_id' && value) {
      const t = tratamientos.find((t) => t.id === value)
      if (t) {
        setDatos((prev) => ({
          ...prev,
          tratamiento_id:  value,
          duracion_min:    String(t.duracion_min),
          precio_acordado: t.precio_base != null ? String(t.precio_base) : prev.precio_acordado,
        }))
      }
    }
  }

  // ── Validación ────────────────────────────────────────────────────────

  function validar(): boolean {
    const e: Record<string, string> = {}
    if (!pacienteSeleccionado) e.paciente = 'Seleccione un paciente'
    if (!datos.dentista_id)    e.dentista_id = 'Seleccione un dentista'
    if (!datos.fecha)          e.fecha = 'Seleccione una fecha'
    if (!datos.hora)           e.hora = 'Seleccione una hora'
    if (!datos.duracion_min || parseInt(datos.duracion_min) < 1)
      e.duracion_min = 'La duración debe ser mayor a 0'
    setErrores(e)
    return Object.keys(e).length === 0
  }

  // ── Guardar ───────────────────────────────────────────────────────────

  async function manejarGuardar(e: React.FormEvent) {
    e.preventDefault()
    setErrorGeneral(null)
    if (!validar() || !pacienteSeleccionado || !sucursalId) return

    setGuardando(true)
    try {
      const fechaHora = `${datos.fecha}T${datos.hora}:00`

      // Verificar disponibilidad del dentista
      const { data: disponible, error: errDisp } = await supabase
        .rpc('clinica_verificar_disponibilidad', {
          p_dentista_id:  datos.dentista_id,
          p_fecha_inicio: fechaHora,
          p_duracion_min: parseInt(datos.duracion_min),
          p_cita_excluir: null,
        })

      if (errDisp) {
        console.warn('Error al verificar disponibilidad:', errDisp)
        // Continuar si hay error en la verificación (no bloquear)
      } else if (disponible === false) {
        setErrorGeneral('El dentista ya tiene una cita en ese horario. Seleccione otro horario.')
        setGuardando(false)
        return
      }

      // Insertar cita
      const { data: nuevaCita, error } = await supabase.from('citas').insert([{
        empresa_id:      EMPRESA_ID,
        sucursal_id:     sucursalId,
        paciente_id:     pacienteSeleccionado.id,
        dentista_id:     datos.dentista_id,
        tratamiento_id:  datos.tratamiento_id  || null,
        fecha_hora:      fechaHora,
        duracion_min:    parseInt(datos.duracion_min),
        precio_acordado: datos.precio_acordado ? parseFloat(datos.precio_acordado) : null,
        notas_previas:   datos.notas_previas.trim() || null,
        estado:          'agendada',
        origen:          'sistema',
        cita_origen_id:  citaOrigenId || null,
      }]).select('id').single()

      if (error) throw error

      // Notificación fire-and-forget (no bloquea la UI)
      const tipoNotif = citaOrigenId ? 'reprogramacion' : 'confirmacion'
      fetch('/api/notificaciones/enviar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cita_id: nuevaCita.id, tipo: tipoNotif }),
      }).catch(() => {})

      onSuccess()
    } catch (err) {
      console.error('Error al agendar cita:', err)
      setErrorGeneral('Ocurrió un error al guardar. Por favor intente de nuevo.')
    } finally {
      setGuardando(false)
    }
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
      <div
        style={{
          background: '#ffffff', borderRadius: 16, width: '100%', maxWidth: 620,
          maxHeight: '90vh', overflowY: 'auto',
          border: '0.5px solid #c5ddf5',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '20px 24px 16px',
          borderBottom: '0.5px solid #e0eef8',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: '#0d3d6e', margin: 0 }}>
            Nueva Cita
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 20, color: '#5a8ab0', lineHeight: 1, padding: 4,
            }}
            aria-label="Cerrar"
          >
            ×
          </button>
        </div>

        {/* Cuerpo del formulario */}
        <form onSubmit={manejarGuardar} noValidate style={{ padding: '20px 24px' }}>

          {errorGeneral && (
            <div style={{
              background: '#fff0f0', border: '0.5px solid #e84040', borderRadius: 8,
              padding: '10px 14px', color: '#e84040', marginBottom: 20, fontSize: 14,
            }}>
              {errorGeneral}
            </div>
          )}

          {/* ── Paciente ── */}
          <div style={{ marginBottom: 16 }}>
            <label className={`ct-label${errores.paciente ? ' ct-label-req' : ''}`}>
              Paciente *
            </label>

            {/* Campo bloqueado cuando viene pre-seleccionado desde el perfil */}
            {pacientePrefijado ? (
              <div style={{
                height: 40, padding: '0 12px',
                background: '#f0f7ff', border: '0.5px solid #c5ddf5',
                borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <span style={{ fontSize: 14, color: '#5a8ab0' }}>🔒</span>
                <span style={{ fontSize: 14, color: '#0d3d6e', fontWeight: 500 }}>
                  {pacientePrefijado.nombre}
                </span>
              </div>
            ) : (
              <div style={{ position: 'relative' }}>
                <input
                  ref={inputBusquedaRef}
                  type="text"
                  value={busqueda}
                  onChange={(e) => manejarBusqueda(e.target.value)}
                  onFocus={() => { if (resultados.length > 0) setMostrarResultados(true) }}
                  onBlur={() => setTimeout(() => setMostrarResultados(false), 200)}
                  placeholder="Buscar por nombre o DPI..."
                  className={`ct-input${errores.paciente ? ' ct-error' : ''}`}
                />
                {buscando && (
                  <span style={{
                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                    fontSize: 12, color: '#5a8ab0',
                  }}>
                    Buscando...
                  </span>
                )}
                {mostrarResultados && resultados.length > 0 && (
                  <div style={{
                    position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10,
                    background: '#ffffff', border: '0.5px solid #c5ddf5',
                    borderRadius: 8, marginTop: 4, maxHeight: 220, overflowY: 'auto',
                  }}>
                    {resultados.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onMouseDown={() => seleccionarPaciente(p)}
                        style={{
                          display: 'block', width: '100%', textAlign: 'left',
                          padding: '10px 14px', background: 'none', border: 'none',
                          cursor: 'pointer', fontSize: 14, color: '#0d3d6e',
                          borderBottom: '0.5px solid #e0eef8',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = '#f0f7ff')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
                      >
                        <span style={{ fontWeight: 500 }}>{nombrePaciente(p)}</span>
                        {p.dpi && (
                          <span style={{ fontSize: 12, color: '#5a8ab0', marginLeft: 8 }}>
                            DPI: {p.dpi}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
                {mostrarResultados && resultados.length === 0 && busqueda.trim() && !buscando && (
                  <div style={{
                    position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10,
                    background: '#ffffff', border: '0.5px solid #c5ddf5',
                    borderRadius: 8, marginTop: 4, padding: '12px 14px',
                    fontSize: 13, color: '#5a8ab0',
                  }}>
                    No se encontraron pacientes con esa búsqueda.
                  </div>
                )}
              </div>
            )}
            {errores.paciente && <p className="ct-field-error">{errores.paciente}</p>}
          </div>

          {/* ── Dentista + Tratamiento ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4" style={{ marginBottom: 16 }}>
            <div>
              <label htmlFor="dentista_id" className={`ct-label${errores.dentista_id ? ' ct-label-req' : ''}`}>
                Dentista *
              </label>
              <select
                id="dentista_id" name="dentista_id"
                value={datos.dentista_id} onChange={manejarCambio}
                className={`ct-select${errores.dentista_id ? ' ct-error' : ''}`}
              >
                <option value="">Seleccione...</option>
                {dentistas.map((d) => (
                  <option key={d.id} value={d.id}>
                    Dr(a). {d.nombre} {d.apellido ?? ''}
                  </option>
                ))}
              </select>
              {errores.dentista_id && <p className="ct-field-error">{errores.dentista_id}</p>}
            </div>

            <div>
              <label htmlFor="tratamiento_id" className="ct-label">Tratamiento</label>
              <select
                id="tratamiento_id" name="tratamiento_id"
                value={datos.tratamiento_id} onChange={manejarCambio} className="ct-select"
              >
                <option value="">Sin especificar</option>
                {tratamientos.map((t) => (
                  <option key={t.id} value={t.id}>{t.nombre}</option>
                ))}
              </select>
            </div>
          </div>

          {/* ── Fecha + Hora ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4" style={{ marginBottom: 16 }}>
            <div>
              <label htmlFor="fecha" className={`ct-label${errores.fecha ? ' ct-label-req' : ''}`}>
                Fecha *
              </label>
              <input
                id="fecha" name="fecha" type="date"
                value={datos.fecha} onChange={manejarCambio}
                className={`ct-input${errores.fecha ? ' ct-error' : ''}`}
              />
              {errores.fecha && <p className="ct-field-error">{errores.fecha}</p>}
            </div>

            <div>
              <label htmlFor="hora" className={`ct-label${errores.hora ? ' ct-label-req' : ''}`}>
                Hora *
              </label>
              <select
                id="hora" name="hora"
                value={datos.hora} onChange={manejarCambio}
                className={`ct-select${errores.hora ? ' ct-error' : ''}`}
              >
                {HORAS.map((h) => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
              {errores.hora && <p className="ct-field-error">{errores.hora}</p>}
            </div>
          </div>

          {/* ── Duración + Precio ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4" style={{ marginBottom: 16 }}>
            <div>
              <label htmlFor="duracion_min" className={`ct-label${errores.duracion_min ? ' ct-label-req' : ''}`}>
                Duración (minutos) *
              </label>
              <input
                id="duracion_min" name="duracion_min" type="number"
                value={datos.duracion_min} onChange={manejarCambio}
                min={5} max={480} step={5}
                className={`ct-input${errores.duracion_min ? ' ct-error' : ''}`}
              />
              {errores.duracion_min && <p className="ct-field-error">{errores.duracion_min}</p>}
            </div>

            <div>
              <label htmlFor="precio_acordado" className="ct-label">Precio acordado (Q)</label>
              <input
                id="precio_acordado" name="precio_acordado" type="number"
                value={datos.precio_acordado} onChange={manejarCambio}
                min={0} step={0.01} placeholder="0.00"
                className="ct-input"
              />
            </div>
          </div>

          {/* ── Notas previas ── */}
          <div style={{ marginBottom: 24 }}>
            <label htmlFor="notas_previas" className="ct-label">Notas previas</label>
            <textarea
              id="notas_previas" name="notas_previas"
              value={datos.notas_previas} onChange={manejarCambio}
              placeholder="Motivo de la consulta, indicaciones especiales..."
              className="ct-textarea" rows={3}
            />
          </div>

          {/* ── Acciones ── */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
            <button
              type="button" className="ct-btn ct-btn-secondary"
              onClick={onClose} disabled={guardando}
            >
              Cancelar
            </button>
            <button
              type="submit" className="ct-btn ct-btn-primary"
              disabled={guardando}
            >
              {guardando ? 'Guardando...' : 'Agendar Cita'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
