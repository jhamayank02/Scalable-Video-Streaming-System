const { ErrorHandler, TryCatch } = require("../utils/error");
const { verifyJwtToken } = require("../utils/jwt");

exports.isAuthorized = TryCatch(async (req, res, next)=>{
    let token = req.headers?.authorization?.split(' ')?.[1] || req.signedCookies.token;
    if(!token){
        throw new ErrorHandler("Authentication Failed", 401);
    }

    const tokenData = verifyJwtToken(token);
    if(!tokenData || !tokenData.email){
        throw new ErrorHandler("Authentication Failed", 401);
    }

    req.user = {
        email: tokenData.email,
        id: tokenData.id,
        is_instructor: tokenData.is_instructor
    };
    next();
})