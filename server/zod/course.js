const { z } = require('zod');

exports.createCourseSchema = z.object({
    title: z.string().min(5).max(100),
    description: z.string().min(100).max(500),
    thumbnail_url: z.string().optional()
});
exports.updateCourseSchema = z.object({
    courseId: z.string(),
    title: z.string().min(5).max(100).optional(),
    description: z.string().min(100).max(500).optional(),
    thumbnail_url: z.string().optional()
});