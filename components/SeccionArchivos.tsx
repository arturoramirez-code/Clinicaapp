'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { EMPRESA_ID } from '@/lib/config'

// ── Constantes ────────────────────────────────────────────────────────────────

const TIPOS_ARCHIVO = [
  { value: 'radiografia_periapical', label: 'Radiografía Periapical' },
  { value: 'radiografia_panoramica', label: 'Radiografía Panorámica' },
  { value: 'radiografia_bitewing',   label: 'Radiografía Bitewing'   },
  { value: 'foto_intraoral',         label: 'Foto Intraoral'         },
  { value: 'foto_extraoral',         label: 'Foto Extraoral'         },
  { value: 'foto_rxray',             label: 'Foto RX'                },
  { value: 'documento',              label: 'Documento'              },
  { value: 'otro',                   label: 'Otro'                   },
]

const MIME_ACEPTADOS = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
const TAMANO_MAX_BYTES = 10 * 1024 * 1024 // 10 MB

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface Archivo {
  id: string
  titulo: string
  tipo: string
  descripcion: string | null
  storage_path: string
  formato: string | null
  tamano_bytes: number | null
  creado_en: string
}

interface Props {
  citaId: string
  pacienteId: string
  notaId: string | null
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function esImagen(formato: string | null): boolean {
  return ['jpg', 'jpeg', 'png', 'webp'].includes((formato ?? '').toLowerCase())
}

function formatearBytes(bytes: number | null): string {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatearFecha(iso: string): string {
  return new Date(iso).toLocaleDateString('es-GT', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  })
}

function etiquetaTipo(tipo: string): string {
  return TIPOS_ARCHIVO.find((t) => t.value === tipo)?.label ?? tipo
}

function sanitizarNombre(nombre: string): string {
  return nombre.toLowerCase().replace(/[^a-z0-9._-]/g, '-').replace(/-+/g, '-').slice(0, 80)
}

// ── Estilos reutilizables ─────────────────────────────────────────────────────

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 13, fontWeight: 500, color: '#5a8ab0', marginBottom: 4,
}

// ── Componente ────────────────────────────────────────────────────────────────

