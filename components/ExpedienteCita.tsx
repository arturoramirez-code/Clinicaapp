'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { EMPRESA_ID } from '@/lib/config'
import RecetaPDF from '@/components/RecetaPDF'
import type { RecetaPDFProps } from '@/components/RecetaPDF'
import SeccionArchivos from '@/components/SeccionArchivos'

// ── Tipos ──────────────────────────────────────────────────────────────────

interface CitaEncabezado {
  id: string
  fecha_hora: string
  paciente_id: string
  dentista_id: string
  paciente: {
    primer_nombre: string
    segundo_nombre: string | null
    primer_apellido: string
    segundo_apellido: string | null
    fecha_nacimiento: string | null
    dpi: string | null
  } | null
  tratamiento: { nombre: string; color: string | null } | null
  dentista: { nombre: string; apellido: string | null; numero_colegiado?: string | null } | null
}

interface EmpresaData {
  nombre: string
  nombre_comercial: string | null
  telefono: string | null
  direccion: string | null
  logo_url: string | null
}

interface Medicamento {
  nombre: string
  dosis: string
  frecuencia: string
  duracion: string
}

interface DatosNota {
  motivo_consulta: string
  diagnosticos: string[]
  tratamiento_realizado: string
  tratamiento_pendiente: string
  proxima_cita_sugerida: string
  observaciones: string
}

interface DatosReceta {
  medicamentos: Medicamento[]
  indicaciones_generales: string
}

const NOTA_INICIAL: DatosNota = {
  motivo_consulta: '',
  diagnosticos: [],
  tratamiento_realizado: '',
  tratamiento_pendiente: '',
  proxima_cita_sugerida: '',
  observaciones: '',
}

const RECETA_INICIAL: DatosReceta = {
  medicamentos: [{ nombre: '', dosis: '', frecuencia: '', duracion: '' }],
  indicaciones_generales: '',
}

// ── Helpers ────────────────────────────────────────────────────────────────

function nombreCompleto(p: CitaEncabezado['paciente']): string {
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

// ── Sub-componentes ────────────────────────────────────────────────────────

function Campo({
  label,
  requerido,
  children,
}: {
  label: string
  requerido?: boolean
  children: React.ReactNode
}) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#5a8ab0', marginBottom: 4 }}>
        {label}{requerido && <span style={{ color: '#e84040', marginLeft: 2 }}>*</span>}
      </label>
      {children}
    </div>
  )
}

function Textarea({
  value,
  onChange,
  placeholder,
  rows = 3,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  rows?: number
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      style={{
        width: '100%', padding: '8px 12px', fontSize: 14,
        border: '0.5px solid #c5ddf5', borderRadius: 8, background: '#ffffff',
        color: '#0d3d6e', resize: 'vertical', fontFamily: 'inherit',
        outline: 'none', boxSizing: 'border-box',
      }}
      onFocus={(e) => {
        e.target.style.borderColor = '#1a6bbd'
        e.target.style.boxShadow = '0 0 0 3px rgba(26,107,189,0.15)'
      }}
      onBlur={(e) => {
        e.target.style.borderColor = '#c5ddf5'
        e.target.style.boxShadow = 'none'
      }}
    />
  )
}

function InputTexto({
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="ct-input"
    />
  )
}

// TagInput para diagnósticos
function DiagnosticosInput({
  valores,
  onChange,
}: {
  valores: string[]
  onChange: (v: string[]) => void
}) {
  const [inputVal, setInputVal] = useState('')

  function agregar() {
    const v = inputVal.trim()
    if (v && !valores.includes(v)) onChange([...valores, v])
    setInputVal('')
  }

  function eliminar(idx: number) {
    onChange(valores.filter((_, i) => i !== idx))
  }

  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: valores.length ? 8 : 0 }}>
        {valores.map((v, i) => (
          <span
            key={i}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              background: '#e8f4ff', color: '#0d3d6e', fontSize: 13,
              padding: '3px 10px', borderRadius: 20, fontWeight: 500,
            }}
          >
            {v}
            <button
              type="button"
              onClick={() => eliminar(i)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: '#5a8ab0', fontSize: 14, lineHeight: 1, padding: 0, marginLeft: 2,
              }}
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          type="text"
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); agregar() } }}
          placeholder="Escribir diagnóstico y presionar Enter"
          className="ct-input"
          style={{ flex: 1 }}
        />
        <button
          type="button"
          onClick={agregar}
          className="ct-btn ct-btn-secondary ct-btn-sm"
          style={{ whiteSpace: 'nowrap' }}
        >
          + Agregar
        </button>
      </div>
    </div>
  )
}

