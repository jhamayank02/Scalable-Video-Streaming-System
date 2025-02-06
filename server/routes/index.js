const router = require('express').Router();

const userRoutes = require('./user');
const courseRoutes = require('./course');
const sectionRoutes = require('./section');
const videoRoutes = require('./video');
const { isAuthorized } = require('../middlewares/isAuthorized');

router.use(['/auth'], [userRoutes]);
router.use(['/course'], isAuthorized, [courseRoutes]);
router.use(['/section'], isAuthorized, [sectionRoutes]);
router.use(['/video'], isAuthorized, [videoRoutes]);

module.exports = router;