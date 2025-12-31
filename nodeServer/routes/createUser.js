import express from 'express';
const router = express.Router();
import bcrypt from 'bcryptjs';
import { makeDbCallAsPromise } from '../ConnectionPool.js';

router.get('/', function(req, res, next){
    res.render('createUser', {errorFromServer:false});
});

router.post('/', function(req, res){
    isUserNameUnique(req, res);
});

function isUserNameUnique(req, res){
    const queryString = "select * from users where email = '" + req.body.alias + "';";
    makeDbCallAsPromise(queryString)
        .then(rows => {
            if(rows.size) {
                res.render('createUser', {errorFromServer: true});
            } else {
                createUser(req, res);
            }
        });
}

function createUser(req, res) {
    console.log("creating user");

    const salt = bcrypt.genSaltSync(10) + req.body.username.toLowerCase() + config.salt;
    const hash = bcrypt.hashSync(req.body.password, salt);

    const queryString = 'CALL createUser("' + req.body.username + '", "' + hash + '", "' + req.body.alias + '", "' + req.body.userAddress + '")';
    makeDbCallAsPromise(queryString)
        .then(rows => {
            console.log('The user db has created a user: ', JSON.stringify(rows));
            res.redirect('login');
        })
        .catch(error => {
            res.render('createUser', {errorFromServer: true});
        });
}

export default router;