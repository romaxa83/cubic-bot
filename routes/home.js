const {Router} = require('express');
const router = Router();

router.get('/', (req, res, next) => {

    if(req.session.isAuthenticated){
        res.redirect('/admin');
    }

    res.redirect('/auth/login');
});

module.exports = router;