const router = require('express').Router();
const auth = require('../middleware/auth');
const requireAdmin = require('../middleware/requireAdmin');
const ctrl = require('../controllers/adminController');

// Every admin route requires a logged-in admin.
router.use(auth, requireAdmin);

router.get('/overview',              ctrl.overview);
router.get('/clients',               ctrl.listClients);
router.post('/clients',              ctrl.createClient);
router.get('/clients/:id',           ctrl.getClient);
router.put('/clients/:id/billing',   ctrl.setClientBilling);
router.post('/clients/:id/suspend',  ctrl.suspendClient);
router.post('/clients/:id/activate', ctrl.activateClient);
router.delete('/clients/:id',        ctrl.deleteClient);
router.post('/clients/:id/impersonate', ctrl.impersonate);
router.post('/clients/:id/issue-invoice', ctrl.issueInvoiceNow);
router.get('/invoices',              ctrl.listInvoices);
router.post('/invoices/:id/pay',     ctrl.payInvoice);

module.exports = router;
