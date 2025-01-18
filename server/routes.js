const router = require('express').Router();

const userRoutes = require('./routes/user');

router.use(['/auth'], [userRoutes]);

module.exports = router;