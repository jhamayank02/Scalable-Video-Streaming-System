exports.generateOTP = (len)=>{
    let otp = '';
    for(let i=0; i<len; i++){
        otp += Math.floor(Math.random()*10);
    }
    return otp;
}