const { z } = require('zod');

exports.getVideoUploadUrlSchema = z.object({
    filename: z.string().min(5).max(50),
    contentType: z.string().includes('/'),
    title: z.string().min(5).max(50),
    description: z.string().min(100).max(500),
    duration: z.number().int().min(0, {message: "Duration must be a positive integer"}),
    sectionId: z.string()
})

exports.getVideoSchema = z.object({
    videoId: z.string()
})