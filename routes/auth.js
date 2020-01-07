const {Router} = require('express');
const router = Router();
const User = require('../models/user');
const bcrypt = require('bcryptjs');

router.get('/login', async (req, res) => {
    res.render('auth/login', {
        title: 'Login',
        isLogin:true,
        loginError: req.flash('loginError'),
    });
});

router.post('/login', async (req, res) => {
    try {
        const {email, password} = req.body;

        const candidate = await User.findOne({email});
        if(candidate) {
            // проверяем пароль пользователя (сравнивает compare сравнивает хеш в бд и пароль с клиента)
            const confirmPassword = await bcrypt.compare(password, candidate.password);
            if(confirmPassword) {
                // успешный логин
                const user = candidate;
                req.session.user = user;
                req.session.isAuthenticated = true;
                req.session.save(err => {
                    if(err) {
                        throw err;
                    }
                    res.redirect('/');
                });
            } else {
                req.flash('loginError', 'Password is a wrong');
                res.redirect('/auth/login');
            }
        } else {
            req.flash('loginError', 'User does not exist');
            res.redirect('/auth/login');
        }
    } catch (err) {
        console.log(err);
    }
});


router.get('/logout', async (req, res) => {
    // когда данные из сессии очистяться,вызовиться колбэк
    req.session.destroy(() => {
        res.redirect('/');
    });
});

module.exports = router;