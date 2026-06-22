const router = require('express').Router();
const auth = require('../middleware/auth');
const ctrl = require('../controllers/costController');

router.get('/summary',     auth, ctrl.summary);
router.get('/by-category', auth, ctrl.byCategory);
router.get('/trend',       auth, ctrl.trend);
router.get('/budget',      auth, ctrl.budget);

module.exports = router;
