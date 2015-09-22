var cryptoJS = require('crypto-js');

var hashString = cryptoJS.HmacSHA256("moeb","12345678").toString();


console.log(hashString);