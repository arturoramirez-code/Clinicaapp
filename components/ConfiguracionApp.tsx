'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { EMPRESA_ID } from '@/lib/config'

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface Empresa {
  id: string
  nombre: string
  nombre_comercial: string | null
  nit: string | null
  email_contacto: string
  telefono: string | null
  direccion: string | null
  logo_url: string | null
  tasa_iva_declaracion: number
  tasa_isr: number
}

interface Sucursal {
  id: string
  nombre: string
  direccion: string | null
  telefono: string | null
  email: string | null
  es_principal: boolean
  activa: boolean
}

interface Usuario {
  id: string
  nombre: string
  apellido: string | null
  email: string
  rol: string
  activo: boolean
}

interface Tratamiento {
  id: string
  nombre: string
  duracion_min: number
  precio_base: number | null
  color: string | null
  activo: boolean
}

interface NotificacionConfig {
  id: string | null
  email_activo: boolean
  horas_recordatorio_1: number
  horas_recordatorio_2: number
  plantilla_confirmacion: string
  plantilla_recordatorio: string
  plantilla_cancelacion: string
  plantilla_reprogramacion: string
}

interface FelConfig {
  id: string
  certificador: string | null
  regimen: string
  tasa_iva: number
  nit_emisor: string | null
  nombre_emisor: string | null
  direccion_emisor: string | null
  ambiente: string
}

// ── Constantes ────────────────────────────────────────────────────────────────

const ROLES = [
  { value: 'admin',         label: 'Administrador' },
  { value: 'dentista',      label: 'Dentista'      },
  { value: 'asistente',     label: 'Asistente'     },
  { value: 'recepcionista', label: 'Recepcionista' },
]

const REGIMENES = [
  { value: 'pequeño_contribuyente', label: 'Pequeño Contribuyente (5%)' },
  { value: 'general',               label: 'Régimen General (12%)'      },
]

const CERTIFICADORES = [
  { value: 'infile',    label: 'INFILE'    },
  { value: 'digifact',  label: 'Digifact'  },
  { value: 'guatefact', label: 'Guatefact' },
  { value: 'otro',      label: 'Otro'      },
]

const TABS = [
  { id: 'clinica',         label: 'Mi Clínica',          icono: '🏥' },
  { id: 'sucursales',      label: 'Sucursales',           icono: '📍' },
  { id: 'usuarios',        label: 'Usuarios y Roles',     icono: '👥' },
  { id: 'tratamientos',    label: 'Tratamientos',         icono: '🦷' },
  { id: 'notificaciones',  label: 'Notificaciones',       icono: '🔔' },
  { id: 'fel',             label: 'FEL / Facturación',    icono: '🧾' },
]

// ── Helpers de estilo ─────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: '100%', height: 40, padding: '0 12px', fontSize: 14,
  border: '0.5px solid #c5ddf5', borderRadius: 8, background: '#fff',
  color: '#0d3d6e', outline: 'none', boxSizing: 'border-box',
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 13, fontWeight: 500, color: '#5a8ab0', marginBottom: 4,
}

const ROL_CFG: Record<string, { bg: string; color: string }> = {
  admin:         { bg: '#e8f4ff', color: '#0d3d6e' },
  dentista:      { bg: '#e8fff5', color: '#0a5535' },
  asistente:     { bg: '#fff8e8', color: '#7a5500' },
  recepcionista: { bg: '#f5e8ff', color: '#5a1a8a' },
}

// ── Componente campo ──────────────────────────────────────────────────────────

function Campo({
  label, requerido, children,
}: {
  label: string; requerido?: boolean; children: React.ReactNode
}) {
  return (
    <div>
      <label style={labelStyle}>
        {label}{requerido && <span style={{ color: '#e84040' }}> *</span>}
      </label>
      {children}
    </div>
  )
}

function MensajeExito({ texto }: { texto: string | null }) {
  if (!texto) return null
  return (
    <div style={{
      background: '#e8fff5', border: '0.5px solid #2ecc8a', borderRadius: 8,
      padding: '10px 14px', color: '#0a5535', fontSize: 13, marginBottom: 16,
    }}>
      ✓ {texto}
    </div>
  )
}

function MensajeError({ texto }: { texto: string | null }) {
  if (!texto) return null
  return (
    <div style={{
      background: '#fff0f0', border: '0.5px solid #e84040', borderRadius: 8,
      padding: '10px 14px', color: '#e84040', fontSize: 13, marginBottom: 16,
    }}>
      {texto}
    </div>
  )
}

// ── Sección Mi Clínica ────────────────────────────────────────────────────────

