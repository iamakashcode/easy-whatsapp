const router = require('express').Router();
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');
const ctrl = require('../controllers/contactsController');

router.get('/',           auth, ctrl.list);
router.post('/',          auth, ctrl.create);
router.put('/:id',        auth, ctrl.update);
router.delete('/:id',     auth, ctrl.remove);
router.post('/import',    auth, upload.single('file'), ctrl.importCSV);

module.exports = router;
