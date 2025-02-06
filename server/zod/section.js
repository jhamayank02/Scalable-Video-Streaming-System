const { z } = require('zod');

exports.createSectionSchema = z.object({
    title: z.string().min(5).max(100),
    courseId: z.string()
});
exports.updateSectionSchema = z.object({
    sectionId: z.string(),
    title: z.string().min(5).max(100).optional(),
});