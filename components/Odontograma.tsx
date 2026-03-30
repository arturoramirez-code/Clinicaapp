'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { EMPRESA_ID } from '@/lib/config'

// ── Constantes de layout FDI ────────────────────────────────────────────────

// Superior: cuadrante 1 (derecha del paciente, izquierda del visor) + cuadrante 2
const DIENTES_SUPERIOR: number[] = [18,17,16,15,14,13,12,11, 21,22,23,24,25,26,27,28]
// Inferior: cuadrante 4 (derecha del paciente) + cuadrante 3
const DIENTES_INFERIOR: number[] = [48,47,46,45,44,43,42,41, 31,32,33,34,35,36,37,38]

type Cara = 'vestibular' | 'lingual' | 'mesial' | 'distal' | 'oclusal'

// ── Tipos ───────────────────────────────────────────────────────────────────

interface CondicionCatalogo {
  id: string
  codigo: string
  nombre: string
  color_hex: string
  aplica_cara: boolean
  orden: number
}

interface DienteState {
  id: string
  condicion_general: string | null
  cara_vestibular: string | null
  cara_lingual: string | null
  cara_mesial: string | null
  cara_distal: string | null
  cara_oclusal: string | null
  nota: string | null
}

interface PopoverState {
  dienteNum: number
  cara: Cara
  x: number
  y: number
}

const CAMPO_CARA: Record<Cara, keyof DienteState> = {
  vestibular: 'cara_vestibular',
  lingual:    'cara_lingual',
  mesial:     'cara_mesial',
  distal:     'cara_distal',
  oclusal:    'cara_oclusal',
}

// ── Helper colores ──────────────────────────────────────────────────────────

const COLOR_SANO = '#639922'
const COLOR_AUSENTE = '#888780'

function getColorDiente(
  diente: DienteState,
  cara: Cara,
  catalogo: CondicionCatalogo[]
): string {
  const buscar = (cod: string | null) =>
    cod ? (catalogo.find((c) => c.codigo === cod)?.color_hex ?? COLOR_SANO) : COLOR_SANO

  if (diente.condicion_general) return buscar(diente.condicion_general)
  const campo = CAMPO_CARA[cara]
  return buscar(diente[campo] as string | null)
}

function esTodoAusente(diente: DienteState): boolean {
  return diente.condicion_general === 'AUSENTE'
}

// ── SVG de un diente ────────────────────────────────────────────────────────
// flip=true: dientes inferiores (lingual arriba, vestibular abajo)

