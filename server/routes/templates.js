const router = require('express').Router();
const auth = require('../middleware/auth');
const ctrl = require('../controllers/templatesController');

router.get('/meta-sync',      auth, ctrl.metaSync);    // must be before /:id
router.post('/sync',          auth, ctrl.syncFromMeta); // persist Meta status into local DB
router.get('/',               auth, ctrl.list);
router.post('/',              auth, ctrl.create);
router.put('/:id',            auth, ctrl.update);
router.delete('/:id',         auth, ctrl.remove);
router.post('/:id/submit',    auth, ctrl.submitToMeta);
router.post('/:id/duplicate', auth, ctrl.duplicate);

module.exports = router;
