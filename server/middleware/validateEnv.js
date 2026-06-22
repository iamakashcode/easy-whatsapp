const REQUIRED = ['DATABASE_URL', 'JWT_SECRET', 'WEBHOOK_VERIFY_TOKEN'];
const PLACEHOLDER_JWT = 'change_this_to_a_long_random_secret_string';

module.exports = function validateEnv() {
  const missing = REQUIRED.filter((k) => !process.env[k]);
  if (missing.length) {
    throw new Error(`Missing required env vars: ${missing.join(', ')}`);
  }
  if (
    process.env.JWT_SECRET === PLACEHOLDER_JWT ||
    process.env.JWT_SECRET.startsWith('REPLACE_WITH') ||
    process.env.JWT_SECRET.length < 32
  ) {
    throw new Error(
      'JWT_SECRET is still the default placeholder.\n' +
      'Generate a real secret with:\n' +
      '  node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"'
    );
  }
};
