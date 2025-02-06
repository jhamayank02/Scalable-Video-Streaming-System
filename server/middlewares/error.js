const { z } = require('zod');
const { formatZodErrors } = require('../zod/error');

exports.globalErrorHandler = (err, req, res, next) => {
    err.message ||= 'Internal Server Error';
    err.statusCode ||= 500;

    // console.log(err)

    // TODO -> Handle Other Types of Error
    if (err.name === "JsonWebTokenError") {
        let message = '';

        if (err.message.includes('jwt malformed')) {
            message = "Session expired, Login again to continue";
        }
        else {
            message = "Invalid token";
        }

        return res.status(401).json({
            status: 401,
            success: false,
            message: message
        });
    }
    if (err instanceof z.ZodError) {
        // console.log(err.errors)
        const errors = formatZodErrors(err.errors);
        return res.status(400).json({
            status: 400,
            success: false,
            message: errors
        });
    }
    if (err.code === 'P2002') {
        // console.error(err);
        let msg;
        if(err.meta?.target?.includes('User_phone_key')){
            msg = 'This phone number is already in use. Please try another one.';
        }
        else if(err.meta?.target?.includes('User_email')){
            msg = 'This email id is already in use. Please try another one.';
        }

        return res.status(400).json({
            status: 400,
            success: false,
            message: msg
        });
    }
    if(err.code === 'P2025'){
        // console.error(err);
        let msg;
        if(err.meta?.modelName?.includes('User')){
            msg = 'User not found';
        }
        else if(err.meta?.modelName?.includes('Course')){
            msg = 'Course not found';
        }
        else{
            msg = 'Record not found'
        }

        return res.status(400).json({
            status: 400,
            success: false,
            message: msg
        });
    }

    return res.status(err.statusCode).json({
        status: err.statusCode,
        success: false,
        message: err.message
    })
}