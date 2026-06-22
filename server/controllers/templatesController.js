const axios  = require('axios');
const prisma  = require('../prisma/client');
const { createTemplate, editTemplate, deleteTemplate } = require('../services/whatsappService');
const { normalizeName, extractVariables, buildComponents, syncUserTemplates } = require('../services/templateMeta');

const BASE = `https://graph.facebook.com/${process.env.WHATSAPP_API_VERSION || 'v18.0'}`;

const getSetting = async (userId) => {
  const setting = await prisma.setting.findUnique({ where: { userId } });
  if (!setting?.businessAccountId || !setting?.accessToken) {
    throw Object.assign(new Error('Configure your WhatsApp credentials first'), { status: 400 });
  }
  return setting;
};

// Meta only accepts MARKETING / UTILITY / AUTHENTICATION as the category.
const toMetaCategory = (c) => {
  const v = String(c || '').toUpperCase();
  return ['MARKETING', 'UTILITY', 'AUTHENTICATION'].includes(v) ? v : 'UTILITY';
};

exports.list = async (req, res, next) => {
  try {
    const search   = req.query.search   || '';
    const category = req.query.category || '';

    const where = {
      userId: req.userId,
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { body: { contains: search, mode: 'insensitive' } },
        ],
      }),
      ...(category && { category }),
    };

    const raw = await prisma.template.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        broadcasts: {
          select: {
            recipients: { where: { status: 'sent' }, select: { id: true } },
          },
        },
      },
    });

    const templates = raw.map(({ broadcasts, ...t }) => ({
      ...t,
      usageCount: broadcasts.reduce((sum, b) => sum + b.recipients.length, 0),
    }));

    res.json(templates);
  } catch (err) {
    next(err);
  }
};

exports.create = async (req, res, next) => {
  try {
    const { body, category, language, header, footer, examples, draft } = req.body;
    const name = normalizeName(req.body.name);
    if (!name || !body) return res.status(400).json({ error: 'Name and body are required' });

    const variables = extractVariables(body);
    if (variables.length && (!Array.isArray(examples) || examples.filter((e) => (e || '').trim()).length < variables.length)) {
      return res.status(400).json({ error: 'Please provide a sample value for each variable' });
    }

    const base = {
      userId: req.userId, name, body, variables,
      header: header || null, footer: footer || null,
      examples: Array.isArray(examples) ? examples : [],
      category: category || null, language: language || 'en_US',
    };

    // Draft → store locally only. Otherwise submit to Meta for approval.
    if (draft) {
      const template = await prisma.template.create({ data: { ...base, status: 'LOCAL' } });
      return res.status(201).json({ ...template, usageCount: 0 });
    }

    const setting = await getSetting(req.userId);
    const result = await createTemplate(setting.businessAccountId, setting.accessToken, {
      name,
      language: base.language,
      category: toMetaCategory(category),
      components: buildComponents(base),
    });

    const template = await prisma.template.create({
      data: { ...base, status: result.status || 'PENDING', metaTemplateId: result.id ? String(result.id) : null },
    });
    res.status(201).json({ ...template, usageCount: 0 });
  } catch (err) {
    next(err);
  }
};

// Submit a LOCAL draft or resubmit a REJECTED template to Meta for approval.
exports.submitToMeta = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const tpl = await prisma.template.findFirst({ where: { id, userId: req.userId } });
    if (!tpl) return res.status(404).json({ error: 'Template not found' });

    const setting = await getSetting(req.userId);
    const components = buildComponents(tpl);
    const category = toMetaCategory(tpl.category);

    let result;
    if (tpl.metaTemplateId) {
      // Already exists on Meta (e.g. rejected) → edit & resubmit
      result = await editTemplate(tpl.metaTemplateId, setting.accessToken, { category, components });
    } else {
      result = await createTemplate(setting.businessAccountId, setting.accessToken, {
        name: tpl.name, language: tpl.language, category, components,
      });
    }

    const updated = await prisma.template.update({
      where: { id },
      data: {
        status: result.status || 'PENDING',
        rejectionReason: null,
        ...(result.id && { metaTemplateId: String(result.id) }),
      },
    });
    res.json({ ...updated, usageCount: 0 });
  } catch (err) {
    next(err);
  }
};

// Pull latest templates + approval status from Meta into the local DB.
exports.syncFromMeta = async (req, res, next) => {
  try {
    const changed = await syncUserTemplates(req.userId);
    res.json({ changed });
  } catch (err) {
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const existing = await prisma.template.findFirst({ where: { id, userId: req.userId } });
    if (!existing) return res.status(404).json({ error: 'Template not found' });
    const { name, body, category, language, header, footer, examples } = req.body;
    const variables = extractVariables(body || existing.body);
    const template = await prisma.template.update({
      where: { id },
      data: {
        ...(name     !== undefined && { name: normalizeName(name) }),
        ...(body     !== undefined && { body, variables }),
        ...(category !== undefined && { category: category || null }),
        ...(language !== undefined && { language: language || 'en_US' }),
        ...(header   !== undefined && { header: header || null }),
        ...(footer   !== undefined && { footer: footer || null }),
        ...(examples !== undefined && { examples: Array.isArray(examples) ? examples : [] }),
      },
    });
    res.json({ ...template, usageCount: 0 });
  } catch (err) {
    next(err);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const existing = await prisma.template.findFirst({ where: { id, userId: req.userId } });
    if (!existing) return res.status(404).json({ error: 'Template not found' });

    // If it was submitted to Meta, delete it there too (don't block local delete on failure)
    let metaWarning = null;
    if (existing.metaTemplateId || existing.status !== 'LOCAL') {
      try {
        const setting = await getSetting(req.userId);
        await deleteTemplate(setting.businessAccountId, setting.accessToken, existing.name);
      } catch (e) {
        console.error('Meta template delete failed (continuing with local delete):', e.message);
        metaWarning = `Removed locally, but couldn't delete from Meta: ${e.message}`;
      }
    }

    await prisma.template.delete({ where: { id } });
    res.json({ success: true, metaWarning });
  } catch (err) {
    next(err);
  }
};

exports.duplicate = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const existing = await prisma.template.findFirst({ where: { id, userId: req.userId } });
    if (!existing) return res.status(404).json({ error: 'Template not found' });
    const copy = await prisma.template.create({
      data: {
        userId:    req.userId,
        name:      existing.name + ' (copy)',
        body:      existing.body,
        category:  existing.category,
        variables: existing.variables,
      },
    });
    res.status(201).json({ ...copy, usageCount: 0 });
  } catch (err) {
    next(err);
  }
};

exports.metaSync = async (req, res, next) => {
  try {
    const setting = await prisma.setting.findUnique({ where: { userId: req.userId } });
    if (!setting) return res.status(400).json({ error: 'WhatsApp settings not configured' });

    const { data } = await axios.get(
      `${BASE}/${setting.businessAccountId}/message_templates`,
      {
        headers: { Authorization: `Bearer ${setting.accessToken}` },
        params: { limit: 100 },
      }
    );

    const templates = (data.data || []).map((t) => ({
      name:     t.name,
      status:   t.status,
      category: t.category,
      language: t.language,
      body:     t.components?.find((c) => c.type === 'BODY')?.text || '',
    }));

    res.json(templates);
  } catch (err) {
    if (err.response?.data) {
      return res.status(err.response.status || 502).json({
        error: err.response.data.error?.message || 'Meta API error',
      });
    }
    next(err);
  }
};
