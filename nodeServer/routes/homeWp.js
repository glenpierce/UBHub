const express = require('express');
const router = express.Router();
const http = require('http');

router.get('/', function(req, res, next) {
    const options = {
        host: '99.79.78.145',
        path: '/',
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
                const removeFromeHere= '<header class="wp-block-template-part">';
                const removeToHere = '<p class="has-text-align-center has-background-color has-text-color">Global impact through local action</p>\n' +
                    '</div></div>\n' +
                    '</header>';

                const firstSection = rawData.split(removeFromeHere)[0];
                let secondSection = rawData.split(removeToHere)[1];
                res.render('homeWp', {username: req.session.user, data: firstSection + secondSection});
            } catch (e) {
                console.error(e.message);
            }
        });

    });
});

module.exports = router;
