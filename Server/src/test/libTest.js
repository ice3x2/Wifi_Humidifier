// create an in-memory database
var SimpleDb = require('simple-node-db');
var Rx = require('rx');
db = new SimpleDb('../../database');

global._ = require('lodash');
global._rx = require('rx');
require('../../import').init('../.',['(.+)test/','(.+)node_modules/','(.+)views/','(.+)gulp/'])

var log = include('ColorLog');

//store.setFanPWM(1).setPowerPWM(1).setMinHumidity(10).setMaxHumidity(50).commit();





//var log = require('../common/ColorLog');
/*
var storage = require('node-persist');


//you must first call storage.init or storage.initSync
storage.initSync();

//then start using it
storage.setItem('name','yourname');
console.log(storage.getItem('ss'));

var batman = {
    first: 'Bruce',
    last: 'Wayne',
    alias: 'Batman'
};

var date = new Date();
date.setFullYear(2015);
date.setMonth(0);
date.setDate(1);
date.setHours(0);
date.setMilliseconds(0);
date.setSeconds(0);
date.setMinutes(0);
console.log(date.getMonth());*/

/*
storage.setItem('batman',batman);
console.log(storage.getItem('batman'));
console.log(Date.now())

console.log(new Date(1442062680552).getHours());
*/
/*
function LogData() {
    this.day = 0;
    this.c = 0;
    this.h = 0;
    this.on = false;
    this.fan = 0;
    this.sonic = 0;
}
var i = 1;

function rt(i) {
    var logData = new LogData();
    logData.day = appendZero(i);
    logData.c = Math.random() % 100;
    logData.h = Math.random() % 100;
    logData.on = (i % 2 == 0);
    logData.fan = i % 255;
    logData.sonic = i % 255;
    var key = db.createDomainKey('LogData', logData.day);
    var callback = function(err, model) {
        if (err) {
            throw err;
        } else {
            //if(i % 100 == 0) {
                console.log(model);
            //}
            if(i < 10000) {
                i += 9;
                rt(i);
            }
        }
    };
    db.insert(key, logData, callback);
}

rt(0);*/

function appendZero(number) {
    var result = number + "";
    var divider = 1000000000000000;
    while(Math.floor(number / divider) == 0) {
        result = "0" + result;
        divider = Math.floor(divider / 10);
    }
    return result;
}


var callback = function(err, model) {
    if (err) {
        throw err;
    } else {
    }
};
/*
var key = db.createDomainKey('LogData', appendZero(1443075747002));
db.insert(key, {a : appendZero(1443075747002)}, callback);

key = db.createDomainKey('LogData', appendZero(1442075567002));
db.insert(key, {a : appendZero(1442075567002)}, callback);

key = db.createDomainKey('LogData', appendZero(1342075547002));
db.insert(key, {a : appendZero(1342075547002)}, callback);

key = db.createDomainKey('LogData', appendZero(1542075547002));
db.insert(key, {a : appendZero(1542075547002)}, callback);

key = db.createDomainKey('LogData', appendZero(75547002));
db.insert(key, {a : appendZero(75547002)}, callback);
*/
/*
var key = db.createDomainKey( 'LogData', 1000000 );

var callback = function(err, model) {
    if (err) console.log(err);
    console.log(model);
};

db.find( key, callback );

function aa(aa,bb) {
    console.log(bb === undefined);
}
 */
/*
var completeCallback = function(err, list) {
    if (err) console.log(err);
    else console.log(list);
};


var params = {
    start:'LogData:' + appendZero(0),
    end:'LogData:' + appendZero(1542075547002 - 1),
};*/

//db.query(params, rowCallback, completeCallback);

var rowCallback = function(key, value) {
    /*db.delete(key,function(err) {

    });*/
    return value;

};



//db.query(params, rowCallback, completeCallback);
//db.queryKeys( {}, console.log );


/*

var properties = require ("properties");

var options = {
    path: true,
    namespaces: true,
    sections: false,
    variables: false,
    include: true
};


properties.parse ("../../.properties", options, function (error, obj){
    if (error) return console.error (error);

    console.log (obj);
    //{ a: 1, b: 2 }
});*/