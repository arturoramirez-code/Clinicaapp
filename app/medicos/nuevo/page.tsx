'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { EMPRESA_ID } from '@/lib/config'

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface Sucursal {
  id: string
  nombre: string
}

interface FormData {
  nombre: string
  apellido: string
  email: string
  sucursal_id: string
  activo: boolean
  numero_colegiado: string
}

interface Errores {
  nombre?: string
  apellido?: string
  email?: string
}

const ESTADO_INICIAL: FormData = {
  nombre:           '',
  apellido:         '',
  email:            '',
  sucursal_id:      '',
  activo:           true,
  numero_colegiado: '',
}

// ── Helpers de estilo ─────────────────────────────────────────────────────────

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 13, fontWeight: 500, color: '#5a8ab0', marginBottom: 4,
}

function Campo({
  label, requerido, error, children,
}: {
  label: string; requerido?: boolean; error?: string; children: React.ReactNode
}) {
  return (
    <div>
      <label style={labelStyle}>
        {label}{requerido && <span style={{ color: '#e84040' }}> *</span>}
      </label>
      {children}
      {error && <p style={{ fontSize: 12, color: '#e84040', marginTop: 4 }}>{error}</p>}
    </div>
  )
}

function obtenerIniciales(nombre: string, apellido: string): string {
  const n = nombre.trim()[0] ?? ''
  const a = apellido.trim()[0] ?? ''
  return (n + a).toUpperCase() || '?'
}

// ── Página ────────────────────────────────────────────────────────────────────

