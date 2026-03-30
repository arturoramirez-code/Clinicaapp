'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { EMPRESA_ID } from '@/lib/config'

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface Sucursal {
  id: string
  nombre: string
  direccion: string | null
  telefono: string | null
  email: string | null
  es_principal: boolean
  activa: boolean
}

// ── Helpers de estilo ─────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: '100%', height: 40, padding: '0 12px', fontSize: 14,
  border: '0.5px solid #c5ddf5', borderRadius: 8, background: '#fff',
  color: '#0d3d6e', outline: 'none', boxSizing: 'border-box',
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 13, fontWeight: 500, color: '#5a8ab0', marginBottom: 4,
}

function Campo({ label, requerido, children }: { label: string; requerido?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label style={labelStyle}>
        {label}{requerido && <span style={{ color: '#e84040' }}> *</span>}
      </label>
      {children}
    </div>
  )
}

// ── Página ────────────────────────────────────────────────────────────────────

export default function PaginaSucursales() {
  const [sucursales, setSucursales] = useState<Sucursal[]>([])
  const [editando, setEditando]     = useState<Sucursal | null>(null)
  const [guardando, setGuardando]   = useState(false)
  const [exito, setExito]           = useState<string | null>(null)
  const [error, setError]           = useState<string | null>(null)
  const [nuevo, setNuevo]           = useState(false)


  useEffect(() => {
    supabase
      .from('sucursales')
      .select('id, nombre, direccion, telefono, email, es_principal, activa')
      .eq('empresa_id', EMPRESA_ID)
      .order('es_principal', { ascending: false })
      .order('nombre')
      .then(({ data }) => setSucursales((data as Sucursal[]) ?? []))
  }, [])

  // ── Guardar ────────────────────────────────────────────────────────────────

  async function guardarEdicion() {
    if (!editando?.nombre.trim()) { setError('El nombre es requerido.'); return }
    setError(null); setGuardando(true); setExito(null)
    try {
      if (nuevo) {
        const { data, error: err } = await supabase
          .from('sucursales')
          .insert({
            empresa_id: EMPRESA_ID,
            nombre:     editando.nombre.trim(),
            direccion:  editando.direccion?.trim() || null,
            telefono:   editando.telefono?.trim() || null,
            email:      editando.email?.trim() || null,
            activa:     editando.activa,
          })
          .select()
          .single()
        if (err) throw err
        setSucursales((prev) => [...prev, data as Sucursal])
      } else {
        const { error: err } = await supabase
          .from('sucursales')
          .update({
            nombre:    editando.nombre.trim(),
            direccion: editando.direccion?.trim() || null,
            telefono:  editando.telefono?.trim() || null,
            email:     editando.email?.trim() || null,
            activa:    editando.activa,
          })
          .eq('id', editando.id)
          .eq('empresa_id', EMPRESA_ID)
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
    const { error: err } = await supabase
      .from('sucursales')
      .update({ activa: !suc.activa })
      .eq('id', suc.id)
      .eq('empresa_id', EMPRESA_ID)
    if (!err) setSucursales((prev) => prev.map((s) => s.id === suc.id ? { ...s, activa: !s.activa } : s))
  }

  function abrirNueva() {
    setNuevo(true)
    setEditando({ id: '', nombre: '', direccion: null, telefono: null, email: null, es_principal: false, activa: true })
    setError(null)
    setExito(null)
  }

  // ── Lógica de límite ───────────────────────────────────────────────────────


  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div>
      {/* Breadcrumb */}
      <nav style={{ fontSize: 13, color: '#5a8ab0', marginBottom: 16 }}>
        <Link href="/configuracion" style={{ color: '#1a6bbd', textDecoration: 'none' }}>
          Configuración
        </Link>
        <span style={{ margin: '0 6px' }}>›</span>
        <span style={{ color: '#0d3d6e', fontWeight: 500 }}>Sucursales</span>
      </nav>

      {/* Encabezado */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 600, color: '#0d3d6e', margin: 0 }}>Sucursales</h1>
        </div>

        <button
          onClick={abrirNueva}
          className="ct-btn ct-btn-primary"
        >
          + Nueva sucursal
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
      <div className="ct-card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="ct-table" style={{ margin: 0 }}>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Dirección</th>
              <th>Teléfono</th>
              <th>Email</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {sucursales.map((suc) => (
              <tr key={suc.id}>
                <td>
                  <div style={{ fontWeight: 500, color: '#0d3d6e' }}>{suc.nombre}</div>
                  {suc.es_principal && (
                    <span style={{ fontSize: 11, background: '#e8f4ff', color: '#1a6bbd', borderRadius: 20, padding: '1px 6px' }}>
                      Principal
                    </span>
                  )}
                </td>
                <td style={{ color: '#5a8ab0', fontSize: 13 }}>{suc.direccion || '—'}</td>
                <td style={{ color: '#5a8ab0', fontSize: 13 }}>{suc.telefono || '—'}</td>
                <td style={{ color: '#5a8ab0', fontSize: 13 }}>{suc.email || '—'}</td>
                <td>
                  <button
                    onClick={() => toggleActiva(suc)}
                    disabled={suc.es_principal}
                    style={{
                      height: 24, padding: '0 10px', fontSize: 11, fontWeight: 600, borderRadius: 20,
                      border: 'none', cursor: suc.es_principal ? 'default' : 'pointer',
                      background: suc.activa ? '#e8fff5' : '#fff0f0',
                      color:      suc.activa ? '#0a5535' : '#7a1a1a',
                      opacity:    suc.es_principal ? 0.7 : 1,
                    }}
                  >
                    {suc.activa ? 'Activa' : 'Inactiva'}
                  </button>
                </td>
                <td>
                  <button
                    onClick={() => { setNuevo(false); setEditando({ ...suc }); setError(null); setExito(null) }}
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
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', color: '#5a8ab0', padding: '32px 0' }}>
                  No se encontraron sucursales.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Formulario inline */}
      {editando && (
        <div className="ct-card" style={{ marginTop: 20 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#0d3d6e', marginBottom: 16 }}>
            {nuevo ? 'Nueva sucursal' : `Editar: ${editando.nombre}`}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <Campo label="Nombre" requerido>
              <input
                style={inputStyle}
                value={editando.nombre}
                onChange={(e) => setEditando({ ...editando, nombre: e.target.value })}
                placeholder="Nombre de la sucursal"
              />
            </Campo>
            <Campo label="Teléfono">
              <input
                style={inputStyle}
                value={editando.telefono ?? ''}
                onChange={(e) => setEditando({ ...editando, telefono: e.target.value })}
                placeholder="Ej. 2345-6789"
              />
            </Campo>
            <Campo label="Correo electrónico">
              <input
                style={inputStyle}
                type="email"
                value={editando.email ?? ''}
                onChange={(e) => setEditando({ ...editando, email: e.target.value })}
                placeholder="sucursal@clinica.com"
              />
            </Campo>
            <Campo label="Estado">
              <select
                style={{ ...inputStyle, cursor: 'pointer' }}
                value={editando.activa ? 'activa' : 'inactiva'}
                onChange={(e) => setEditando({ ...editando, activa: e.target.value === 'activa' })}
              >
                <option value="activa">Activa</option>
                <option value="inactiva">Inactiva</option>
              </select>
            </Campo>
          </div>
          <Campo label="Dirección">
            <textarea
              style={{ ...inputStyle, height: 'auto', padding: '8px 12px', minHeight: 60, resize: 'vertical' }}
              value={editando.direccion ?? ''}
              onChange={(e) => setEditando({ ...editando, direccion: e.target.value })}
              placeholder="Dirección completa"
            />
          </Campo>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16 }}>
            <button
              onClick={() => { setEditando(null); setNuevo(false); setError(null) }}
              className="ct-btn ct-btn-secondary"
            >
              Cancelar
            </button>
            <button
              onClick={guardarEdicion}
              disabled={guardando}
              className="ct-btn ct-btn-primary"
              style={{ opacity: guardando ? 0.6 : 1 }}
            >
              {guardando ? 'Guardando...' : 'Guardar sucursal'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
