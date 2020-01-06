const {Router} = require('express');
const router = Router();

router.get('/', async (req, res) => {
    res.render('auth/login', {
        title: 'Login',
        isLogin:true,
        // loginError: req.flash('loginError'),
        // registerError: req.flash('registerError')
    });
});

module.exports = router;