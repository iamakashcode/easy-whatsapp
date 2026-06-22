const router = require('express').Router();
const auth = require('../middleware/auth');
const ctrl = require('../controllers/analyticsController');

router.get('/summary',          auth, ctrl.summary);
router.get('/messages-per-day', auth, ctrl.messagesPerDay);
router.get('/delivery-stats',   auth, ctrl.deliveryStats);
router.get('/active-contacts',  auth, ctrl.activeContacts);
router.get('/failed-messages',  auth, ctrl.failedMessages);

module.exports = router;
