'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { EMPRESA_ID } from '@/lib/config'

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface Usuario {
  id: string
  nombre: string
  apellido: string | null
  email: string
  rol: string
  activo: boolean
}

// ── Constantes ────────────────────────────────────────────────────────────────

const ROLES = [
  { value: 'admin',         label: 'Administrador'  },
  { value: 'dentista',      label: 'Dentista'        },
  { value: 'asistente',     label: 'Asistente'       },
  { value: 'recepcionista', label: 'Recepcionista'   },
]

const ROL_CFG: Record<string, { bg: string; color: string }> = {
  admin:         { bg: '#e8f4ff', color: '#0d3d6e' },
  dentista:      { bg: '#e8fff5', color: '#0a5535' },
  asistente:     { bg: '#fff8e8', color: '#7a5500' },
  recepcionista: { bg: '#f5e8ff', color: '#5a1a8a' },
}

const inputStyle: React.CSSProperties = {
  width: '100%', height: 40, padding: '0 12px', fontSize: 14,
  border: '0.5px solid #c5ddf5', borderRadius: 8, background: '#fff',
  color: '#0d3d6e', outline: 'none', boxSizing: 'border-box',
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 13, fontWeight: 500, color: '#5a8ab0', marginBottom: 4,
}

const FORM_INICIAL = { nombre: '', apellido: '', email: '', rol: 'recepcionista' }

// ── Página ────────────────────────────────────────────────────────────────────

