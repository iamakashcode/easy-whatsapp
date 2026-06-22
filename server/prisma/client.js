const { PrismaClient } = require('@prisma/client');

const prisma = global.__prisma || (global.__prisma = new PrismaClient());

module.exports = prisma;
