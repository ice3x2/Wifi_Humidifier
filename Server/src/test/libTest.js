// create an in-memory database
var SimpleDb = require('simple-node-db');
var Rx = require('rx');
db = new SimpleDb('../../database');

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
    //console.log(result);
    var divider = 10000000000;
    while(Math.floor(number / divider) == 0) {
        result = "0" + result;
        divider = Math.floor(divider / 10);
    }
    return result;
}


/*
var key = db.createDomainKey( 'LogData', 1000000 );

var callback = function(err, model) {
    if (err) console.log(err);
    console.log(model);
};

db.find( key, callback );*/


/*

var rowCallback = function(key, value) {
    // put appropriate query conditions here
    return value;

};

var completeCallback = function(err, list) {
    if (err) console.log(err);
    else console.log(list);
};

var params = {
    start:'LogData:' + appendZero(5),
    end:'LogData:' + appendZero(100)  // the tilde insures all 'my domain' rows are found
};

db.query(params, rowCallback, completeCallback);
//db.queryKeys( {}, console.log );


*/

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
});