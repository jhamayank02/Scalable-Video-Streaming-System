const { details, create, update, remove } = require('../controllers/user');

const router = require('express').Router();

router.route('/')
        .get(details)
        .post(create)
        .put(update)
        .delete(remove)

module.exports = router;