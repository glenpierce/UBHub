const express = require('express');
const router = express.Router();
const http = require('http');

router.get('/', function(req, res, next) {
    const options = {
        host: '99.79.78.145',
        path: '/about/',
        port: 80,
        headers: {
            'Content-Type': 'text/html; charset=utf-8'
        }
    };
    http.get(options, (response) => {
        response.setEncoding('utf8');
        let rawData = '';
        response.on('data', (chunk) => { rawData += chunk; });
        response.on('end', () => {
            try {
                const firstSection = rawData.split('<header')[0];
                let secondSection = rawData.split('header>')[1];
                secondSection = secondSection.split('<div class="wp-block-cover is-light"')[0]
                const thirdSection = rawData.split('footer>')[1];
                res.render('aboutUsWp', {username: req.session.user, data: firstSection + secondSection + thirdSection});
            } catch (e) {
                console.error(e.message);
            }
        });

    });
});

module.exports = router;
