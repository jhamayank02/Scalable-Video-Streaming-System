const jwt = require("jsonwebtoken");

exports.getJwtToken = (email, id, isInstructor)=>{
    return jwt.sign({
        email: email,
        id: id,
        is_instructor: isInstructor
    }, process.env.JWT_SECRET, {
        expiresIn: '24h'
    })
}

exports.verifyJwtToken = (token)=>{
    return jwt.verify(token, process.env.JWT_SECRET);
}