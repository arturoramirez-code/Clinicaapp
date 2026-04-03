// ── Normalización de teléfono ─────────────────────────────────────────────

export function generarLinkWhatsApp({
  telefono,
  mensaje,
}: {
  telefono: string
  mensaje: string
}): string {
  // Quitar espacios, guiones, paréntesis y puntos
  let t = telefono.replace(/[\s\-().+]/g, '')

  // Si empieza en 0 → reemplazar con código de Guatemala
  if (t.startsWith('0')) {
    t = '502' + t.slice(1)
  }

  // Si tiene menos de 10 dígitos → asumir Guatemala (502 + número local de 8 dígitos)
  if (t.length < 10) {
    t = '502' + t
  }

  return `https://wa.me/${t}?text=${encodeURIComponent(mensaje)}`
}

// ── Constructores de mensaje ──────────────────────────────────────────────

export function mensajeConfirmacion({
  paciente,
  clinica,
  fecha,
  hora,
  dentista,
}: {
  paciente: string
  clinica: string
  fecha: string
  hora: string
  dentista: string
}): string {
  return (
    `Hola ${paciente} 👋, le confirmamos su cita en *${clinica}*.\n\n` +
    `📅 *Fecha:* ${fecha}\n` +
    `🕐 *Hora:* ${hora}\n` +
    `👨‍⚕️ *Doctor/a:* ${dentista}\n\n` +
    `Si necesita cancelar o hacer algún cambio, por favor avísenos con anticipación. ¡Le esperamos!`
  )
}

export function mensajeRecordatorio({
  paciente,
  clinica,
  fecha,
  hora,
  dentista,
}: {
  paciente: string
  clinica: string
  fecha: string
  hora: string
  dentista: string
}): string {
  return (
    `Hola ${paciente} 👋, le recordamos su cita en *${clinica}*.\n\n` +
    `📅 *Fecha:* ${fecha}\n` +
    `🕐 *Hora:* ${hora}\n` +
    `👨‍⚕️ *Doctor/a:* ${dentista}\n\n` +
    `Le pedimos llegar 10 minutos antes. Si necesita cancelar, avísenos lo antes posible.`
  )
}

export function mensajeCancelacion({
  paciente,
  clinica,
  fecha,
  hora,
}: {
  paciente: string
  clinica: string
  fecha: string
  hora: string
}): string {
  return (
    `Hola ${paciente}, le informamos que su cita del *${fecha}* a las *${hora}* en *${clinica}* ha sido cancelada.\n\n` +
    `Si desea agendar una nueva cita, con gusto le atendemos. 😊`
  )
}

export function mensajeReprogramacion({
  paciente,
  clinica,
  fechaNueva,
  horaNueva,
  dentista,
}: {
  paciente: string
  clinica: string
  fechaNueva: string
  horaNueva: string
  dentista: string
}): string {
  return (
    `Hola ${paciente} 👋, su cita en *${clinica}* ha sido reprogramada.\n\n` +
    `📅 *Nueva fecha:* ${fechaNueva}\n` +
    `🕐 *Nueva hora:* ${horaNueva}\n` +
    `👨‍⚕️ *Doctor/a:* ${dentista}\n\n` +
    `Cualquier consulta, estamos a sus órdenes.`
  )
}
