const { create, remove, update, details, list } = require('../controllers/course');
const { isCourseInstructor } = require('../middlewares/isCourseInstructor');
const { isInstructor } = require('../middlewares/isInstructor');

const router = require('express').Router();

router.route('/')
        .post(create)
        .put(isInstructor, isCourseInstructor, update)
        .delete(isInstructor, isCourseInstructor, remove);
router.get('/list', list);
router.get('/:courseId', details);

module.exports = router;