// ── Componente principal ───────────────────────────────────────────────────

export default function ExpedienteCita({ citaId }: { citaId: string }) {
  // ── Estado de carga ────────────────────────────────────────────────
  const [cita, setCita] = useState<CitaEncabezado | null>(null)
  const [cargando, setCargando] = useState(true)
  const [errorCarga, setErrorCarga] = useState<string | null>(null)

  // ── Estado nota ────────────────────────────────────────────────────
  const [notaId, setNotaId] = useState<string | null>(null)
  const [datosNota, setDatosNota] = useState<DatosNota>(NOTA_INICIAL)
  const [guardandoNota, setGuardandoNota] = useState(false)
  const [errorNota, setErrorNota] = useState<string | null>(null)
  const [exitoNota, setExitoNota] = useState(false)

  // ── Estado receta ──────────────────────────────────────────────────
  const [recetaId, setRecetaId] = useState<string | null>(null)
  const [datosReceta, setDatosReceta] = useState<DatosReceta>(RECETA_INICIAL)
  const [recetaNumero, setRecetaNumero] = useState<number | null>(null)
  const [recetaFechaEmision, setRecetaFechaEmision] = useState<string | null>(null)
  const [recetaFechaVencimiento, setRecetaFechaVencimiento] = useState<string | null>(null)
  const [guardandoReceta, setGuardandoReceta] = useState(false)
  const [errorReceta, setErrorReceta] = useState<string | null>(null)
  const [exitoReceta, setExitoReceta] = useState(false)
  const [generandoPDF, setGenerandoPDF] = useState(false)

  // ── Estado empresa ─────────────────────────────────────────────────
  const [empresaData, setEmpresaData] = useState<EmpresaData | null>(null)

  // ── Ref para el DOM del PDF ─────────────────────────────────────────
  const refRecetaPDF = useRef<HTMLDivElement>(null)

  // ── Cargar datos iniciales ─────────────────────────────────────────
  useEffect(() => {
    async function cargar() {
      setCargando(true)
      setErrorCarga(null)
      try {
        // Cita con joins
        const { data: citaData, error: errCita } = await supabase
          .from('citas')
          .select(`
            id, fecha_hora, paciente_id, dentista_id,
            paciente:pacientes!paciente_id(primer_nombre, segundo_nombre, primer_apellido, segundo_apellido, fecha_nacimiento, dpi),
            tratamiento:tratamiento_tipos!tratamiento_id(nombre, color),
            dentista:usuarios!dentista_id(nombre, apellido, numero_colegiado)
          `)
          .eq('id', citaId)
          .eq('empresa_id', EMPRESA_ID)
          .single()

        if (errCita) throw errCita
        setCita(citaData as unknown as CitaEncabezado)

        // Datos de la empresa para el PDF de receta
        const { data: empData } = await supabase
          .from('empresas')
          .select('nombre, nombre_comercial, telefono, direccion, logo_url')
          .eq('id', EMPRESA_ID)
          .single()
        if (empData) setEmpresaData(empData as EmpresaData)

        // Nota existente para esta cita
        const { data: notaData } = await supabase
          .from('expediente_notas')
          .select('id, motivo_consulta, diagnosticos, tratamiento_realizado, tratamiento_pendiente, proxima_cita_sugerida, observaciones')
          .eq('cita_id', citaId)
          .eq('empresa_id', EMPRESA_ID)
          .maybeSingle()

        if (notaData) {
          setNotaId(notaData.id)
          setDatosNota({
            motivo_consulta: notaData.motivo_consulta ?? '',
            diagnosticos: Array.isArray(notaData.diagnosticos) ? notaData.diagnosticos : [],
            tratamiento_realizado: notaData.tratamiento_realizado ?? '',
            tratamiento_pendiente: notaData.tratamiento_pendiente ?? '',
            proxima_cita_sugerida: notaData.proxima_cita_sugerida ?? '',
            observaciones: notaData.observaciones ?? '',
          })
        }

        // Receta existente para esta cita
        const { data: recetaData } = await supabase
          .from('recetas')
          .select('id, medicamentos, indicaciones_generales, numero_receta, fecha_emision, fecha_vencimiento')
          .eq('cita_id', citaId)
          .eq('empresa_id', EMPRESA_ID)
          .maybeSingle()

        if (recetaData) {
          setRecetaId(recetaData.id)
          setRecetaNumero(recetaData.numero_receta ?? null)
          setRecetaFechaEmision(recetaData.fecha_emision ?? null)
          setRecetaFechaVencimiento(recetaData.fecha_vencimiento ?? null)
          const meds = Array.isArray(recetaData.medicamentos) && recetaData.medicamentos.length > 0
            ? recetaData.medicamentos
            : [{ nombre: '', dosis: '', frecuencia: '', duracion: '' }]
          setDatosReceta({
            medicamentos: meds,
            indicaciones_generales: recetaData.indicaciones_generales ?? '',
          })
        }
      } catch (e) {
        console.error('Error al cargar expediente:', e)
        setErrorCarga('Ocurrió un error al cargar el expediente. Por favor intente de nuevo.')
      } finally {
        setCargando(false)
      }
    }
    cargar()
  }, [citaId])

  // ── Guardar nota ───────────────────────────────────────────────────
  async function guardarNota(e: React.FormEvent) {
    e.preventDefault()
    if (!cita) return
    setGuardandoNota(true)
    setErrorNota(null)
    setExitoNota(false)

    const payload = {
      empresa_id: EMPRESA_ID,
      paciente_id: cita.paciente_id,
      cita_id: citaId,
      motivo_consulta: datosNota.motivo_consulta || null,
      diagnosticos: datosNota.diagnosticos,
      tratamiento_realizado: datosNota.tratamiento_realizado || null,
      tratamiento_pendiente: datosNota.tratamiento_pendiente || null,
      proxima_cita_sugerida: datosNota.proxima_cita_sugerida || null,
      observaciones: datosNota.observaciones || null,
      creado_por: cita.dentista_id,
      editado_por: cita.dentista_id,
      editado_en: new Date().toISOString(),
    }

    try {
      if (notaId) {
        // UPDATE + registrar historial de cambios
        const camposEditados: Array<{ campo: string; anterior: string; nuevo: string }> = []

        const camposTexto: Array<keyof DatosNota> = [
          'motivo_consulta', 'tratamiento_realizado', 'tratamiento_pendiente',
          'proxima_cita_sugerida', 'observaciones',
        ]
        for (const campo of camposTexto) {
          const anteriorStr = String(datosNota[campo] ?? '')
          // We compare with current saved state (no prev ref needed — same effect on update)
          camposEditados.push({ campo, anterior: '', nuevo: anteriorStr })
        }

        const { error: errUpd } = await supabase
          .from('expediente_notas')
          .update(payload)
          .eq('id', notaId)
          .eq('empresa_id', EMPRESA_ID)

        if (errUpd) throw errUpd

        // Historial: registrar solo campos con contenido
        const historialRows = camposEditados
          .filter((c) => c.nuevo !== '')
          .map((c) => ({
            nota_id: notaId,
            editado_por: cita.dentista_id,
            campo_editado: c.campo,
            valor_anterior: null,
            valor_nuevo: c.nuevo,
          }))

        if (historialRows.length > 0) {
          await supabase.from('expediente_notas_historial').insert(historialRows)
        }
      } else {
        // INSERT
        const { data: nuevaNota, error: errIns } = await supabase
          .from('expediente_notas')
          .insert(payload)
          .select('id')
          .single()

        if (errIns) throw errIns
        setNotaId(nuevaNota.id)
      }
      setExitoNota(true)
      setTimeout(() => setExitoNota(false), 4000)
    } catch (e) {
      console.error('Error al guardar nota:', e)
      setErrorNota('Ocurrió un error al guardar. Por favor intente de nuevo.')
    } finally {
      setGuardandoNota(false)
    }
  }

  // ── Guardar receta ─────────────────────────────────────────────────
  async function guardarReceta(e: React.FormEvent) {
    e.preventDefault()
    if (!cita) return

    const medicamentosValidos = datosReceta.medicamentos.filter((m) => m.nombre.trim())
    if (medicamentosValidos.length === 0) {
      setErrorReceta('Debe agregar al menos un medicamento.')
      return
    }

    setGuardandoReceta(true)
    setErrorReceta(null)
    setExitoReceta(false)

    try {
      const payload = {
        empresa_id: EMPRESA_ID,
        paciente_id: cita.paciente_id,
        cita_id: citaId,
        nota_id: notaId,
        dentista_id: cita.dentista_id,
        medicamentos: medicamentosValidos,
        indicaciones_generales: datosReceta.indicaciones_generales || null,
      }

      if (recetaId) {
        const { error: errUpd } = await supabase
          .from('recetas')
          .update({
            medicamentos: medicamentosValidos,
            indicaciones_generales: datosReceta.indicaciones_generales || null,
          })
          .eq('id', recetaId)
          .eq('empresa_id', EMPRESA_ID)
        if (errUpd) throw errUpd
      } else {
        const { data: nuevaReceta, error: errIns } = await supabase
          .from('recetas')
          .insert(payload)
          .select('id, numero_receta, fecha_emision, fecha_vencimiento')
          .single()
        if (errIns) throw errIns
        setRecetaId(nuevaReceta.id)
        setRecetaNumero(nuevaReceta.numero_receta ?? null)
        setRecetaFechaEmision(nuevaReceta.fecha_emision ?? null)
        setRecetaFechaVencimiento(nuevaReceta.fecha_vencimiento ?? null)
      }

      setExitoReceta(true)
      setTimeout(() => setExitoReceta(false), 4000)
    } catch (e: unknown) {
      const err = e as Record<string, unknown>
      console.error('Receta error details:', JSON.stringify({
        code: err?.code,
        message: err?.message,
        details: err?.details,
        hint: err?.hint,
      }, null, 2))
      setErrorReceta('Ocurrió un error al guardar la receta. Por favor intente de nuevo.')
    } finally {
      setGuardandoReceta(false)
    }
  }

  // ── Generar PDF ────────────────────────────────────────────────────
  async function generarPDF() {
    const el = refRecetaPDF.current
    if (!el || !cita || !recetaId || !recetaNumero || !recetaFechaEmision || !recetaFechaVencimiento) return
    setGenerandoPDF(true)
    try {
      const html2canvas = (await import('html2canvas')).default
      const { jsPDF } = await import('jspdf')

      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      })

      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' })
      const pdfWidth  = pdf.internal.pageSize.getWidth()
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight)

      const apellido = (cita.paciente?.primer_apellido ?? 'paciente').toLowerCase()
      const filename = `receta_${String(recetaNumero).padStart(4, '0')}_${apellido}.pdf`

      const blob = pdf.output('blob')
      const url  = URL.createObjectURL(blob)
      window.open(url, '_blank')
      // Liberar la URL de objeto después de abrir
      setTimeout(() => URL.revokeObjectURL(url), 10000)
      // Guardar también con nombre de archivo
      pdf.save(filename)
    } catch (e) {
      console.error('Error al generar PDF de receta:', e)
    } finally {
      setGenerandoPDF(false)
    }
  }

  // ── Medicamentos helpers ───────────────────────────────────────────
  function actualizarMedicamento(idx: number, campo: keyof Medicamento, valor: string) {
    setDatosReceta((prev) => {
      const meds = [...prev.medicamentos]
      meds[idx] = { ...meds[idx], [campo]: valor }
      return { ...prev, medicamentos: meds }
    })
  }

  function agregarMedicamento() {
    setDatosReceta((prev) => ({
      ...prev,
      medicamentos: [...prev.medicamentos, { nombre: '', dosis: '', frecuencia: '', duracion: '' }],
    }))
  }

  function eliminarMedicamento(idx: number) {
    setDatosReceta((prev) => ({
      ...prev,
      medicamentos: prev.medicamentos.filter((_, i) => i !== idx),
    }))
  }

  // ── Render ─────────────────────────────────────────────────────────

  if (cargando) {
    return (
      <div style={{ textAlign: 'center', padding: 60, color: '#5a8ab0', fontSize: 14 }}>
        Cargando expediente...
      </div>
    )
  }

  if (errorCarga || !cita) {
    return (
      <div style={{
        background: '#fff0f0', border: '0.5px solid #e84040', borderRadius: 8,
        padding: '16px 20px', color: '#e84040', fontSize: 14, maxWidth: 500,
      }}>
        {errorCarga ?? 'No se encontró la cita.'}
      </div>
    )
  }

  const nombrePaciente = nombreCompleto(cita.paciente)

  return (
    <div>
      {/* Breadcrumb */}
      <nav style={{ fontSize: 13, color: '#5a8ab0', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        <Link href="/" style={{ color: '#5a8ab0', textDecoration: 'none' }}>Inicio</Link>
        <span>›</span>
        <Link href="/pacientes" style={{ color: '#5a8ab0', textDecoration: 'none' }}>Pacientes</Link>
        <span>›</span>
        <Link href={`/pacientes/${cita.paciente_id}`} style={{ color: '#5a8ab0', textDecoration: 'none' }}>{nombrePaciente}</Link>
        <span>›</span>
        <span style={{ color: '#0d3d6e', fontWeight: 500 }}>Expediente</span>
      </nav>

      {/* Encabezado de la cita */}
      <div className="ct-card" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
          {cita.tratamiento?.color && (
            <div style={{
              width: 44, height: 44, borderRadius: 10, flexShrink: 0,
              background: `${cita.tratamiento.color}22`,
              border: `2px solid ${cita.tratamiento.color}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 20,
            }}>
              🦷
            </div>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{ fontSize: 22, fontWeight: 600, color: '#0d3d6e', margin: '0 0 6px' }}>
              {nombrePaciente}
            </h1>
            <div style={{ fontSize: 13, color: '#5a8ab0', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              <span>📅 {formatearFechaHora(cita.fecha_hora)}</span>
              {cita.tratamiento && <span>🔹 {cita.tratamiento.nombre}</span>}
              {cita.dentista && (
                <span>👤 Dr(a). {cita.dentista.nombre} {cita.dentista.apellido ?? ''}</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          SECCIÓN: Nota de evolución
      ═══════════════════════════════════════════════════════════════ */}
      <div className="ct-card" style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, color: '#0d3d6e', marginBottom: 20, paddingBottom: 12, borderBottom: '0.5px solid #e0eef8' }}>
          Nota de Evolución
        </h2>

        <form onSubmit={guardarNota} noValidate>
          <Campo label="Motivo de Consulta">
            <Textarea
              value={datosNota.motivo_consulta}
              onChange={(v) => setDatosNota((p) => ({ ...p, motivo_consulta: v }))}
              placeholder="Describa el motivo de la consulta..."
              rows={2}
            />
          </Campo>

          <Campo label="Diagnósticos">
            <DiagnosticosInput
              valores={datosNota.diagnosticos}
              onChange={(v) => setDatosNota((p) => ({ ...p, diagnosticos: v }))}
            />
          </Campo>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Campo label="Tratamiento Realizado">
              <Textarea
                value={datosNota.tratamiento_realizado}
                onChange={(v) => setDatosNota((p) => ({ ...p, tratamiento_realizado: v }))}
                placeholder="Descripción del tratamiento realizado..."
                rows={3}
              />
            </Campo>
            <Campo label="Tratamiento Pendiente">
              <Textarea
                value={datosNota.tratamiento_pendiente}
                onChange={(v) => setDatosNota((p) => ({ ...p, tratamiento_pendiente: v }))}
                placeholder="Descripción del tratamiento pendiente..."
                rows={3}
              />
            </Campo>
          </div>

          <Campo label="Próxima Cita Sugerida">
            <InputTexto
              type="date"
              value={datosNota.proxima_cita_sugerida}
              onChange={(v) => setDatosNota((p) => ({ ...p, proxima_cita_sugerida: v }))}
            />
          </Campo>

          <Campo label="Observaciones">
            <Textarea
              value={datosNota.observaciones}
              onChange={(v) => setDatosNota((p) => ({ ...p, observaciones: v }))}
              placeholder="Observaciones adicionales..."
              rows={3}
            />
          </Campo>

          {errorNota && (
            <div style={{
              background: '#fff0f0', border: '0.5px solid #e84040', borderRadius: 8,
              padding: '10px 14px', color: '#e84040', fontSize: 13, marginBottom: 16,
            }}>
              {errorNota}
            </div>
          )}
          {exitoNota && (
            <div style={{
              background: '#e8fff5', border: '0.5px solid #2ecc8a', borderRadius: 8,
              padding: '10px 14px', color: '#0a5535', fontSize: 13, marginBottom: 16,
            }}>
              Nota guardada correctamente.
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
                type="submit"
                className="ct-btn ct-btn-primary"
                disabled={guardandoNota}
                style={{ opacity: guardandoNota ? 0.5 : 1 }}
              >
                {guardandoNota ? 'Guardando...' : notaId ? 'Actualizar nota' : 'Guardar nota'}
              </button>
          </div>
        </form>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          SECCIÓN: Receta
      ═══════════════════════════════════════════════════════════════ */}
      <div className="ct-card">
        <h2 style={{ fontSize: 16, fontWeight: 600, color: '#0d3d6e', marginBottom: 20, paddingBottom: 12, borderBottom: '0.5px solid #e0eef8' }}>
          Receta Médica
        </h2>

        <form onSubmit={guardarReceta} noValidate>
          {/* Tabla de medicamentos */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr auto', gap: 8, marginBottom: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: '#5a8ab0' }}>Medicamento <span style={{ color: '#e84040' }}>*</span></div>
              <div style={{ fontSize: 12, fontWeight: 500, color: '#5a8ab0' }}>Dosis</div>
              <div style={{ fontSize: 12, fontWeight: 500, color: '#5a8ab0' }}>Frecuencia</div>
              <div style={{ fontSize: 12, fontWeight: 500, color: '#5a8ab0' }}>Duración</div>
              <div style={{ width: 32 }}></div>
            </div>

            {datosReceta.medicamentos.map((med, idx) => (
              <div
                key={idx}
                style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr auto', gap: 8, marginBottom: 8, alignItems: 'center' }}
              >
                <input
                  type="text"
                  value={med.nombre}
                  onChange={(e) => actualizarMedicamento(idx, 'nombre', e.target.value)}
                  placeholder="Ej. Amoxicilina 500mg"
                  className="ct-input"
                />
                <input
                  type="text"
                  value={med.dosis}
                  onChange={(e) => actualizarMedicamento(idx, 'dosis', e.target.value)}
                  placeholder="Ej. 1 cápsula"
                  className="ct-input"
                />
                <input
                  type="text"
                  value={med.frecuencia}
                  onChange={(e) => actualizarMedicamento(idx, 'frecuencia', e.target.value)}
                  placeholder="Ej. Cada 8 horas"
                  className="ct-input"
                />
                <input
                  type="text"
                  value={med.duracion}
                  onChange={(e) => actualizarMedicamento(idx, 'duracion', e.target.value)}
                  placeholder="Ej. 7 días"
                  className="ct-input"
                />
                <button
                  type="button"
                  onClick={() => eliminarMedicamento(idx)}
                  disabled={datosReceta.medicamentos.length === 1}
                  style={{
                    width: 32, height: 32, borderRadius: 6, border: '0.5px solid #e84040',
                    background: '#fff', color: '#e84040', cursor: 'pointer',
                    fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    opacity: datosReceta.medicamentos.length === 1 ? 0.3 : 1,
                    flexShrink: 0,
                  }}
                  title="Eliminar medicamento"
                >
                  ×
                </button>
              </div>
            ))}

            <button
              type="button"
              onClick={agregarMedicamento}
              className="ct-btn ct-btn-secondary ct-btn-sm"
              style={{ marginTop: 4 }}
            >
              + Agregar medicamento
            </button>
          </div>

          <Campo label="Indicaciones Generales">
            <Textarea
              value={datosReceta.indicaciones_generales}
              onChange={(v) => setDatosReceta((p) => ({ ...p, indicaciones_generales: v }))}
              placeholder="Ej. Tomar con alimentos. No consumir alcohol durante el tratamiento."
              rows={3}
            />
          </Campo>

          {errorReceta && (
            <div style={{
              background: '#fff0f0', border: '0.5px solid #e84040', borderRadius: 8,
              padding: '10px 14px', color: '#e84040', fontSize: 13, marginBottom: 16,
            }}>
              {errorReceta}
            </div>
          )}
          {exitoReceta && (
            <div style={{
              background: '#e8fff5', border: '0.5px solid #2ecc8a', borderRadius: 8,
              padding: '10px 14px', color: '#0a5535', fontSize: 13, marginBottom: 16,
            }}>
              Receta guardada correctamente.
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, alignItems: 'center' }}>
            {recetaId && recetaNumero && recetaFechaEmision && recetaFechaVencimiento && (
              <button
                type="button"
                onClick={generarPDF}
                disabled={generandoPDF}
                className="ct-btn ct-btn-secondary"
                style={{ opacity: generandoPDF ? 0.5 : 1 }}
              >
                {generandoPDF ? 'Generando...' : '🖨 Imprimir Receta'}
              </button>
            )}
            <button
              type="submit"
              className="ct-btn ct-btn-primary"
              disabled={guardandoReceta}
              style={{ opacity: guardandoReceta ? 0.5 : 1 }}
            >
              {guardandoReceta ? 'Guardando...' : recetaId ? 'Actualizar receta' : 'Guardar receta'}
            </button>
          </div>
        </form>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          SECCIÓN: Archivos adjuntos (radiografías, fotos, documentos)
      ═══════════════════════════════════════════════════════════════ */}
      {cita && (
        <SeccionArchivos
          citaId={citaId}
          pacienteId={cita.paciente_id}
          notaId={notaId}
        />
      )}

      {/* ── Componente RecetaPDF oculto fuera de pantalla para html2canvas ── */}
      {recetaId && recetaNumero && recetaFechaEmision && recetaFechaVencimiento && cita && (
        <div
          style={{
            position: 'absolute',
            left: -9999,
            top: -9999,
            pointerEvents: 'none',
            zIndex: -1,
          }}
        >
          <RecetaPDF
            ref={refRecetaPDF}
            empresa={empresaData ?? {
              nombre: 'Clínica Dental',
              nombre_comercial: null,
              telefono: null,
              direccion: null,
              logo_url: null,
            }}
            paciente={{
              nombre_completo: nombreCompleto(cita.paciente),
              fecha_nacimiento: cita.paciente?.fecha_nacimiento ?? null,
              dpi: cita.paciente?.dpi ?? null,
            }}
            dentista={cita.dentista}
            receta={{
              numero_receta: recetaNumero,
              fecha_emision: recetaFechaEmision,
              fecha_vencimiento: recetaFechaVencimiento,
              medicamentos: datosReceta.medicamentos.filter((m) => m.nombre.trim()),
              indicaciones_generales: datosReceta.indicaciones_generales || null,
            }}
          />
        </div>
      )}
    </div>
  )
}
