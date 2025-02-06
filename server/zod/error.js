exports.formatZodErrors = (errors)=>{
    return errors.map(err => ({
        path: err.path.join(', '),
        message: err.message
    }));
}