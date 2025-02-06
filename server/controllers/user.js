const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const { userCreateSchema, optVerificationSchema, userUpdateSchema } = require("../zod/user");
const prisma = require('../prisma/prismaClient');
const { ErrorHandler, TryCatch } = require('../utils/error');
const { generateOTP } = require('../utils/generateOTP');
const { getJwtToken, verifyJwtToken } = require('../utils/jwt');

exports.create = TryCatch(async (req, res) => {
    const parsedData = userCreateSchema.parse(req.body);

    const hashedPass = await bcrypt.hash(parsedData.password, 10);
    const user = await prisma.User.create({
        data: {
            ...parsedData,
            password: hashedPass,
            is_verified: false
        }
    });

    // Generate OTP
    const otp = generateOTP(6);
    await prisma.Otp.create({
        data: {
            email: parsedData.email,
            otp: otp
        }
    });

    // TODO -> Send OTP on email

    res.status(200).json({
        status: 200,
        success: true,
        message: 'User has been registered successfully. OTP has been sent to your email id.',
        user: {
            ...user,
            password: undefined
        }
    })
});
exports.verifyOtp = TryCatch(async (req, res) => {
    const parsedData = optVerificationSchema.parse(req.body);
    // Verify OTP
    const isValid = await prisma.Otp.findUnique({
        where: { email: parsedData.email }
    });
    if (!isValid || isValid.otp !== parsedData.otp) {
        throw new ErrorHandler("Invalid OTP", 401);
    }
    // If verified, delete OTP from db
    await prisma.Otp.delete({
        where: { email: parsedData.email, otp: parsedData.otp }
    });
    // Update user's verification status
    await prisma.User.update({
        where: { email: parsedData.email },
        data: { is_verified: true }
    });

    res.status(200).json({
        status: 200,
        success: true,
        message: "OTP has been verified successfully"
    })
});
exports.resendOtp = TryCatch(async (req, res) => {
    const { email } = req.body;
    if (!email) {
        throw new ErrorHandler('Email id not provided', 400);
    }

    let otp = await prisma.Otp.findUnique({
        where: {
            email: email
        }
    });

    if (!otp) {
        let newOtp = generateOTP(6);
        otp = await prisma.Otp.create({
            data: {
                email: email,
                otp: newOtp
            }
        });
    }

    res.status(200).json({
        status: 200,
        success: true,
        message: "OTP has been sent successfully"
    });
});
exports.login = TryCatch(async (req, res) => {
    const token = req.headers?.authorization?.split(' ')?.[1];
    const { email, password } = req.body;
    if (!token && !email) {
        throw new ErrorHandler("Either email id and password or authentication token should be provided");
    }

    if (token) {
        const verified = jwt.verify(token, process.env.JWT_SECRET);
        const currTimeInSec = Math.floor(Date.now() / 1000);

        if (verified && verified.iat < currTimeInSec && verified.exp > currTimeInSec) {
            const user = await prisma.User.findUnique({
                where: { email: verified.email }
            });
            if (!user) {
                throw new ErrorHandler("User doesn't exist", 400);
            }
            if (!user.is_verified) {
                throw new ErrorHandler("Verify your account to continue", 400);
            }
            const newToken = jwt.sign({
                email: verified.email,
                iat: Math.floor(Date.now() / 1000) - 30
            }, process.env.JWT_SECRET, { expiresIn: "1d" });

            return res.status(200).json({
                status: 200,
                success: true,
                message: "Logged in succesfully",
                user: user,
                token: newToken
            })
        }
        else {
            throw new ErrorHandler('Session expired, Login again to continue', 400);
        }
    }
    else {
        const user = await prisma.User.findUnique({
            where: { email: email }
        });
        if (!user) {
            throw new ErrorHandler("User doesn't exist", 400);
        }
        if (!user.is_verified) {
            throw new ErrorHandler("Verify your account to continue", 400);
        }
        const isMatched = await bcrypt.compare(password, user.password);
        if (!isMatched) {
            throw new ErrorHandler("Make sure you have entered the correct credentials", 400);
        }
        const newToken = jwt.sign({
            email: user.email,
            iat: Math.floor(Date.now() / 1000) - 30
        }, process.env.JWT_SECRET, { expiresIn: "1d" });

        return res.status(200).json({
            status: 200,
            success: true,
            message: "Logged in succesfully",
            user: user,
            token: newToken
        });
    }
})
exports.details = TryCatch(async (req, res) => {
    const id = req.user.id;
    const user = await prisma.User.findUnique({
        where: {
            id: id
        }
    });
    if (!user) {
        throw new ErrorHandler("User doesn't exist", 400);
    }
    return res.status(200).json({
        status: 200,
        success: true,
        user: user
    })
})
exports.update = TryCatch(async (req, res) => {
    const { id, first_name, last_name, email, phone, is_instructor, profile_picture } = userUpdateSchema.parse(req.body);

    const updatedUser = await prisma.User.update({
        where: {
            id: id
        },
        data: {
            first_name: first_name, last_name: last_name, email: email, phone: phone, is_instructor: is_instructor, profile_picture_url: profile_picture
        }
    });

    updatedUser.password = undefined;

    res.status(200).json({
        status: 200,
        success: true,
        message: "User details has been updated successfully",
        user: updatedUser
    })
});
exports.remove = TryCatch(async (req, res) => {
    const id = req.user.id;
    if (!id) {
        throw new ErrorHandler("id not provided", 400);
    }

    const user = await prisma.User.findUnique({
        where: {
            id
        }
    });
    if (!user) {
        throw new Error("User doesn't exist", 400);
    }

    await prisma.User.delete({
        where: {
            id
        }
    });

    res.status(200).json({
        status: 200,
        success: true,
        message: "User account has been deleted successfully"
    })
});
exports.login = TryCatch(async (req, res) => {
    const { email, password } = req.body;
    let token = req.headers?.authorization?.split(' ')?.[1];
    if (!token) {
        token = req.signedCookies.token
    }

    // Authenticate via email and password
    if (!token && email && password) {
        const user = await prisma.User.findUnique({
            where: {
                email
            }
        });
        if (!user) {
            throw new ErrorHandler("User not found", 400);
        }
        if(!user.is_verified){
            throw new ErrorHandler("Account not verified", 401);
        }
        const isPassMatched = await bcrypt.compare(password, user.password);
        if (!isPassMatched) {
            throw new ErrorHandler("Make sure you have entered the correct credentials", 401);
        }

        const newToken = getJwtToken(user.email, user.id, user.is_instructor);

        res.cookie('token', newToken, {
            signed: true, // This ensures the cookie is signed
            httpOnly: true, // The cookie cannot be accessed via JavaScript
            secure: true,   // The cookie will only be sent over HTTPS
            sameSite: 'Strict', // Helps prevent CSRF attacks
            maxAge: 60 * 60 * 24 * 1000 // Cookie expiration time (1 day)
        });

        return res.status(200).json({
            status: 200,
            success: true,
            message: "Logged in successfully",
            token: newToken
        })
    }
    else if (token) {
        const tokenData = verifyJwtToken(token);
        if (!tokenData || !tokenData.email) {
            throw new ErrorHandler("Invalid token", 401);
        }

        const newToken = getJwtToken(tokenData.email, tokenData.id, tokenData.is_instructor);

        res.cookie('token', newToken, {
            signed: true, // This ensures the cookie is signed
            httpOnly: true, // The cookie cannot be accessed via JavaScript
            secure: true,   // The cookie will only be sent over HTTPS
            sameSite: 'Strict', // Helps prevent CSRF attacks
            maxAge: 60 * 60 * 24 * 1000 // Cookie expiration time (1 day)
        });

        return res.status(200).json({
            success: true,
            status: true,
            message: "Logged in successfully",
            token: newToken
        })
    }

    res.status(400).json({
        status: 400,
        success: false,
        message: "Email id and Password or Authentication token is required"
    })
})