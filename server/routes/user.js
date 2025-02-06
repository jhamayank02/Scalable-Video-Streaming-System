const { details, create, update, remove, verifyOtp, login, resendOtp } = require('../controllers/user');
const { isAuthorized } = require('../middlewares/isAuthorized');

const router = require('express').Router();

router.route('/')
        .get(isAuthorized, details)
        .post(create)
        .put(isAuthorized, update)
        .delete(isAuthorized, remove)
router.post('/verify', verifyOtp);
router.post('/get-otp', resendOtp);
router.post('/login', login);

module.exports = router;