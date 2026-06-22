const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../prisma/client');

const signToken = (user) =>
  jwt.sign({ userId: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });

// The platform admin is pinned to ADMIN_EMAIL — privilege can never be self-assigned through the API
// (every signup is forced to CUSTOMER); only this server-side check promotes the configured email.
const isAdminEmail = (email) =>
  !!process.env.ADMIN_EMAIL && email?.toLowerCase() === process.env.ADMIN_EMAIL.toLowerCase();

exports.register = async (req, res, next) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    const existing = await prisma.user.findFirst({
      where: { OR: [{ email }, { username }] },
    });
    if (existing) {
      return res.status(409).json({ error: 'Username or email already taken' });
    }
    const hash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { username, email, password: hash, role: isAdminEmail(email) ? 'ADMIN' : 'CUSTOMER' },
      select: { id: true, username: true, email: true, role: true, status: true, createdAt: true },
    });
    res.status(201).json({ token: signToken(user), user });
  } catch (err) {
    next(err);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    let user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    // Keep the configured admin email in sync (e.g. if ADMIN_EMAIL was set after the account existed).
    const expectedRole = isAdminEmail(user.email) ? 'ADMIN' : 'CUSTOMER';
    if (user.role !== expectedRole) {
      user = await prisma.user.update({ where: { id: user.id }, data: { role: expectedRole } });
    }
    const { password: _, ...safeUser } = user;
    res.json({ token: signToken(user), user: safeUser });
  } catch (err) {
    next(err);
  }
};

exports.me = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { id: true, username: true, email: true, role: true, status: true, createdAt: true },
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    next(err);
  }
};
