// после res.locals можно создавать свои переменный
// и присваивать им значения и они будут видны на фронте
module.exports = function(req, res, next) {
    res.locals.isAuth = req.session.isAuthenticated;
    // res.locals.csrf = req.csrfToken();
    next();
};