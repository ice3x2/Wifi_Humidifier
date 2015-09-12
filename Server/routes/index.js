var express = require('express');
var router = express.Router();

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

  setTimeout(function() {
    try {
      console.log("send");
      res.send("*50*60*80*215*200*****");
    } catch(err){};
  },1500);
});

module.exports = router;


