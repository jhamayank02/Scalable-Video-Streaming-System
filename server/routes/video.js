const router = require('express').Router();

const { getUploadUrl } = require('../controllers/video');
const { isInstructor } = require('../middlewares/isInstructor');

router.post('/upload-url', isInstructor, getUploadUrl);

module.exports = router;