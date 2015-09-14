/**
 * Created by ice3x2 on 2015. 9. 15..
 */

var cryptoJS = require('crypto-js');
var log = include('ColorLog')
const KEY_LENGTH = 12;

var Session = function() {
    var _waitSessionMap = [];
    var _availableSessionMap = [];
    var SessionInfo = function(_time, _hashString) {
        this.time = _time;
        this.success = false;
        this.hashString = _hashString;
        this.ip = '';
    };

    this.createKey = function() {
        var publicKey = randomString(KEY_LENGTH);
        var hashString = cryptoJS.HmacSHA256(__properties.control.key,publicKey).toString();
        _waitSessionMap.push(new SessionInfo(Date.now(),hashString));
        _waitSessionMap = gcSessionMap(_waitSessionMap);
        return publicKey;
    };

    this.auth = function(hashString) {
        if(this.renewSession(hashString)) {
            return true;
        }
        var sessionInfo = _.find(_waitSessionMap, function(item, index) {
            if(item.hashString == hashString) {
                item.time = Date.now();
                item.success = true;
                _availableSessionMap.push(_.cloneDeep(item));
                return true;
            }
            return false;
        });
        _availableSessionMap = gcSessionMap(_availableSessionMap);
        return sessionInfo;
    };

    this.renewSession = function(hashString) {
        var sessionInfo = _.find(_availableSessionMap, function(item, index) {
            if(item.hashString == hashString) {
                item.time = Date.now();
                item.success = true;
            }
            return false;
        });
        return !_.isUndefined(sessionInfo) && !_.isNull(sessionInfo);
    };

    this.removeSession = function(hashString) {
        var sessionMap = [];
        var result = false;
        _.forEach(_availableSessionMap, function(item) {
           if(item.hashString != hashString) {
               sessionMap.push(item);
           } else {
               result = true;
           }
        });
        _availableSessionMap = sessionMap;
        return result;
    };


    function gcSessionMap(sessionMap) {
        if(sessionMap.length > __properties.web.max_session) {
            return _.take(_.sortBy(sessionMap, 'time').reverse(), sessionMap.length - 1);
        }
        return sessionMap;
    }

    // 인터넷에서 긁어온 함수.
    function randomString(length) {
        var text = "";
        var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        for(var i = 0; i < length; i++) {
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        }
        return text;
    };


    return this;
}();


module.exports = Session;