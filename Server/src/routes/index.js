var express = require('express');
var path = require('path');
var router = express.Router();
var controlValues = include('ControlValueStore');
var dataStore = include('DataStore');// include('DataStore');
var log = include('ColorLog');


router.post('/list', function(req, res, next) {

  if(_.isEmpty(req.body)) {
    res.json([]);
    return;
  }
  function subscriber(list) {
    log.d(list.length)
    res.json(list);
  }
  function error(err) {
    next(err);
  }
  var time = (parseInt(req.body.time) + '' == 'NaN')?Date.now():parseInt(req.body.time);

  if(req.body.type == 'h') {
    dataStore.readHourRx(time).subscribe(subscriber, error);
  } else if(req.body.type == 'd') {
    dataStore.readDayRx(time).subscribe(subscriber, error);
  } else if(req.body.type == 'm') {
    dataStore.readMonthRx(time).subscribe(subscriber, error);
  } else if(req.body.type == 'y') {
    dataStore.readYearRx(time).subscribe(subscriber, error);
  } else {
    res.json([]);
  }

});


router.all(/^\/ng.*$/, function(req, res, next) {

  var filename = req.path.substring(1, req.path.length);
  log.e(req.path);
  var sIdx =filename.lastIndexOf('/');
  if(sIdx > 0) {
    filename = req.path.substring(0, sIdx);
  }
  filename += ".html";
  log.e(filename);
  res.sendFile(path.join(__rootPath, 'build','template', filename));
});


router.get('/', function(req, res, next) {
  log.e(req.path);
  res.sendFile(path.join(__rootPath, 'build', 'index.html'));
});



router.get("/data", function(req, res, next) {

    res.removeHeader('X-Powered-By');
    res.removeHeader('Transfer-Encoding');
    res.removeHeader('Date');
    if (req.path != null) {
      console.log(req.path);
    }
    var result = "";
    var key = req.query.key;
    var temperature = req.query.t;
    var humidity = req.query.h;
    var water = req.query.w;


    if(key != __properties.control.key) {
        result = "Auth fail";
    } else {
        result = ',' + controlValues.getMinHumidity() +
            ',' + controlValues.getMaxHumidity() +
            ',' + (controlValues.getThresholdDiscomfort()  * 10) +
            ',' + controlValues.getPowerPWM() +
            ',' + controlValues.getFanPWM() +
            ',,,,,';
    }


    log.v(JSON.stringify(req.query));


    if (temperature > -100 && humidity > -100 &&
        temperature != undefined && humidity != undefined && water != undefined) {
      dataStore.putHumidity(humidity / 10).putTemperature(temperature / 10).putWater(water);
      dataStore.putFan(controlValues.getFan()).putPower(controlValues.getPower());
      dataStore.commitData();
    }

    log.i(result);
    res.send(result);
});

module.exports = router;


