const router = require('express').Router();
const auth = require('../middleware/auth');
const requireAdmin = require('../middleware/requireAdmin');
const ctrl = require('../controllers/platformController');

router.get('/pricing', auth, ctrl.getPricing);                // any authenticated user (read-only)
router.put('/pricing', auth, requireAdmin, ctrl.updatePricing); // admin only

module.exports = router;
