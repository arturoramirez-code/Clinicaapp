import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { sendEmail } from '@/lib/brevo'
import {
  templateConfirmacion,
  templateRecordatorio,
  templateCancelacion,
  templateReprogramacion,
} from '@/lib/email-templates'

// ─── Tipos ──────────────────────────────────────────────────────────────────

const TIPOS_VALIDOS = [
  'confirmacion',
  'recordatorio_1',
  'recordatorio_2',
  'cancelacion',
  'reprogramacion',
] as const

type TipoNotificacion = (typeof TIPOS_VALIDOS)[number]

// ─── Utilidades ─────────────────────────────────────────────────────────────

function formatearFecha(fechaISO: string): string {
  return new Date(fechaISO).toLocaleDateString('es-GT', {
    timeZone: 'America/Guatemala',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function formatearHora(fechaISO: string): string {
  return new Date(fechaISO).toLocaleTimeString('es-GT', {
    timeZone: 'America/Guatemala',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
}

function armarNombreCompleto(paciente: {
  primer_nombre: string
  segundo_nombre: string | null
  primer_apellido: string
  segundo_apellido: string | null
}): string {
  return [
    paciente.primer_nombre,
    paciente.segundo_nombre,
    paciente.primer_apellido,
    paciente.segundo_apellido,
  ]
    .filter(Boolean)
    .join(' ')
}

// ─── Handler ─────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  // Parsear body
  let citaId: string
  let tipo: TipoNotificacion

  try {
    const body = await request.json()
    citaId = body.cita_id
    tipo = body.tipo
  } catch {
    return NextResponse.json({ error: 'Cuerpo de solicitud inválido' }, { status: 400 })
  }

  if (!citaId || !tipo) {
    return NextResponse.json({ error: 'Se requiere cita_id y tipo' }, { status: 400 })
  }

  if (!(TIPOS_VALIDOS as readonly string[]).includes(tipo)) {
    return NextResponse.json({ error: 'Tipo de notificación inválido' }, { status: 400 })
  }

  // Obtener cita
  const { data: cita, error: errorCita } = await supabase
    .from('citas')
    .select(
      'id, empresa_id, sucursal_id, paciente_id, dentista_id, fecha_hora, motivo_cancelacion, cita_origen_id'
    )
    .eq('id', citaId)
    .single()

  if (errorCita || !cita) {
    console.error('Error al obtener cita:', errorCita)
    return NextResponse.json({ error: 'Cita no encontrada' }, { status: 404 })
  }

  // Obtener paciente
  const { data: paciente, error: errorPaciente } = await supabase
    .from('pacientes')
    .select('id, primer_nombre, segundo_nombre, primer_apellido, segundo_apellido, email')
    .eq('id', cita.paciente_id)
    .single()

  if (errorPaciente || !paciente) {
    console.error('Error al obtener paciente:', errorPaciente)
    return NextResponse.json({ error: 'Paciente no encontrado' }, { status: 404 })
  }

  // Verificar que el paciente tenga email
  if (!paciente.email) {
    return NextResponse.json({ skipped: true, reason: 'no_email' })
  }

  // Obtener dentista, sucursal y empresa en paralelo
  const [resDentista, resSucursal, resEmpresa, resConfig] = await Promise.all([
    supabase
      .from('usuarios')
      .select('nombre, apellido')
      .eq('id', cita.dentista_id)
      .single(),
    supabase
      .from('sucursales')
      .select('nombre, direccion')
      .eq('id', cita.sucursal_id)
      .single(),
    supabase
      .from('empresas')
      .select('nombre, nombre_comercial')
      .eq('id', cita.empresa_id)
      .single(),
    supabase
      .from('notificacion_config')
      .select(
        'email_activo, email_remitente_nombre, enviar_confirmacion, enviar_recordatorio_1, enviar_recordatorio_2, enviar_cancelacion, enviar_reprogramacion, horas_recordatorio_1, horas_recordatorio_2'
      )
      .eq('empresa_id', cita.empresa_id)
      .single(),
  ])

  if (resDentista.error || !resDentista.data) {
    console.error('Error al obtener dentista:', resDentista.error)
    return NextResponse.json({ error: 'Dentista no encontrado' }, { status: 404 })
  }
  if (resSucursal.error || !resSucursal.data) {
    console.error('Error al obtener sucursal:', resSucursal.error)
    return NextResponse.json({ error: 'Sucursal no encontrada' }, { status: 404 })
  }
  if (resEmpresa.error || !resEmpresa.data) {
    console.error('Error al obtener empresa:', resEmpresa.error)
    return NextResponse.json({ error: 'Empresa no encontrada' }, { status: 404 })
  }
  if (resConfig.error || !resConfig.data) {
    return NextResponse.json({ skipped: true, reason: 'sin_configuracion' })
  }

  const dentista = resDentista.data
  const sucursal = resSucursal.data
  const empresa = resEmpresa.data
  const config = resConfig.data

  // Verificar si el email está activo globalmente
  if (!config.email_activo) {
    return NextResponse.json({ skipped: true, reason: 'email_inactivo' })
  }

  // Verificar el flag específico para este tipo
  const flagPorTipo: Record<TipoNotificacion, boolean> = {
    confirmacion: config.enviar_confirmacion ?? false,
    recordatorio_1: config.enviar_recordatorio_1 ?? false,
    recordatorio_2: config.enviar_recordatorio_2 ?? false,
    cancelacion: config.enviar_cancelacion ?? false,
    reprogramacion: config.enviar_reprogramacion ?? false,
  }

  if (!flagPorTipo[tipo]) {
    return NextResponse.json({ skipped: true, reason: `${tipo}_desactivado` })
  }

  // Datos comunes para los templates
  const nombreClinica = empresa.nombre_comercial || empresa.nombre
  const nombrePaciente = armarNombreCompleto(paciente)
  const nombreDentista = [dentista.nombre, dentista.apellido].filter(Boolean).join(' ')
  const fechaCita = formatearFecha(cita.fecha_hora)
  const horaCita = formatearHora(cita.fecha_hora)
  const direccionSucursal = sucursal.direccion || sucursal.nombre

  // Construir asunto y HTML según el tipo
  let asunto: string
  let htmlContent: string

  if (tipo === 'confirmacion') {
    asunto = `Confirmación de cita — ${nombreClinica}`
    htmlContent = templateConfirmacion({
      paciente: nombrePaciente,
      clinica: nombreClinica,
      fecha: fechaCita,
      hora: horaCita,
      dentista: nombreDentista,
      direccion: direccionSucursal,
    })
  } else if (tipo === 'recordatorio_1' || tipo === 'recordatorio_2') {
    const horasAntes =
      tipo === 'recordatorio_1'
        ? (config.horas_recordatorio_1 ?? 24)
        : (config.horas_recordatorio_2 ?? 2)
    asunto = `Recordatorio de cita — ${nombreClinica}`
    htmlContent = templateRecordatorio({
      paciente: nombrePaciente,
      clinica: nombreClinica,
      fecha: fechaCita,
      hora: horaCita,
      dentista: nombreDentista,
      direccion: direccionSucursal,
      horasAntes,
    })
  } else if (tipo === 'cancelacion') {
    asunto = `Su cita ha sido cancelada — ${nombreClinica}`
    htmlContent = templateCancelacion({
      paciente: nombrePaciente,
      clinica: nombreClinica,
      fecha: fechaCita,
      hora: horaCita,
      motivo: cita.motivo_cancelacion || 'No especificado',
    })
  } else {
    // reprogramacion — obtener fecha/hora de la cita original
    let fechaAnterior = 'N/D'
    let horaAnterior = 'N/D'

    if (cita.cita_origen_id) {
      const { data: citaOrigen } = await supabase
        .from('citas')
        .select('fecha_hora')
        .eq('id', cita.cita_origen_id)
        .single()

      if (citaOrigen) {
        fechaAnterior = formatearFecha(citaOrigen.fecha_hora)
        horaAnterior = formatearHora(citaOrigen.fecha_hora)
      }
    }

    asunto = `Su cita ha sido reprogramada — ${nombreClinica}`
    htmlContent = templateReprogramacion({
      paciente: nombrePaciente,
      clinica: nombreClinica,
      fechaAnterior,
      horaAnterior,
      fechaNueva: fechaCita,
      horaNueva: horaCita,
      dentista: nombreDentista,
    })
  }

  // Enviar el correo
  const senderName = config.email_remitente_nombre || nombreClinica
  const enviado = await sendEmail({
    to: paciente.email,
    toName: nombrePaciente,
    subject: asunto,
    htmlContent,
    senderName,
  })

  // Registrar en la tabla notificaciones
  const { data: notificacion, error: errorInsert } = await supabase
    .from('notificaciones')
    .insert({
      empresa_id: cita.empresa_id,
      cita_id: citaId,
      paciente_id: cita.paciente_id,
      tipo,
      canal: 'email',
      destinatario: paciente.email,
      asunto,
      mensaje: htmlContent,
      estado: enviado ? 'enviado' : 'fallido',
      intentos: 1,
      programado_para: new Date().toISOString(),
      enviado_en: enviado ? new Date().toISOString() : null,
      error_detalle: enviado ? null : 'Fallo al enviar con Brevo',
    })
    .select('id')
    .single()

  if (errorInsert) {
    console.error('Error al registrar notificación:', errorInsert)
  }

  return NextResponse.json({
    success: enviado,
    notificacion_id: notificacion?.id ?? null,
  })
}
