// ─── Utilidades internas ────────────────────────────────────────────────────

function layoutBase(clinica: string, contenido: string): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${clinica}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f6f9;font-family:Arial,sans-serif;font-size:16px;color:#333333;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f6f9;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background-color:#ffffff;border-radius:8px;overflow:hidden;border:1px solid #e0e0e0;">

          <!-- Encabezado -->
          <tr>
            <td style="background-color:#1B2B4B;padding:28px 32px;text-align:center;">
              <p style="margin:0;font-size:22px;font-weight:700;color:#ffffff;letter-spacing:0.5px;">${clinica}</p>
              <p style="margin:6px 0 0;font-size:13px;color:#a8c0e0;">Sistema de Gestión Clínica</p>
            </td>
          </tr>

          <!-- Contenido -->
          ${contenido}

          <!-- Pie de página -->
          <tr>
            <td style="background-color:#f4f6f9;padding:20px 32px;text-align:center;border-top:1px solid #e8e8e8;">
              <p style="margin:0;font-size:12px;color:#888888;">
                Este mensaje fue enviado por <strong>ClinicaApp</strong> · clinicaapp.com
              </p>
              <p style="margin:6px 0 0;font-size:11px;color:#aaaaaa;">
                Si no solicitó esta información, puede ignorar este correo.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

function filaDato(etiqueta: string, valor: string): string {
  return `<tr>
    <td style="padding:8px 0;border-bottom:1px solid #eef2f7;">
      <span style="font-size:12px;font-weight:700;color:#5a8ab0;text-transform:uppercase;letter-spacing:0.5px;">${etiqueta}</span>
      <p style="margin:4px 0 0;font-size:15px;color:#1B2B4B;font-weight:600;">${valor}</p>
    </td>
  </tr>`
}

function cajaCita(filas: string): string {
  return `<tr>
    <td style="padding:24px 32px 8px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
        style="background-color:#f7faff;border:1px solid #c5ddf5;border-radius:8px;padding:20px 24px;">
        <tr><td>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            ${filas}
          </table>
        </td></tr>
      </table>
    </td>
  </tr>`
}

// ─── Templates ──────────────────────────────────────────────────────────────

interface DatosConfirmacion {
  paciente: string
  clinica: string
  fecha: string
  hora: string
  dentista: string
  direccion: string
}

export function templateConfirmacion({
  paciente,
  clinica,
  fecha,
  hora,
  dentista,
  direccion,
}: DatosConfirmacion): string {
  const contenido = `
  <tr>
    <td style="padding:32px 32px 8px;">
      <p style="margin:0;font-size:20px;font-weight:700;color:#1B2B4B;">¡Cita confirmada!</p>
      <p style="margin:12px 0 0;font-size:15px;color:#444444;line-height:1.6;">
        Hola <strong>${paciente}</strong>, le confirmamos que su cita ha sido agendada exitosamente.
        A continuación encontrará los detalles de su cita:
      </p>
    </td>
  </tr>

  ${cajaCita(`
    ${filaDato('Fecha', fecha)}
    ${filaDato('Hora', hora)}
    ${filaDato('Doctor/a', dentista)}
    ${filaDato('Dirección', direccion)}
  `)}

  <tr>
    <td style="padding:20px 32px 32px;">
      <p style="margin:0;font-size:14px;color:#666666;line-height:1.6;">
        Si necesita cancelar o reprogramar su cita, por favor comuníquese con la clínica
        con al menos <strong>24 horas de anticipación</strong>.
      </p>
    </td>
  </tr>`

  return layoutBase(clinica, contenido)
}

// ────────────────────────────────────────────────────────────────────────────

interface DatosRecordatorio {
  paciente: string
  clinica: string
  fecha: string
  hora: string
  dentista: string
  direccion: string
  horasAntes: number
}

export function templateRecordatorio({
  paciente,
  clinica,
  fecha,
  hora,
  dentista,
  direccion,
  horasAntes,
}: DatosRecordatorio): string {
  const tiempoTexto = horasAntes === 24 ? 'mañana' : `en ${horasAntes} horas`

  const contenido = `
  <tr>
    <td style="padding:32px 32px 8px;">
      <p style="margin:0;font-size:20px;font-weight:700;color:#1B2B4B;">Recordatorio de cita</p>
      <p style="margin:12px 0 0;font-size:15px;color:#444444;line-height:1.6;">
        Hola <strong>${paciente}</strong>, le recordamos que tiene una cita programada
        <strong>${tiempoTexto}</strong>. Aquí están los detalles:
      </p>
    </td>
  </tr>

  ${cajaCita(`
    ${filaDato('Fecha', fecha)}
    ${filaDato('Hora', hora)}
    ${filaDato('Doctor/a', dentista)}
    ${filaDato('Dirección', direccion)}
  `)}

  <tr>
    <td style="padding:20px 32px 32px;">
      <p style="margin:0;font-size:14px;color:#666666;line-height:1.6;">
        Le pedimos llegar <strong>10 minutos antes</strong> de su cita.
        Si necesita cancelar, por favor avísenos lo antes posible.
      </p>
    </td>
  </tr>`

  return layoutBase(clinica, contenido)
}

