import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../db.js'

export const inboxRouter = Router()

/**
 * The public quote-request inbox.
 *
 * An owner registers a short code from the app and gets a link like
 *   https://<host>/q/AB12CD
 * which they put on a truck magnet, a yard sign, or a Facebook post. A homeowner
 * fills the form; the app pulls the request down into Leads. No account for the
 * homeowner, no phone number to buy, no per-message cost.
 */

const registerSchema = z.object({
  code: z.string().min(4).max(12),
  businessName: z.string().min(1).max(120),
  phone: z.string().max(40).optional(),
})

const leadSchema = z.object({
  name: z.string().min(1).max(120),
  phone: z.string().min(5).max(40),
  address: z.string().max(200).optional(),
  service: z.string().max(60).optional(),
  notes: z.string().max(800).optional(),
})

/** The app claims a code (generated on device) and keeps its name in sync. */
inboxRouter.post('/register', async (req, res) => {
  const parsed = registerSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })
  const { code, businessName, phone } = parsed.data

  const inbox = await prisma.inbox.upsert({
    where: { code },
    update: { businessName, phone: phone ?? null },
    create: { code, businessName, phone: phone ?? null },
  })
  return res.json({ code: inbox.code })
})

/** The app pulls anything new, and we mark it delivered so it can't import twice. */
inboxRouter.get('/:code/requests', async (req, res) => {
  const { code } = req.params
  const inbox = await prisma.inbox.findUnique({ where: { code } })
  if (!inbox) return res.status(404).json({ error: 'unknown_inbox' })

  const requests = await prisma.quoteRequest.findMany({
    where: { inboxCode: code, delivered: false },
    orderBy: { createdAt: 'asc' },
    take: 50,
  })

  if (requests.length > 0) {
    await prisma.quoteRequest.updateMany({
      where: { id: { in: requests.map((r) => r.id) } },
      data: { delivered: true },
    })
  }

  return res.json({ requests })
})

/** The homeowner's form posts here. */
inboxRouter.post('/:code/requests', async (req, res) => {
  const { code } = req.params
  const inbox = await prisma.inbox.findUnique({ where: { code } })
  if (!inbox) return res.status(404).json({ error: 'unknown_inbox' })

  const parsed = leadSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })

  await prisma.quoteRequest.create({
    data: {
      inboxCode: code,
      name: parsed.data.name.trim(),
      phone: parsed.data.phone.trim(),
      address: parsed.data.address?.trim() ?? '',
      service: parsed.data.service?.trim() ?? '',
      notes: parsed.data.notes?.trim() ?? '',
    },
  })

  return res.status(201).json({ ok: true })
})

const escapeHtml = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/**
 * The page the homeowner actually sees. Server-rendered, no JS framework, works on
 * a five-year-old Android in a driveway with one bar of signal. Bilingual, because
 * half these neighborhoods are.
 */
