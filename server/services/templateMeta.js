const prisma = require('../prisma/client');
const { fetchTemplates } = require('./whatsappService');

// WhatsApp template names must be lowercase, alphanumeric + underscores.
const normalizeName = (str) =>
  String(str || '')
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '');

// Pull the {{placeholder}} variables out of a template body, in first-seen order, de-duplicated.
const extractVariables = (body) => {
  const matches = (body || '').match(/\{\{(\w+)\}\}/g) || [];
  return [...new Set(matches.map((m) => m.replace(/\{\{|\}\}/g, '')))];
};

// Build the Meta `components` array for a text template (header text + body + footer).
// Body variables require example values (Meta rejects otherwise).
const buildComponents = ({ header, body, footer, examples }) => {
  const components = [];
  if (header?.trim()) {
    components.push({ type: 'HEADER', format: 'TEXT', text: header.trim() });
  }
  const bodyComp = { type: 'BODY', text: body };
  const samples = (examples || []).filter((v) => (v ?? '').toString().length > 0);
  if (samples.length) {
    bodyComp.example = { body_text: [samples] };
  }
  components.push(bodyComp);
  if (footer?.trim()) {
    components.push({ type: 'FOOTER', text: footer.trim() });
  }
  return components;
};

const bodyText = (t)   => t.components?.find((c) => c.type === 'BODY')?.text || '';
const headerText = (t) => {
  const h = t.components?.find((c) => c.type === 'HEADER');
  return h?.format === 'TEXT' ? (h.text || null) : null;
};
const footerText = (t) => t.components?.find((c) => c.type === 'FOOTER')?.text || null;

// Fetch templates from Meta and upsert them into the local DB (matched by name + language),
// persisting approval status. Returns the list of templates whose status changed.
const syncUserTemplates = async (userId) => {
  const setting = await prisma.setting.findUnique({ where: { userId } });
  if (!setting?.businessAccountId || !setting?.accessToken) return [];

  const metaTemplates = await fetchTemplates(setting.businessAccountId, setting.accessToken);
  const changed = [];

  for (const t of metaTemplates) {
    const existing = await prisma.template.findFirst({
      where: { userId, name: t.name, language: t.language },
    });
    const body = bodyText(t) || existing?.body || `[${t.name}]`;
    const data = {
      status:          t.status || 'PENDING',
      category:        t.category || existing?.category || null,
      language:        t.language,
      body,
      // Keep variables in sync with the (Meta-authoritative) body so the composer always shows the
      // right inputs — Meta numbers placeholders as {{1}}, {{2}}, ...
      variables:       extractVariables(body),
      header:          headerText(t),
      footer:          footerText(t),
      metaTemplateId:  t.id ? String(t.id) : existing?.metaTemplateId || null,
      rejectionReason: t.status === 'REJECTED' ? (t.rejected_reason || 'Rejected by Meta') : null,
    };

    if (existing) {
      if (existing.status !== data.status) {
        changed.push({ name: t.name, from: existing.status, to: data.status });
      }
      await prisma.template.update({ where: { id: existing.id }, data });
    } else {
      await prisma.template.create({
        data: { userId, name: t.name, examples: [], ...data },
      });
      changed.push({ name: t.name, from: null, to: data.status });
    }
  }

  return changed;
};

module.exports = { normalizeName, extractVariables, buildComponents, syncUserTemplates };
