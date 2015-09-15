/**
 * Created by ice3x2 on 2015. 9. 15..
 */

var express = require('express');
var router = express.Router();
var session = include('Session');

router.post('/login', function(req, res, next) {
    var sessionInfo = session.auth(req.body.key || 'error');
    if(!_.isUndefined(sessionInfo)) {
        res.cookie('sid', sessionInfo.hashString);
        res.json({auth : true});
    } else {
        res.status(401).json({auth : false});
    }
});

router.post('/logout', function(req, res, next) {
    var isSuccess = session.removeSession(req.cookies.sid || 'error');
    res.clearCookie('sid');
    res.status(isSuccess?200:401).json(isSuccess?{auth : true}:{auth : false})
});

router.post('/key', function(req, res, next) {
    res.json({key : session.createKey()});
});

module.exports = router;
