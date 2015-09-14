// create an in-memory database
var SimpleDb = require('simple-node-db');
var Rx = require('rx');
db = new SimpleDb('../../database');

global._ = require('lodash');
global._rx = require('rx');
require('../../import').init('../.',['(.+)test/','(.+)node_modules/','(.+)views/','(.+)gulp/'])

var log = include('ColorLog');

//store.setFanPWM(1).setPowerPWM(1).setMinHumidity(10).setMaxHumidity(50).commit();

var a =  [{id:1},{id:2}];
console.log(_.find(a, function(obj, idx) {
    return obj.id == 1;
}));

var json = [
    { key: 'firstName', value: 2 },
    { key: 'lastName',  value: 21 },
    { key: 'phone', value: 10 }
];
json = _.sortBy(json, 'value').reverse();;

console.log(json);
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
