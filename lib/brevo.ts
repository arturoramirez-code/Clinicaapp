import { BrevoClient } from '@getbrevo/brevo'

const cliente = new BrevoClient({
  apiKey: process.env.BREVO_API_KEY ?? '',
})

interface EnvioEmailParams {
  to: string
  toName: string
  subject: string
  htmlContent: string
  senderName: string
}

export async function sendEmail({
  to,
  toName,
  subject,
  htmlContent,
  senderName,
}: EnvioEmailParams): Promise<boolean> {
  try {
    await cliente.transactionalEmails.sendTransacEmail({
      sender: {
        name: senderName,
        email: 'citaclinicaapp@gmail.com',
      },
      to: [{ email: to, name: toName }],
      subject,
      htmlContent,
    })
    return true
  } catch (error) {
    console.error('Error al enviar correo con Brevo:', error)
    return false
  }
}
