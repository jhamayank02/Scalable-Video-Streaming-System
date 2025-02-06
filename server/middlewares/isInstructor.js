const { TryCatch, ErrorHandler } = require("../utils/error");

exports.isInstructor = TryCatch(async (req, res, next)=>{
    if(!req.user.is_instructor){
        throw new ErrorHandler("You are not an instructor", 401);
    }

    next();
})