function ToothSVG({
  dienteNum,
  diente,
  catalogo,
  flip,
  onFaceClick,
}: {
  dienteNum: number
  diente: DienteState | undefined
  catalogo: CondicionCatalogo[]
  flip: boolean
  onFaceClick: (cara: Cara, e: React.MouseEvent) => void
}) {
  const vacio: DienteState = {
    id: '', condicion_general: null, cara_vestibular: null,
    cara_lingual: null, cara_mesial: null, cara_distal: null, cara_oclusal: null,
    nota: null,
  }
  const d = diente ?? vacio
  const ausente = esTodoAusente(d)

  const col = (cara: Cara) => getColorDiente(d, cara, catalogo)

  // Posiciones Y para caras principales
  const yV = flip ? 38 : 0     // vestibular
  const yL = flip ? 0  : 38    // lingual

  const STROKE = '#ffffff'
  const SW = 1.5

  const faceStyle: React.CSSProperties = { cursor: 'pointer' }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 50 }}>
      {/* Número del diente — superior (encima del SVG) */}
      <div style={{ fontSize: 10, color: flip ? 'transparent' : '#5a8ab0', marginBottom: 2, fontWeight: 500, height: 14, lineHeight: '14px' }}>
        {dienteNum}
      </div>

      <svg
        width={50}
        height={52}
        viewBox="0 0 50 52"
        style={{ display: 'block', overflow: 'hidden' }}
      >
        {/* Vestibular */}
        <rect
          x={14} y={yV} width={22} height={14}
          fill={col('vestibular')}
          stroke={STROKE} strokeWidth={SW} rx={2}
          style={faceStyle}
          onClick={(e) => onFaceClick('vestibular', e)}
        />
        {/* Mesial */}
        <rect
          x={0} y={16} width={12} height={20}
          fill={col('mesial')}
          stroke={STROKE} strokeWidth={SW} rx={2}
          style={faceStyle}
          onClick={(e) => onFaceClick('mesial', e)}
        />
        {/* Oclusal */}
        <rect
          x={14} y={16} width={22} height={20}
          fill={col('oclusal')}
          stroke={STROKE} strokeWidth={SW} rx={2}
          style={faceStyle}
          onClick={(e) => onFaceClick('oclusal', e)}
        />
        {/* Distal */}
        <rect
          x={38} y={16} width={12} height={20}
          fill={col('distal')}
          stroke={STROKE} strokeWidth={SW} rx={2}
          style={faceStyle}
          onClick={(e) => onFaceClick('distal', e)}
        />
        {/* Lingual */}
        <rect
          x={14} y={yL} width={22} height={14}
          fill={col('lingual')}
          stroke={STROKE} strokeWidth={SW} rx={2}
          style={faceStyle}
          onClick={(e) => onFaceClick('lingual', e)}
        />

        {/* X superpuesta para diente AUSENTE */}
        {ausente && (
          <g pointerEvents="none">
            <line x1={6} y1={4} x2={44} y2={48} stroke={COLOR_AUSENTE} strokeWidth={2.5} strokeLinecap="round" />
            <line x1={44} y1={4} x2={6} y2={48} stroke={COLOR_AUSENTE} strokeWidth={2.5} strokeLinecap="round" />
          </g>
        )}

        {/* Indicador de nota — punto azul en esquina superior derecha */}
        {diente?.nota && (
          <g pointerEvents="none">
            <circle cx={45} cy={5} r={4} fill="#1a6bbd" />
            <title>📝 {diente.nota}</title>
          </g>
        )}
      </svg>

      {/* Número del diente — inferior (debajo del SVG) */}
      <div style={{ fontSize: 10, color: flip ? '#5a8ab0' : 'transparent', marginTop: 2, fontWeight: 500, height: 14, lineHeight: '14px' }}>
        {dienteNum}
      </div>
    </div>
  )
}

// ── Sub-componentes del popover (nivel de módulo para evitar remount) ────────

function ItemCondicion({
  cond,
  onSelect,
}: {
  cond: CondicionCatalogo
  onSelect: (c: CondicionCatalogo) => void
}) {
  return (
    <button
      onClick={() => onSelect(cond)}
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        width: '100%', padding: '7px 12px', background: 'none',
        border: 'none', borderBottom: '0.5px solid #f7faff',
        cursor: 'pointer', textAlign: 'left', fontSize: 13, color: '#0d3d6e',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = '#f0f7ff')}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
    >
      <span style={{
        width: 14, height: 14, borderRadius: 3, flexShrink: 0,
        background: cond.color_hex, border: '0.5px solid rgba(0,0,0,0.15)',
      }} />
      <span>{cond.nombre}</span>
    </button>
  )
}

function SeccionHeader({ titulo }: { titulo: string }) {
  return (
    <div style={{
      padding: '5px 12px 3px',
      fontSize: 10, fontWeight: 700, color: '#5a8ab0',
      textTransform: 'uppercase', letterSpacing: '0.06em',
      background: '#f7faff', borderBottom: '0.5px solid #e0eef8',
    }}>
      {titulo}
    </div>
  )
}

// ── Popover de selección de condición ───────────────────────────────────────

