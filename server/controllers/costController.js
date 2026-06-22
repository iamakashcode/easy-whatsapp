const prisma = require('../prisma/client');
const { getPlatformPricing } = require('../services/platformPricing');

const startOfDay = (date = new Date()) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

const startOfMonth = (date = new Date()) => {
  const d = new Date(date);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
};

const num = (v) => Number(v ?? 0);

// Spend totals for today and the current month, plus a per-message average.
// Only OUTBOUND messages that actually carry a captured cost contribute — pre-launch rows with a
// null costAmount are excluded (not counted as zero) so month-to-date isn't artificially diluted.
exports.summary = async (req, res, next) => {
  try {
    const uid = req.userId;
    const todayStart = startOfDay();
    const monthStart = startOfMonth();

    const [today, month, billableCount, pricing] = await Promise.all([
      prisma.message.aggregate({
        _sum: { costAmount: true },
        where: { userId: uid, direction: 'OUTBOUND', createdAt: { gte: todayStart } },
      }),
      prisma.message.aggregate({
        _sum: { costAmount: true },
        _count: { id: true },
        where: { userId: uid, direction: 'OUTBOUND', costAmount: { not: null }, createdAt: { gte: monthStart } },
      }),
      prisma.message.count({
        where: { userId: uid, direction: 'OUTBOUND', billable: true, createdAt: { gte: monthStart } },
      }),
      getPlatformPricing(),
    ]);

    const monthTotal = num(month._sum.costAmount);
    const costedCount = month._count.id;

    res.json({
      currency: pricing.currency || 'INR',
      today: num(today._sum.costAmount),
      month: monthTotal,
      billableCount,
      avgPerMsg: costedCount ? monthTotal / costedCount : 0,
    });
  } catch (err) {
    next(err);
  }
};

// Current-month spend grouped by category — shaped as { name, value } for the PieChart.
exports.byCategory = async (req, res, next) => {
  try {
    const monthStart = startOfMonth();
    const rows = await prisma.message.groupBy({
      by: ['category'],
      where: {
        userId: req.userId,
        direction: 'OUTBOUND',
        costAmount: { not: null },
        createdAt: { gte: monthStart },
      },
      _sum: { costAmount: true },
      _count: { id: true },
    });

    const data = rows.map((r) => ({
      name: r.category || 'Uncosted',
      value: num(r._sum.costAmount),
      count: r._count.id,
    }));

    res.json(data);
  } catch (err) {
    next(err);
  }
};

// Daily spend over the last `days` days — shaped as { date, spend } for the LineChart.
exports.trend = async (req, res, next) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const uid = req.userId;
    const results = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const start = startOfDay(date);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);

      const agg = await prisma.message.aggregate({
        _sum: { costAmount: true },
        where: { userId: uid, direction: 'OUTBOUND', createdAt: { gte: start, lt: end } },
      });

      results.push({ date: start.toISOString().split('T')[0], spend: num(agg._sum.costAmount) });
    }

    res.json(results);
  } catch (err) {
    next(err);
  }
};

// Monthly budget status — drives the alert banner on the frontend.
exports.budget = async (req, res, next) => {
  try {
    const uid = req.userId;
    const monthStart = startOfMonth();

    const [setting, month, pricing] = await Promise.all([
      prisma.setting.findUnique({ where: { userId: uid }, select: { monthlyBudget: true } }),
      prisma.message.aggregate({
        _sum: { costAmount: true },
        where: { userId: uid, direction: 'OUTBOUND', costAmount: { not: null }, createdAt: { gte: monthStart } },
      }),
      getPlatformPricing(),
    ]);

    const budget = setting?.monthlyBudget != null ? num(setting.monthlyBudget) : null;
    const spend = num(month._sum.costAmount);

    res.json({
      currency: pricing.currency || 'INR',
      budget,
      spend,
      pct: budget && budget > 0 ? spend / budget : null,
    });
  } catch (err) {
    next(err);
  }
};
