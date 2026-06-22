const prisma = require('../prisma/client');
const { sendTextMessage } = require('../services/whatsappService');
const {
  resolveParams,
  buildBodyComponents,
  fillBody,
  sendTemplateWithAutoLanguage,
} = require('../services/templateSend');
const { quote, getBillingState, creditHeadroom, assertCanSend } = require('../services/billingService');

const getUserSettings = async (userId) => {
  const setting = await prisma.setting.findUnique({ where: { userId } });
  if (!setting) throw Object.assign(new Error('WhatsApp settings not configured'), { status: 400 });
  return setting;
};

// What a single outbound message costs the customer. Template messages are billed by their category;
// plain session (text) messages are service messages and free.
const priceFor = async (type, templateCategory) => {
  if (type === 'template' && templateCategory) {
    const { charge, meta } = await quote(templateCategory);
    return { category: String(templateCategory).toLowerCase(), charge, meta, billable: true };
  }
  return { category: null, charge: 0, meta: 0, billable: undefined };
};

exports.list = async (req, res, next) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 20);
    const direction = req.query.direction;

    const where = {
      userId: req.userId,
      ...(direction && { direction }),
    };

    const [data, total] = await prisma.$transaction([
      prisma.message.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { contact: { select: { id: true, name: true, phone: true } } },
      }),
      prisma.message.count({ where }),
    ]);

    res.json({ data, total, page, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    next(err);
  }
};

exports.conversation = async (req, res, next) => {
  try {
    const contactId = parseInt(req.params.contactId);
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 50);

    const contact = await prisma.contact.findFirst({ where: { id: contactId, userId: req.userId } });
    if (!contact) return res.status(404).json({ error: 'Contact not found' });

    const [data, total] = await prisma.$transaction([
      prisma.message.findMany({
        where: { userId: req.userId, contactId },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'asc' },
      }),
      prisma.message.count({ where: { userId: req.userId, contactId } }),
    ]);

    res.json({ contact, data, total, page, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    next(err);
  }
};

exports.send = async (req, res, next) => {
  try {
    const { contactId, type = 'text', body, templateName, templateParams } = req.body;
    if (!contactId || !body) return res.status(400).json({ error: 'contactId and body are required' });

    const contact = await prisma.contact.findFirst({ where: { id: contactId, userId: req.userId } });
    if (!contact) return res.status(404).json({ error: 'Contact not found' });

    const { phoneNumberId, accessToken, businessAccountId } = await getUserSettings(req.userId);

    let waMessageId = null;
    let storedBody = body;
    let tpl = null;
    if (type === 'template' && templateName) {
      tpl = await prisma.template.findFirst({
        where: { userId: req.userId, name: templateName },
        select: { language: true, body: true, variables: true, category: true },
      });
    }

    // Block the send up front if suspended, an invoice is overdue, or this would exceed the credit limit.
    const price = await priceFor(type, tpl?.category);
    const state = await getBillingState(req.userId);
    assertCanSend(state, price.charge);

    if (type === 'template' && templateName) {
      const params = resolveParams(templateParams, contact);
      storedBody = fillBody(tpl?.body, tpl?.variables, params) || body;
      waMessageId = await sendTemplateWithAutoLanguage({
        setting: { phoneNumberId, accessToken, businessAccountId },
        userId: req.userId,
        to: contact.phone,
        templateName,
        components: buildBodyComponents(params),
        state: { language: tpl?.language },
      });
    } else {
      const result = await sendTextMessage(phoneNumberId, accessToken, contact.phone, body);
      waMessageId = result?.data?.messages?.[0]?.id || null;
    }

    const message = await prisma.message.create({
      data: {
        userId: req.userId,
        contactId,
        direction: 'OUTBOUND',
        type,
        body: storedBody,
        status: 'sent',
        waMessageId,
        sentAt: new Date(),
        category: price.category,
        billable: price.billable,
        costAmount: price.charge > 0 ? price.charge : null,
        metaCost: price.charge > 0 ? price.meta : null,
      },
    });

    res.status(201).json(message);
  } catch (err) {
    next(err);
  }
};

