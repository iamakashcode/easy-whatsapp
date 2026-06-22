const prisma = require('../prisma/client');
const { sendTemplateMessage, fetchTemplates, isLanguageMismatch } = require('./whatsappService');

// Resolve one dynamic token against a contact, with optional fallback after a pipe.
// Supported tokens (case-insensitive): {first_name}, {name}, {phone}, e.g. {first_name|there}.
const resolveToken = (token, fallback, contact) => {
  const key = token.trim().toLowerCase();
  let val = '';
  if (key === 'first_name') val = (contact?.name || '').trim().split(/\s+/)[0] || '';
  else if (key === 'name')  val = contact?.name || '';
  else if (key === 'phone') val = contact?.phone || '';
  else return null; // unknown token — leave the original text untouched
  return val || fallback || '';
};

// Resolve per-contact tokens in each template parameter value. Anything that isn't a
// recognised {token} (or {token|fallback}) is treated as literal custom text.
const resolveParams = (params, contact) =>
  (params || []).map((p) =>
    String(p ?? '').replace(/\{([a-z_]+)(?:\|([^}]*))?\}/gi, (whole, token, fallback) => {
      const resolved = resolveToken(token, fallback, contact);
      return resolved === null ? whole : resolved;
    })
  );

// Build the WhatsApp template "body" component from ordered parameter values.
// No values → no component (templates without placeholders must send none).
const buildBodyComponents = (paramValues) => {
  if (!paramValues?.length) return [];
  return [{
    type: 'body',
    parameters: paramValues.map((text) => ({ type: 'text', text: String(text ?? '') })),
  }];
};

// Substitute resolved values into the stored template body for display in the inbox.
const fillBody = (body, variables, paramValues) => {
  if (!body || !variables?.length) return body;
  const map = {};
  variables.forEach((key, i) => { map[key] = paramValues?.[i] ?? `{{${key}}}`; });
  return body.replace(/\{\{(\w+)\}\}/g, (_, key) => (map[key] ?? `{{${key}}}`));
};

// Send a template, self-healing the language: if Meta rejects the stored language
// (e.g. it drifted from the approved translation), look up the real language from
// Meta, persist the correction, and retry once. `state.language` carries the known-good
// language across a bulk run so we only hit Meta once. `components` carries the
// resolved body parameters for templates that have placeholders.
const sendTemplateWithAutoLanguage = async ({ setting, userId, to, templateName, components, state }) => {
  const { phoneNumberId, accessToken, businessAccountId } = setting;
  const language = state.language || 'en_US';
  try {
    const res = await sendTemplateMessage(phoneNumberId, accessToken, to, templateName, language, components);
    return res?.data?.messages?.[0]?.id || null;
  } catch (err) {
    if (!isLanguageMismatch(err) || !businessAccountId) throw err;

    const metaTemplates = await fetchTemplates(businessAccountId, accessToken);
    const match =
      metaTemplates.find((t) => t.name === templateName && t.status === 'APPROVED') ||
      metaTemplates.find((t) => t.name === templateName);
    if (!match?.language || match.language === language) throw err;

    const res = await sendTemplateMessage(phoneNumberId, accessToken, to, templateName, match.language, components);
    state.language = match.language;
    await prisma.template.updateMany({
      where: { userId, name: templateName },
      data: { language: match.language },
    });
    return res?.data?.messages?.[0]?.id || null;
  }
};

module.exports = { resolveParams, buildBodyComponents, fillBody, sendTemplateWithAutoLanguage };