// ────────────────────────────────────────────────────────────────────────────

interface DatosCancelacion {
  paciente: string
  clinica: string
  fecha: string
  hora: string
  motivo: string
}

export function templateCancelacion({
  paciente,
  clinica,
  fecha,
  hora,
  motivo,
}: DatosCancelacion): string {
  const contenido = `
  <tr>
    <td style="padding:32px 32px 8px;">
      <p style="margin:0;font-size:20px;font-weight:700;color:#1B2B4B;">Cita cancelada</p>
      <p style="margin:12px 0 0;font-size:15px;color:#444444;line-height:1.6;">
        Hola <strong>${paciente}</strong>, le informamos que su cita ha sido cancelada.
        A continuación los detalles de la cita cancelada:
      </p>
    </td>
  </tr>

  ${cajaCita(`
    ${filaDato('Fecha', fecha)}
    ${filaDato('Hora', hora)}
    ${filaDato('Motivo de cancelación', motivo)}
  `)}

  <tr>
    <td style="padding:20px 32px 32px;">
      <p style="margin:0;font-size:14px;color:#666666;line-height:1.6;">
        Si desea agendar una nueva cita, por favor comuníquese con la clínica o
        visítenos en persona. Con gusto le atenderemos.
      </p>
    </td>
  </tr>`

  return layoutBase(clinica, contenido)
}

// ────────────────────────────────────────────────────────────────────────────

interface DatosReprogramacion {
  paciente: string
  clinica: string
  fechaAnterior: string
  horaAnterior: string
  fechaNueva: string
  horaNueva: string
  dentista: string
}

export function templateReprogramacion({
  paciente,
  clinica,
  fechaAnterior,
  horaAnterior,
  fechaNueva,
  horaNueva,
  dentista,
}: DatosReprogramacion): string {
  const contenido = `
  <tr>
    <td style="padding:32px 32px 8px;">
      <p style="margin:0;font-size:20px;font-weight:700;color:#1B2B4B;">Cita reprogramada</p>
      <p style="margin:12px 0 0;font-size:15px;color:#444444;line-height:1.6;">
        Hola <strong>${paciente}</strong>, su cita ha sido reprogramada exitosamente.
        A continuación los nuevos detalles:
      </p>
    </td>
  </tr>

  <!-- Fecha anterior -->
  <tr>
    <td style="padding:16px 32px 4px;">
      <p style="margin:0;font-size:12px;font-weight:700;color:#888888;text-transform:uppercase;letter-spacing:0.5px;">
        Cita anterior
      </p>
    </td>
  </tr>
  <tr>
    <td style="padding:0 32px 8px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
        style="background-color:#fff5f5;border:1px solid #f5c5c5;border-radius:8px;padding:14px 20px;">
        <tr><td>
          <p style="margin:0;font-size:14px;color:#999999;text-decoration:line-through;">
            ${fechaAnterior} — ${horaAnterior}
          </p>
        </td></tr>
      </table>
    </td>
  </tr>

  <!-- Nueva fecha -->
  <tr>
    <td style="padding:8px 32px 4px;">
      <p style="margin:0;font-size:12px;font-weight:700;color:#0a5535;text-transform:uppercase;letter-spacing:0.5px;">
        Nueva cita
      </p>
    </td>
  </tr>

  ${cajaCita(`
    ${filaDato('Nueva fecha', fechaNueva)}
    ${filaDato('Nueva hora', horaNueva)}
    ${filaDato('Doctor/a', dentista)}
  `)}

  <tr>
    <td style="padding:20px 32px 32px;">
      <p style="margin:0;font-size:14px;color:#666666;line-height:1.6;">
        Si tiene alguna duda sobre su cita reprogramada, no dude en contactarnos.
      </p>
    </td>
  </tr>`

  return layoutBase(clinica, contenido)
}