function PopoverCondicion({
  condiciones,
  cara,
  dienteNum,
  x,
  y,
  notaActual,
  onSelect,
  onNotaChange,
  onClose,
}: {
  condiciones: CondicionCatalogo[]
  cara: Cara
  dienteNum: number
  x: number
  y: number
  notaActual: string | null
  onSelect: (condicion: CondicionCatalogo) => void
  onNotaChange: (nota: string) => void
  onClose: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const esCentro = cara === 'oclusal'

  // Cerrar al hacer clic fuera
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [onClose])

  const nombreCara: Record<Cara, string> = {
    vestibular: 'Vestibular', lingual: 'Lingual',
    mesial: 'Mesial', distal: 'Distal', oclusal: 'Condición General',
  }

  // Condiciones por cara (aplica_cara=true) y de diente completo (aplica_cara=false)
  const porCara   = condiciones.filter((c) => c.aplica_cara)
  const completas = condiciones.filter((c) => !c.aplica_cara)

  // Ajustar posición para no salir de pantalla — altura máx ~480px
  const left = Math.min(x, window.innerWidth - 240)
  const top  = Math.min(y, window.innerHeight - 500)

  return (
    <div
      ref={ref}
      style={{
        position: 'fixed', left, top, zIndex: 9999,
        background: '#ffffff', border: '0.5px solid #c5ddf5',
        borderRadius: 10, boxShadow: '0 4px 20px rgba(13,61,110,0.15)',
        width: 240, overflow: 'hidden',
        display: 'flex', flexDirection: 'column',
      }}
    >
      {/* Header */}
      <div style={{
        background: '#f0f7ff', padding: '8px 12px',
        fontSize: 11, fontWeight: 600, color: '#0d3d6e',
        borderBottom: '0.5px solid #e0eef8',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexShrink: 0,
      }}>
        <span>Diente {dienteNum} · {nombreCara[cara]}</span>
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#5a8ab0', fontSize: 16, lineHeight: 1 }}
        >×</button>
      </div>

      {/* Lista de condiciones */}
      <div style={{ maxHeight: 300, overflowY: 'auto', flexShrink: 0 }}>
        {esCentro ? (
          <>
            <SeccionHeader titulo="Por cara" />
            {porCara.map((cond) => <ItemCondicion key={cond.codigo} cond={cond} onSelect={onSelect} />)}
            <SeccionHeader titulo="Diente completo" />
            {completas.map((cond) => <ItemCondicion key={cond.codigo} cond={cond} onSelect={onSelect} />)}
          </>
        ) : (
          porCara.map((cond) => <ItemCondicion key={cond.codigo} cond={cond} onSelect={onSelect} />)
        )}
      </div>

      {/* Nota del diente */}
      <div style={{
        padding: '10px 12px',
        borderTop: '0.5px solid #e0eef8',
        background: '#fafcff',
        flexShrink: 0,
      }}>
        <label style={{
          display: 'block', fontSize: 10, fontWeight: 700, color: '#5a8ab0',
          textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5,
        }}>
          Nota del diente
        </label>
        <input
          type="text"
          value={notaActual ?? ''}
          onChange={(e) => onNotaChange(e.target.value)}
          placeholder="Ej: pendiente revisión, prótesis fija..."
          maxLength={200}
          // Evitar que el clic dentro cierre el popover
          onMouseDown={(e) => e.stopPropagation()}
          style={{
            width: '100%', padding: '6px 8px', fontSize: 12,
            border: '0.5px solid #c5ddf5', borderRadius: 6,
            background: '#ffffff', color: '#0d3d6e',
            outline: 'none', boxSizing: 'border-box',
          }}
          onFocus={(e) => {
            e.target.style.borderColor = '#1a6bbd'
            e.target.style.boxShadow = '0 0 0 2px rgba(26,107,189,0.12)'
          }}
          onBlur={(e) => {
            e.target.style.borderColor = '#c5ddf5'
            e.target.style.boxShadow = 'none'
          }}
        />
        <div style={{ fontSize: 10, color: '#c5ddf5', textAlign: 'right', marginTop: 3 }}>
          {(notaActual ?? '').length}/200
        </div>
      </div>
    </div>
  )
}

// ── Panel de historial ──────────────────────────────────────────────────────

