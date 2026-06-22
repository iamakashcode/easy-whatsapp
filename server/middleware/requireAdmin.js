const prisma = require('../prisma/client');

// Gate admin-only endpoints. Runs after `auth`. Verifies the role against the database (not just the
// token) so a demotion takes effect immediately and stale tokens can't retain admin access.
module.exports = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { role: true },
    });
    if (user?.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    next();
  } catch (err) {
    next(err);
  }
};
