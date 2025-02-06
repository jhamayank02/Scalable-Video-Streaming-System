const prisma = require("../prisma/prismaClient");
const { TryCatch, ErrorHandler } = require("../utils/error");

exports.isCourseInstructor = TryCatch(async (req, res, next) => {
    const userId = req.user.id;
    const { courseId } = req.body;
    if (!courseId) {
        throw new ErrorHandler("Course id not provided", 400);
    }

    const course = await prisma.course.findUnique({
        where: {
            id: courseId
        }
    });
    if (!course) {
        throw new ErrorHandler("Course not found", 400);
    }
    if (course.authorId.toString() !== userId.toString()) {
        throw new ErrorHandler("You are not authorized to modify/delete this course", 400);
    }
    next();
})