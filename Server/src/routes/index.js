var express = require('express');
var path = require('path');
var router = express.Router();
var controlValues = include('ControlValueStore');
var dataStore = include('DataStore');// include('DataStore');
var log = include('ColorLog');


// /ngStatusBox
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




var count = 0;
router.get("/data", function(req, res, next) {

    //res.removeHeader('Transfer-Encoding');
    console.log("data! : ", ++count);
    res.removeHeader('X-Powered-By');
    res.removeHeader('Transfer-Encoding');
    res.removeHeader('Date');
    if (req.path != null) {
      console.log(req.path);
    }
    var result = '';
    var key = req.query.key;
    var temperature = req.query.t;
    var humidity = req.query.h;
    var water = req.query.w;

    result = '*' + controlValues.getMinHumidity() +
             '*' + controlValues.getMaxHumidity() +
             '*' + controlValues.getThresholdDiscomfort() +
             '*' + controlValues.getPowerPWM() +
             '*' + controlValues.getFanPWM() +
             '******';


    log.i(req.query);



    if (temperature != undefined && humidity != undefined && water != undefined) {
      dataStore.putHumidity(humidity / 10).putTemperature(temperature / 10).putWater(water);
      dataStore.putFanPWM(controlValues.getFanPWM()).putPowerPWM(controlValues.getPowerPWM());
      dataStore.commitData();
    }

    setTimeout(function () {
      try {
        console.log("send");
        log.i(result);
        res.send(result);
      } catch (err) {
      }
      ;
    }, 500);

});

module.exports = router;


