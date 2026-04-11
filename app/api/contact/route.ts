import { NextRequest, NextResponse } from 'next/server'
import { templateContactoLanding } from '@/lib/email-templates'

export async function POST(req: NextRequest) {
  try {
    const { nombre, clinica, pais, email, plan, mensaje } = await req.json()

    if (!nombre || !email || !plan) {
      return NextResponse.json({ error: 'Campos requeridos faltantes' }, { status: 400 })
    }

    const apiKey = process.env.BREVO_API_KEY
    if (!apiKey) {
      console.error('BREVO_API_KEY no configurada')
      return NextResponse.json({ error: 'Error de configuración del servidor' }, { status: 500 })
    }

    const payload = {
      sender: { name: 'ClinicaApp Contacto', email: 'noreply@cliniaapp.com' },
      to: [{ email: 'contacto@cliniaapp.com', name: 'ClinicaApp' }],
      replyTo: { email, name: nombre },
      subject: `Nuevo contacto desde ClinicaApp - ${plan}`,
      htmlContent: templateContactoLanding({ nombre, clinica, pais, email, plan, mensaje }),
    }

    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      const errorData = await res.text()
      console.error('Error Brevo:', errorData)
      return NextResponse.json({ error: 'Error al enviar el mensaje' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Error en /api/contact:', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