exports.sendBulk = async (req, res, next) => {
  try {
    const { contactIds, body, type = 'text', templateName, templateParams } = req.body;
    if (!contactIds?.length || !body) {
      return res.status(400).json({ error: 'contactIds and body are required' });
    }

    const contacts = await prisma.contact.findMany({
      where: { id: { in: contactIds }, userId: req.userId },
    });
    if (!contacts.length) return res.status(404).json({ error: 'No contacts found' });

    const { phoneNumberId, accessToken, businessAccountId } = await getUserSettings(req.userId);

    const tpl = type === 'template' && templateName
      ? await prisma.template.findFirst({
          where: { userId: req.userId, name: templateName },
          select: { language: true, body: true, variables: true, category: true },
        })
      : null;
    // Carries the known-good language across the loop so the language is resolved
    // from Meta at most once, even if the stored value was wrong.
    const templateState = { language: tpl?.language };

    // Per-message price, and an up-front block (suspended / overdue / over credit limit for the first msg).
    const price = await priceFor(type, tpl?.category);
    const state = await getBillingState(req.userId);
    assertCanSend(state, price.charge);

    let headroom = creditHeadroom(state); // remaining credit; Infinity when no limit is set
    const results = { sent: 0, failed: 0, blocked: 0, errors: [] };
    for (const contact of contacts) {
      // Stop cleanly the moment the next billable message would exceed the credit limit.
      if (price.charge > 0 && price.charge > headroom) {
        results.blocked++;
        continue;
      }
      try {
        let waMessageId = null;
        let storedBody = body;
        if (type === 'template' && templateName) {
          const params = resolveParams(templateParams, contact);
          storedBody = fillBody(tpl?.body, tpl?.variables, params) || body;
          waMessageId = await sendTemplateWithAutoLanguage({
            setting: { phoneNumberId, accessToken, businessAccountId },
            userId: req.userId,
            to: contact.phone,
            templateName,
            components: buildBodyComponents(params),
            state: templateState,
          });
        } else {
          const r = await sendTextMessage(phoneNumberId, accessToken, contact.phone, body);
          waMessageId = r?.data?.messages?.[0]?.id || null;
        }
        await prisma.message.create({
          data: {
            userId: req.userId,
            contactId: contact.id,
            direction: 'OUTBOUND',
            type,
            body: storedBody,
            status: 'sent',
            waMessageId,
            sentAt: new Date(),
            category: price.category,
            billable: price.billable,
            costAmount: price.charge > 0 ? price.charge : null,
            metaCost: price.charge > 0 ? price.meta : null,
          },
        });
        if (price.charge > 0) headroom -= price.charge;
        results.sent++;
      } catch (err) {
        results.failed++;
        results.errors.push({ phone: contact.phone, error: err.message });
      }
      await new Promise(r => setTimeout(r, 50));
    }

    if (results.blocked) {
      results.note = `${results.blocked} message(s) not sent — wallet balance ran out. Top up to send the rest.`;
    }
    res.json(results);
  } catch (err) {
    next(err);
  }
};

exports.unreadCounts = async (req, res, next) => {
  try {
    const counts = await prisma.message.groupBy({
      by: ['contactId'],
      where: { userId: req.userId, direction: 'INBOUND' },
      _count: { id: true },
    });
    const result = {};
    counts.forEach((c) => { result[c.contactId] = c._count.id; });
    res.json(result);
  } catch (err) {
    next(err);
  }
};

exports.updateStatus = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const { status } = req.body;
    const validStatuses = ['sent', 'delivered', 'read', 'failed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    const message = await prisma.message.findFirst({ where: { id, userId: req.userId } });
    if (!message) return res.status(404).json({ error: 'Message not found' });
    const updated = await prisma.message.update({ where: { id }, data: { status } });
    res.json(updated);
  } catch (err) {
    next(err);
  }
};
