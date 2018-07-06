var fs = require("fs");
var Q = require("q");

exports.readCsv = Q.async(function*(path) {
  var jsonAry = [];
  var data = yield readFile(path);
  var deleteTask = deleteFile(path);
  var tempAry = data.split("\r\n");
  for (var i in tempAry) {
    var temp = tempAry[i];
    if (temp !== "") {
      var dataAry = temp.split(",");
      jsonAry.push({
        displayname: dataAry[0],
        department: dataAry[1],
        username: dataAry[2],
        userType: parseInt(dataAry[3]),
        points: parseInt(dataAry[4]),
        teamId: dataAry[5]
      });
    }
  }
  yield deleteTask;
  return jsonAry;
});

function readFile(path) {
  var deferred = Q.defer();
  fs.readFile(path, "utf8", deferred.makeNodeResolver());
  return deferred.promise;
}

function deleteFile(path) {
  var deferred = Q.defer();
  fs.unlink(path, deferred.makeNodeResolver());
  return deferred.promise;
}
