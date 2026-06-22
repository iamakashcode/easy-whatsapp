const router = require('express').Router();
const auth = require('../middleware/auth');
const ctrl = require('../controllers/broadcastsController');

router.get('/',                  auth, ctrl.list);
router.post('/',                 auth, ctrl.create);
router.get('/:id',               auth, ctrl.get);
router.get('/:id/recipients',    auth, ctrl.recipients);
router.get('/:id/report',        auth, ctrl.report);
router.delete('/:id',            auth, ctrl.remove);

module.exports = router;
