'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'
import { Plus_Jakarta_Sans } from 'next/font/google'

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-plus-jakarta',
})

// ─── Inline SVG Icons ───────────────────────────────────────────────────────

function IconCalendar({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  )
}

function IconDocument({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path d="M9 12h6m-6 4h6M7 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V8l-5-5H7z" />
    </svg>
  )
}

function IconReceipt({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path d="M9 14l2 2 4-4M3 21V5a2 2 0 012-2h14a2 2 0 012 2v16l-3-2-2 2-2-2-2 2-2-2-3 2z" />
    </svg>
  )
}

function IconCreditCard({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <path d="M2 10h20" />
    </svg>
  )
}

function IconShield({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path d="M12 2L4 6v6c0 5.25 3.75 10.15 8 11 4.25-.85 8-5.75 8-11V6l-8-4z" />
    </svg>
  )
}

function IconHome({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path d="M3 12l9-9 9 9M5 10v10a1 1 0 001 1h4v-5h4v5h4a1 1 0 001-1V10" />
    </svg>
  )
}

function IconLightning({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M13 2L4.09 12.97A1 1 0 005 14.5h6.5L10 22l9.91-10.97A1 1 0 0019 9.5h-6.5L13 2z" />
    </svg>
  )
}

function IconCheck({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  )
}

function IconX({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}

function IconStar({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  )
}

// ─── Feature Card ───────────────────────────────────────────────────────────

interface FeatureCardProps {
  icon: React.ReactNode
  iconBg: string
  title: string
  description: string
  badge?: string
  secondBadge?: React.ReactNode
  disclaimer?: string
}

function FeatureCard({ icon, iconBg, title, description, badge, secondBadge, disclaimer }: FeatureCardProps) {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-6 hover:border-[#0A6E5A]/30 hover:shadow-sm transition-all">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-4 ${iconBg}`}>
        {icon}
      </div>
      <h3 className="font-semibold text-gray-900 text-[15px] mb-2">{title}</h3>
      {badge && (
        <span className="inline-block text-[11px] font-medium text-blue-700 bg-blue-50 border border-blue-100 rounded-full px-2 py-0.5 mb-2">
          {badge}
        </span>
      )}
      {secondBadge && <div className="mb-2">{secondBadge}</div>}
      <p className="text-gray-500 text-[13.5px] leading-relaxed">{description}</p>
      {disclaimer && (
        <p className="text-xs text-amber-600 mt-2">{disclaimer}</p>
      )}
    </div>
  )
}

// ─── Plan Card ───────────────────────────────────────────────────────────────

interface PlanCardProps {
  name: string
  subtitle: string
  highlighted?: boolean
  badge?: string
  features: string[]
  disabled?: string[]
  ctaLabel: string
  ctaHref: string
  ctaVariant: 'outline' | 'green' | 'dark'
}

function PlanCard({ name, subtitle, highlighted, badge, features, disabled, ctaLabel, ctaHref, ctaVariant }: PlanCardProps) {
  const borderClass = highlighted
    ? 'border-2 border-[#0A6E5A] shadow-lg shadow-[#0A6E5A]/10'
    : 'border border-gray-200'

  const ctaClass =
    ctaVariant === 'green'
      ? 'w-full py-3 rounded-xl bg-[#0A6E5A] text-white font-semibold text-[15px] hover:bg-[#085c4a] transition-colors'
      : ctaVariant === 'outline'
      ? 'w-full py-3 rounded-xl border-2 border-[#0A6E5A] text-[#0A6E5A] font-semibold text-[15px] hover:bg-[#0A6E5A]/5 transition-colors'
      : 'w-full py-3 rounded-xl bg-gray-900 text-white font-semibold text-[15px] hover:bg-gray-800 transition-colors'

  return (
    <div className={`relative bg-white rounded-2xl p-8 flex flex-col ${borderClass}`}>
      {badge && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#0A6E5A] text-white text-[12px] font-semibold px-3 py-1 rounded-full whitespace-nowrap">
          {badge}
        </span>
      )}
      <div className="mb-6">
        <h3 className="font-bold text-xl text-gray-900 mb-1">{name}</h3>
        <p className="text-gray-500 text-[13.5px]">{subtitle}</p>
      </div>
      <ul className="space-y-3 mb-8 flex-1">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2.5">
            <IconCheck className="w-4 h-4 text-[#0A6E5A] mt-0.5 shrink-0" />
            <span className="text-gray-700 text-[13.5px]">{f}</span>
          </li>
        ))}
        {disabled?.map((f) => (
          <li key={f} className="flex items-start gap-2.5 opacity-40">
            <IconX className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
            <span className="text-gray-400 text-[13.5px] line-through">{f}</span>
          </li>
        ))}
      </ul>
      <Link href={ctaHref} className={ctaClass + ' text-center'}>
        {ctaLabel}
      </Link>
    </div>
  )
}

