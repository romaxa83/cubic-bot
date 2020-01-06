const {Router} = require('express');
const router = Router();

router.get('/', (req, res, next) => {
    res.render('auth', {
        title: 'login',
        isHome: true
    });
});

module.exports = router;