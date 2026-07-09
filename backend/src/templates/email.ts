const BRAND_COLOR = '#195847'
const BRAND_NAME = 'Verde Ops'

function layout(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f0;font-family:sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f0;padding:32px 0;">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;max-width:560px;width:100%;">
<tr><td style="background:${BRAND_COLOR};padding:24px 32px;">
  <span style="color:#ffffff;font-size:20px;font-weight:700;">${BRAND_NAME}</span>
</td></tr>
<tr><td style="padding:32px;">${body}</td></tr>
<tr><td style="padding:16px 32px;background:#f4f4f0;font-size:12px;color:#666;">
  © ${new Date().getFullYear()} ${BRAND_NAME}. All rights reserved.
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`
}

function btn(url: string, label: string): string {
  return `<p><a href="${url}" style="display:inline-block;background:${BRAND_COLOR};color:#fff;text-decoration:none;padding:12px 24px;border-radius:6px;font-weight:600;">${label}</a></p>`
}

// ─── Auth ────────────────────────────────────────────────────────────────────

export function welcomeEmail(
  lang: 'en' | 'es',
  name: string,
  businessName: string,
): { subject: string; html: string } {
  const en = {
    subject: `Welcome to ${BRAND_NAME}, ${name}!`,
    body: `<h2 style="margin-top:0;color:#195847;">Welcome, ${name}!</h2>
<p>Your account for <strong>${businessName}</strong> is ready. You're on a 14-day free trial — no credit card required.</p>
<p>Log in to start scheduling jobs, building estimates, and collecting payments.</p>`,
  }
  const es = {
    subject: `Bienvenido a ${BRAND_NAME}, ${name}!`,
    body: `<h2 style="margin-top:0;color:#195847;">Bienvenido, ${name}!</h2>
<p>Tu cuenta para <strong>${businessName}</strong> está lista. Tienes 14 días de prueba gratis, sin tarjeta de crédito.</p>
<p>Inicia sesión para empezar a programar trabajos, crear cotizaciones y cobrar pagos.</p>`,
  }
  const t = lang === 'es' ? es : en
  return { subject: t.subject, html: layout(t.subject, t.body) }
}

export function forgotPasswordEmail(
  lang: 'en' | 'es',
  resetUrl: string,
): { subject: string; html: string } {
  const en = {
    subject: 'Reset your password',
    body: `<h2 style="margin-top:0;">Reset your password</h2>
<p>We received a request to reset your password. Click the button below — this link expires in 1 hour.</p>
${btn(resetUrl, 'Reset Password')}
<p style="color:#666;font-size:13px;">If you didn't request this, you can safely ignore this email.</p>`,
  }
  const es = {
    subject: 'Restablece tu contraseña',
    body: `<h2 style="margin-top:0;">Restablece tu contraseña</h2>
<p>Recibimos una solicitud para restablecer tu contraseña. Haz clic en el botón de abajo — este enlace expira en 1 hora.</p>
${btn(resetUrl, 'Restablecer Contraseña')}
<p style="color:#666;font-size:13px;">Si no solicitaste esto, puedes ignorar este correo.</p>`,
  }
  const t = lang === 'es' ? es : en
  return { subject: t.subject, html: layout(t.subject, t.body) }
}

export function resetPasswordConfirmationEmail(
  lang: 'en' | 'es',
): { subject: string; html: string } {
  const en = {
    subject: 'Your password has been reset',
    body: `<h2 style="margin-top:0;">Password updated</h2>
<p>Your password was successfully reset. If you didn't do this, contact support immediately.</p>`,
  }
  const es = {
    subject: 'Tu contraseña fue restablecida',
    body: `<h2 style="margin-top:0;">Contraseña actualizada</h2>
<p>Tu contraseña fue restablecida correctamente. Si no fuiste tú, contacta a soporte de inmediato.</p>`,
  }
  const t = lang === 'es' ? es : en
  return { subject: t.subject, html: layout(t.subject, t.body) }
}

// ─── Estimates ───────────────────────────────────────────────────────────────

export function estimateSentEmail(
  lang: 'en' | 'es',
  clientName: string,
  businessName: string,
  totalFormatted: string,
  viewUrl: string,
): { subject: string; html: string } {
  const en = {
    subject: `Your estimate from ${businessName}`,
    body: `<h2 style="margin-top:0;">Hi ${clientName},</h2>
<p><strong>${businessName}</strong> has sent you an estimate for <strong>${totalFormatted}</strong>.</p>
${btn(viewUrl, 'View Estimate')}
<p style="color:#666;font-size:13px;">Have questions? Reply to this email or call us directly.</p>`,
  }
  const es = {
    subject: `Tu cotización de ${businessName}`,
    body: `<h2 style="margin-top:0;">Hola ${clientName},</h2>
<p><strong>${businessName}</strong> te envió una cotización por <strong>${totalFormatted}</strong>.</p>
${btn(viewUrl, 'Ver Cotización')}
<p style="color:#666;font-size:13px;">¿Tienes preguntas? Responde este correo o llámanos.</p>`,
  }
  const t = lang === 'es' ? es : en
  return { subject: t.subject, html: layout(t.subject, t.body) }
}

// ─── Invoices ────────────────────────────────────────────────────────────────

export function invoiceSentEmail(
  lang: 'en' | 'es',
  clientName: string,
  businessName: string,
  invoiceNumber: string,
  totalFormatted: string,
  dueDateFormatted: string,
  viewUrl: string,
): { subject: string; html: string } {
  const en = {
    subject: `Invoice #${invoiceNumber} from ${businessName}`,
    body: `<h2 style="margin-top:0;">Hi ${clientName},</h2>
<p>Invoice <strong>#${invoiceNumber}</strong> for <strong>${totalFormatted}</strong> is ready. Due: <strong>${dueDateFormatted}</strong>.</p>
${btn(viewUrl, 'View & Pay Invoice')}`,
  }
  const es = {
    subject: `Factura #${invoiceNumber} de ${businessName}`,
    body: `<h2 style="margin-top:0;">Hola ${clientName},</h2>
<p>La factura <strong>#${invoiceNumber}</strong> por <strong>${totalFormatted}</strong> está lista. Vence: <strong>${dueDateFormatted}</strong>.</p>
${btn(viewUrl, 'Ver y Pagar Factura')}`,
  }
  const t = lang === 'es' ? es : en
  return { subject: t.subject, html: layout(t.subject, t.body) }
}

export function paymentReceivedEmail(
  lang: 'en' | 'es',
  clientName: string,
  businessName: string,
  amountFormatted: string,
): { subject: string; html: string } {
  const en = {
    subject: `Payment received — thank you!`,
    body: `<h2 style="margin-top:0;">Payment confirmed, ${clientName}!</h2>
<p><strong>${businessName}</strong> received your payment of <strong>${amountFormatted}</strong>. Thank you!</p>`,
  }
  const es = {
    subject: `Pago recibido — ¡gracias!`,
    body: `<h2 style="margin-top:0;">¡Pago confirmado, ${clientName}!</h2>
<p><strong>${businessName}</strong> recibió tu pago de <strong>${amountFormatted}</strong>. ¡Gracias!</p>`,
  }
  const t = lang === 'es' ? es : en
  return { subject: t.subject, html: layout(t.subject, t.body) }
}
