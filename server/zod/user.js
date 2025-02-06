const { z } = require('zod');

exports.userCreateSchema = z.object({
    first_name: z.string().min(2).max(25),
    last_name: z.string().max(25).optional(),
    email: z.string().email(),
    phone: z.string().length(10),
    profile_picture: z.string().optional(),
    is_instructor: z.boolean().optional(),
    password: z.string().min(8)
});
exports.userUpdateSchema = z.object({
    id: z.string(),
    first_name: z.string().min(2).max(25).optional(),
    last_name: z.string().max(25).optional().optional(),
    email: z.string().email().optional(),
    phone: z.string().length(10).optional(),
    profile_picture: z.string().optional(),
    is_instructor: z.boolean().optional()
});
exports.optVerificationSchema = z.object({
    otp: z.string().length(6),
    email: z.string().email(),
});