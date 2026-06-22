const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const prisma = require('../prisma/client');
const { getBillingState } = require('../services/billingService');
const { markPaid, monthBoundsUTC, issueClientNow } = require('../services/invoiceService');

const num = (v) => Number(v ?? 0);

// Create a client (CUSTOMER) account directly from the admin console, with optional billing setup.
exports.createClient = async (req, res, next) => {
  try {
    const { username, email, password, monthlyFee, billingStartsAt } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email and password are required' });
    }
    if (String(password).length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    const existing = await prisma.user.findFirst({
      where: { OR: [{ email }, { username }] },
    });
    if (existing) return res.status(409).json({ error: 'A user with this email or username already exists' });

    const data = {
      username: String(username).trim(),
      email: String(email).trim().toLowerCase(),
      password: await bcrypt.hash(password, 12),
      role: 'CUSTOMER', // admin-created accounts are always customers
    };
    if (monthlyFee !== undefined && monthlyFee !== '' && monthlyFee !== null) {
      const f = Number(monthlyFee);
      if (!Number.isFinite(f) || f < 0) return res.status(400).json({ error: 'Invalid monthly fee' });
      data.monthlyFee = f;
    }
    if (billingStartsAt) {
      const [y, m] = String(billingStartsAt).split('-').map(Number);
      if (!y || !m || m < 1 || m > 12) return res.status(400).json({ error: 'Invalid billing start month' });
      data.billingStartsAt = new Date(Date.UTC(y, m - 1, 1));
    }

    const user = await prisma.user.create({
      data,
      select: { id: true, username: true, email: true, role: true, status: true, createdAt: true },
    });
    res.status(201).json(user);
  } catch (err) {
    next(err);
  }
};

// Platform-wide KPIs for the admin overview.
exports.overview = async (req, res, next) => {
  try {
    const { start: monthStart } = monthBoundsUTC(new Date());
    const customerWhere = { role: 'CUSTOMER' };

    const [totalCustomers, suspended, msgAllTime, msgMonth, unpaidAgg, overdueCount] = await Promise.all([
      prisma.user.count({ where: customerWhere }),
      prisma.user.count({ where: { ...customerWhere, status: 'SUSPENDED' } }),
      prisma.message.aggregate({
        _sum: { costAmount: true, metaCost: true },
        _count: { id: true },
        where: { direction: 'OUTBOUND', costAmount: { not: null } },
      }),
      prisma.message.aggregate({
        _sum: { costAmount: true, metaCost: true },
        _count: { id: true },
        where: { direction: 'OUTBOUND', costAmount: { not: null }, createdAt: { gte: monthStart } },
      }),
      prisma.invoice.aggregate({ _sum: { total: true }, where: { status: { in: ['ISSUED', 'OVERDUE'] } } }),
      prisma.invoice.count({ where: { status: 'OVERDUE' } }),
    ]);

    const revenueAll = num(msgAllTime._sum.costAmount);
    const metaAll = num(msgAllTime._sum.metaCost);
    const revenueMonth = num(msgMonth._sum.costAmount);
    const metaMonth = num(msgMonth._sum.metaCost);

    res.json({
      currency: 'INR',
      customers: { total: totalCustomers, active: totalCustomers - suspended, suspended },
      messages: { allTime: msgAllTime._count.id, thisMonth: msgMonth._count.id },
      revenue: { allTime: revenueAll, thisMonth: revenueMonth },
      metaCost: { allTime: metaAll, thisMonth: metaMonth },
      margin: { allTime: revenueAll - metaAll, thisMonth: revenueMonth - metaMonth },
      outstanding: num(unpaidAgg._sum.total),
      overdueCount,
    });
  } catch (err) {
    next(err);
  }
};

