const prisma = require("../prisma/prismaClient");
const { TryCatch, ErrorHandler } = require("../utils/error");
const { createCourseSchema, updateCourseSchema } = require("../zod/course");

exports.create = TryCatch(async (req, res) => {
    if (!req.user.is_instructor) {
        throw new ErrorHandler("You are not an instructor", 401);
    }
    const parsedData = createCourseSchema.parse(req.body);

    const course = await prisma.course.create({
        data: {
            ...parsedData,
            authorId: req.user.id
        }
    });

    res.status(200).json({
        status: 200,
        success: true,
        message: "Course has been created successfully",
        course
    });
})
exports.update = TryCatch(async (req, res) => {
    const parsedData = updateCourseSchema.parse(req.body);
    const { courseId, title, description, thumbnail_url } = parsedData;

    const course = await prisma.course.update({
        where: {
            id: courseId
        },
        data: {
            title: title, description: description, thumbnail_url: thumbnail_url
        }
    });

    res.status(200).json({
        status: 200,
        success: true,
        message: "Course has been updated successfully",
        course
    });
})
exports.remove = TryCatch(async (req, res) => {
    const { courseId } = req.body;
    if (!courseId) {
        throw new ErrorHandler("Course id not provided", 400);
    }

    const deletedCourse = await prisma.Course.delete({
        where: {
            id: courseId
        }
    });

    res.status(200).json({
        status: 200,
        success: true,
        message: "Course has been deleted successfully",
        course: deletedCourse
    })
})
exports.details = TryCatch(async (req, res) => {
    const { courseId } = req.params;
    if (!courseId) {
        throw new ErrorHandler("Course id not provided", 400);
    }

    const course = await prisma.Course.findUnique({
        where: {
            id: courseId
        }
    });
    if (!course) {
        throw new ErrorHandler("Course not found", 400);
    }

    res.status(200).json({
        status: 200,
        success: true,
        course: course
    })
})
exports.list = TryCatch(async (req, res) => {
    const { authorId } = req.query;
    const courses = await prisma.Course.findMany({
        where: {
            authorId: authorId
        },
        include: {
            section: {
                include: {
                    video: true
                }
            }
        }
    });
    res.status(200).json({
        status: 200,
        success: true,
        courses
    })
})