export default function PaginaUsuarios() {
  const [usuarios, setUsuarios]         = useState<Usuario[]>([])
  const [mostrarForm, setMostrarForm]   = useState(false)
  const [form, setForm]                 = useState(FORM_INICIAL)
  const [guardando, setGuardando]       = useState(false)
  const [exito, setExito]               = useState<string | null>(null)
  const [error, setError]               = useState<string | null>(null)

  useEffect(() => {
    supabase
      .from('usuarios')
      .select('id, nombre, apellido, email, rol, activo')
      .eq('empresa_id', EMPRESA_ID)
      .order('nombre')
      .then(({ data }) => setUsuarios((data as Usuario[]) ?? []))
  }, [])

  // ── Crear usuario ──────────────────────────────────────────────────────────

  async function crearUsuario() {
    if (!form.nombre.trim()) { setError('El nombre es requerido.'); return }
    if (!form.email.trim())  { setError('El correo electrónico es requerido.'); return }
    setError(null); setGuardando(true); setExito(null)
    try {
      const { data, error: err } = await supabase
        .from('usuarios')
        .insert({
          empresa_id: EMPRESA_ID,
          nombre:     form.nombre.trim(),
          apellido:   form.apellido.trim() || null,
          email:      form.email.trim(),
          rol:        form.rol,
          activo:     true,
        })
        .select()
        .single()
      if (err) throw err
      setUsuarios((prev) => [...prev, data as Usuario].sort((a, b) => a.nombre.localeCompare(b.nombre)))
      setExito('Usuario creado correctamente.')
      setMostrarForm(false)
      setForm(FORM_INICIAL)
    } catch (e: unknown) {
      console.error(e)
      const msg = e instanceof Error && (e as { message?: string }).message?.includes('duplicate')
        ? 'Ya existe un usuario con ese correo electrónico.'
        : 'Ocurrió un error al guardar. Por favor intente de nuevo.'
      setError(msg)
    } finally {
      setGuardando(false)
    }
  }

  async function toggleActivo(u: Usuario) {
    const { error: err } = await supabase
      .from('usuarios')
      .update({ activo: !u.activo })
      .eq('id', u.id)
      .eq('empresa_id', EMPRESA_ID)
    if (!err) setUsuarios((prev) => prev.map((x) => x.id === u.id ? { ...x, activo: !x.activo } : x))
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div>
      {/* Breadcrumb */}
      <nav style={{ fontSize: 13, color: '#5a8ab0', marginBottom: 16 }}>
        <Link href="/configuracion" style={{ color: '#1a6bbd', textDecoration: 'none' }}>
          Configuración
        </Link>
        <span style={{ margin: '0 6px' }}>›</span>
        <span style={{ color: '#0d3d6e', fontWeight: 500 }}>Usuarios y Roles</span>
      </nav>

      {/* Encabezado */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 600, color: '#0d3d6e', margin: 0 }}>Usuarios y Roles</h1>
        </div>

        <button
          onClick={() => { setMostrarForm(true); setError(null); setExito(null) }}
          className="ct-btn ct-btn-primary"
        >
          + Nuevo usuario
        </button>
      </div>

      {/* Mensajes */}
      {exito && (
        <div style={{
          background: '#e8fff5', border: '0.5px solid #2ecc8a', borderRadius: 8,
          padding: '10px 14px', color: '#0a5535', fontSize: 13, marginBottom: 16,
        }}>
          ✓ {exito}
        </div>
      )}
      {error && (
        <div style={{
          background: '#fff0f0', border: '0.5px solid #e84040', borderRadius: 8,
          padding: '10px 14px', color: '#e84040', fontSize: 13, marginBottom: 16,
        }}>
          {error}
        </div>
      )}

      {/* Tabla */}
      <div className="ct-card" style={{ padding: 0, overflow: 'hidden', marginBottom: mostrarForm ? 20 : 0 }}>
        <table className="ct-table" style={{ margin: 0 }}>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Correo electrónico</th>
              <th>Rol</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {usuarios.map((u) => (
              <tr key={u.id}>
                <td>
                  <div style={{ fontWeight: 500, color: '#0d3d6e' }}>
                    {u.nombre} {u.apellido ?? ''}
                  </div>
                </td>
                <td style={{ color: '#5a8ab0', fontSize: 13 }}>{u.email}</td>
                <td>
                  <span style={{
                    fontSize: 12, fontWeight: 500, borderRadius: 20, padding: '2px 10px',
                    background: ROL_CFG[u.rol]?.bg ?? '#f0f7ff',
                    color:      ROL_CFG[u.rol]?.color ?? '#0d3d6e',
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
                      color:      u.activo ? '#0a5535' : '#7a1a1a',
                    }}
                  >
                    {u.activo ? 'Activo' : 'Inactivo'}
                  </button>
                </td>
              </tr>
            ))}
            {usuarios.length === 0 && (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center', color: '#5a8ab0', padding: '32px 0' }}>
                  No se encontraron usuarios.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Formulario nuevo usuario */}
      {mostrarForm && (
        <div className="ct-card">
          <div style={{ fontSize: 15, fontWeight: 600, color: '#0d3d6e', marginBottom: 16 }}>
            Nuevo usuario
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div>
              <label style={labelStyle}>Nombre <span style={{ color: '#e84040' }}>*</span></label>
              <input
                style={inputStyle}
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                placeholder="Primer nombre"
              />
            </div>
            <div>
              <label style={labelStyle}>Apellido</label>
              <input
                style={inputStyle}
                value={form.apellido}
                onChange={(e) => setForm({ ...form, apellido: e.target.value })}
                placeholder="Apellido"
              />
            </div>
            <div>
              <label style={labelStyle}>Correo electrónico <span style={{ color: '#e84040' }}>*</span></label>
              <input
                style={inputStyle}
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="usuario@clinica.com"
              />
            </div>
            <div>
              <label style={labelStyle}>Rol</label>
              <select
                style={{ ...inputStyle, cursor: 'pointer' }}
                value={form.rol}
                onChange={(e) => setForm({ ...form, rol: e.target.value })}
              >
                {ROLES.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button
              onClick={() => { setMostrarForm(false); setForm(FORM_INICIAL); setError(null) }}
              className="ct-btn ct-btn-secondary"
            >
              Cancelar
            </button>
            <button
              onClick={crearUsuario}
              disabled={guardando}
              className="ct-btn ct-btn-primary"
              style={{ opacity: guardando ? 0.6 : 1 }}
            >
              {guardando ? 'Guardando...' : 'Crear usuario'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