// All customers with usage, billing settings and outstanding, for the Clients table.
exports.listClients = async (req, res, next) => {
  try {
    const { start: monthStart } = monthBoundsUTC(new Date());

    const [users, usageAll, usageMonth, unpaid, overdue, invoicedThisMonth] = await Promise.all([
      prisma.user.findMany({
        where: { role: 'CUSTOMER' },
        select: { id: true, username: true, email: true, status: true, monthlyFee: true, creditLimit: true, billingStartsAt: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.message.groupBy({ by: ['userId'], where: { direction: 'OUTBOUND' }, _count: { id: true }, _sum: { costAmount: true } }),
      prisma.message.groupBy({ by: ['userId'], where: { direction: 'OUTBOUND', costAmount: { not: null }, createdAt: { gte: monthStart } }, _sum: { costAmount: true } }),
      prisma.invoice.groupBy({ by: ['userId'], where: { status: { in: ['ISSUED', 'OVERDUE'] } }, _sum: { total: true } }),
      prisma.invoice.groupBy({ by: ['userId'], where: { status: 'OVERDUE' }, _count: { id: true } }),
      prisma.invoice.findMany({ where: { periodStart: monthStart }, select: { userId: true } }),
    ]);
    const allMap = Object.fromEntries(usageAll.map((u) => [u.userId, u]));
    const monthMap = Object.fromEntries(usageMonth.map((u) => [u.userId, u]));
    const unpaidMap = Object.fromEntries(unpaid.map((u) => [u.userId, num(u._sum.total)]));
    const overdueSet = new Set(overdue.map((u) => u.userId));
    const invoicedSet = new Set(invoicedThisMonth.map((i) => i.userId)); // already has a current-month invoice

    const data = users.map((u) => {
      const monthlyFee = num(u.monthlyFee);
      const creditLimit = u.creditLimit != null ? num(u.creditLimit) : null;
      const currentUsage = num(monthMap[u.id]?._sum.costAmount);
      // Add the monthly fee to outstanding only if it isn't already invoiced this month (advance mode
      // puts it in an invoice) and the client's billing has started — otherwise it double-counts.
      const joinStart = monthBoundsUTC(u.createdAt).start;
      let feeFrom = u.billingStartsAt ? monthBoundsUTC(u.billingStartsAt).start : joinStart;
      if (feeFrom < joinStart) feeFrom = joinStart;
      const pendingFee = invoicedSet.has(u.id) || monthStart < feeFrom ? 0 : monthlyFee;
      const outstanding = currentUsage + pendingFee + (unpaidMap[u.id] || 0);
      const blocked = u.status === 'SUSPENDED' || overdueSet.has(u.id) || (creditLimit != null && outstanding >= creditLimit);
      return {
        id: u.id, username: u.username, email: u.email, status: u.status, createdAt: u.createdAt,
        monthlyFee, creditLimit, currentUsage, outstanding, blocked,
        messageCount: allMap[u.id]?._count.id || 0,
        totalSpend: num(allMap[u.id]?._sum.costAmount),
      };
    });

    res.json(data);
  } catch (err) {
    next(err);
  }
};

// One customer, with billing settings, current-cycle usage and invoice history.
exports.getClient = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const user = await prisma.user.findFirst({
      where: { id, role: 'CUSTOMER' },
      select: {
        id: true, username: true, email: true, status: true, monthlyFee: true, creditLimit: true,
        billingStartsAt: true, createdAt: true,
        setting: { select: { phoneNumberId: true } },
        _count: { select: { contacts: true, messages: true, templates: true } },
      },
    });
    if (!user) return res.status(404).json({ error: 'Client not found' });

    const [invoices, state] = await Promise.all([
      prisma.invoice.findMany({ where: { userId: id }, orderBy: { periodStart: 'desc' }, take: 24 }),
      getBillingState(id),
    ]);

    res.json({
      ...user,
      monthlyFee: num(user.monthlyFee),
      creditLimit: user.creditLimit != null ? num(user.creditLimit) : null,
      currentUsage: state.currentUsage,
      outstanding: state.outstanding,
      invoices: invoices.map((i) => ({
        ...i, planFee: num(i.planFee), usageAmount: num(i.usageAmount), total: num(i.total), metaCost: num(i.metaCost),
      })),
    });
  } catch (err) {
    next(err);
  }
};

// Set a client's plan fee and credit limit.
exports.setClientBilling = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const user = await prisma.user.findFirst({ where: { id, role: 'CUSTOMER' } });
    if (!user) return res.status(404).json({ error: 'Client not found' });

    const data = {};
    if (req.body.monthlyFee !== undefined) {
      const f = Number(req.body.monthlyFee);
      if (!Number.isFinite(f) || f < 0) return res.status(400).json({ error: 'Invalid monthly fee' });
      data.monthlyFee = f;
    }
    if (req.body.creditLimit !== undefined) {
      if (req.body.creditLimit === null || req.body.creditLimit === '') {
        data.creditLimit = null;
      } else {
        const c = Number(req.body.creditLimit);
        if (!Number.isFinite(c) || c < 0) return res.status(400).json({ error: 'Invalid credit limit' });
        data.creditLimit = c;
      }
    }
    if (req.body.billingStartsAt !== undefined) {
      // Accepts "YYYY-MM" (or empty to clear → bill from joining month). Stored as that month's UTC start.
      const v = req.body.billingStartsAt;
      if (!v) {
        data.billingStartsAt = null;
      } else {
        const [y, m] = String(v).split('-').map(Number);
        if (!y || !m || m < 1 || m > 12) return res.status(400).json({ error: 'Invalid billing start month' });
        data.billingStartsAt = new Date(Date.UTC(y, m - 1, 1));
      }
    }

    const updated = await prisma.user.update({
      where: { id }, data,
      select: { id: true, monthlyFee: true, creditLimit: true, billingStartsAt: true },
    });
    res.json({
      id: updated.id,
      monthlyFee: num(updated.monthlyFee),
      creditLimit: updated.creditLimit != null ? num(updated.creditLimit) : null,
      billingStartsAt: updated.billingStartsAt,
    });
  } catch (err) {
    next(err);
  }
};

