// middleware для защиты роутов от неавторизованых пользователей
module.exports = function(req, res, next) {
    if(!req.session.isAuthenticated) {
        return res.redirect('/auth/login');
    }
    next();
};