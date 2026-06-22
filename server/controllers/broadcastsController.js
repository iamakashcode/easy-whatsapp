const prisma = require('../prisma/client');

exports.list = async (req, res, next) => {
  try {
    const broadcasts = await prisma.broadcast.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: 'desc' },
      include: {
        template: { select: { id: true, name: true } },
        _count: { select: { recipients: true } },
      },
    });
    res.json(broadcasts);
  } catch (err) {
    next(err);
  }
};

exports.get = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const broadcast = await prisma.broadcast.findFirst({
      where: { id, userId: req.userId },
      include: {
        template: true,
        _count: { select: { recipients: true } },
      },
    });
    if (!broadcast) return res.status(404).json({ error: 'Broadcast not found' });
    res.json(broadcast);
  } catch (err) {
    next(err);
  }
};

exports.create = async (req, res, next) => {
  try {
    const { templateId, contactIds, tagFilter, scheduledAt, templateParams } = req.body;
    if (!templateId) return res.status(400).json({ error: 'templateId is required' });

    const template = await prisma.template.findFirst({ where: { id: templateId, userId: req.userId } });
    if (!template) return res.status(404).json({ error: 'Template not found' });

    let resolvedContactIds = contactIds || [];
    if (tagFilter) {
      const tagged = await prisma.contact.findMany({
        where: { userId: req.userId, tags: { has: tagFilter } },
        select: { id: true },
      });
      resolvedContactIds = [...new Set([...resolvedContactIds, ...tagged.map((c) => c.id)])];
    }

    if (!resolvedContactIds.length) {
      return res.status(400).json({ error: 'No contacts selected' });
    }

    const broadcast = await prisma.broadcast.create({
      data: {
        userId: req.userId,
        templateId,
        status: scheduledAt ? 'scheduled' : 'draft',
        templateParams: Array.isArray(templateParams) ? templateParams : [],
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        recipients: {
          createMany: {
            data: resolvedContactIds.map((cid) => ({ contactId: cid })),
            skipDuplicates: true,
          },
        },
      },
      include: { _count: { select: { recipients: true } } },
    });

    res.status(201).json(broadcast);
  } catch (err) {
    next(err);
  }
};

exports.recipients = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const broadcast = await prisma.broadcast.findFirst({ where: { id, userId: req.userId } });
    if (!broadcast) return res.status(404).json({ error: 'Broadcast not found' });

    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 20);

    const [data, total] = await prisma.$transaction([
      prisma.broadcastRecipient.findMany({
        where: { broadcastId: id },
        skip: (page - 1) * limit,
        take: limit,
        include: { contact: { select: { id: true, name: true, phone: true } } },
      }),
      prisma.broadcastRecipient.count({ where: { broadcastId: id } }),
    ]);

    res.json({ data, total, page, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    next(err);
  }
};

// Per-broadcast delivery report: each recipient's true outcome (delivered/read/failed + reason),
// merging the dispatch record with the actual message status reported by Meta's webhook.
exports.report = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const broadcast = await prisma.broadcast.findFirst({
      where: { id, userId: req.userId },
      include: { template: { select: { name: true, category: true } } },
    });
    if (!broadcast) return res.status(404).json({ error: 'Broadcast not found' });

    const [recipients, messages] = await Promise.all([
      prisma.broadcastRecipient.findMany({
        where: { broadcastId: id },
        include: { contact: { select: { id: true, name: true, phone: true } } },
      }),
      prisma.message.findMany({
        where: { broadcastId: id },
        select: { contactId: true, status: true, error: true, sentAt: true },
      }),
    ]);

    // One message per contact for this broadcast.
    const msgByContact = {};
    for (const m of messages) msgByContact[m.contactId] = m;

    const rows = recipients.map((r) => {
      const m = msgByContact[r.contactId];
      // Prefer the message's webhook-reported status; fall back to the dispatch record.
      const status = m ? m.status : (r.status === 'pending' ? 'pending' : r.status);
      return {
        id: r.id,
        contact: r.contact,
        status,                                   // sent | delivered | read | failed | pending
        error: m?.error || r.error || null,       // failure reason (e.g. WhatsApp policy)
        sentAt: m?.sentAt || r.sentAt || null,
      };
    });

    const summary = { total: rows.length, sent: 0, delivered: 0, read: 0, failed: 0, pending: 0 };
    for (const row of rows) {
      if (summary[row.status] !== undefined) summary[row.status] += 1;
      else summary.pending += 1;
    }
    // Anything that left our system successfully (sent/delivered/read) counts as "reached".
    summary.reached = summary.sent + summary.delivered + summary.read;

    res.json({ broadcast, summary, recipients: rows });
  } catch (err) {
    next(err);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const existing = await prisma.broadcast.findFirst({ where: { id, userId: req.userId } });
    if (!existing) return res.status(404).json({ error: 'Broadcast not found' });
    await prisma.broadcast.delete({ where: { id } });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};