// Generate this client's current-cycle invoice on demand — used to collect the first advance payment
// at onboarding (before they start using), without waiting for the monthly run. Idempotent.
exports.issueInvoiceNow = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const user = await prisma.user.findFirst({ where: { id, role: 'CUSTOMER' } });
    if (!user) return res.status(404).json({ error: 'Client not found' });
    const created = await issueClientNow(id);
    res.json({
      created,
      message: created
        ? 'Invoice generated.'
        : 'No invoice generated — already invoiced for this cycle, or nothing to bill yet.',
    });
  } catch (err) {
    next(err);
  }
};

const setStatus = (status) => async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const user = await prisma.user.findFirst({ where: { id, role: 'CUSTOMER' } });
    if (!user) return res.status(404).json({ error: 'Client not found' });
    const updated = await prisma.user.update({ where: { id }, data: { status }, select: { id: true, status: true } });
    res.json(updated);
  } catch (err) {
    next(err);
  }
};
exports.suspendClient = setStatus('SUSPENDED');
exports.activateClient = setStatus('ACTIVE');

exports.deleteClient = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const user = await prisma.user.findFirst({ where: { id, role: 'CUSTOMER' } });
    if (!user) return res.status(404).json({ error: 'Client not found (admins cannot be deleted here)' });
    await prisma.user.delete({ where: { id } });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
};

// Issue a token for a customer so the admin can view the app as them (support/debugging).
exports.impersonate = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const user = await prisma.user.findFirst({
      where: { id, role: 'CUSTOMER' },
      select: { id: true, username: true, email: true, role: true },
    });
    if (!user) return res.status(404).json({ error: 'Client not found' });
    const token = jwt.sign({ userId: user.id, role: user.role, impersonated: true }, process.env.JWT_SECRET, { expiresIn: '2h' });
    res.json({ token, user });
  } catch (err) {
    next(err);
  }
};

// All invoices across clients (newest first), optionally filtered by status.
exports.listInvoices = async (req, res, next) => {
  try {
    const where = {};
    if (req.query.status) where.status = req.query.status;
    const invoices = await prisma.invoice.findMany({
      where,
      orderBy: [{ status: 'asc' }, { periodStart: 'desc' }],
      take: 200,
      include: { user: { select: { username: true, email: true } } },
    });
    res.json(invoices.map((i) => ({
      ...i, planFee: num(i.planFee), usageAmount: num(i.usageAmount), total: num(i.total), metaCost: num(i.metaCost),
    })));
  } catch (err) {
    next(err);
  }
};

// Mark an invoice paid (offline settlement; Razorpay self-serve comes later).
exports.payInvoice = async (req, res, next) => {
  try {
    const inv = await markPaid(parseInt(req.params.id));
    res.json({ id: inv.id, status: inv.status, paidAt: inv.paidAt });
  } catch (err) {
    next(err);
  }
};