function SeccionClinica() {
  const [datos, setDatos] = useState<Empresa | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [exito, setExito]         = useState<string | null>(null)
  const [error, setError]         = useState<string | null>(null)
  const [errorIva, setErrorIva]         = useState<string | null>(null)
  const [errorIsr, setErrorIsr]         = useState<string | null>(null)
  const [subiendoLogo, setSubiendoLogo] = useState(false)
  const [errorLogo, setErrorLogo]       = useState<string | null>(null)
  const [exitoLogo, setExitoLogo]       = useState<string | null>(null)
  const [progresoLogo, setProgresoLogo] = useState<number>(0)

  useEffect(() => {
    supabase.from('empresas').select('id, nombre, nombre_comercial, nit, email_contacto, telefono, direccion, logo_url, tasa_iva_declaracion, tasa_isr')
      .eq('id', EMPRESA_ID).single()
      .then(({ data }) => setDatos(data as Empresa))
  }, [])

  async function guardar() {
    if (!datos) return
    if (!datos.nombre.trim()) { setError('El nombre de la empresa es requerido.'); return }

    // Validación de tasas fiscales
    let hayErrorFiscal = false
    if (datos.tasa_iva_declaracion < 0 || datos.tasa_iva_declaracion > 100) {
      setErrorIva('La tasa de IVA debe estar entre 0 y 100.')
      hayErrorFiscal = true
    } else {
      setErrorIva(null)
    }
    if (datos.tasa_isr < 0 || datos.tasa_isr > 100) {
      setErrorIsr('La tasa de ISR debe estar entre 0 y 100.')
      hayErrorFiscal = true
    } else {
      setErrorIsr(null)
    }
    if (hayErrorFiscal) return

    setError(null); setGuardando(true); setExito(null)
    try {
      const { error: err } = await supabase.from('empresas')
        .update({
          nombre:               datos.nombre.trim(),
          nombre_comercial:     datos.nombre_comercial?.trim() || null,
          nit:                  datos.nit?.trim() || null,
          email_contacto:       datos.email_contacto.trim(),
          telefono:             datos.telefono?.trim() || null,
          direccion:            datos.direccion?.trim() || null,
          tasa_iva_declaracion: datos.tasa_iva_declaracion,
          tasa_isr:             datos.tasa_isr,
          actualizado_en:       new Date().toISOString(),
        })
        .eq('id', EMPRESA_ID)
      if (err) throw err
      setExito('Datos de la clínica actualizados correctamente.')
    } catch (e: unknown) {
      console.error(e)
      setError('Ocurrió un error al guardar. Por favor intente de nuevo.')
    } finally {
      setGuardando(false)
    }
  }

  async function subirLogo(archivo: File) {
    setErrorLogo(null)
    setExitoLogo(null)
    setProgresoLogo(0)

    // Validaciones
    const tiposPermitidos = ['image/jpeg', 'image/png', 'image/webp']
    if (!tiposPermitidos.includes(archivo.type)) {
      setErrorLogo('Formato no válido. Solo se aceptan archivos JPG, PNG o WebP.')
      return
    }
    if (archivo.size > 2 * 1024 * 1024) {
      setErrorLogo('El archivo es demasiado grande. El tamaño máximo es 2 MB.')
      return
    }

    const ext = archivo.name.split('.').pop()?.toLowerCase() ?? 'jpg'
    const ruta = `${EMPRESA_ID}/logo.${ext}`

    setSubiendoLogo(true)
    setProgresoLogo(30)
    try {
      // Subir al bucket (upsert para sobreescribir logo anterior)
      const { error: errSubida } = await supabase.storage
        .from('logos-clinicas')
        .upload(ruta, archivo, { upsert: true, contentType: archivo.type })
      if (errSubida) throw errSubida

      setProgresoLogo(70)

      // Obtener URL pública
      const { data: urlData } = supabase.storage
        .from('logos-clinicas')
        .getPublicUrl(ruta)
      // Agregar cache-buster para forzar recarga del img
      const urlPublica = `${urlData.publicUrl}?t=${Date.now()}`

      // Actualizar logo_url en empresas
      const { error: errUpdate } = await supabase.from('empresas')
        .update({ logo_url: urlData.publicUrl, actualizado_en: new Date().toISOString() })
        .eq('id', EMPRESA_ID)
      if (errUpdate) throw errUpdate

      setProgresoLogo(100)
      setDatos((prev) => prev ? { ...prev, logo_url: urlPublica } : prev)
      setExitoLogo('Logo actualizado correctamente.')
    } catch (e: unknown) {
      console.error(e)
      setErrorLogo('Ocurrió un error al subir el logo. Por favor intente de nuevo.')
    } finally {
      setSubiendoLogo(false)
    }
  }

  if (!datos) return (
    <div style={{ padding: '32px 0', textAlign: 'center', color: '#5a8ab0', fontSize: 14 }}>
      Cargando...
    </div>
  )

  // Iniciales de la clínica para el placeholder
  const iniciales = (datos.nombre_comercial || datos.nombre)
    .split(' ').slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('')

  return (
    <div>
      <h2 style={{ fontSize: 18, fontWeight: 600, color: '#0d3d6e', margin: '0 0 20px' }}>Mi Clínica</h2>
      <MensajeExito texto={exito} />
      <MensajeError texto={error} />

      {/* Sección Logo */}
      <div style={{
        border: '0.5px solid #c5ddf5', borderRadius: 12, padding: '20px 24px',
        marginBottom: 24, background: '#fff',
      }}>
        <p style={{ fontSize: 16, fontWeight: 600, color: '#0d3d6e', margin: '0 0 16px' }}>
          Logo de la Clínica
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
          {/* Previsualización */}
          <div style={{
            width: 120, height: 80, borderRadius: 8, border: '0.5px solid #c5ddf5',
            background: '#f0f7ff', display: 'flex', alignItems: 'center',
            justifyContent: 'center', overflow: 'hidden', flexShrink: 0,
          }}>
            {datos.logo_url ? (
              <img
                src={datos.logo_url}
                alt="Logo de la clínica"
                style={{ maxWidth: 200, maxHeight: 76, objectFit: 'contain' }}
              />
            ) : (
              <span style={{ fontSize: 28, fontWeight: 600, color: '#1a6bbd', letterSpacing: 2 }}>
                {iniciales}
              </span>
            )}
          </div>

          {/* Controles */}
          <div style={{ flex: 1, minWidth: 200 }}>
            <label
              htmlFor="input-logo"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                height: 40, padding: '0 20px', fontSize: 14, fontWeight: 500,
                borderRadius: 8, border: '1px solid #1a6bbd', color: '#1a6bbd',
                background: subiendoLogo ? '#f0f7ff' : '#fff',
                cursor: subiendoLogo ? 'not-allowed' : 'pointer',
                opacity: subiendoLogo ? 0.6 : 1,
              }}
            >
              {subiendoLogo ? 'Subiendo...' : 'Cambiar Logo'}
            </label>
            <input
              id="input-logo"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              style={{ display: 'none' }}
              disabled={subiendoLogo}
              onChange={(e) => {
                const archivo = e.target.files?.[0]
                if (archivo) subirLogo(archivo)
                // Limpiar input para permitir re-selección del mismo archivo
                e.target.value = ''
              }}
            />
            <p style={{ fontSize: 12, color: '#5a8ab0', margin: '6px 0 0' }}>
              JPG, PNG o WebP — máximo 2 MB
            </p>

            {/* Barra de progreso */}
            {subiendoLogo && (
              <div style={{
                marginTop: 8, height: 4, background: '#e0eef8',
                borderRadius: 4, overflow: 'hidden', width: '100%', maxWidth: 220,
              }}>
                <div style={{
                  height: '100%', background: '#1a6bbd', borderRadius: 4,
                  width: `${progresoLogo}%`, transition: 'width 0.3s ease',
                }} />
              </div>
            )}

            {/* Mensajes de logo */}
            {errorLogo && (
              <p style={{ fontSize: 12, color: '#e84040', margin: '6px 0 0' }}>{errorLogo}</p>
            )}
            {exitoLogo && !subiendoLogo && (
              <p style={{ fontSize: 12, color: '#0a5535', margin: '6px 0 0' }}>✓ {exitoLogo}</p>
            )}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <Campo label="Nombre legal" requerido>
          <input className="ct-input" value={datos.nombre}
            onChange={(e) => setDatos({ ...datos, nombre: e.target.value })} />
        </Campo>
        <Campo label="Nombre comercial">
          <input className="ct-input" value={datos.nombre_comercial ?? ''}
            onChange={(e) => setDatos({ ...datos, nombre_comercial: e.target.value })}
            placeholder="Nombre que ven los pacientes" />
        </Campo>
        <Campo label="NIT">
          <input className="ct-input" value={datos.nit ?? ''}
            onChange={(e) => setDatos({ ...datos, nit: e.target.value })}
            placeholder="Ej: 123456-7" />
        </Campo>
        <Campo label="Email de contacto" requerido>
          <input className="ct-input" type="email" value={datos.email_contacto}
            onChange={(e) => setDatos({ ...datos, email_contacto: e.target.value })} />
        </Campo>
        <Campo label="Teléfono">
          <input className="ct-input" value={datos.telefono ?? ''}
            onChange={(e) => setDatos({ ...datos, telefono: e.target.value })}
            placeholder="Ej: 2345-6789" />
        </Campo>
      </div>
      <div style={{ marginBottom: 24 }}>
        <Campo label="Dirección">
          <textarea className="ct-textarea" value={datos.direccion ?? ''}
            onChange={(e) => setDatos({ ...datos, direccion: e.target.value })}
            placeholder="Dirección completa de la clínica" rows={2} />
        </Campo>
      </div>

      {/* Sección Configuración Fiscal */}
      <div style={{ borderTop: '0.5px solid #c5ddf5', paddingTop: 24, marginBottom: 24 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, color: '#0d3d6e', margin: '0 0 16px' }}>
          Configuración Fiscal
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <Campo label="Tasa IVA (%)" requerido>
              <input
                className="ct-input"
                type="number"
                min={0}
                max={100}
                step={0.01}
                value={datos.tasa_iva_declaracion}
                onChange={(e) => setDatos({ ...datos, tasa_iva_declaracion: parseFloat(e.target.value) || 0 })}
              />
            </Campo>
            {errorIva && (
              <p style={{ fontSize: 12, color: '#e84040', marginTop: 4 }}>{errorIva}</p>
            )}
            <p style={{ fontSize: 12, color: '#5a8ab0', marginTop: 4 }}>
              Para declaración mensual de IVA
            </p>
          </div>
          <div>
            <Campo label="Tasa ISR (%)" requerido>
              <input
                className="ct-input"
                type="number"
                min={0}
                max={100}
                step={0.01}
                value={datos.tasa_isr}
                onChange={(e) => setDatos({ ...datos, tasa_isr: parseFloat(e.target.value) || 0 })}
              />
            </Campo>
            {errorIsr && (
              <p style={{ fontSize: 12, color: '#e84040', marginTop: 4 }}>{errorIsr}</p>
            )}
            <p style={{ fontSize: 12, color: '#5a8ab0', marginTop: 4 }}>
              Para declaración mensual de ISR
            </p>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button onClick={guardar} disabled={guardando} className="ct-btn ct-btn-primary"
            style={{ opacity: guardando ? 0.6 : 1 }}>
            {guardando ? 'Guardando...' : 'Guardar cambios'}
          </button>
      </div>
    </div>
  )
}

