var express = require('express');
var path = require('path');
var router = express.Router();
var controlValues = include('ControlValueStore');
var dataStore = include('DataStore');// include('DataStore');
var log = include('ColorLog');



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



module.exports = router;