function PanelHistorial({
  pacienteId,
  catalogo,
  recargar,
}: {
  pacienteId: string
  catalogo: CondicionCatalogo[]
  recargar: number
}) {
  const [historial, setHistorial] = useState<HistorialRow[]>([])
  const [cargando, setCargando] = useState(false)
  const [abierto, setAbierto] = useState(false)

  interface HistorialRow {
    id: string
    numero_diente: number
    condicion_anterior: string | null
    condicion_nueva: string | null
    cara_vestibular_ant: string | null
    cara_vestibular_nueva: string | null
    cara_lingual_ant: string | null
    cara_lingual_nueva: string | null
    cara_mesial_ant: string | null
    cara_mesial_nueva: string | null
    cara_distal_ant: string | null
    cara_distal_nueva: string | null
    cara_oclusal_ant: string | null
    cara_oclusal_nueva: string | null
    modificado_en: string | null
  }

  useEffect(() => {
    if (!abierto) return
    async function cargar() {
      setCargando(true)
      const { data } = await supabase
        .from('odontograma_historial')
        .select('id, numero_diente, condicion_anterior, condicion_nueva, cara_vestibular_ant, cara_vestibular_nueva, cara_lingual_ant, cara_lingual_nueva, cara_mesial_ant, cara_mesial_nueva, cara_distal_ant, cara_distal_nueva, cara_oclusal_ant, cara_oclusal_nueva, modificado_en')
        .eq('paciente_id', pacienteId)
        .eq('empresa_id', EMPRESA_ID)
        .order('modificado_en', { ascending: false })
        .limit(50)
      setHistorial((data as HistorialRow[]) ?? [])
      setCargando(false)
    }
    cargar()
  }, [pacienteId, abierto, recargar])

  function nombreCod(cod: string | null) {
    if (!cod) return '—'
    return catalogo.find((c) => c.codigo === cod)?.nombre ?? cod
  }

  function colorCod(cod: string | null) {
    if (!cod) return '#e0eef8'
    return catalogo.find((c) => c.codigo === cod)?.color_hex ?? '#e0eef8'
  }

  function formatFecha(iso: string | null) {
    if (!iso) return '—'
    return new Date(iso).toLocaleString('es-GT', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true,
    })
  }

  function resumenCambio(row: HistorialRow): string {
    const caras: string[] = []
    if (row.cara_vestibular_ant !== row.cara_vestibular_nueva) caras.push('V')
    if (row.cara_lingual_ant !== row.cara_lingual_nueva) caras.push('L')
    if (row.cara_mesial_ant !== row.cara_mesial_nueva) caras.push('M')
    if (row.cara_distal_ant !== row.cara_distal_nueva) caras.push('D')
    if (row.cara_oclusal_ant !== row.cara_oclusal_nueva) caras.push('O')
    return caras.length ? `Caras: ${caras.join(', ')}` : ''
  }

  return (
    <div style={{ marginTop: 24 }}>
      <button
        onClick={() => setAbierto((v) => !v)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8, background: 'none',
          border: 'none', cursor: 'pointer', padding: '8px 0',
          fontSize: 14, fontWeight: 600, color: '#0d3d6e',
        }}
      >
        <span style={{
          display: 'inline-block', width: 18, height: 18, lineHeight: '18px',
          textAlign: 'center', background: '#e8f4ff', borderRadius: 4, fontSize: 11,
          color: '#1a6bbd', fontWeight: 700,
        }}>
          {abierto ? '▲' : '▼'}
        </span>
        Historial de Cambios
      </button>

      {abierto && (
        <div style={{ marginTop: 12, overflowX: 'auto' }}>
          {cargando && (
            <div style={{ padding: '16px 0', color: '#5a8ab0', fontSize: 13 }}>Cargando...</div>
          )}
          {!cargando && historial.length === 0 && (
            <div style={{ padding: '16px 0', color: '#5a8ab0', fontSize: 13 }}>
              Sin historial de cambios registrado.
            </div>
          )}
          {!cargando && historial.length > 0 && (
            <table className="ct-table" style={{ fontSize: 12 }}>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Diente</th>
                  <th>Condición anterior</th>
                  <th>Condición nueva</th>
                  <th>Caras modificadas</th>
                </tr>
              </thead>
              <tbody>
                {historial.map((row) => (
                  <tr key={row.id}>
                    <td style={{ whiteSpace: 'nowrap', color: '#5a8ab0' }}>
                      {formatFecha(row.modificado_en)}
                    </td>
                    <td style={{ fontWeight: 600, color: '#0d3d6e' }}>
                      {row.numero_diente}
                    </td>
                    <td>
                      {row.condicion_anterior ? (
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 5,
                          padding: '2px 8px', borderRadius: 12,
                          background: colorCod(row.condicion_anterior) + '22',
                          color: '#0d3d6e', fontSize: 11,
                        }}>
                          <span style={{ width: 8, height: 8, borderRadius: 2, background: colorCod(row.condicion_anterior), flexShrink: 0 }} />
                          {nombreCod(row.condicion_anterior)}
                        </span>
                      ) : '—'}
                    </td>
                    <td>
                      {row.condicion_nueva ? (
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 5,
                          padding: '2px 8px', borderRadius: 12,
                          background: colorCod(row.condicion_nueva) + '22',
                          color: '#0d3d6e', fontSize: 11,
                        }}>
                          <span style={{ width: 8, height: 8, borderRadius: 2, background: colorCod(row.condicion_nueva), flexShrink: 0 }} />
                          {nombreCod(row.condicion_nueva)}
                        </span>
                      ) : '—'}
                    </td>
                    <td style={{ color: '#5a8ab0', fontFamily: 'monospace', fontSize: 11 }}>
                      {resumenCambio(row)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}

// ── Componente principal ─────────────────────────────────────────────────────

export default function Odontograma({ pacienteId }: { pacienteId: string }) {
  const [condiciones, setCondiciones] = useState<CondicionCatalogo[]>([])
  const [dientes, setDientes] = useState<Map<number, DienteState>>(new Map())
  const [dirty, setDirty] = useState<Set<number>>(new Set())
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [exitoGuardar, setExitoGuardar] = useState(false)
  const [dentistaId, setDentistaId] = useState<string | null>(null)
  const [popover, setPopover] = useState<PopoverState | null>(null)
  const [recargarHistorial, setRecargarHistorial] = useState(0)

  // ── Carga inicial ──────────────────────────────────────────────────
  useEffect(() => {
    async function cargar() {
      setCargando(true)
      setError(null)
      try {
        // Condiciones del catálogo
        const { data: catData, error: errCat } = await supabase
          .from('condicion_dental_catalogo')
          .select('id, codigo, nombre, color_hex, aplica_cara, orden')
          .eq('activo', true)
          .order('orden')
        if (errCat) throw errCat

        // Dentista para usar como actualizado_por
        const { data: dentData } = await supabase
          .from('usuarios')
          .select('id')
          .eq('empresa_id', EMPRESA_ID)
          .limit(1)
          .single()
        if (dentData) setDentistaId(dentData.id)

        // Inicializar odontograma si no tiene filas
        const { count } = await supabase
          .from('odontograma')
          .select('id', { count: 'exact', head: true })
          .eq('paciente_id', pacienteId)
          .eq('empresa_id', EMPRESA_ID)

        if ((count ?? 0) === 0) {
          await supabase.rpc('clinica_inicializar_odontograma', {
            p_empresa_id: EMPRESA_ID,
            p_paciente_id: pacienteId,
          })
        }

        // Cargar filas del odontograma
        const { data: odonData, error: errOdon } = await supabase
          .from('odontograma')
          .select('id, numero_diente, condicion_general, cara_vestibular, cara_lingual, cara_mesial, cara_distal, cara_oclusal, nota')
          .eq('paciente_id', pacienteId)
          .eq('empresa_id', EMPRESA_ID)
        if (errOdon) throw errOdon

        const mapa = new Map<number, DienteState>()
        for (const row of odonData ?? []) {
          mapa.set(row.numero_diente, {
            id: row.id,
            condicion_general: row.condicion_general ?? null,
            cara_vestibular:   row.cara_vestibular ?? null,
            cara_lingual:      row.cara_lingual ?? null,
            cara_mesial:       row.cara_mesial ?? null,
            cara_distal:       row.cara_distal ?? null,
            cara_oclusal:      row.cara_oclusal ?? null,
            nota:              row.nota ?? null,
          })
        }

        setCondiciones((catData as CondicionCatalogo[]) ?? [])
        setDientes(mapa)
      } catch (e) {
        console.error('Error al cargar odontograma:', e)
        setError('Ocurrió un error al cargar el odontograma. Por favor intente de nuevo.')
      } finally {
        setCargando(false)
      }
    }
    cargar()
  }, [pacienteId])

  // ── Manejo de clic en cara ─────────────────────────────────────────
  const handleFaceClick = useCallback(
    (dienteNum: number, cara: Cara, e: React.MouseEvent) => {
      e.stopPropagation()
      const rect = (e.target as Element).getBoundingClientRect()
      setPopover({
        dienteNum,
        cara,
        x: rect.left,
        y: rect.bottom + 4,
      })
    },
    []
  )

  // ── Seleccionar condición ──────────────────────────────────────────
  function handleSelect(condicion: CondicionCatalogo) {
    if (!popover) return
    const { dienteNum, cara } = popover

    setDientes((prev) => {
      const mapa = new Map(prev)
      const diente = mapa.get(dienteNum)
      if (!diente) return prev

      let updated: DienteState
      if (!condicion.aplica_cara) {
        // Condición de diente completo: limpiar todas las caras
        updated = {
          ...diente,
          condicion_general: condicion.codigo,
          cara_vestibular: null,
          cara_lingual: null,
          cara_mesial: null,
          cara_distal: null,
          cara_oclusal: null,
        }
      } else {
        // Condición por cara: aplicar solo esa cara
        const campo = CAMPO_CARA[cara]
        updated = {
          ...diente,
          condicion_general: null,
          [campo]: condicion.codigo,
        }
      }
      mapa.set(dienteNum, updated)
      return mapa
    })

    setDirty((prev) => new Set(prev).add(dienteNum))
    setPopover(null)
  }

  // ── Cambiar nota de un diente ──────────────────────────────────────
  function handleNotaChange(dienteNum: number, nota: string) {
    setDientes((prev) => {
      const mapa = new Map(prev)
      const diente = mapa.get(dienteNum)
      if (!diente) return prev
      mapa.set(dienteNum, { ...diente, nota: nota || null })
      return mapa
    })
    setDirty((prev) => new Set(prev).add(dienteNum))
  }

  // ── Guardar ────────────────────────────────────────────────────────
  async function guardar() {
    if (dirty.size === 0 || !dentistaId) return
    setGuardando(true)
    setExitoGuardar(false)

    try {
      const promesas = Array.from(dirty).map((num) => {
        const d = dientes.get(num)
        if (!d) return Promise.resolve()
        return supabase
          .from('odontograma')
          .update({
            condicion_general: d.condicion_general,
            cara_vestibular:   d.cara_vestibular,
            cara_lingual:      d.cara_lingual,
            cara_mesial:       d.cara_mesial,
            cara_distal:       d.cara_distal,
            cara_oclusal:      d.cara_oclusal,
            nota:              d.nota?.trim() || null,
            actualizado_por:   dentistaId,
            actualizado_en:    new Date().toISOString(),
          })
          .eq('id', d.id)
          .eq('empresa_id', EMPRESA_ID)
      })

      const resultados = await Promise.all(promesas)
      for (const r of resultados) {
        if (r && typeof r === 'object' && 'error' in r && r.error) {
          throw (r as { error: unknown }).error
        }
      }

      setDirty(new Set())
      setExitoGuardar(true)
      setRecargarHistorial((n) => n + 1)
      setTimeout(() => setExitoGuardar(false), 4000)
    } catch (e) {
      console.error('Error al guardar odontograma:', e)
    } finally {
      setGuardando(false)
    }
  }

  // ── Leyenda de condiciones ─────────────────────────────────────────
  function Leyenda() {
    return (
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: '6px 14px',
        padding: '12px 16px', background: '#f7faff',
        borderRadius: 8, border: '0.5px solid #e0eef8', marginBottom: 20,
      }}>
        {condiciones.map((c) => (
          <div key={c.codigo} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{
              width: 12, height: 12, borderRadius: 2, flexShrink: 0,
              background: c.color_hex, border: '0.5px solid rgba(0,0,0,0.12)',
            }} />
            <span style={{ fontSize: 11, color: '#0d3d6e' }}>{c.nombre}</span>
          </div>
        ))}
      </div>
    )
  }

  // ── Fila de dientes ────────────────────────────────────────────────
  function FilaDientes({
    dientesNums,
    flip,
    etiqueta,
  }: {
    dientesNums: number[]
    flip: boolean
    etiqueta: string
  }) {
    const mitadA = dientesNums.slice(0, 8)
    const mitadB = dientesNums.slice(8)

    const renderDiente = (num: number) => (
      <ToothSVG
        key={num}
        dienteNum={num}
        diente={dientes.get(num)}
        catalogo={condiciones}
        flip={flip}
        onFaceClick={(cara, e) => handleFaceClick(num, cara, e)}
      />
    )

    return (
      <div>
        <div style={{
          fontSize: 10, color: '#5a8ab0', marginBottom: 6, textAlign: 'center',
          fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase',
        }}>
          {etiqueta}
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'stretch', gap: 0 }}>
          {/* Cuadrante izquierdo */}
          <div style={{ display: 'flex', gap: 2 }}>
            {mitadA.map(renderDiente)}
          </div>
          {/* Separador de línea media */}
          <div style={{
            width: 1, background: '#c5ddf5',
            margin: '0 8px', flexShrink: 0,
          }} />
          {/* Cuadrante derecho */}
          <div style={{ display: 'flex', gap: 2 }}>
            {mitadB.map(renderDiente)}
          </div>
        </div>
      </div>
    )
  }

  // ── Render ─────────────────────────────────────────────────────────

  if (cargando) {
    return (
      <div style={{ textAlign: 'center', padding: '32px 0', color: '#5a8ab0', fontSize: 14 }}>
        Cargando odontograma...
      </div>
    )
  }

  if (error) {
    return (
      <div style={{
        background: '#fff0f0', border: '0.5px solid #e84040', borderRadius: 8,
        padding: '12px 16px', color: '#e84040', fontSize: 13,
      }}>
        {error}
      </div>
    )
  }

  return (
    <div>
      {/* Leyenda */}
      <Leyenda />

      {/* Diagrama */}
      <div style={{
        overflowX: 'auto',
        border: '0.5px solid #e0eef8', borderRadius: 10,
        background: '#ffffff',
      }}>
        <div style={{ minWidth: 900, padding: '20px 12px 28px' }}>

          {/* ── MAXILAR SUPERIOR ─────────────────────────── */}
          <FilaDientes
            dientesNums={DIENTES_SUPERIOR}
            flip={false}
            etiqueta="Maxilar Superior"
          />

          {/* Separador entre arcadas — 40px total con texto centrado */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            margin: '20px 12px',
          }}>
            <div style={{ flex: 1, height: 1, background: '#e0eef8' }} />
            <span style={{
              fontSize: 10, color: '#c5ddf5', fontWeight: 700,
              letterSpacing: '0.1em', whiteSpace: 'nowrap',
              padding: '4px 12px', border: '0.5px solid #e0eef8',
              borderRadius: 20, background: '#f7faff',
            }}>
              ── LÍNEA MEDIA ──
            </span>
            <div style={{ flex: 1, height: 1, background: '#e0eef8' }} />
          </div>

          {/* ── MAXILAR INFERIOR ─────────────────────────── */}
          <FilaDientes
            dientesNums={DIENTES_INFERIOR}
            flip={true}
            etiqueta="Maxilar Inferior"
          />
        </div>
      </div>

      {/* Instrucción */}
      <div style={{ fontSize: 12, color: '#5a8ab0', marginTop: 8, textAlign: 'center' }}>
        Haga clic en cualquier cara del diente para asignar una condición · Centro = condición general del diente
      </div>

      {/* Botón guardar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 16 }}>
          <button
            onClick={guardar}
            disabled={guardando || dirty.size === 0 || !dentistaId}
            className="ct-btn ct-btn-primary"
            style={{ opacity: (guardando || dirty.size === 0) ? 0.5 : 1 }}
          >
            {guardando ? 'Guardando...' : `Guardar Odontograma${dirty.size > 0 ? ` (${dirty.size})` : ''}`}
          </button>
          {dirty.size > 0 && !guardando && (
            <span style={{ fontSize: 12, color: '#7a5500', background: '#fff8e8', border: '0.5px solid #f0c040', padding: '3px 10px', borderRadius: 20 }}>
              {dirty.size} diente{dirty.size !== 1 ? 's' : ''} con cambios pendientes
            </span>
          )}
          {exitoGuardar && (
            <span style={{ fontSize: 12, color: '#0a5535', background: '#e8fff5', border: '0.5px solid #2ecc8a', padding: '3px 10px', borderRadius: 20 }}>
              Odontograma guardado correctamente.
            </span>
          )}
        </div>

      {/* Panel de historial */}
      <PanelHistorial
        pacienteId={pacienteId}
        catalogo={condiciones}
        recargar={recargarHistorial}
      />

      {/* Popover */}
      {popover && (
        <PopoverCondicion
          condiciones={condiciones}
          cara={popover.cara}
          dienteNum={popover.dienteNum}
          x={popover.x}
          y={popover.y}
          notaActual={dientes.get(popover.dienteNum)?.nota ?? null}
          onSelect={handleSelect}
          onNotaChange={(nota) => handleNotaChange(popover.dienteNum, nota)}
          onClose={() => setPopover(null)}
        />
      )}
    </div>
  )
}
