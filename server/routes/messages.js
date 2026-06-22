const router = require('express').Router();
const auth = require('../middleware/auth');
const ctrl = require('../controllers/messagesController');

router.get('/',                        auth, ctrl.list);
router.get('/unread-counts',           auth, ctrl.unreadCounts);
router.get('/conversation/:contactId', auth, ctrl.conversation);
router.post('/send',                   auth, ctrl.send);
router.post('/send-bulk',              auth, ctrl.sendBulk);
router.patch('/:id/status',            auth, ctrl.updateStatus);

module.exports = router;