export default function PaginaNuevoMedico() {
  const router = useRouter()
  const [datos, setDatos]           = useState<FormData>(ESTADO_INICIAL)
  const [errores, setErrores]       = useState<Errores>({})
  const [guardando, setGuardando]   = useState(false)
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null)
  const [sucursales, setSucursales] = useState<Sucursal[]>([])

  // Foto
  const [fotoPreview, setFotoPreview]   = useState<string | null>(null)
  const [fotoUrl, setFotoUrl]           = useState<string | null>(null)
  const [subiendoFoto, setSubiendoFoto] = useState(false)
  const [errorFoto, setErrorFoto]       = useState<string | null>(null)
  const inputFotoRef = useRef<HTMLInputElement>(null)

  // Cargar sucursales para el dropdown
  useEffect(() => {
    supabase
      .from('sucursales')
      .select('id, nombre')
      .eq('empresa_id', EMPRESA_ID)
      .eq('activa', true)
      .order('es_principal', { ascending: false })
      .order('nombre', { ascending: true })
      .then(({ data }) => setSucursales((data as Sucursal[]) ?? []))
  }, [])

  // ── Subir foto ──────────────────────────────────────────────────────────────

  async function subirFoto(archivo: File) {
    setErrorFoto(null)
    const tiposPermitidos = ['image/jpeg', 'image/png', 'image/webp']
    if (!tiposPermitidos.includes(archivo.type)) {
      setErrorFoto('Solo se permiten imágenes JPG, PNG o WebP.')
      return
    }
    if (archivo.size > 2 * 1024 * 1024) {
      setErrorFoto('La imagen no debe superar 2 MB.')
      return
    }

    // Preview inmediato
    const reader = new FileReader()
    reader.onload = (e) => setFotoPreview(e.target?.result as string)
    reader.readAsDataURL(archivo)

    setSubiendoFoto(true)
    try {
      // Usamos un ID temporal basado en timestamp para el nuevo médico
      const ext = archivo.name.split('.').pop()?.toLowerCase() ?? 'jpg'
      const pathTemporal = `${EMPRESA_ID}/nuevo_${Date.now()}.${ext}`

      const { error: errUp } = await supabase.storage
        .from('fotos-medicos')
        .upload(pathTemporal, archivo, { upsert: true, contentType: archivo.type })
      if (errUp) throw errUp

      const { data: urlData } = supabase.storage
        .from('fotos-medicos')
        .getPublicUrl(pathTemporal)

      setFotoUrl(`${urlData.publicUrl}?t=${Date.now()}`)
    } catch (e) {
      console.error('Error al subir foto:', e)
      setErrorFoto('Error al subir la foto. Por favor intente de nuevo.')
      setFotoPreview(null)
    } finally {
      setSubiendoFoto(false)
    }
  }

  // ── Validación ──────────────────────────────────────────────────────────────

  function validar(): boolean {
    const e: Errores = {}

    if (!datos.nombre.trim())
      e.nombre = 'Este campo es requerido'
    if (!datos.apellido.trim())
      e.apellido = 'Este campo es requerido'
    if (!datos.email.trim())
      e.email = 'Este campo es requerido'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(datos.email.trim()))
      e.email = 'Formato de correo electrónico inválido'

    setErrores(e)
    return Object.keys(e).length === 0
  }

  // ── Guardar ─────────────────────────────────────────────────────────────────

  async function guardar(e: React.FormEvent) {
    e.preventDefault()
    setErrorGeneral(null)
    if (!validar()) return

    setGuardando(true)
    try {
      const { data: insertData, error: err } = await supabase
        .from('usuarios')
        .insert({
          empresa_id:       EMPRESA_ID,
          nombre:           datos.nombre.trim(),
          apellido:         datos.apellido.trim() || null,
          email:            datos.email.trim(),
          rol:              'dentista',
          sucursal_id:      datos.sucursal_id || null,
          activo:           datos.activo,
          numero_colegiado: datos.numero_colegiado.trim() || null,
          foto_url:         fotoUrl || null,
        })
        .select('id')
        .single()
      if (err) throw err

      // Si subimos foto con path temporal, renombrarla al ID real
      if (fotoUrl && insertData?.id) {
        const ext = fotoUrl.split('.').pop()?.split('?')[0] ?? 'jpg'
        const pathFinal = `${EMPRESA_ID}/${insertData.id}.${ext}`
        const pathTemporal = new URL(fotoUrl).pathname.split('/fotos-medicos/')[1]?.split('?')[0]
        if (pathTemporal && pathTemporal !== pathFinal) {
          const resp = await fetch(fotoUrl.split('?')[0])
          const blob = await resp.blob()
          await supabase.storage.from('fotos-medicos').upload(pathFinal, blob, { upsert: true })
          const { data: urlFinal } = supabase.storage.from('fotos-medicos').getPublicUrl(pathFinal)
          await supabase
            .from('usuarios')
            .update({ foto_url: `${urlFinal.publicUrl}?t=${Date.now()}` })
            .eq('id', insertData.id)
          // Eliminar path temporal
          await supabase.storage.from('fotos-medicos').remove([pathTemporal])
        }
      }

      router.push('/medicos?registrado=1')
    } catch (err: unknown) {
      console.error('Error al registrar médico:', err)
      setErrorGeneral('Ocurrió un error al guardar. Por favor intente de nuevo.')
    } finally {
      setGuardando(false)
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div>
      {/* Breadcrumb */}
      <nav style={{ fontSize: 13, color: '#5a8ab0', marginBottom: 16 }}>
        <Link href="/medicos" style={{ color: '#1a6bbd', textDecoration: 'none' }}>
          Médicos
        </Link>
        <span style={{ margin: '0 6px' }}>›</span>
        <span style={{ color: '#0d3d6e', fontWeight: 500 }}>Nuevo Médico</span>
      </nav>

      {/* Encabezado */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 600, color: '#0d3d6e', margin: 0 }}>
          Registrar Nuevo Médico
        </h1>
        <p style={{ fontSize: 14, color: '#5a8ab0', marginTop: 6 }}>
          Complete los datos del médico. Los campos marcados con{' '}
          <span style={{ color: '#e84040' }}>*</span> son requeridos.
        </p>
      </div>

      {/* Formulario */}
      <div className="ct-card" style={{ maxWidth: 700 }}>
        {errorGeneral && (
          <div style={{
            background: '#fff0f0', border: '0.5px solid #e84040', borderRadius: 8,
            padding: '10px 14px', color: '#e84040', fontSize: 13, marginBottom: 20,
          }}>
            {errorGeneral}
          </div>
        )}

        <form onSubmit={guardar} noValidate>

          {/* Datos personales */}
          <p style={{ fontSize: 16, fontWeight: 600, color: '#0d3d6e', margin: '0 0 16px' }}>
            Datos personales
          </p>

          {/* Avatar + foto */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20, marginBottom: 20 }}>
            {/* Avatar circular */}
            <div style={{ flexShrink: 0 }}>
              {fotoPreview ? (
                <img
                  src={fotoPreview}
                  alt="Foto del médico"
                  style={{
                    width: 80, height: 80, borderRadius: '50%', objectFit: 'cover',
                    border: '0.5px solid #c5ddf5',
                  }}
                />
              ) : (
                <div style={{
                  width: 80, height: 80, borderRadius: '50%',
                  background: '#e8f4ff', border: '0.5px solid #c5ddf5',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 24, fontWeight: 600, color: '#1a6bbd',
                }}>
                  {obtenerIniciales(datos.nombre, datos.apellido)}
                </div>
              )}
            </div>

            {/* Controles de foto */}
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Foto del Médico</label>
              <input
                ref={inputFotoRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const archivo = e.target.files?.[0]
                  if (archivo) subirFoto(archivo)
                  e.target.value = ''
                }}
              />
              <button
                type="button"
                className="ct-btn ct-btn-secondary ct-btn-sm"
                onClick={() => inputFotoRef.current?.click()}
                disabled={subiendoFoto}
                style={{ opacity: subiendoFoto ? 0.6 : 1 }}
              >
                {subiendoFoto ? 'Subiendo...' : fotoPreview ? 'Cambiar Foto' : 'Subir Foto'}
              </button>
              <p style={{ fontSize: 12, color: '#5a8ab0', margin: '6px 0 0' }}>
                JPG, PNG o WebP · Máx. 2 MB
              </p>
              {errorFoto && (
                <p style={{ fontSize: 12, color: '#e84040', margin: '4px 0 0' }}>{errorFoto}</p>
              )}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <Campo label="Nombre" requerido error={errores.nombre}>
              <input
                className="ct-input"
                value={datos.nombre}
                onChange={(e) => {
                  setDatos({ ...datos, nombre: e.target.value })
                  if (errores.nombre) setErrores({ ...errores, nombre: undefined })
                }}
                placeholder="Primer nombre"
                style={errores.nombre ? { borderColor: '#e84040' } : undefined}
              />
            </Campo>
            <Campo label="Apellido" requerido error={errores.apellido}>
              <input
                className="ct-input"
                value={datos.apellido}
                onChange={(e) => {
                  setDatos({ ...datos, apellido: e.target.value })
                  if (errores.apellido) setErrores({ ...errores, apellido: undefined })
                }}
                placeholder="Apellido"
                style={errores.apellido ? { borderColor: '#e84040' } : undefined}
              />
            </Campo>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
            <Campo label="Correo electrónico" requerido error={errores.email}>
              <input
                className="ct-input"
                type="email"
                value={datos.email}
                onChange={(e) => {
                  setDatos({ ...datos, email: e.target.value })
                  if (errores.email) setErrores({ ...errores, email: undefined })
                }}
                placeholder="ejemplo@clinica.com"
                style={errores.email ? { borderColor: '#e84040' } : undefined}
              />
            </Campo>
            <Campo label="Número de Colegiado">
              <input
                className="ct-input"
                value={datos.numero_colegiado}
                onChange={(e) => setDatos({ ...datos, numero_colegiado: e.target.value })}
                placeholder="Ej. 12345"
                maxLength={20}
              />
            </Campo>
          </div>

          {/* Línea divisoria */}
          <div style={{ borderTop: '0.5px solid #c5ddf5', marginBottom: 24 }} />

          {/* Asignación y acceso */}
          <p style={{ fontSize: 16, fontWeight: 600, color: '#0d3d6e', margin: '0 0 16px' }}>
            Asignación y acceso
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>

            {/* Rol — bloqueado */}
            <Campo label="Rol">
              <input
                className="ct-input"
                value="Médico / Dentista"
                readOnly
                style={{ background: '#f0f7ff', color: '#5a8ab0', cursor: 'not-allowed' }}
              />
            </Campo>

            {/* Sucursal */}
            <Campo label="Sucursal asignada">
              <select
                className="ct-input"
                value={datos.sucursal_id}
                onChange={(e) => setDatos({ ...datos, sucursal_id: e.target.value })}
                style={{ cursor: 'pointer' }}
              >
                <option value="">— Sin sucursal asignada —</option>
                {sucursales.map((s) => (
                  <option key={s.id} value={s.id}>{s.nombre}</option>
                ))}
              </select>
            </Campo>
          </div>

          {/* Toggle activo */}
          <div style={{ marginBottom: 28 }}>
            <label style={labelStyle}>Estado inicial</label>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
              <div
                onClick={() => setDatos({ ...datos, activo: !datos.activo })}
                style={{
                  width: 44, height: 24, borderRadius: 12, position: 'relative',
                  background: datos.activo ? '#1a6bbd' : '#c5ddf5',
                  transition: 'background 0.2s', cursor: 'pointer', flexShrink: 0,
                }}
              >
                <div style={{
                  position: 'absolute', top: 3, left: datos.activo ? 23 : 3,
                  width: 18, height: 18, borderRadius: '50%', background: '#fff',
                  transition: 'left 0.2s',
                }} />
              </div>
              <span style={{ fontSize: 14, color: '#0d3d6e' }}>
                {datos.activo ? 'Activo' : 'Inactivo'}
              </span>
            </label>
          </div>

          {/* Botones */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
            <Link href="/medicos">
              <button type="button" className="ct-btn ct-btn-secondary">
                Cancelar
              </button>
            </Link>
            <button
              type="submit"
              className="ct-btn ct-btn-primary"
              disabled={guardando}
              style={{ opacity: guardando ? 0.5 : 1 }}
            >
              {guardando ? 'Guardando...' : 'Registrar Médico'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
