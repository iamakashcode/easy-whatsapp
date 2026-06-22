const router = require('express').Router();
const express = require('express');
const ctrl = require('../controllers/webhookController');

// Parse raw body for signature verification before express.json() runs globally
router.use(express.json({
  verify: (req, res, buf) => { req.rawBody = buf; },
}));

router.get('/',  ctrl.verify);
router.post('/', ctrl.receive);

module.exports = router;