// ─── Contact Form ────────────────────────────────────────────────────────────

function ContactForm() {
  const [form, setForm] = useState({ nombre: '', clinica: '', email: '', plan: '', mensaje: '' })
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('loading')
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error('Error')
      setStatus('success')
      setForm({ nombre: '', clinica: '', email: '', plan: '', mensaje: '' })
    } catch {
      setStatus('error')
    }
  }

  const inputClass =
    'w-full h-10 px-3 rounded-lg border border-gray-200 bg-white text-[14px] text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#0A6E5A] focus:ring-2 focus:ring-[#0A6E5A]/10 transition-all'
  const labelClass = 'block text-[13px] font-medium text-gray-600 mb-1'

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-8">
      {status === 'success' ? (
        <div className="text-center py-8">
          <div className="w-14 h-14 bg-[#0A6E5A]/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <IconCheck className="w-7 h-7 text-[#0A6E5A]" />
          </div>
          <h3 className="font-bold text-gray-900 text-lg mb-2">¡Mensaje enviado!</h3>
          <p className="text-gray-500 text-[14px]">Le contactaremos a la brevedad posible.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={labelClass}>
              Nombre <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              className={inputClass}
              placeholder="Su nombre completo"
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
            />
          </div>
          <div>
            <label className={labelClass}>Clínica</label>
            <input
              type="text"
              className={inputClass}
              placeholder="Nombre de su clínica"
              value={form.clinica}
              onChange={(e) => setForm({ ...form, clinica: e.target.value })}
            />
          </div>
          <div>
            <label className={labelClass}>
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              required
              className={inputClass}
              placeholder="correo@ejemplo.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <div>
            <label className={labelClass}>
              Plan de interés <span className="text-red-500">*</span>
            </label>
            <select
              required
              className={inputClass + ' cursor-pointer'}
              value={form.plan}
              onChange={(e) => setForm({ ...form, plan: e.target.value })}
            >
              <option value="">Seleccione un plan</option>
              <option value="Estándar">Estándar</option>
              <option value="Pro">Pro</option>
              <option value="Enterprise">Enterprise</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Mensaje</label>
            <textarea
              rows={4}
              className={inputClass + ' h-auto resize-none py-2'}
              placeholder="¿En qué podemos ayudarle?"
              value={form.mensaje}
              onChange={(e) => setForm({ ...form, mensaje: e.target.value })}
            />
          </div>
          {status === 'error' && (
            <p className="text-[13px] text-red-600">Ocurrió un error. Por favor intente de nuevo.</p>
          )}
          <button
            type="submit"
            disabled={status === 'loading'}
            className="w-full py-3 rounded-xl bg-[#0A6E5A] text-white font-semibold text-[15px] hover:bg-[#085c4a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {status === 'loading' ? 'Enviando...' : 'Enviar mensaje'}
          </button>
        </form>
      )}
    </div>
  )
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <div className={`${plusJakarta.variable} font-[family-name:var(--font-plus-jakarta)] bg-white`}>

      {/* ── Navbar ─────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#0A6E5A] flex items-center justify-center">
              <svg className="w-4.5 h-4.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 2a8 8 0 100 16A8 8 0 0010 2zm1 11H9v-2h2v2zm0-4H9V7h2v2z" />
              </svg>
            </div>
            <span className="font-bold text-[17px] text-gray-900">ClinicaApp</span>
          </Link>

          {/* Nav links */}
          <nav className="hidden md:flex items-center gap-8">
            <a href="#funciones" className="text-[14px] text-gray-600 hover:text-[#0A6E5A] transition-colors font-medium">
              Funciones
            </a>
            <a href="#planes" className="text-[14px] text-gray-600 hover:text-[#0A6E5A] transition-colors font-medium">
              Planes
            </a>
            <a href="#contacto" className="text-[14px] text-gray-600 hover:text-[#0A6E5A] transition-colors font-medium">
              Contacto
            </a>
          </nav>

          {/* CTA buttons */}
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="hidden sm:inline-flex h-9 px-4 items-center rounded-lg border border-gray-300 text-[14px] font-medium text-gray-700 hover:border-[#0A6E5A] hover:text-[#0A6E5A] transition-colors"
            >
              Iniciar sesión
            </Link>
            <Link
              href="/login"
              className="h-9 px-4 inline-flex items-center rounded-lg bg-[#0A6E5A] text-white text-[14px] font-semibold hover:bg-[#085c4a] transition-colors"
            >
              Prueba gratis
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ───────────────────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-6 py-16 md:py-24 grid md:grid-cols-2 gap-12 items-center">
        {/* Left */}
        <div>
          <span className="inline-flex items-center gap-2 bg-[#0A6E5A]/8 text-[#0A6E5A] text-[13px] font-semibold px-3 py-1.5 rounded-full mb-6 border border-[#0A6E5A]/15">
            <IconStar className="w-3.5 h-3.5" />
            Diseñado para clínicas dentales
          </span>
          <h1 className="font-extrabold text-4xl md:text-5xl text-gray-900 leading-tight mb-5">
            Tu clínica dental<br />
            gestionada de forma{' '}
            <em className="not-italic text-[#0A6E5A]">inteligente</em>
          </h1>
          <p className="text-gray-500 text-[16px] leading-relaxed mb-8 max-w-md">
            Agenda citas, gestiona expedientes, emite facturas electrónicas y controla tu inventario — todo desde un solo lugar. Con inteligencia artificial integrada.
          </p>
          <div className="flex flex-wrap gap-3 mb-8">
            <Link
              href="/login"
              className="h-12 px-6 inline-flex items-center rounded-xl bg-[#0A6E5A] text-white text-[15px] font-semibold hover:bg-[#085c4a] transition-colors"
            >
              Iniciar prueba gratis
            </Link>
            <a
              href="#funciones"
              className="h-12 px-6 inline-flex items-center rounded-xl border-2 border-gray-200 text-gray-700 text-[15px] font-semibold hover:border-[#0A6E5A] hover:text-[#0A6E5A] transition-colors"
            >
              Ver demo
            </a>
          </div>
          {/* Trust pills */}
          <div className="flex flex-wrap gap-2">
            {['30 días gratis', 'Sin tarjeta de crédito', 'Facturación electrónica incluida'].map((pill) => (
              <span
                key={pill}
                className="flex items-center gap-1.5 text-[12.5px] text-gray-500 bg-gray-50 border border-gray-100 px-3 py-1.5 rounded-full"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#0A6E5A] inline-block" />
                {pill}
              </span>
            ))}
          </div>
        </div>

        {/* Right — dark image panel */}
        <div className="relative h-[420px] md:h-[500px] rounded-2xl overflow-hidden bg-[#1a2535]">
          <Image
            src="/MedicoClinicaApp.png"
            alt="Médico usando ClinicaApp"
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-cover opacity-80"
            priority
          />
          <div className="absolute inset-0 bg-[#1a2535]/40" />
          {/* Floating chip */}
          <div className="absolute bottom-5 left-5 bg-white rounded-xl px-4 py-3 flex items-center gap-3 shadow-xl max-w-[220px]">
            <div className="w-9 h-9 rounded-lg bg-[#0A6E5A]/10 flex items-center justify-center shrink-0">
              <IconLightning className="w-4 h-4 text-[#0A6E5A]" />
            </div>
            <div>
              <p className="font-semibold text-gray-900 text-[13px] leading-tight">IA activa en tu clínica</p>
              <p className="text-gray-500 text-[11px] mt-0.5">Notas clínicas y sugerencias automáticas</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ───────────────────────────────────────────────────────── */}
      <section id="funciones" className="bg-white py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <p className="text-[#0A6E5A] font-semibold text-[13px] uppercase tracking-widest mb-3">Funcionalidades</p>
            <h2 className="font-bold text-3xl text-gray-900">Todo lo que necesita su clínica</h2>
            <p className="text-gray-500 mt-3 text-[15px] max-w-xl mx-auto">
              Desde la agenda hasta la factura, cubrimos todos los procesos clave de su clínica dental.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            <FeatureCard
              icon={<IconCalendar className="w-5 h-5 text-[#0A6E5A]" />}
              iconBg="bg-[#0A6E5A]/10"
              title="Agenda inteligente"
              description="Calendario semanal con disponibilidad en tiempo real. Recordatorios automáticos por email y WhatsApp. Lista de espera integrada."
            />
            <FeatureCard
              icon={<IconDocument className="w-5 h-5 text-indigo-600" />}
              iconBg="bg-indigo-50"
              title="Expediente clínico"
              description="Notas de evolución por cita, odontograma interactivo por caras con historial completo de cambios, recetas médicas y archivos adjuntos (radiografías, fotos intraorales)."
              badge="IA disponible en plan Pro"
              secondBadge={
                <span className="inline-flex items-center gap-1 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold px-2 py-0.5 rounded-full mt-1">
                  ◆ Odontograma interactivo incluido
                </span>
              }
            />
            <FeatureCard
              icon={<IconReceipt className="w-5 h-5 text-orange-600" />}
              iconBg="bg-orange-50"
              title="Facturación electrónica"
              description="Emite facturas electrónicas según la normativa local. IVA configurado por régimen fiscal. Compatible con los principales certificadores."
              disclaimer="* La integración con el certificador electrónico tiene costo adicional según proveedor."
            />
            <FeatureCard
              icon={<IconCreditCard className="w-5 h-5 text-[#0A6E5A]" />}
              iconBg="bg-[#0A6E5A]/10"
              title="Control de pagos a plazos"
              description="Planes de pago por tratamiento: define cuotas, registra abonos y lleva el control financiero completo por paciente. Factura una cuota a la vez."
            />
            <FeatureCard
              icon={<IconShield className="w-5 h-5 text-rose-600" />}
              iconBg="bg-rose-50"
              title="Inventario y stock"
              description="Control de materiales dentales con alertas de stock mínimo. Registro de consumos por cita. Movimientos auditados."
            />
            <FeatureCard
              icon={<IconHome className="w-5 h-5 text-sky-600" />}
              iconBg="bg-sky-50"
              title="Multi-sucursal y roles"
              description="Gestiona varias sedes desde una sola cuenta. Control de acceso por rol: admin, dentista, recepcionista, asistente."
            />
          </div>
        </div>
      </section>

      {/* ── AI Banner ──────────────────────────────────────────────────────── */}
      <section className="py-20" style={{ background: 'linear-gradient(135deg, #0A6E5A 0%, #0d5c78 100%)' }}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col lg:flex-row lg:items-center gap-10">
            <div className="flex-1">
              <span className="inline-flex items-center gap-2 bg-white/15 text-white text-[12.5px] font-semibold px-3 py-1.5 rounded-full mb-5 border border-white/20">
                <IconLightning className="w-3.5 h-3.5" />
                Inteligencia Artificial integrada
              </span>
              <h2 className="font-bold text-3xl md:text-4xl text-white mb-4">
                Tu asistente clínico<br />siempre disponible
              </h2>
              <p className="text-white/80 text-[15px] leading-relaxed mb-7 max-w-xl">
                ClinicaApp incorpora inteligencia artificial en los flujos clínicos clave. El sistema sugiere tratamientos basado en el historial del paciente, ayuda a redactar notas de evolución y genera resúmenes automáticos del expediente — para que el dentista se enfoque en el paciente, no en el papeleo.
              </p>
              <div className="flex flex-wrap gap-2">
                {[
                  'Sugerencias de tratamiento',
                  'Notas clínicas asistidas',
                  'Resúmenes de expediente',
                  'Sin configuración adicional',
                ].map((pill) => (
                  <span key={pill} className="text-[12.5px] text-white bg-white/15 border border-white/20 px-3 py-1.5 rounded-full font-medium">
                    {pill}
                  </span>
                ))}
              </div>
            </div>
            <div className="lg:text-right shrink-0">
              <p className="text-white/70 text-[13px] font-medium mb-3">Disponible en todos los planes</p>
              <a
                href="#funciones"
                className="inline-flex items-center h-11 px-6 rounded-xl border-2 border-white text-white text-[14px] font-semibold hover:bg-white hover:text-[#0A6E5A] transition-colors"
              >
                Ver cómo funciona
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── SaaS Banner ────────────────────────────────────────────────────── */}
      <section className="py-16 bg-[#0f1117]">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row md:items-center gap-8 md:gap-16">
          <div className="flex-1">
            <h3 className="font-bold text-2xl md:text-3xl text-white mb-2">
              Software 24/7 — sin instalaciones, sin servidores
            </h3>
            <p className="text-gray-400 text-[15px] mb-6">
              Accede desde cualquier dispositivo. Actualizaciones automáticas. Backups diarios. Soporte incluido.
            </p>
            <div className="flex flex-wrap gap-2">
              {[
                'Facturación electrónica',
                'IVA configurado',
                'Soporte local',
                'Seguridad multicapa',
              ].map((pill) => (
                <span key={pill} className="text-[12.5px] text-gray-300 bg-white/8 border border-white/10 px-3 py-1.5 rounded-full">
                  {pill}
                </span>
              ))}
            </div>
          </div>
          <div className="shrink-0">
            <Link
              href="/login"
              className="inline-flex items-center h-12 px-8 rounded-xl bg-[#0A6E5A] text-white text-[15px] font-semibold hover:bg-[#085c4a] transition-colors"
            >
              Empezar ahora
            </Link>
          </div>
        </div>
      </section>

      {/* ── Plans ──────────────────────────────────────────────────────────── */}
      <section id="planes" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-14">
            <p className="text-[#0A6E5A] font-semibold text-[13px] uppercase tracking-widest mb-3">Planes</p>
            <h2 className="font-bold text-3xl text-gray-900">Elige el plan para su clínica</h2>
            <p className="text-gray-500 mt-3 text-[15px]">30 días gratis en todos los planes. Sin tarjeta de crédito.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
            <PlanCard
              name="Estándar"
              subtitle="Para clínicas con 1 sede"
              features={[
                '1 sucursal',
                'Hasta 5 usuarios',
                'Agenda y expediente clínico',
                'Odontograma interactivo',
                'Facturación electrónica',
                'Sugerencias IA de tratamiento',
              ]}
              disabled={[
                'Inventario',
                'Multi-sucursal',
                'Notas IA + resúmenes Pro',
              ]}
              ctaLabel="Iniciar prueba gratis"
              ctaHref="/login"
              ctaVariant="outline"
            />
            <PlanCard
              name="Pro"
              subtitle="Para clínicas con varias sedes"
              highlighted
              badge="Más popular"
              features={[
                'Hasta 3 sucursales',
                '5 usuarios por sucursal',
                'Todo el plan Estándar',
                'Inventario incluido',
                'Reportería avanzada',
                '✨ Asistente IA Pro: notas asistidas + resúmenes automáticos',
                'Soporte prioritario',
              ]}
              ctaLabel="Iniciar prueba gratis"
              ctaHref="/login"
              ctaVariant="green"
            />
            <PlanCard
              name="Enterprise"
              subtitle="Para grupos clínicos grandes"
              features={[
                'Sucursales ilimitadas',
                'Usuarios negociados',
                'Todo el plan Pro',
                'Reportería empresarial',
                'Integración con sistemas existentes',
                'SLA con tiempo de respuesta',
                'Precio negociado',
              ]}
              ctaLabel="Contactar ventas"
              ctaHref="#contacto"
              ctaVariant="dark"
            />
          </div>
        </div>
      </section>

      {/* ── Contact ────────────────────────────────────────────────────────── */}
      <section id="contacto" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-12 items-start">
          {/* Left info */}
          <div>
            <p className="text-[#0A6E5A] font-semibold text-[13px] uppercase tracking-widest mb-3">Contacto</p>
            <h2 className="font-bold text-3xl text-gray-900 mb-4">
              ¿Listo para transformar su clínica?
            </h2>
            <p className="text-gray-500 text-[15px] leading-relaxed mb-8">
              Contáctenos y con gusto le explicamos cómo ClinicaApp puede adaptarse a los procesos de su clínica dental. Le responderemos en menos de 24 horas.
            </p>
            <div className="space-y-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#0A6E5A]/10 flex items-center justify-center">
                  <svg className="w-5 h-5 text-[#0A6E5A]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path d="M3 8l9-5 9 5v10a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
                    <path d="M9 21V12h6v9" />
                  </svg>
                </div>
                <div>
                  <p className="text-[12px] text-gray-400 font-medium">Email</p>
                  <a href="mailto:contacto@clinicaapp.com" className="text-[14px] text-gray-900 font-semibold hover:text-[#0A6E5A] transition-colors">
                    contacto@clinicaapp.com
                  </a>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#0A6E5A]/10 flex items-center justify-center">
                  <IconCheck className="w-5 h-5 text-[#0A6E5A]" />
                </div>
                <p className="text-[14px] text-gray-700 font-medium">Soporte incluido en todos los planes</p>
              </div>
            </div>
          </div>
          {/* Right form */}
          <ContactForm />
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <footer className="bg-gray-900 py-12">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 sm:grid-cols-3 gap-8">
          {/* Col 1 */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg bg-[#0A6E5A] flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 2a8 8 0 100 16A8 8 0 0010 2zm1 11H9v-2h2v2zm0-4H9V7h2v2z" />
                </svg>
              </div>
              <span className="font-bold text-white text-[16px]">ClinicaApp</span>
            </div>
            <p className="text-gray-500 text-[13px]">Strategic Solutions GT</p>
            <p className="text-gray-500 text-[13px]">© 2026 — Todos los derechos reservados</p>
          </div>
          {/* Col 2 */}
          <div>
            <h4 className="font-semibold text-white text-[13px] mb-4">Navegación</h4>
            <ul className="space-y-2.5">
              {[
                { label: 'Funciones', href: '#funciones' },
                { label: 'Planes', href: '#planes' },
                { label: 'Contacto', href: '#contacto' },
                { label: 'Iniciar sesión', href: '/login' },
              ].map((link) => (
                <li key={link.label}>
                  <a href={link.href} className="text-gray-400 text-[13px] hover:text-white transition-colors">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          {/* Col 3 */}
          <div>
            <h4 className="font-semibold text-white text-[13px] mb-4">Contacto</h4>
            <a
              href="mailto:contacto@clinicaapp.com"
              className="text-gray-400 text-[13px] hover:text-white transition-colors"
            >
              contacto@clinicaapp.com
            </a>
            <p className="text-gray-600 text-[12px] mt-4">Guatemala · Facturación electrónica local</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