export default function SeccionArchivos({ citaId, pacienteId, notaId }: Props) {
  // Lista
  const [archivos, setArchivos]         = useState<Archivo[]>([])
  const [cargando, setCargando]         = useState(true)

  // Panel de subida
  const [mostrarPanel, setMostrarPanel] = useState(false)
  const [archivoSel, setArchivoSel]     = useState<File | null>(null)
  const [titulo, setTitulo]             = useState('')
  const [tipo, setTipo]                 = useState('radiografia_periapical')
  const [descripcion, setDescripcion]   = useState('')
  const [tituloError, setTituloError]   = useState<string | null>(null)
  const [errorUpload, setErrorUpload]   = useState<string | null>(null)
  const [subiendo, setSubiendo]         = useState(false)
  const [progreso, setProgreso]         = useState(0)
  const [exitoUpload, setExitoUpload]   = useState(false)

  // Lightbox
  const [lightbox, setLightbox] = useState<{
    url: string; titulo: string; desc: string | null
  } | null>(null)

  // Eliminación
  const [confirmEliminar, setConfirmEliminar] = useState<string | null>(null)
  const [eliminando, setEliminando]           = useState(false)
  const [errorEliminar, setErrorEliminar]     = useState<string | null>(null)

  const inputRef = useRef<HTMLInputElement>(null)

  // ── Cargar ─────────────────────────────────────────────────────────────────

  async function cargarArchivos() {
    setCargando(true)
    try {
      const { data, error: err } = await supabase
        .from('expediente_imagenes')
        .select('id, titulo, tipo, descripcion, storage_path, formato, tamano_bytes, creado_en')
        .eq('cita_id', citaId)
        .eq('empresa_id', EMPRESA_ID)
        .order('creado_en', { ascending: false })
      if (err) throw err
      setArchivos((data as Archivo[]) ?? [])
    } catch (e) {
      console.error('Error al cargar archivos del expediente:', e)
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => { cargarArchivos() }, [citaId])

  // Auto-ocultar éxito
  useEffect(() => {
    if (!exitoUpload) return
    const t = setTimeout(() => setExitoUpload(false), 4000)
    return () => clearTimeout(t)
  }, [exitoUpload])

  // ── Selección de archivo ───────────────────────────────────────────────────

  function manejarSeleccion(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    e.target.value = '' // Permite re-selección del mismo archivo
    if (!f) return

    setErrorUpload(null)

    if (!MIME_ACEPTADOS.includes(f.type)) {
      setErrorUpload('Formato no válido. Solo se aceptan archivos JPG, PNG, WebP o PDF.')
      return
    }
    if (f.size > TAMANO_MAX_BYTES) {
      setErrorUpload('El archivo es demasiado grande. El tamaño máximo es 10 MB.')
      return
    }

    setArchivoSel(f)
    // Pre-llenar título con el nombre del archivo sin extensión
    setTitulo(f.name.replace(/\.[^.]+$/, ''))
    setMostrarPanel(true)
  }

  // ── Subida ─────────────────────────────────────────────────────────────────

  async function subirArchivo(e: React.FormEvent) {
    e.preventDefault()
    if (!archivoSel) return

    setTituloError(null)
    if (!titulo.trim()) {
      setTituloError('El título es requerido.')
      return
    }

    setSubiendo(true)
    setProgreso(10)
    setErrorUpload(null)

    try {
      const ext          = archivoSel.name.split('.').pop()?.toLowerCase() ?? 'bin'
      const nombreSanit  = sanitizarNombre(archivoSel.name)
      const ruta         = `${EMPRESA_ID}/${pacienteId}/${citaId}/${Date.now()}-${nombreSanit}`

      // 1. Subir al bucket privado
      const { error: errStorage } = await supabase.storage
        .from('expediente-imagenes')
        .upload(ruta, archivoSel, { contentType: archivoSel.type, upsert: false })
      if (errStorage) throw errStorage

      setProgreso(65)

      // 2. Generar URL firmada inicial (1 hora) para referencia en url_publica
      const { data: signedData, error: errSigned } = await supabase.storage
        .from('expediente-imagenes')
        .createSignedUrl(ruta, 3600)
      if (errSigned) throw errSigned

      setProgreso(82)

      // 3. Insertar registro en expediente_imagenes
      const { error: errDB } = await supabase
        .from('expediente_imagenes')
        .insert({
          empresa_id:   EMPRESA_ID,
          paciente_id:  pacienteId,
          cita_id:      citaId,
          nota_id:      notaId,
          tipo,
          titulo:       titulo.trim(),
          descripcion:  descripcion.trim() || null,
          storage_path: ruta,
          url_publica:  signedData.signedUrl,
          tamano_bytes: archivoSel.size,
          formato:      ext,
        })
      if (errDB) throw errDB

      setProgreso(100)

      // Limpiar y refrescar
      cancelarPanel()
      setExitoUpload(true)
      await cargarArchivos()
    } catch (e: unknown) {
      console.error('Error al subir archivo:', e)
      setErrorUpload('Ocurrió un error al subir el archivo. Por favor intente de nuevo.')
    } finally {
      setSubiendo(false)
      setProgreso(0)
    }
  }

  // ── Ver archivo (genera URL firmada al momento) ────────────────────────────

  async function verArchivo(archivo: Archivo) {
    try {
      const { data, error: err } = await supabase.storage
        .from('expediente-imagenes')
        .createSignedUrl(archivo.storage_path, 3600)
      if (err) throw err

      if (esImagen(archivo.formato)) {
        setLightbox({ url: data.signedUrl, titulo: archivo.titulo, desc: archivo.descripcion })
      } else {
        window.open(data.signedUrl, '_blank')
      }
    } catch (e) {
      console.error('Error al generar URL firmada:', e)
    }
  }

  // ── Eliminar ───────────────────────────────────────────────────────────────

  async function confirmarEliminar(id: string) {
    const archivo = archivos.find((a) => a.id === id)
    if (!archivo) return

    setEliminando(true)
    setErrorEliminar(null)
    try {
      // Eliminar del storage
      const { error: errStorage } = await supabase.storage
        .from('expediente-imagenes')
        .remove([archivo.storage_path])
      if (errStorage) throw errStorage

      // Eliminar de la base de datos
      const { error: errDB } = await supabase
        .from('expediente_imagenes')
        .delete()
        .eq('id', id)
        .eq('empresa_id', EMPRESA_ID)
      if (errDB) throw errDB

      setArchivos((prev) => prev.filter((a) => a.id !== id))
      setConfirmEliminar(null)
    } catch (e: unknown) {
      console.error('Error al eliminar archivo:', e)
      setErrorEliminar('Ocurrió un error al eliminar. Por favor intente de nuevo.')
    } finally {
      setEliminando(false)
    }
  }

  // ── Cancelar panel ─────────────────────────────────────────────────────────

  function cancelarPanel() {
    setMostrarPanel(false)
    setArchivoSel(null)
    setTitulo('')
    setTipo('radiografia_periapical')
    setDescripcion('')
    setTituloError(null)
    setErrorUpload(null)
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="ct-card" style={{ marginTop: 24 }}>

      {/* ── Encabezado sección ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 20, paddingBottom: 12, borderBottom: '0.5px solid #e0eef8',
      }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, color: '#0d3d6e', margin: 0 }}>
          Archivos
          {!cargando && archivos.length > 0 && (
            <span style={{
              marginLeft: 8, fontSize: 12, fontWeight: 500,
              background: '#e8f4ff', color: '#0d3d6e',
              padding: '2px 8px', borderRadius: 20, display: 'inline-block',
            }}>
              {archivos.length}
            </span>
          )}
        </h2>
        {!mostrarPanel && (
          <button
              type="button"
              className="ct-btn ct-btn-secondary ct-btn-sm"
              onClick={() => inputRef.current?.click()}
            >
              + Agregar Archivo
            </button>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          style={{ display: 'none' }}
          onChange={manejarSeleccion}
        />
      </div>

      {/* ── Toast éxito ── */}
      {exitoUpload && (
        <div style={{
          background: '#e8fff5', border: '0.5px solid #2ecc8a', borderRadius: 8,
          padding: '10px 14px', color: '#0a5535', fontSize: 13, marginBottom: 16,
        }}>
          ✓ Archivo agregado correctamente.
        </div>
      )}

      {/* ── Error de selección (antes de abrir el panel) ── */}
      {errorUpload && !mostrarPanel && (
        <div style={{
          background: '#fff0f0', border: '0.5px solid #e84040', borderRadius: 8,
          padding: '10px 14px', color: '#e84040', fontSize: 13, marginBottom: 16,
        }}>
          {errorUpload}
        </div>
      )}

      {/* ── Panel de subida ── */}
      {mostrarPanel && archivoSel && (
        <div style={{
          background: '#f0f7ff', border: '0.5px solid #c5ddf5', borderRadius: 10,
          padding: '16px 20px', marginBottom: 20,
        }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: '#0d3d6e', margin: '0 0 14px' }}>
            Nuevo archivo adjunto
          </p>

          {/* Información del archivo seleccionado */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            background: '#fff', border: '0.5px solid #c5ddf5',
            borderRadius: 8, padding: '10px 14px', marginBottom: 16,
          }}>
            <span style={{ fontSize: 22, flexShrink: 0 }}>
              {archivoSel.type === 'application/pdf' ? '📄' : '🖼'}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{
                fontSize: 13, fontWeight: 500, color: '#0d3d6e', margin: 0,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {archivoSel.name}
              </p>
              <p style={{ fontSize: 12, color: '#5a8ab0', margin: '2px 0 0' }}>
                {formatearBytes(archivoSel.size)}
              </p>
            </div>
          </div>

          <form onSubmit={subirArchivo} noValidate>
            {/* Título */}
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>
                Título <span style={{ color: '#e84040' }}>*</span>
              </label>
              <input
                className="ct-input"
                value={titulo}
                onChange={(e) => {
                  setTitulo(e.target.value)
                  if (tituloError) setTituloError(null)
                }}
                placeholder="Ej. RX Periapical pieza 16"
                style={tituloError ? { borderColor: '#e84040' } : undefined}
              />
              {tituloError && (
                <p style={{ fontSize: 12, color: '#e84040', marginTop: 4 }}>{tituloError}</p>
              )}
            </div>

            {/* Tipo */}
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Tipo</label>
              <select
                className="ct-input"
                value={tipo}
                onChange={(e) => setTipo(e.target.value)}
                style={{ cursor: 'pointer' }}
              >
                {TIPOS_ARCHIVO.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            {/* Descripción */}
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>
                Descripción{' '}
                <span style={{ fontSize: 12, fontWeight: 400, color: '#5a8ab0' }}>(opcional)</span>
              </label>
              <textarea
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                placeholder="Observaciones sobre este archivo..."
                rows={2}
                style={{
                  width: '100%', padding: '8px 12px', fontSize: 14,
                  border: '0.5px solid #c5ddf5', borderRadius: 8, background: '#fff',
                  color: '#0d3d6e', resize: 'vertical', fontFamily: 'inherit',
                  outline: 'none', boxSizing: 'border-box',
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#1a6bbd'
                  e.target.style.boxShadow   = '0 0 0 3px rgba(26,107,189,0.15)'
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#c5ddf5'
                  e.target.style.boxShadow   = 'none'
                }}
              />
            </div>

            {/* Barra de progreso */}
            {subiendo && (
              <div style={{ marginBottom: 14 }}>
                <div style={{
                  height: 4, background: '#e0eef8', borderRadius: 4, overflow: 'hidden',
                }}>
                  <div style={{
                    height: '100%', background: '#1a6bbd', borderRadius: 4,
                    width: `${progreso}%`, transition: 'width 0.35s ease',
                  }} />
                </div>
                <p style={{ fontSize: 12, color: '#5a8ab0', marginTop: 4 }}>
                  Subiendo… {progreso}%
                </p>
              </div>
            )}

            {/* Error de subida */}
            {errorUpload && (
              <div style={{
                background: '#fff0f0', border: '0.5px solid #e84040', borderRadius: 8,
                padding: '10px 14px', color: '#e84040', fontSize: 13, marginBottom: 12,
              }}>
                {errorUpload}
              </div>
            )}

            {/* Botones */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                className="ct-btn ct-btn-secondary ct-btn-sm"
                onClick={cancelarPanel}
                disabled={subiendo}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="ct-btn ct-btn-primary ct-btn-sm"
                disabled={subiendo}
                style={{ opacity: subiendo ? 0.6 : 1 }}
              >
                {subiendo ? 'Subiendo…' : 'Guardar archivo'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Lista de archivos ── */}
      {cargando ? (
        <div style={{ textAlign: 'center', padding: '20px 0', color: '#5a8ab0', fontSize: 14 }}>
          Cargando…
        </div>
      ) : archivos.length === 0 && !mostrarPanel ? (
        <div style={{
          textAlign: 'center', padding: '28px 20px',
          border: '0.5px dashed #c5ddf5', borderRadius: 8,
        }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>📎</div>
          <div style={{ fontSize: 14, fontWeight: 500, color: '#0d3d6e', marginBottom: 4 }}>
            Sin archivos adjuntos
          </div>
          <div style={{ fontSize: 13, color: '#5a8ab0' }}>
            Agregue radiografías, fotografías o documentos de esta consulta.
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {archivos.map((a) => (
            <div key={a.id}>
              {/* Fila del archivo */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 14px', borderRadius: 8,
                border: '0.5px solid #e0eef8', background: '#f7faff',
              }}>
                {/* Ícono */}
                <span style={{ fontSize: 22, flexShrink: 0 }}>
                  {a.formato === 'pdf' ? '📄' : '🖼'}
                </span>

                {/* Metadatos */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 14, fontWeight: 500, color: '#0d3d6e' }}>
                      {a.titulo}
                    </span>
                    <span style={{
                      fontSize: 11, fontWeight: 500, padding: '1px 8px', borderRadius: 20,
                      background: '#e8f4ff', color: '#0d3d6e', whiteSpace: 'nowrap',
                    }}>
                      {etiquetaTipo(a.tipo)}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: '#5a8ab0', marginTop: 3 }}>
                    {formatearFecha(a.creado_en)}
                    {a.tamano_bytes ? ` · ${formatearBytes(a.tamano_bytes)}` : ''}
                  </div>
                  {a.descripcion && (
                    <div style={{ fontSize: 12, color: '#5a8ab0', marginTop: 2 }}>
                      {a.descripcion}
                    </div>
                  )}
                </div>

                {/* Acciones */}
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  <button
                    type="button"
                    className="ct-btn ct-btn-secondary ct-btn-sm"
                    onClick={() => verArchivo(a)}
                    title={esImagen(a.formato) ? 'Ver imagen' : 'Abrir PDF en nueva pestaña'}
                  >
                    {esImagen(a.formato) ? '🔍 Ver' : '↗ Abrir'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setConfirmEliminar(a.id)
                      setErrorEliminar(null)
                    }}
                    title="Eliminar archivo"
                    style={{
                      width: 32, height: 32, borderRadius: 6,
                      border: '0.5px solid #e84040', background: '#fff',
                      color: '#e84040', cursor: 'pointer', fontSize: 14,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    🗑
                  </button>
                </div>
              </div>

              {/* Confirmación de eliminación inline */}
              {confirmEliminar === a.id && (
                <div style={{
                  background: '#fff8e8', border: '0.5px solid #f0c040',
                  borderRadius: 8, padding: '12px 14px', marginTop: 4,
                }}>
                  <p style={{ fontSize: 13, color: '#7a5500', margin: '0 0 10px', fontWeight: 500 }}>
                    ¿Eliminar este archivo? Esta acción no se puede deshacer.
                  </p>
                  {errorEliminar && (
                    <p style={{ fontSize: 12, color: '#e84040', margin: '0 0 8px' }}>
                      {errorEliminar}
                    </p>
                  )}
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      type="button"
                      className="ct-btn ct-btn-secondary ct-btn-sm"
                      onClick={() => { setConfirmEliminar(null); setErrorEliminar(null) }}
                      disabled={eliminando}
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={() => confirmarEliminar(a.id)}
                      disabled={eliminando}
                      style={{
                        height: 32, padding: '0 14px', borderRadius: 8, fontSize: 13,
                        fontWeight: 500, border: 'none',
                        background: eliminando ? 'rgba(232,64,64,0.6)' : '#e84040',
                        color: '#fff',
                        cursor: eliminando ? 'not-allowed' : 'pointer',
                        opacity: eliminando ? 0.7 : 1,
                      }}
                    >
                      {eliminando ? 'Eliminando…' : 'Sí, eliminar'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Lightbox para imágenes ── */}
      {lightbox && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 9999, padding: 20,
          }}
          onClick={() => setLightbox(null)}
        >
          <div
            style={{ maxWidth: '90vw', maxHeight: '90vh', position: 'relative' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Cerrar */}
            <button
              onClick={() => setLightbox(null)}
              title="Cerrar"
              style={{
                position: 'absolute', top: -42, right: 0,
                background: 'rgba(255,255,255,0.15)', border: 'none',
                color: '#fff', fontSize: 18, cursor: 'pointer',
                width: 36, height: 36, borderRadius: 8,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              ✕
            </button>

            {/* Imagen */}
            <img
              src={lightbox.url}
              alt={lightbox.titulo}
              style={{
                maxWidth: '88vw', maxHeight: '78vh',
                objectFit: 'contain', borderRadius: 8, display: 'block',
              }}
            />

            {/* Leyenda */}
            <div style={{
              marginTop: 10, textAlign: 'center',
              color: '#fff', fontSize: 14, fontWeight: 500,
            }}>
              {lightbox.titulo}
              {lightbox.desc && (
                <span style={{ fontSize: 13, fontWeight: 400, color: '#a8c8e8', marginLeft: 8 }}>
                  · {lightbox.desc}
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