// ── Sección Sucursales ────────────────────────────────────────────────────────

function SeccionSucursales() {
  const [sucursales, setSucursales] = useState<Sucursal[]>([])
  const [editando, setEditando]     = useState<Sucursal | null>(null)
  const [guardando, setGuardando]   = useState(false)
  const [exito, setExito]           = useState<string | null>(null)
  const [error, setError]           = useState<string | null>(null)
  const [nuevo, setNuevo]           = useState(false)

  useEffect(() => {
    supabase.from('sucursales').select('id, nombre, direccion, telefono, email, es_principal, activa')
      .eq('empresa_id', EMPRESA_ID).order('es_principal', { ascending: false })
      .then(({ data }) => setSucursales((data as Sucursal[]) ?? []))
  }, [])

  async function guardarEdicion() {
    if (!editando?.nombre.trim()) { setError('El nombre es requerido.'); return }
    setError(null); setGuardando(true); setExito(null)
    try {
      if (nuevo) {
        const { data, error: err } = await supabase.from('sucursales')
          .insert({
            empresa_id: EMPRESA_ID,
            nombre:     editando.nombre.trim(),
            direccion:  editando.direccion?.trim() || null,
            telefono:   editando.telefono?.trim() || null,
            email:      editando.email?.trim() || null,
            activa:     editando.activa,
          })
          .select().single()
        if (err) throw err
        setSucursales((prev) => [...prev, data as Sucursal])
      } else {
        const { error: err } = await supabase.from('sucursales')
          .update({
            nombre:    editando.nombre.trim(),
            direccion: editando.direccion?.trim() || null,
            telefono:  editando.telefono?.trim() || null,
            email:     editando.email?.trim() || null,
            activa:    editando.activa,
          })
          .eq('id', editando.id).eq('empresa_id', EMPRESA_ID)
        if (err) throw err
        setSucursales((prev) => prev.map((s) => s.id === editando.id ? editando : s))
      }
      setExito('Sucursal guardada correctamente.')
      setEditando(null); setNuevo(false)
    } catch (e: unknown) {
      console.error(e)
      setError('Ocurrió un error al guardar.')
    } finally {
      setGuardando(false)
    }
  }

  async function toggleActiva(suc: Sucursal) {
    const { error: err } = await supabase.from('sucursales')
      .update({ activa: !suc.activa })
      .eq('id', suc.id).eq('empresa_id', EMPRESA_ID)
    if (!err) setSucursales((prev) => prev.map((s) => s.id === suc.id ? { ...s, activa: !s.activa } : s))
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, color: '#0d3d6e', margin: 0 }}>Sucursales</h2>
        <button
            onClick={() => { setNuevo(true); setEditando({ id: '', nombre: '', direccion: null, telefono: null, email: null, es_principal: false, activa: true }) }}
            className="ct-btn ct-btn-primary ct-btn-sm"
          >
            + Nueva sucursal
          </button>
      </div>

      <MensajeExito texto={exito} />
      <MensajeError texto={error} />

      <table className="ct-table" style={{ marginBottom: 24 }}>
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Dirección</th>
            <th>Teléfono</th>
            <th>Estado</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {sucursales.map((suc) => (
            <tr key={suc.id}>
              <td>
                <div style={{ fontWeight: 500 }}>{suc.nombre}</div>
                {suc.es_principal && (
                  <span style={{ fontSize: 11, background: '#e8f4ff', color: '#1a6bbd', borderRadius: 20, padding: '1px 6px' }}>
                    Principal
                  </span>
                )}
              </td>
              <td style={{ color: '#5a8ab0', fontSize: 13 }}>{suc.direccion || '—'}</td>
              <td style={{ color: '#5a8ab0', fontSize: 13 }}>{suc.telefono || '—'}</td>
              <td>
                <button
                  onClick={() => toggleActiva(suc)}
                  style={{
                    height: 24, padding: '0 10px', fontSize: 11, fontWeight: 600, borderRadius: 20,
                    border: 'none', cursor: 'pointer',
                    background: suc.activa ? '#e8fff5' : '#fff0f0',
                    color: suc.activa ? '#0a5535' : '#7a1a1a',
                  }}
                >
                  {suc.activa ? 'Activa' : 'Inactiva'}
                </button>
              </td>
              <td>
                <button
                  onClick={() => { setNuevo(false); setEditando({ ...suc }) }}
                  style={{
                    height: 30, padding: '0 12px', fontSize: 12, borderRadius: 6,
                    border: '1px solid #c5ddf5', background: '#fff', color: '#1a6bbd', cursor: 'pointer',
                  }}
                >
                  Editar
                </button>
              </td>
            </tr>
          ))}
          {sucursales.length === 0 && (
            <tr><td colSpan={5} style={{ textAlign: 'center', color: '#5a8ab0' }}>No hay sucursales registradas.</td></tr>
          )}
        </tbody>
      </table>

      {/* Formulario edición inline */}
      {editando && (
        <div style={{
          background: '#f7faff', border: '0.5px solid #c5ddf5', borderRadius: 12, padding: 20,
        }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#0d3d6e', marginBottom: 16 }}>
            {nuevo ? 'Nueva sucursal' : `Editar: ${editando.nombre}`}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <Campo label="Nombre" requerido>
              <input style={inputStyle} value={editando.nombre}
                onChange={(e) => setEditando({ ...editando, nombre: e.target.value })} />
            </Campo>
            <Campo label="Teléfono">
              <input style={inputStyle} value={editando.telefono ?? ''}
                onChange={(e) => setEditando({ ...editando, telefono: e.target.value })} />
            </Campo>
            <Campo label="Email">
              <input style={inputStyle} type="email" value={editando.email ?? ''}
                onChange={(e) => setEditando({ ...editando, email: e.target.value })} />
            </Campo>
            <Campo label="Estado">
              <select style={{ ...inputStyle, cursor: 'pointer' }}
                value={editando.activa ? 'activa' : 'inactiva'}
                onChange={(e) => setEditando({ ...editando, activa: e.target.value === 'activa' })}>
                <option value="activa">Activa</option>
                <option value="inactiva">Inactiva</option>
              </select>
            </Campo>
          </div>
          <Campo label="Dirección">
            <textarea style={{ ...inputStyle, height: 'auto', padding: '8px 12px', minHeight: 60, resize: 'vertical' }}
              value={editando.direccion ?? ''}
              onChange={(e) => setEditando({ ...editando, direccion: e.target.value })} />
          </Campo>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16 }}>
            <button onClick={() => { setEditando(null); setNuevo(false); setError(null) }}
              className="ct-btn ct-btn-secondary">Cancelar</button>
            <button onClick={guardarEdicion} disabled={guardando} className="ct-btn ct-btn-primary"
              style={{ opacity: guardando ? 0.6 : 1 }}>
              {guardando ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Sección Usuarios ──────────────────────────────────────────────────────────

function SeccionUsuarios() {
  const [usuarios, setUsuarios]     = useState<Usuario[]>([])
  const [mostrarForm, setMostrarForm] = useState(false)
  const [form, setForm]             = useState({ nombre: '', apellido: '', email: '', rol: 'recepcionista' })
  const [guardando, setGuardando]   = useState(false)
  const [exito, setExito]           = useState<string | null>(null)
  const [error, setError]           = useState<string | null>(null)

  useEffect(() => {
    supabase.from('usuarios').select('id, nombre, apellido, email, rol, activo')
      .eq('empresa_id', EMPRESA_ID).order('nombre')
      .then(({ data }) => setUsuarios((data as Usuario[]) ?? []))
  }, [])

  async function crearUsuario() {
    if (!form.nombre.trim()) { setError('El nombre es requerido.'); return }
    if (!form.email.trim()) { setError('El email es requerido.'); return }
    setError(null); setGuardando(true); setExito(null)
    try {
      const { data, error: err } = await supabase.from('usuarios')
        .insert({
          empresa_id: EMPRESA_ID,
          nombre:     form.nombre.trim(),
          apellido:   form.apellido.trim() || null,
          email:      form.email.trim(),
          rol:        form.rol,
          activo:     true,
        })
        .select().single()
      if (err) throw err
      setUsuarios((prev) => [...prev, data as Usuario].sort((a, b) => a.nombre.localeCompare(b.nombre)))
      setExito('Usuario creado correctamente.')
      setMostrarForm(false)
      setForm({ nombre: '', apellido: '', email: '', rol: 'recepcionista' })
    } catch (e: unknown) {
      console.error(e)
      const msg = e instanceof Error && (e as { message?: string }).message?.includes('duplicate')
        ? 'Ya existe un usuario con ese email.'
        : 'Ocurrió un error al guardar.'
      setError(msg)
    } finally {
      setGuardando(false)
    }
  }

  async function toggleActivo(u: Usuario) {
    const { error: err } = await supabase.from('usuarios')
      .update({ activo: !u.activo }).eq('id', u.id).eq('empresa_id', EMPRESA_ID)
    if (!err) setUsuarios((prev) => prev.map((x) => x.id === u.id ? { ...x, activo: !x.activo } : x))
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, color: '#0d3d6e', margin: 0 }}>Usuarios y Roles</h2>
        <button onClick={() => setMostrarForm(true)} className="ct-btn ct-btn-primary ct-btn-sm">
            + Nuevo usuario
          </button>
      </div>

      <MensajeExito texto={exito} />
      <MensajeError texto={error} />

      <table className="ct-table" style={{ marginBottom: 24 }}>
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Email</th>
            <th>Rol</th>
            <th>Estado</th>
          </tr>
        </thead>
        <tbody>
          {usuarios.map((u) => {
            const rolCfg = ROL_CFG[u.rol] ?? { bg: '#f0f7ff', color: '#0d3d6e' }
            return (
              <tr key={u.id}>
                <td style={{ fontWeight: 500 }}>{u.nombre}{u.apellido ? ` ${u.apellido}` : ''}</td>
                <td style={{ color: '#5a8ab0', fontSize: 13 }}>{u.email}</td>
                <td>
                  <span style={{
                    display: 'inline-block', padding: '2px 10px', borderRadius: 20,
                    background: rolCfg.bg, color: rolCfg.color, fontSize: 12, fontWeight: 600,
                  }}>
                    {ROLES.find((r) => r.value === u.rol)?.label ?? u.rol}
                  </span>
                </td>
                <td>
                  <button
                    onClick={() => toggleActivo(u)}
                    style={{
                      height: 24, padding: '0 10px', fontSize: 11, fontWeight: 600, borderRadius: 20,
                      border: 'none', cursor: 'pointer',
                      background: u.activo ? '#e8fff5' : '#fff0f0',
                      color: u.activo ? '#0a5535' : '#7a1a1a',
                    }}
                  >
                    {u.activo ? 'Activo' : 'Inactivo'}
                  </button>
                </td>
              </tr>
            )
          })}
          {usuarios.length === 0 && (
            <tr><td colSpan={4} style={{ textAlign: 'center', color: '#5a8ab0' }}>No hay usuarios registrados.</td></tr>
          )}
        </tbody>
      </table>

      {/* Formulario nuevo usuario */}
      {mostrarForm && (
        <div style={{
          background: '#f7faff', border: '0.5px solid #c5ddf5', borderRadius: 12, padding: 20,
        }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#0d3d6e', marginBottom: 16 }}>
            Nuevo usuario
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <Campo label="Nombre" requerido>
              <input style={inputStyle} value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
            </Campo>
            <Campo label="Apellido">
              <input style={inputStyle} value={form.apellido}
                onChange={(e) => setForm({ ...form, apellido: e.target.value })} />
            </Campo>
            <Campo label="Email" requerido>
              <input style={inputStyle} type="email" value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </Campo>
            <Campo label="Rol">
              <select style={{ ...inputStyle, cursor: 'pointer' }} value={form.rol}
                onChange={(e) => setForm({ ...form, rol: e.target.value })}>
                {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </Campo>
          </div>
          <div style={{ fontSize: 12, color: '#5a8ab0', marginBottom: 16 }}>
            El usuario recibirá una invitación por email para establecer su contraseña.
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button onClick={() => { setMostrarForm(false); setError(null) }}
              className="ct-btn ct-btn-secondary">Cancelar</button>
            <button onClick={crearUsuario} disabled={guardando} className="ct-btn ct-btn-primary"
              style={{ opacity: guardando ? 0.6 : 1 }}>
              {guardando ? 'Guardando...' : 'Crear usuario'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Sección Tratamientos ──────────────────────────────────────────────────────

function SeccionTratamientos() {
  const [lista, setLista]           = useState<Tratamiento[]>([])
  const [editando, setEditando]     = useState<Tratamiento | null>(null)
  const [esNuevo, setEsNuevo]       = useState(false)
  const [guardando, setGuardando]   = useState(false)
  const [exito, setExito]           = useState<string | null>(null)
  const [error, setError]           = useState<string | null>(null)

  useEffect(() => {
    supabase.from('tratamiento_tipos')
      .select('id, nombre, duracion_min, precio_base, color, activo')
      .eq('empresa_id', EMPRESA_ID).order('nombre')
      .then(({ data }) => setLista((data as Tratamiento[]) ?? []))
  }, [])

  const vacio: Tratamiento = { id: '', nombre: '', duracion_min: 30, precio_base: null, color: '#1a6bbd', activo: true }

  async function guardar() {
    if (!editando?.nombre.trim()) { setError('El nombre es requerido.'); return }
    setError(null); setGuardando(true); setExito(null)
    try {
      const payload = {
        nombre:       editando.nombre.trim(),
        duracion_min: editando.duracion_min,
        precio_base:  editando.precio_base,
        color:        editando.color,
        activo:       editando.activo,
      }
      if (esNuevo) {
        const { data, error: err } = await supabase.from('tratamiento_tipos')
          .insert({ empresa_id: EMPRESA_ID, ...payload })
          .select().single()
        if (err) throw err
        setLista((prev) => [...prev, data as Tratamiento].sort((a, b) => a.nombre.localeCompare(b.nombre)))
      } else {
        const { error: err } = await supabase.from('tratamiento_tipos')
          .update(payload).eq('id', editando.id).eq('empresa_id', EMPRESA_ID)
        if (err) throw err
        setLista((prev) => prev.map((t) => t.id === editando.id ? editando : t))
      }
      setExito('Tratamiento guardado correctamente.')
      setEditando(null); setEsNuevo(false)
    } catch (e: unknown) {
      console.error(e)
      setError('Ocurrió un error al guardar.')
    } finally {
      setGuardando(false)
    }
  }

  async function toggleActivo(t: Tratamiento) {
    const { error: err } = await supabase.from('tratamiento_tipos')
      .update({ activo: !t.activo }).eq('id', t.id).eq('empresa_id', EMPRESA_ID)
    if (!err) setLista((prev) => prev.map((x) => x.id === t.id ? { ...x, activo: !x.activo } : x))
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, color: '#0d3d6e', margin: 0 }}>Tratamientos</h2>
        <button onClick={() => { setEsNuevo(true); setEditando({ ...vacio }) }}
            className="ct-btn ct-btn-primary ct-btn-sm">
            + Nuevo tratamiento
          </button>
      </div>

      <MensajeExito texto={exito} />
      <MensajeError texto={error} />

      <table className="ct-table" style={{ marginBottom: 24 }}>
        <thead>
          <tr>
            <th>Color</th>
            <th>Nombre</th>
            <th>Duración</th>
            <th>Precio base (Q)</th>
            <th>Estado</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {lista.map((t) => (
            <tr key={t.id}>
              <td>
                <div style={{
                  width: 20, height: 20, borderRadius: '50%',
                  background: t.color ?? '#c5ddf5', border: '0.5px solid #e0eef8',
                }} />
              </td>
              <td style={{ fontWeight: 500 }}>{t.nombre}</td>
              <td style={{ color: '#5a8ab0', fontSize: 13 }}>{t.duracion_min} min</td>
              <td style={{ color: '#5a8ab0', fontSize: 13 }}>
                {t.precio_base != null ? `Q ${Number(t.precio_base).toFixed(2)}` : '—'}
              </td>
              <td>
                <button
                  onClick={() => toggleActivo(t)}
                  style={{
                    height: 24, padding: '0 10px', fontSize: 11, fontWeight: 600, borderRadius: 20,
                    border: 'none', cursor: 'pointer',
                    background: t.activo ? '#e8fff5' : '#fff0f0',
                    color: t.activo ? '#0a5535' : '#7a1a1a',
                  }}
                >
                  {t.activo ? 'Activo' : 'Inactivo'}
                </button>
              </td>
              <td>
                <button
                  onClick={() => { setEsNuevo(false); setEditando({ ...t }) }}
                  style={{
                    height: 30, padding: '0 12px', fontSize: 12, borderRadius: 6,
                    border: '1px solid #c5ddf5', background: '#fff', color: '#1a6bbd', cursor: 'pointer',
                  }}
                >
                  Editar
                </button>
              </td>
            </tr>
          ))}
          {lista.length === 0 && (
            <tr><td colSpan={6} style={{ textAlign: 'center', color: '#5a8ab0' }}>No hay tratamientos registrados.</td></tr>
          )}
        </tbody>
      </table>

      {editando && (
        <div style={{ background: '#f7faff', border: '0.5px solid #c5ddf5', borderRadius: 12, padding: 20 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#0d3d6e', marginBottom: 16 }}>
            {esNuevo ? 'Nuevo tratamiento' : `Editar: ${editando.nombre}`}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div style={{ gridColumn: '1 / 3' }}>
              <Campo label="Nombre" requerido>
                <input style={inputStyle} value={editando.nombre}
                  onChange={(e) => setEditando({ ...editando, nombre: e.target.value })} />
              </Campo>
            </div>
            <Campo label="Color en agenda">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <input
                  type="color"
                  value={editando.color ?? '#1a6bbd'}
                  onChange={(e) => setEditando({ ...editando, color: e.target.value })}
                  style={{ width: 40, height: 40, border: '0.5px solid #c5ddf5', borderRadius: 8, cursor: 'pointer', padding: 2 }}
                />
                <input style={{ ...inputStyle, width: 100 }} value={editando.color ?? ''}
                  onChange={(e) => setEditando({ ...editando, color: e.target.value })}
                  placeholder="#1a6bbd" />
              </div>
            </Campo>
            <Campo label="Duración (min)">
              <input type="number" min={5} step={5} style={inputStyle} value={editando.duracion_min}
                onChange={(e) => setEditando({ ...editando, duracion_min: Math.max(5, Number(e.target.value)) })} />
            </Campo>
            <Campo label="Precio base (Q)">
              <input type="number" min={0} step={0.01} style={inputStyle}
                value={editando.precio_base ?? ''}
                onChange={(e) => setEditando({ ...editando, precio_base: e.target.value === '' ? null : Number(e.target.value) })}
                placeholder="Opcional" />
            </Campo>
            <Campo label="Estado">
              <select style={{ ...inputStyle, cursor: 'pointer' }}
                value={editando.activo ? 'activo' : 'inactivo'}
                onChange={(e) => setEditando({ ...editando, activo: e.target.value === 'activo' })}>
                <option value="activo">Activo</option>
                <option value="inactivo">Inactivo</option>
              </select>
            </Campo>
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button onClick={() => { setEditando(null); setEsNuevo(false); setError(null) }}
              className="ct-btn ct-btn-secondary">Cancelar</button>
            <button onClick={guardar} disabled={guardando} className="ct-btn ct-btn-primary"
              style={{ opacity: guardando ? 0.6 : 1 }}>
              {guardando ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Sección Notificaciones ────────────────────────────────────────────────────

function SeccionNotificaciones() {
  const DEFAULT: NotificacionConfig = {
    id: null,
    email_activo: true,
    horas_recordatorio_1: 24,
    horas_recordatorio_2: 2,
    plantilla_confirmacion:   'Hola {paciente}, tu cita en {clinica} fue confirmada para el {fecha} a las {hora} con {dentista}.',
    plantilla_recordatorio:   'Hola {paciente}, te recordamos tu cita en {clinica} el {fecha} a las {hora} con {dentista}.',
    plantilla_cancelacion:    'Hola {paciente}, tu cita en {clinica} del {fecha} a las {hora} fue cancelada.',
    plantilla_reprogramacion: 'Hola {paciente}, tu cita en {clinica} fue reprogramada para el {fecha} a las {hora}.',
  }

  const [cfg, setCfg]             = useState<NotificacionConfig>(DEFAULT)
  const [cargando, setCargando]   = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [exito, setExito]         = useState<string | null>(null)
  const [error, setError]         = useState<string | null>(null)

  useEffect(() => {
    supabase.from('notificacion_config')
      .select('id, email_activo, horas_recordatorio_1, horas_recordatorio_2, plantilla_confirmacion, plantilla_recordatorio, plantilla_cancelacion, plantilla_reprogramacion')
      .eq('empresa_id', EMPRESA_ID).maybeSingle()
      .then(({ data }) => {
        if (data) setCfg(data as NotificacionConfig)
        setCargando(false)
      })
  }, [])

  async function guardar() {
    setError(null); setGuardando(true); setExito(null)
    try {
      if (cfg.id) {
        const { error: err } = await supabase.from('notificacion_config')
          .update({
            email_activo:            cfg.email_activo,
            horas_recordatorio_1:    cfg.horas_recordatorio_1,
            horas_recordatorio_2:    cfg.horas_recordatorio_2,
            plantilla_confirmacion:  cfg.plantilla_confirmacion,
            plantilla_recordatorio:  cfg.plantilla_recordatorio,
            plantilla_cancelacion:   cfg.plantilla_cancelacion,
            plantilla_reprogramacion: cfg.plantilla_reprogramacion,
            actualizado_en:          new Date().toISOString(),
          })
          .eq('id', cfg.id)
        if (err) throw err
      } else {
        const { data, error: err } = await supabase.from('notificacion_config')
          .insert({
            empresa_id:              EMPRESA_ID,
            email_activo:            cfg.email_activo,
            horas_recordatorio_1:    cfg.horas_recordatorio_1,
            horas_recordatorio_2:    cfg.horas_recordatorio_2,
            plantilla_confirmacion:  cfg.plantilla_confirmacion,
            plantilla_recordatorio:  cfg.plantilla_recordatorio,
            plantilla_cancelacion:   cfg.plantilla_cancelacion,
            plantilla_reprogramacion: cfg.plantilla_reprogramacion,
          })
          .select('id').single()
        if (err) throw err
        setCfg((prev) => ({ ...prev, id: (data as { id: string }).id }))
      }
      setExito('Configuración de notificaciones guardada.')
    } catch (e: unknown) {
      console.error(e)
      setError('Ocurrió un error al guardar.')
    } finally {
      setGuardando(false)
    }
  }

  if (cargando) return <div style={{ padding: '32px 0', textAlign: 'center', color: '#5a8ab0', fontSize: 14 }}>Cargando...</div>

  return (
    <div>
      <h2 style={{ fontSize: 18, fontWeight: 600, color: '#0d3d6e', margin: '0 0 20px' }}>Notificaciones</h2>
      <MensajeExito texto={exito} />
      <MensajeError texto={error} />

      {/* Toggle email */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20,
        padding: '14px 16px', background: '#f0f7ff', borderRadius: 8, border: '0.5px solid #c5ddf5',
      }}>
        <input type="checkbox" className="ct-checkbox" id="emailActivo"
          checked={cfg.email_activo}
          onChange={(e) => setCfg({ ...cfg, email_activo: e.target.checked })} />
        <label htmlFor="emailActivo" style={{ fontSize: 14, fontWeight: 500, color: '#0d3d6e', cursor: 'pointer' }}>
          Enviar notificaciones por email
        </label>
      </div>

      {/* Recordatorios */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
        <Campo label="Recordatorio 1 (horas antes de la cita)">
          <input type="number" min={1} max={168} style={inputStyle}
            value={cfg.horas_recordatorio_1}
            onChange={(e) => setCfg({ ...cfg, horas_recordatorio_1: Math.max(1, Number(e.target.value)) })} />
        </Campo>
        <Campo label="Recordatorio 2 (horas antes de la cita)">
          <input type="number" min={1} max={48} style={inputStyle}
            value={cfg.horas_recordatorio_2}
            onChange={(e) => setCfg({ ...cfg, horas_recordatorio_2: Math.max(1, Number(e.target.value)) })} />
        </Campo>
      </div>

      <hr style={{ border: 'none', borderTop: '0.5px solid #e0eef8', margin: '0 0 20px' }} />
      <div style={{ fontSize: 12, color: '#5a8ab0', marginBottom: 16 }}>
        Variables disponibles: <code style={{ background: '#f0f7ff', padding: '1px 4px', borderRadius: 4 }}>
          {'{paciente}'} {'{clinica}'} {'{fecha}'} {'{hora}'} {'{dentista}'}
        </code>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}>
        <Campo label="Plantilla de confirmación">
          <textarea className="ct-textarea" rows={2}
            value={cfg.plantilla_confirmacion}
            onChange={(e) => setCfg({ ...cfg, plantilla_confirmacion: e.target.value })} />
        </Campo>
        <Campo label="Plantilla de recordatorio">
          <textarea className="ct-textarea" rows={2}
            value={cfg.plantilla_recordatorio}
            onChange={(e) => setCfg({ ...cfg, plantilla_recordatorio: e.target.value })} />
        </Campo>
        <Campo label="Plantilla de cancelación">
          <textarea className="ct-textarea" rows={2}
            value={cfg.plantilla_cancelacion}
            onChange={(e) => setCfg({ ...cfg, plantilla_cancelacion: e.target.value })} />
        </Campo>
        <Campo label="Plantilla de reprogramación">
          <textarea className="ct-textarea" rows={2}
            value={cfg.plantilla_reprogramacion}
            onChange={(e) => setCfg({ ...cfg, plantilla_reprogramacion: e.target.value })} />
        </Campo>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button onClick={guardar} disabled={guardando} className="ct-btn ct-btn-primary"
            style={{ opacity: guardando ? 0.6 : 1 }}>
            {guardando ? 'Guardando...' : 'Guardar configuración'}
          </button>
      </div>
    </div>
  )
}

// ── Sección FEL / Facturación ─────────────────────────────────────────────────

function SeccionFel() {
  const [cfg, setCfg]             = useState<FelConfig | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [exito, setExito]         = useState<string | null>(null)
  const [error, setError]         = useState<string | null>(null)

  useEffect(() => {
    supabase.from('fel_config')
      .select('id, certificador, regimen, tasa_iva, nit_emisor, nombre_emisor, direccion_emisor, ambiente')
      .eq('empresa_id', EMPRESA_ID).maybeSingle()
      .then(({ data }) => {
        if (data) setCfg(data as FelConfig)
        else setCfg({
          id: '', certificador: null, regimen: 'pequeño_contribuyente', tasa_iva: 5,
          nit_emisor: null, nombre_emisor: null, direccion_emisor: null, ambiente: 'pruebas',
        })
      })
  }, [])

  async function guardar() {
    if (!cfg) return
    setError(null); setGuardando(true); setExito(null)
    try {
      const payload = {
        certificador:    cfg.certificador?.trim() || null,
        regimen:         cfg.regimen,
        tasa_iva:        cfg.tasa_iva,
        nit_emisor:      cfg.nit_emisor?.trim() || null,
        nombre_emisor:   cfg.nombre_emisor?.trim() || null,
        direccion_emisor: cfg.direccion_emisor?.trim() || null,
        ambiente:        cfg.ambiente,
        actualizado_en:  new Date().toISOString(),
      }
      if (cfg.id) {
        const { error: err } = await supabase.from('fel_config')
          .update(payload).eq('id', cfg.id)
        if (err) throw err
      } else {
        const { data, error: err } = await supabase.from('fel_config')
          .insert({ empresa_id: EMPRESA_ID, ...payload })
          .select('id').single()
        if (err) throw err
        setCfg((prev) => prev ? { ...prev, id: (data as { id: string }).id } : prev)
      }
      setExito('Configuración FEL guardada correctamente.')
    } catch (e: unknown) {
      console.error(e)
      setError('Ocurrió un error al guardar.')
    } finally {
      setGuardando(false)
    }
  }

  if (!cfg) return <div style={{ padding: '32px 0', textAlign: 'center', color: '#5a8ab0', fontSize: 14 }}>Cargando...</div>

  return (
    <div>
      <h2 style={{ fontSize: 18, fontWeight: 600, color: '#0d3d6e', margin: '0 0 4px' }}>
        FEL / Facturación Electrónica
      </h2>
      <p style={{ fontSize: 13, color: '#5a8ab0', marginBottom: 20 }}>
        Configuración para la emisión de facturas electrónicas ante el SAT Guatemala.
      </p>

      <MensajeExito texto={exito} />
      <MensajeError texto={error} />

      {/* Ambiente */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20,
        padding: '14px 16px', background: cfg.ambiente === 'produccion' ? '#fff8e8' : '#f0f7ff',
        borderRadius: 8, border: `0.5px solid ${cfg.ambiente === 'produccion' ? '#f0c040' : '#c5ddf5'}`,
      }}>
        <span style={{ fontSize: 13, fontWeight: 500, color: '#0d3d6e' }}>Ambiente:</span>
        {(['pruebas', 'produccion'] as const).map((a) => (
          <button key={a} onClick={() => setCfg({ ...cfg, ambiente: a })}
            style={{
              height: 32, padding: '0 14px', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 500,
              background: cfg.ambiente === a ? (a === 'produccion' ? '#f0c040' : '#1a6bbd') : '#fff',
              color: cfg.ambiente === a ? (a === 'produccion' ? '#7a5500' : '#fff') : '#5a8ab0',
              border: `1px solid ${cfg.ambiente === a ? (a === 'produccion' ? '#f0c040' : '#1a6bbd') : '#c5ddf5'}`,
            }}
          >
            {a === 'pruebas' ? 'Pruebas' : 'Producción'}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <Campo label="Certificador FEL">
          <select style={{ ...inputStyle, cursor: 'pointer' }}
            value={cfg.certificador ?? ''}
            onChange={(e) => setCfg({ ...cfg, certificador: e.target.value || null })}>
            <option value="">Seleccionar...</option>
            {CERTIFICADORES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </Campo>
        <Campo label="Régimen fiscal">
          <select style={{ ...inputStyle, cursor: 'pointer' }}
            value={cfg.regimen}
            onChange={(e) => setCfg({ ...cfg, regimen: e.target.value,
              tasa_iva: e.target.value === 'pequeño_contribuyente' ? 5 : 12 })}>
            {REGIMENES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </Campo>
        <Campo label="Tasa IVA (%)">
          <input type="number" min={0} max={100} step={0.01} style={inputStyle}
            value={cfg.tasa_iva}
            onChange={(e) => setCfg({ ...cfg, tasa_iva: Number(e.target.value) })} />
        </Campo>
        <Campo label="NIT emisor">
          <input style={inputStyle} value={cfg.nit_emisor ?? ''}
            onChange={(e) => setCfg({ ...cfg, nit_emisor: e.target.value })}
            placeholder="NIT de la clínica" />
        </Campo>
        <div style={{ gridColumn: '1 / -1' }}>
          <Campo label="Nombre del emisor">
            <input style={inputStyle} value={cfg.nombre_emisor ?? ''}
              onChange={(e) => setCfg({ ...cfg, nombre_emisor: e.target.value })}
              placeholder="Nombre legal que aparece en la factura" />
          </Campo>
        </div>
        <div style={{ gridColumn: '1 / -1' }}>
          <Campo label="Dirección del emisor">
            <input style={inputStyle} value={cfg.direccion_emisor ?? ''}
              onChange={(e) => setCfg({ ...cfg, direccion_emisor: e.target.value })}
              placeholder="Dirección que aparece en la factura" />
          </Campo>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button onClick={guardar} disabled={guardando} className="ct-btn ct-btn-primary"
            style={{ opacity: guardando ? 0.6 : 1 }}>
            {guardando ? 'Guardando...' : 'Guardar configuración FEL'}
          </button>
      </div>
    </div>
  )
}

// ── Componente raíz ───────────────────────────────────────────────────────────

export default function ConfiguracionApp() {
  const [tabActiva, setTabActiva] = useState('clinica')

  return (
    <div style={{ maxWidth: 1100 }}>
      {/* Encabezado */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 600, color: '#0d3d6e', margin: '0 0 4px' }}>
          Configuración
        </h1>
        <div style={{ fontSize: 14, color: '#5a8ab0' }}>
          Gestione los ajustes de su clínica, usuarios, tratamientos y facturación.
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '210px 1fr', gap: 20, alignItems: 'start' }}>

        {/* Menú lateral de tabs */}
        <div style={{ background: '#fff', border: '0.5px solid #c5ddf5', borderRadius: 12, overflow: 'hidden' }}>
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setTabActiva(tab.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                width: '100%', padding: '12px 16px', textAlign: 'left',
                background: tabActiva === tab.id ? '#f0f7ff' : '#fff',
                border: 'none',
                borderLeft: `3px solid ${tabActiva === tab.id ? '#1a6bbd' : 'transparent'}`,
                borderBottom: '0.5px solid #f0f7ff',
                cursor: 'pointer',
                fontSize: 13, fontWeight: tabActiva === tab.id ? 600 : 400,
                color: tabActiva === tab.id ? '#1a6bbd' : '#0d3d6e',
                transition: 'background 0.15s',
              }}
            >
              <span>{tab.icono}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Contenido de la sección */}
        <div style={{ background: '#fff', border: '0.5px solid #c5ddf5', borderRadius: 12, padding: '24px 28px' }}>
          {tabActiva === 'clinica'        && <SeccionClinica />}
          {tabActiva === 'sucursales'     && <SeccionSucursales />}
          {tabActiva === 'usuarios'       && <SeccionUsuarios />}
          {tabActiva === 'tratamientos'   && <SeccionTratamientos />}
          {tabActiva === 'notificaciones' && <SeccionNotificaciones />}
          {tabActiva === 'fel'            && <SeccionFel />}
        </div>
      </div>
    </div>
  )
}
