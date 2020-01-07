const {Router} = require('express');
const router = Router();
const auth = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
    res.render('admin/index', {
        title: 'Admin',
    });
});

module.exports = router;