inboxRouter.get('/page/:code', async (req, res) => {
  const { code } = req.params
  const inbox = await prisma.inbox.findUnique({ where: { code } })

  if (!inbox) {
    return res
      .status(404)
      .type('html')
      .send('<!doctype html><meta charset="utf-8"><p style="font-family:system-ui;padding:40px">This quote link is not active.</p>')
  }

  const business = escapeHtml(inbox.businessName)

  return res.type('html').send(`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Get a quote — ${business}</title>
<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body { margin:0; font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;
         background:#f4f2eb; color:#17211b; }
  .wrap { max-width:520px; margin:0 auto; padding:28px 20px 60px; }
  .badge { display:inline-block; background:#d9ece6; color:#195847; font-weight:700;
           font-size:12px; letter-spacing:.08em; text-transform:uppercase;
           padding:6px 10px; border-radius:999px; }
  h1 { font-size:30px; line-height:1.15; margin:14px 0 6px; }
  .sub { color:#566257; font-size:15px; line-height:1.5; margin:0 0 22px; }
  form { background:#fbfaf6; border:1px solid #ddd8cb; border-radius:16px; padding:18px; }
  label { display:block; font-weight:600; font-size:13.5px; margin:14px 0 6px; }
  label:first-child { margin-top:0; }
  input, select, textarea { width:100%; padding:13px; font-size:16px; border-radius:10px;
    border:1px solid #ddd8cb; background:#fff; color:#17211b; font-family:inherit; }
  textarea { height:92px; resize:vertical; }
  button { width:100%; margin-top:18px; padding:16px; font-size:16px; font-weight:800;
    color:#fff; background:#195847; border:0; border-radius:12px; cursor:pointer; }
  button:disabled { opacity:.5; }
  .ok { background:#d9ece6; border:1px solid #195847; border-radius:14px; padding:22px;
        text-align:center; }
  .ok h2 { margin:0 0 6px; font-size:20px; color:#195847; }
  .ok p { margin:0; color:#3c5348; }
  .foot { text-align:center; color:#738171; font-size:12px; margin-top:22px; }
  .lang { float:right; font-size:13px; color:#195847; text-decoration:none; font-weight:700; }
</style>
</head>
<body>
<div class="wrap">
  <a class="lang" href="?lang=es" id="langlink">Español</a>
  <span class="badge" id="badge">Free quote</span>
  <h1 id="title">${business}</h1>
  <p class="sub" id="sub">Tell us about your yard and we'll get right back to you with a price.</p>

  <div id="done" class="ok" style="display:none">
    <h2 id="donetitle">Got it — thank you!</h2>
    <p id="donetext">We'll call or text you shortly with a price.</p>
  </div>

  <form id="f">
    <label id="l1">Your name</label>
    <input name="name" required autocomplete="name" placeholder="Maria Lopez">

    <label id="l2">Phone number</label>
    <input name="phone" required type="tel" autocomplete="tel" placeholder="(817) 555-0142">

    <label id="l3">Property address</label>
    <input name="address" autocomplete="street-address" placeholder="1420 Oak St, Fort Worth">

    <label id="l4">What do you need?</label>
    <select name="service">
      <option value="Mow & maintain">Mowing / regular maintenance</option>
      <option value="Yard cleanup">Yard cleanup</option>
      <option value="Hedge & shrub trim">Hedge / shrub trimming</option>
      <option value="Leaf removal">Leaf removal</option>
      <option value="Mulch install">Mulch</option>
      <option value="Aeration & overseed">Aeration / overseed</option>
      <option value="Fertilization">Fertilization / weed control</option>
      <option value="Irrigation service">Sprinklers / irrigation</option>
      <option value="Sod install">New sod</option>
      <option value="Other">Something else</option>
    </select>

    <label id="l5">Anything we should know?</label>
    <textarea name="notes" placeholder="Gate code, dog in the yard, best time to come by..."></textarea>

    <button type="submit" id="btn">Send my request</button>
  </form>

  <p class="foot">Powered by Cuadrilla</p>
</div>

<script>
  var ES = {
    badge: 'Cotización gratis',
    sub: 'Cuéntanos de tu jardín y te damos precio rápido.',
    l1: 'Tu nombre', l2: 'Teléfono', l3: 'Dirección de la propiedad',
    l4: '¿Qué necesitas?', l5: '¿Algo que debamos saber?',
    btn: 'Enviar mi solicitud',
    donetitle: '¡Listo, gracias!', donetext: 'Te llamamos o te mandamos mensaje con el precio.',
    lang: 'English'
  };
  if (location.search.indexOf('lang=es') > -1) {
    for (var k in ES) { var el = document.getElementById(k === 'lang' ? 'langlink' : k); if (el) el.textContent = ES[k]; }
    document.getElementById('langlink').href = '?';
    document.querySelector('[name=notes]').placeholder = 'Código del portón, perro en el patio, mejor hora...';
  }

  var form = document.getElementById('f');
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var btn = document.getElementById('btn');
    btn.disabled = true;
    var data = Object.fromEntries(new FormData(form).entries());
    fetch('/inbox/${code}/requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).then(function (r) {
      if (!r.ok) throw new Error('failed');
      form.style.display = 'none';
      document.getElementById('done').style.display = 'block';
    }).catch(function () {
      btn.disabled = false;
      btn.textContent = 'Try again';
    });
  });
</script>
</body>
</html>`)
})
