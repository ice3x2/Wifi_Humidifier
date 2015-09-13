var express = require('express');
var router = express.Router();
var controlValues = include('ControlValueStore');
var dataStore = require('../data/DataStore');// include('DataStore');
var log = include('ColorLog');


const NIL_VALUE = -1000;
/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

router.get('/us', function(req, res, next) {
  //res.removeHeader('Transfer-Encoding');
  res.removeHeader('X-Powered-By');
  res.removeHeader('Connection');
  res.removeHeader('Transfer-Encoding');
  res.removeHeader('Date');
  res.send('* /50/60/80/255/255/').end();
});

var count = 0;

router.get("/data", function(req, res, next) {
  //res.removeHeader('Transfer-Encoding');
  console.log("data! : ", ++count);
  res.removeHeader('X-Powered-By');
  res.removeHeader('Transfer-Encoding');
  res.removeHeader('Date');
  if(req.path != null) {
    console.log(req.path);
  }


  var key = req.query.key;
  var temperature = req.query.t;
  var humidity = req.query.h;
  var water = req.query.w;
  log.i(temperature);
  log.i(humidity);
  log.i(water);

  if(temperature != undefined && humidity != undefined && water != undefined) {
    dataStore.putHumidity(humidity / 10).putTemperature(temperature / 10).putWater(water);
    dataStore.commitData()

    /*var date = new Date();
    //date.setHours(new Date(Date.now()).getHours() - 6 );
    dataStore.readYearRx(date.getTime()).subscribe(function(list) {
      _.forEach(list, function(n) {
        log.i(new Date(n.time).getMonth());
      });
      log.v(list.length);
    }, function(err) {
      log.e(err.stack);
    });*/
  }

  setTimeout(function() {
    try {
      console.log("send");
      res.send("*50*60*80*215*200*****");
    } catch(err){};
  },1500);
});

module.exports = router;


