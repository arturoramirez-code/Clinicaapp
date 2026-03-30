'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

// ── Helpers de estilo ─────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: '100%',
  height: 40,
  padding: '0 12px',
  fontSize: 14,
  border: '0.5px solid #c5ddf5',
  borderRadius: 8,
  background: '#ffffff',
  color: '#0d3d6e',
  outline: 'none',
  boxSizing: 'border-box',
}

const inputFocusStyle: React.CSSProperties = {
  borderColor: '#1a6bbd',
  boxShadow: '0 0 0 3px rgba(26,107,189,0.15)',
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 13,
  fontWeight: 500,
  color: '#5a8ab0',
  marginBottom: 4,
}

// ── Página ────────────────────────────────────────────────────────────────────

export default function PaginaLogin() {
  const router = useRouter()

  const [email, setEmail]           = useState('')
  const [password, setPassword]     = useState('')
  const [cargando, setCargando]     = useState(false)
  const [error, setError]           = useState<string | null>(null)
  const [focusEmail, setFocusEmail] = useState(false)
  const [focusPass, setFocusPass]   = useState(false)

  // ── Iniciar sesión ──────────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!email.trim()) {
      setError('El correo electrónico es requerido.')
      return
    }
    if (!password) {
      setError('La contraseña es requerida.')
      return
    }

    setCargando(true)
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email:    email.trim(),
        password: password,
      })

      if (authError) {
        // Mensajes de error en español guatemalteco
        if (authError.message.includes('Invalid login credentials')) {
          setError('Correo electrónico o contraseña incorrectos.')
        } else if (authError.message.includes('Email not confirmed')) {
          setError('Debés confirmar tu correo electrónico antes de ingresar.')
        } else if (authError.message.includes('Too many requests')) {
          setError('Demasiados intentos. Por favor esperá unos minutos e intentá de nuevo.')
        } else {
          setError('Ocurrió un error al iniciar sesión. Por favor intentá de nuevo.')
        }
        return
      }

      router.replace('/inicio')
    } catch {
      setError('Ocurrió un error inesperado. Por favor intentá de nuevo.')
    } finally {
      setCargando(false)
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#f7faff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <div style={{ width: '100%', maxWidth: 400 }}>

        {/* Logo / marca */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div
            style={{
              width: 52,
              height: 52,
              background: '#1a6bbd',
              borderRadius: 14,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 26,
              marginBottom: 14,
            }}
          >
            🏥
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 600, color: '#0d3d6e', margin: '0 0 4px' }}>
            ClinicaApp
          </h1>
          <p style={{ fontSize: 13, color: '#5a8ab0', margin: 0 }}>
            Strategic Solutions GT
          </p>
        </div>

        {/* Card de login */}
        <div
          style={{
            background: '#ffffff',
            border: '0.5px solid #c5ddf5',
            borderRadius: 12,
            padding: '28px 32px',
          }}
        >
          <h2 style={{ fontSize: 18, fontWeight: 600, color: '#0d3d6e', margin: '0 0 24px' }}>
            Iniciar sesión
          </h2>

          {/* Error */}
          {error && (
            <div
              style={{
                background: '#fff0f0',
                border: '0.5px solid #e84040',
                borderRadius: 8,
                padding: '10px 14px',
                color: '#e84040',
                fontSize: 13,
                marginBottom: 20,
              }}
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>

            {/* Correo */}
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>
                Correo electrónico <span style={{ color: '#e84040' }}>*</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(null) }}
                onFocus={() => setFocusEmail(true)}
                onBlur={() => setFocusEmail(false)}
                placeholder="ejemplo@clinica.com"
                autoComplete="email"
                style={focusEmail ? { ...inputStyle, ...inputFocusStyle } : inputStyle}
                disabled={cargando}
              />
            </div>

            {/* Contraseña */}
            <div style={{ marginBottom: 24 }}>
              <label style={labelStyle}>
                Contraseña <span style={{ color: '#e84040' }}>*</span>
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(null) }}
                onFocus={() => setFocusPass(true)}
                onBlur={() => setFocusPass(false)}
                placeholder="••••••••"
                autoComplete="current-password"
                style={focusPass ? { ...inputStyle, ...inputFocusStyle } : inputStyle}
                disabled={cargando}
              />
            </div>

            {/* Botón */}
            <button
              type="submit"
              disabled={cargando}
              style={{
                width: '100%',
                height: 40,
                background: cargando ? '#5a8ab0' : '#1a6bbd',
                color: '#ffffff',
                border: 'none',
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 500,
                cursor: cargando ? 'not-allowed' : 'pointer',
                transition: 'background 0.15s',
              }}
            >
              {cargando ? 'Ingresando...' : 'Ingresar'}
            </button>

          </form>
        </div>

        {/* Footer */}
        <p style={{ textAlign: 'center', fontSize: 12, color: '#5a8ab0', marginTop: 24 }}>
          © 2026 Strategic Solutions GT · ClinicaApp
        </p>

      </div>
    </div>
  )
}
