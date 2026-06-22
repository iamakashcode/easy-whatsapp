const prisma = require('../prisma/client');

const startOfDay = (date = new Date()) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

exports.summary = async (req, res, next) => {
  try {
    const todayStart = startOfDay();
    const uid = req.userId;

    const [totalContacts, sentToday, receivedToday, totalMessages] = await prisma.$transaction([
      prisma.contact.count({ where: { userId: uid } }),
      prisma.message.count({ where: { userId: uid, direction: 'OUTBOUND', createdAt: { gte: todayStart } } }),
      prisma.message.count({ where: { userId: uid, direction: 'INBOUND',  createdAt: { gte: todayStart } } }),
      prisma.message.count({ where: { userId: uid } }),
    ]);

    const deliveryBreakdown = await prisma.message.groupBy({
      by: ['status'],
      where: { userId: uid, direction: 'OUTBOUND' },
      _count: { status: true },
    });

    const stats = { sent: 0, delivered: 0, read: 0, failed: 0 };
    for (const row of deliveryBreakdown) {
      stats[row.status] = row._count.status;
    }

    const recentActivity = await prisma.message.findMany({
      where: { userId: uid },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: { contact: { select: { name: true, phone: true } } },
    });

    res.json({ totalContacts, sentToday, receivedToday, totalMessages, deliveryStats: stats, recentActivity });
  } catch (err) {
    next(err);
  }
};

exports.messagesPerDay = async (req, res, next) => {
  try {
    const days = parseInt(req.query.days) || 7;
    const uid  = req.userId;
    const results = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const start = startOfDay(date);
      const end   = new Date(start);
      end.setDate(end.getDate() + 1);

      const [sent, received] = await prisma.$transaction([
        prisma.message.count({ where: { userId: uid, direction: 'OUTBOUND', createdAt: { gte: start, lt: end } } }),
        prisma.message.count({ where: { userId: uid, direction: 'INBOUND',  createdAt: { gte: start, lt: end } } }),
      ]);

      results.push({
        date: start.toISOString().split('T')[0],
        sent,
        received,
      });
    }

    res.json(results);
  } catch (err) {
    next(err);
  }
};

exports.deliveryStats = async (req, res, next) => {
  try {
    const breakdown = await prisma.message.groupBy({
      by: ['status'],
      where: { userId: req.userId, direction: 'OUTBOUND' },
      _count: { status: true },
    });
    const data = breakdown.map((row) => ({ name: row.status, value: row._count.status }));
    res.json(data);
  } catch (err) {
    next(err);
  }
};

exports.activeContacts = async (req, res, next) => {
  try {
    const results = await prisma.message.groupBy({
      by: ['contactId'],
      where: { userId: req.userId },
      _count: { contactId: true },
      orderBy: { _count: { contactId: 'desc' } },
      take: 10,
    });

    const contactIds = results.map((r) => r.contactId);
    const contacts = await prisma.contact.findMany({
      where: { id: { in: contactIds } },
      select: { id: true, name: true, phone: true },
    });

    const contactMap = Object.fromEntries(contacts.map((c) => [c.id, c]));
    const data = results.map((r) => ({
      contact: contactMap[r.contactId],
      messageCount: r._count.contactId,
    }));

    res.json(data);
  } catch (err) {
    next(err);
  }
};

exports.failedMessages = async (req, res, next) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 20);

    const [data, total] = await prisma.$transaction([
      prisma.message.findMany({
        where: { userId: req.userId, status: 'failed' },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { contact: { select: { name: true, phone: true } } },
      }),
      prisma.message.count({ where: { userId: req.userId, status: 'failed' } }),
    ]);

    res.json({ data, total, page, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    next(err);
  }
};
