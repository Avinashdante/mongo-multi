var express = require("express");
var mongoose = require("mongoose");
var Schema = mongoose.Schema;
var app = express();
//Global connection stack
var globalConnectionStack = [];
var dbs = {
  test1: {
    uri: "mongodb://localhost:27017/test1",
  },
  test2: {
    uri: "mongodb://localhost:27017/test2",
  },
  default: {
    uri: "mongodb://localhost:27017/physical-dev-127",
  },
};

//sample mongoose schema for testing
var UserSchema = new Schema(
  {
    first: {
      type: String,
    },
    last: {
      type: String,
    },
  },
  { timestamps: true }
);

/*
middleware config
here we analys the requests and create non created host mongo connections
and that connections are stored on the global connection stack variable.
here I present a simple schema with two fields.
*/
app.use(function (req, res, next) {
  var host = req.headers.host;
  console.log("host", host);
  if (typeof dbs[req.headers.host] === "undefined")
    dbs[req.headers.host] = dbs.default.uri;

  var connection_uri = dbs[req.headers.host].uri;
  var dburi = "";
  if (typeof globalConnectionStack[host] === "undefined") {
    //initiating one time unique connection
    globalConnectionStack[host] = {};
    globalConnectionStack[host].db = mongoose.createConnection(
      "mongodb://localhost:27017/test2"
    );
    globalConnectionStack["test1.test.com"] = {};
    globalConnectionStack["test1.test.com"]["db"] = mongoose.createConnection(
      "mongodb://localhost:27017/test1"
    );
    console.log(
      globalConnectionStack["test1.test.com"]["db"].id,
      globalConnectionStack[host].db.id
    );
    //save user model to the corresponding stack
    globalConnectionStack[host].user = globalConnectionStack[host].db.model(
      "User",
      UserSchema
    );
  }
  return next();
});

//random text generate method
function randomTextGenerator() {
  var text = "";
  var possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (var i = 0; i < 5; i++)
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  return text;
}

//save data to the corresponding database
app.get("/random", function (req, res) {
  var host = req.headers.host; //for ex: localhost:3000 or 127.0.0.1
  var ranName = new globalConnectionStack[host].user({
    first: randomTextGenerator(),
    last: randomTextGenerator(),
  });
  ranName.save(function () {
    //res.send('New data saved in ' + host + 'database');
    res.redirect("/");
  });
});
/*
 Root path
 here the code checks the client hostname
 if the host is listed in the array 
 then it will get the data from the database that mentioned in that host array
*/
app.get("/", function (req, res) {
  var host = req.headers.host; //for ex: localhost:3000 or 127.0.0.1
  req["mongo"] = mongoose.createConnection("mongodb://localhost:27017/test2");
  //   req["mongo"].user = req["mongo"].model("User", UserSchema);

  // ;
  req.mongo
    .model("User", UserSchema)
    .find({}, function (err, data) {
      res.json(data);
    })
    .sort({ createdAt: -1 });
});

//server starts here
app.listen(5000, function () {
  console.log("Example app listening on port 5000!");
});
