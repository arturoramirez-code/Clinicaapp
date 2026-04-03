import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// ─── Tipos ──────────────────────────────────────────────────────────────────

interface ConfigNotificacion {
  email_activo: boolean | null
  enviar_recordatorio_1: boolean | null
  enviar_recordatorio_2: boolean | null
  horas_recordatorio_1: number | null
  horas_recordatorio_2: number | null
}

// ─── Constantes ──────────────────────────────────────────────────────────────

// Ventana de ±30 minutos para considerar que un recordatorio "cae" en este ciclo.
// Si el cron corre cada hora, esto garantiza que no se salte ninguna cita.
const VENTANA_MINUTOS = 30

// ─── Utilidades ──────────────────────────────────────────────────────────────

// Devuelve true si la cita cae dentro de la ventana de ±VENTANA_MINUTOS
// alrededor del punto "ahora + horasAntes".
function dentroDeVentana(fechaHoraCita: string, horasAntes: number): boolean {
  const ahora = Date.now()
  const objetivoMs = ahora + horasAntes * 60 * 60 * 1000
  const ventanaMs = VENTANA_MINUTOS * 60 * 1000
  const citaMs = new Date(fechaHoraCita).getTime()
  return citaMs >= objetivoMs - ventanaMs && citaMs <= objetivoMs + ventanaMs
}

async function yaEnviado(
  citaId: string,
  tipo: 'recordatorio_1' | 'recordatorio_2'
): Promise<boolean> {
  const { data } = await supabase
    .from('notificaciones')
    .select('id')
    .eq('cita_id', citaId)
    .eq('tipo', tipo)
    .eq('estado', 'enviado')
    .limit(1)

  return (data?.length ?? 0) > 0
}

// ─── Handler ─────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  // Validar secreto de cron
  const cronSecret = request.headers.get('x-cron-secret')
  if (!process.env.CRON_SECRET || cronSecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  // Obtener citas agendadas o confirmadas en las próximas 48 horas
  const ahora = new Date()
  const limite = new Date(ahora.getTime() + 48 * 60 * 60 * 1000)

  const { data: citas, error: errorCitas } = await supabase
    .from('citas')
    .select('id, empresa_id, fecha_hora')
    .in('estado', ['agendada', 'confirmada'])
    .gte('fecha_hora', ahora.toISOString())
    .lte('fecha_hora', limite.toISOString())

  if (errorCitas) {
    console.error('Error al obtener citas para recordatorios:', errorCitas)
    return NextResponse.json({ error: 'Error al consultar citas' }, { status: 500 })
  }

  if (!citas || citas.length === 0) {
    return NextResponse.json({ procesadas: 0, enviadas: 0, omitidas: 0 })
  }

  // Cachear configs por empresa para evitar queries repetidas
  const cacheConfig = new Map<string, ConfigNotificacion | null>()

  async function obtenerConfig(empresaId: string): Promise<ConfigNotificacion | null> {
    if (cacheConfig.has(empresaId)) return cacheConfig.get(empresaId)!

    const { data, error } = await supabase
      .from('notificacion_config')
      .select(
        'email_activo, enviar_recordatorio_1, enviar_recordatorio_2, horas_recordatorio_1, horas_recordatorio_2'
      )
      .eq('empresa_id', empresaId)
      .single()

    const config = error || !data ? null : data
    cacheConfig.set(empresaId, config)
    return config
  }

  // URL base para llamar al endpoint de envío internamente
  const baseUrl = new URL(request.url).origin

  let procesadas = 0
  let enviadas = 0
  let omitidas = 0

  for (const cita of citas) {
    procesadas++

    const config = await obtenerConfig(cita.empresa_id)

    // Sin config o email inactivo → omitir toda la cita
    if (!config || !config.email_activo) {
      omitidas++
      continue
    }

    const horasR1 = config.horas_recordatorio_1 ?? 24
    const horasR2 = config.horas_recordatorio_2 ?? 2

    // Determinar qué recordatorios aplican en este ciclo
    const candidatos: Array<'recordatorio_1' | 'recordatorio_2'> = []

    if (config.enviar_recordatorio_1 && dentroDeVentana(cita.fecha_hora, horasR1)) {
      candidatos.push('recordatorio_1')
    }
    if (config.enviar_recordatorio_2 && dentroDeVentana(cita.fecha_hora, horasR2)) {
      candidatos.push('recordatorio_2')
    }

    if (candidatos.length === 0) {
      omitidas++
      continue
    }

    for (const tipo of candidatos) {
      // Evitar envíos duplicados
      const duplicado = await yaEnviado(cita.id, tipo)
      if (duplicado) {
        omitidas++
        continue
      }

      // Delegar el envío al endpoint /enviar
      try {
        const respuesta = await fetch(`${baseUrl}/api/notificaciones/enviar`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cita_id: cita.id, tipo }),
        })

        const resultado = await respuesta.json()

        if (resultado.skipped) {
          omitidas++
        } else if (resultado.success) {
          enviadas++
        } else {
          omitidas++
        }
      } catch (error) {
        console.error(`Error al enviar ${tipo} para cita ${cita.id}:`, error)
        omitidas++
      }
    }
  }

  return NextResponse.json({ procesadas, enviadas, omitidas })
}
