// Accessor for the single, admin-controlled platform rate card. Customers are charged these rates;
// they can read them but only the admin edits them.
const prisma = require('../prisma/client');
const { DEFAULT_RATES_INR } = require('./pricingService');

// Fetch the one PlatformPricing row, creating it (seeded with India defaults) on first use.
const getPlatformPricing = async () => {
  let row = await prisma.platformPricing.findFirst({ orderBy: { id: 'asc' } });
  if (!row) {
    row = await prisma.platformPricing.create({
      data: {
        rateMarketing: DEFAULT_RATES_INR.marketing,
        rateUtility: DEFAULT_RATES_INR.utility,
        rateAuthentication: DEFAULT_RATES_INR.authentication,
        rateService: 0,
        currency: 'INR',
      },
    });
  }
  return row;
};

const updatePlatformPricing = async (data) => {
  const row = await getPlatformPricing();
  return prisma.platformPricing.update({ where: { id: row.id }, data });
};

module.exports = { getPlatformPricing, updatePlatformPricing };
