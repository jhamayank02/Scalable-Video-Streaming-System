class ErrorHandler extends Error {
    constructor(message, statusCode) {
        super(message || 'Internal Server Error');
        this.error = message || 'Internal Server Error';
        this.statusCode = statusCode || 500;
    }
};

const TryCatch = (passedFunc) => async (req, res, next) => {
    try {
        await passedFunc(req, res, next);
    } catch (error) {
        next(error);
    }
};

module.exports = {
    ErrorHandler,
    TryCatch
}