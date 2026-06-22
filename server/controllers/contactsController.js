const { parse } = require('csv-parse/sync');
const prisma = require('../prisma/client');
const { normalizePhone } = require('../services/phone');

exports.list = async (req, res, next) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 20);
    const search = req.query.search || '';
    const tag    = req.query.tag || '';

    const where = {
      userId: req.userId,
      ...(search && {
        OR: [
          { name:  { contains: search, mode: 'insensitive' } },
          { phone: { contains: search, mode: 'insensitive' } },
        ],
      }),
      ...(tag && { tags: { has: tag } }),
    };

    const [raw, total] = await prisma.$transaction([
      prisma.contact.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          messages: {
            take: 1,
            orderBy: { createdAt: 'desc' },
            select: { createdAt: true, body: true },
          },
        },
      }),
      prisma.contact.count({ where }),
    ]);

    const data = raw.map(({ messages, ...c }) => ({
      ...c,
      lastMessageAt: messages[0]?.createdAt ?? c.createdAt,
      lastMessageBody: messages[0]?.body ?? null,
    }));

    res.json({ data, total, page, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    next(err);
  }
};

exports.create = async (req, res, next) => {
  try {
    const { name, tags = [], notes } = req.body;
    const phone = normalizePhone(req.body.phone); // store in canonical +<digits> form
    if (!name || !phone) return res.status(400).json({ error: 'Name and a valid phone are required' });

    // Duplicate check: same phone for this user (match with or without + prefix, just in case)
    const digits = phone.replace(/\D/g, '');
    const existing = await prisma.contact.findFirst({
      where: {
        userId: req.userId,
        OR: [{ phone }, { phone: digits }],
      },
    });
    if (existing) {
      return res.status(409).json({
        error: `This number is already saved as "${existing.name}"`,
        contact: existing,
      });
    }

    const contact = await prisma.contact.create({
      data: { userId: req.userId, name, phone, tags, notes },
    });
    res.status(201).json(contact);
  } catch (err) {
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const existing = await prisma.contact.findFirst({ where: { id, userId: req.userId } });
    if (!existing) return res.status(404).json({ error: 'Contact not found' });
    const { name, tags, notes } = req.body;
    const phone = req.body.phone !== undefined ? normalizePhone(req.body.phone) : undefined;
    const contact = await prisma.contact.update({
      where: { id },
      data: { name, phone, tags, notes },
    });
    res.json(contact);
  } catch (err) {
    next(err);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const existing = await prisma.contact.findFirst({ where: { id, userId: req.userId } });
    if (!existing) return res.status(404).json({ error: 'Contact not found' });
    await prisma.contact.delete({ where: { id } });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

exports.importCSV = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'CSV file required' });

    const records = parse(req.file.buffer, {
      columns: (header) =>
        header.map((h) => h.toLowerCase().replace(/[\s_-]+/g, '')),
      skip_empty_lines: true,
      trim: true,
    });

    const rows = records.map((r) => ({
      name:  (r.name || r.fullname || r.contactname || '').trim(),
      phone: normalizePhone(r.phone || r.phonenumber || r.mobile || ''), // "+" added automatically
      tags:  r.tags ? r.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
      notes: r.notes || r.note || null,
    })).filter((r) => r.name && r.phone);

    if (rows.length === 0) {
      return res.status(400).json({ error: 'No valid rows found. Expected columns: name, phone (with country code).' });
    }

    // De-duplicate within the file (by normalized phone).
    const seen = new Set();
    const unique = rows.filter((r) => (seen.has(r.phone) ? false : seen.add(r.phone)));

    // Skip numbers that already exist for this user (so re-importing won't create duplicates).
    const existing = await prisma.contact.findMany({
      where: { userId: req.userId, phone: { in: unique.map((r) => r.phone) } },
      select: { phone: true },
    });
    const existingSet = new Set(existing.map((e) => e.phone));
    const toCreate = unique
      .filter((r) => !existingSet.has(r.phone))
      .map((r) => ({ userId: req.userId, ...r }));

    const result = toCreate.length
      ? await prisma.contact.createMany({ data: toCreate, skipDuplicates: true })
      : { count: 0 };

    res.json({
      imported: result.count,
      skipped: rows.length - result.count, // duplicates in file + already-existing numbers
      total: rows.length,
    });
  } catch (err) {
    next(err);
  }
};
