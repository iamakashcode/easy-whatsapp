const router = require('express').Router();
const auth = require('../middleware/auth');
const imageUpload = require('../middleware/imageUpload');
const ctrl = require('../controllers/settingsController');

router.get('/',              auth, ctrl.get);
router.put('/',              auth, ctrl.upsert);
router.put('/budget',        auth, ctrl.updateBudget);
router.get('/profile',       auth, ctrl.getProfile);
router.put('/profile',       auth, ctrl.updateProfile);
router.post('/profile/photo', auth, imageUpload.single('photo'), ctrl.uploadProfilePicture);

module.exports = router;
