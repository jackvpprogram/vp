(function() {
  var winston = require("winston");
  global.logger = new(winston.Logger)({
    transports: [
      new(winston.transports.Console)({
        name: "info",
        timestamp: true,
        level: "info"
      }),
      new(winston.transports.File)({
        name: "error",
        timestamp: true,
        filename: "./logs/error.log",
        maxsize: 10240,
        level: "info"
      })
    ]
  });
})();
var siofu = require("socketio-file-upload");
var cluster = require("cluster");
var jimp = require('jimp');
var jo = require('jpeg-autorotate');
var crypto = require('crypto')

if (cluster.isMaster) {
  if (process.env.IP == null) process.env.IP = "localhost";
  cluster.fork();
  cluster.on("exit", function(_worker, code, signal) {
    logger.error("Worker " + _worker.process.pid + " died with code: " + code + ", and signal: " + signal);
    logger.info("Starting a new worker");
    cluster.fork();
  });
} else {
  var Q = require("q");
  var chatDb = require("./chat.db");
  var io;

  // init
  (function() {
    var express = require("express");
    var app = express();
    var upload = require("multer")({
      dest: "uploads/"
    });
    var server = require("http").createServer(app);
    io = require("socket.io")(server);
    var port = process.env.PORT || 3333;

    server.listen(port, function() {
      logger.info("Server listening at port %d", port);
    });

    app.use(express.static("./client"));

    var uploadTask = Q.async(function*(req, res) {
      var csvReader = require("./csv.reader");
      var userArray = yield csvReader.readCsv(req.file.path);
      yield chatDb.addUsers(userArray);
      return res;
    });

    app.post("/admin/upload", upload.single("upload"), function(req, res) {
      uploadTask(req, res).then(function(res) {
        res.send(true);
      }).catch(function(error) {
        logger.error(error);
        res.send(false);
      });
    });
  })();

  var usernames = {};
  var rooms = {};
  var usersOnProfile = {};
  var usersOnComments = {};
  var banUsernames = [];
  var generalRoom = "General Room";
  var commentsPage = "#commentsPage";
  var adminSocket = null;

  io.on("connection", function(socket) {
    var userId = null;
    var addedUser = false;
    var isAdmin = false;
    var usertype = 0;
    var joinedRoom = null;
    var httpsClient = require('https');
    var uploader = new siofu();
    uploader.dir = "./client/images/uploads";
    uploader.listen(socket);

    // Do something when a file is saved:
    uploader.on("saved", Q.async(function*(event){

    	var orientation = 1;
    	var pathName = event.file.pathName;
    	var lastIndex = pathName.lastIndexOf("/");
    	if(!lastIndex)
    		lastIndex = pathName.lastIndexOf("\\");
    	pathName = pathName.substring(lastIndex + 1);
    	console.log("pathName = " + pathName);
    	var options = {};
    	var path = uploader.dir + '/' + pathName;
    	jo.rotate(path, options, function(error, buffer, ori_orientation) {
    		if (error) {
    			console.log('An error occurred when rotating the file: ' + error.message);
    			return;
    		}
    		orientation = ori_orientation;
    		console.log('Orientation was: ' + ori_orientation);
    	});

    	jimp.read(uploader.dir+ '/' +pathName).then(function (image) {
			// do stuff with the image
			image.quality(50);
			if(image.bitmap.width > 800)
				image.resize(800, jimp.AUTO);
			if(image.bitmap.height > 800)
				image.resize(jimp.AUTO, 800);

			switch(orientation) {
				case 2:
					image.flip(true, false);
					break;
				case 3:
					image.rotate(180);
					break;
				case 4:
					image.flip(false, true);
					break;
				case 5:
					image.rotate(90).flip(true, false);
					break;
				case 6:
					image.rotate(90);
					break;
				case 7:
					image.rotate(270).flip(true, false);
					break;
				case 8:
					image.rotate(270);
					break;
				default:
					break;
			}

			image.write(uploader.dir+ '/resize/'+pathName);
			//socket.emit("image_uploaded", pathName);
			//emitImageUploaded(pathName);
		}).catch(function (err) {
			// handle an exception
			console.log("Error resizing image!", err);
		});
		event.file.clientDetail.pathName = pathName;
        //console.log(event.file);
    }));

    // Error handler:
    uploader.on("error", function(event){
        console.log("Error from uploader", event);
    });

    socket.on("loadlb", Q.async(function*() {
      var data = {limit: 20};
      var lbdata = yield chatDb.loadLB(data);
      //io.to("/leaderboard").emit("loadlb", lbdata);
      socket.emit("loadlb", lbdata);
    }));

    socket.on("checkUsername", Q.async(function*(username) {

      var getUser = yield chatDb.getUser(username);

      var passwordSet = 0;
      if(getUser) {
      	  if(getUser.password)
      	  	  passwordSet = 1;
      	  else
      	  	  passwordSet = 0;
      }
      if (getUser == null) {
        socket.emit("username not exists");
        return;
      } else if (getUser.login && passwordSet == 0) {
      	socket.emit("invalidaccess");
        return;
      } else if (usernames[username] == null) {	//User not logged in
        socket.emit("doPassword", {username, passwordSet});
        return;
      } else {	// User logged in ( on another session ), force old user to logout

      	var oldUser = usernames[username];
        oldUser.emit("forcelogout");
        oldUser.disconnect();

        socket.emit("doPassword", {username, passwordSet});
        return;
      }
    }));

    // check if already logged in
    socket.on("checklogin", Q.async(function*(username, reconnect) {

      var getUser = yield chatDb.getUserId(username);
      logger.info("00 mark: on 'checklogin', getUser=" + JSON.stringify(getUser))
      if (getUser == null) {
        socket.emit("username not exists");
        return;
      } else if (usernames[username] == null) {	// user not logged in
        socket.emit("dologin", {username});
        return;
      } else {									// user logged in other session

      	console.log("Force logout " + username);  //Why does it force logout when the same user emits "checklogin"???
      	//var oldUser = usernames[username];
        //oldUser.emit("forcelogout");
        //oldUser.disconnect();
		//
        //socket.emit("dologin", {username});

        return;
      }
    }));

    // login
    socket.on("login", Q.async(function*(username, roomName) {
		logger.info("logging in " + username);
		if (usernames[username] != null) {
			var oldUser = usernames[username];
			oldUser.emit("forcelogout");
			oldUser.disconnect();

			socket.emit("dologin", {username});
			//socket.emit("already login", username);
			return;
		}

		if (banUsernames.indexOf(username) != -1) {
			socket.emit("already ban");
			return;
		}

		//var getUser = yield chatDb.getUserId(username);
		var getUser = yield chatDb.getUser(username);

		logger.info("logging in 2 " + username + ", getUser=" + JSON.stringify(getUser));
		if (getUser == null) {
			socket.emit("username not exists");
			return;
		}
		yield chatDb.updateUserLogintime(username);

		userId = getUser._id;
		usertype = getUser.userType;

		socket.username = username;
		usernames[username] = socket;
		addedUser = true;
		if (roomName == null)
			roomName = generalRoom;
		yield joinRoom(roomName);

		var isadmin = false;
		if(username == "admin1@dbs.com" || username == "admin2@dbs.com" || username == "admin3@dbs.com" || username == "admin4@dbs.com" || username == "admin5@dbs.com")
			isadmin = true;

		var d = new Date();
		d.setHours(d.getHours() + 8);

		var dow = d.getDay();
		if(dow == 0 || dow == 6)
			dow = 1;
		dow=5;  //why needs above codes when dow is hardcoded???

		socket.emit("login", {
			_id: userId,
			roomName: roomName,
			isAdmin: isadmin,
			userType: usertype,
			username: username,
			dow: dow,
			rooms: yield chatDb.getRoomList()
		});
		//socket.emit("history", yield chatDb.getHistory(joinedRoom, 0, 0, 5, usertype));
		if (adminSocket)
			adminSocket.emit("admin user joined", {
				username: socket.username,
				users: rooms[joinedRoom].users
			});
    }));

    // loginWithPasssword
    socket.on("loginWithPassword", Q.async(function*(user, password) {

      console.log("loginWithPassword");
      username = user.username;
      if (usernames[username] != null) {	// user logged on another session
      	  var oldUser = usernames[username];
      	  oldUser.emit("forcelogout");
      	  oldUser.disconnect();
      }
      if (banUsernames.indexOf(username) != -1) {
      	  socket.emit("already ban");
      	  return;
      }
      //var getUser = yield chatDb.getUserId(username);
      var getUser = yield chatDb.getUser(username);

      if (getUser == null) {
      	  socket.emit("username not exists");
      	  return;
      }

      var randomSalt = "";
      var loginStatus = 0;
      if(user.passwordSet == 1) {	// verify user password
      	  randomSalt = getUser.salt;
      	  console.log("randomSalt1 - " + randomSalt);

      	  var encryptedPassword = crypto.pbkdf2Sync(password, randomSalt, 100, 32, 'sha256').toString('hex');
      	  console.log("encryptedPassword1 - " + encryptedPassword);
      	  //var dbPassword = yield chatDb.getPassword(username);
      	  console.log("dbPassword1 - " + getUser.password);
      	  if(encryptedPassword == getUser.password)
      	  	  loginStatus = 1;
      } else {						// set new password
      	  randomSalt = genRandomString(32);
      	  console.log("randomSalt2 - " + randomSalt);
      	  var encryptedPassword = crypto.pbkdf2Sync(password, randomSalt, 100, 32, 'sha256').toString('hex');
      	  console.log("encryptedPassword2 - " + encryptedPassword);
      	  var setPassword = yield chatDb.setPassword(username, randomSalt, encryptedPassword);

      	  console.log(setPassword.result);
      	  if(setPassword.result.ok == 1)
      	  	  loginStatus = 1;
      }

      console.log("loginStatus " + loginStatus);
      if(loginStatus == 1) { 	//logged in successfully
		  yield chatDb.updateUserLogintime(username);

		  userId = getUser._id;
		  usertype = getUser.userType;

		  console.log("userId " + userId + " , " + username);

		  socket.username = username;
		  console.log("socket " + socket.username);
		  usernames[username] = socket;
		  addedUser = true;

		  /*
		  console.log("roomName = " + roomName);
		  if (roomName == null)
			roomName = "/menu";
		  yield joinRoom(roomName);
		  */

		  var isadmin = false;
		  if(username == "admin1@dbs.com" || username == "admin2@dbs.com" || username == "admin3@dbs.com" || username == "admin4@dbs.com" || username == "admin5@dbs.com")
			  isadmin = true;

		  var d = new Date();
		  d.setHours(d.getHours() + 8);

		  var dow = d.getDay();
		  if(dow == 0 || dow == 6)
			  dow = 1;
		  dow=5;

		  console.log("DOW " + dow);

		  socket.emit("login", {
		    _id: userId,
			roomName: "/menu",
			isAdmin: isadmin,
			userType: usertype,
			username: username,
			dow: dow,
			rooms: yield chatDb.getRoomList()
		  });
		  socket.emit("history", yield chatDb.getHistory(joinedRoom, 0, 0, 5, usertype));
		  if (adminSocket) {
			adminSocket.emit("admin user joined", {
			  username: socket.username,
			  users: rooms[joinedRoom].users
			});
		  }
	  } else {
	  	  socket.emit("login failed");
	  }
    }));

    function genRandomString (length) {
    	return crypto.randomBytes(Math.ceil(length/2))
            .toString('hex') 	/** convert to hexadecimal format */
            .slice(0,length);   /** return required number of characters */
    };

    var checkPMcount = Q.async(function*(pmlist, offset) {
    	var pmarr = [];
    	for(var i=0;i<pmlist.length;i++) {
    		var pmcount = yield chatDb.getTotalMessage(pmlist[i].roomName);
    		var pm = {roomName:pmlist[i].roomName, count:pmcount}
    		console.log("PM " + pmlist[i].roomName + ", " + pmcount);
    		pmarr.push(pm);
    	}
    	console.log("checkPMcount " + pmarr.length);
    	socket.emit("checkPMcount", pmarr);
    });

    socket.on("gettotalmessage", Q.async(function*(roomName, userType) {
      socket.emit("gettotalmessage", yield chatDb.getTotalMessage(roomName, userType));
    }));

    socket.on("refreshlist", Q.async(function*(roomName, sortbylike) {
      socket.emit("history", yield chatDb.getHistory(roomName, sortbylike, 0, 5, usertype));
    }));

    socket.on("loadprevious", Q.async(function*(roomName, sortbylike, messagecount, userType) {
      socket.emit("loadprevious", yield chatDb.getHistory(roomName, sortbylike, messagecount, 5, userType));
    }));

    socket.on("loadmostlikes", Q.async(function*(roomName, userType) {
      socket.emit("history", yield chatDb.getHistory(roomName, 1, 0, 5, userType));
    }));

    socket.on("loadhistory", Q.async(function*(roomName, userType) {
      socket.emit("history", yield chatDb.getHistory(roomName, 0, 0, 5, userType));
    }));

    // when the user disconnects.. perform this
    socket.on("disconnect", function() {
      // remove the username from global usernames list
      if (addedUser) {
        delete usernames[socket.username];
        if (adminSocket)
          adminSocket.emit("admin user left", {
            username: socket.username,
            users: rooms[joinedRoom].users
          });
        leaveRoom();
      }
      if (isAdmin)
        adminSocket = null;
    });

    var callRegister = Q.async(function*(username) {
    		//var httpsRequest = require('request');
			var request = require('request');
			request('https://dev-dbs-api.3radical.com/api/getCampaigns?uid=47F852F973C140458D9FEC41D63B8BED&campaigns=%5B2979%2C2980%2C2981%2C2982%2C2983%5D&source=web', function (error, response, body) {
			  console.log('error:', error); // Print the error if one occurred
			  console.log('statusCode:', response && response.statusCode); // Print the response status code if a response was received
			  console.log('body:', body); // Print the HTML for the Google homepage.
			});
    });

    var refreshRoomList = Q.async(function*() {
      //io.emit("room list", yield chatDb.getRoomList());
    });

    var joinRoom = Q.async(function*(roomName) {
      leaveRoom();
      joinedRoom = roomName;
      yield chatDb.addRoom(joinedRoom);
      if (rooms[roomName] == null) {
        rooms[roomName] = {
          users: {}
        };
        yield refreshRoomList();
      }
      rooms[joinedRoom].users[socket.username] = true;
      socket.join(joinedRoom);
      socket.broadcast.to(joinedRoom).emit("user joined", {
        username: socket.username,
        users: rooms[joinedRoom].users
      });
    });
    var joinPrivateRoom = Q.async(function*(roomName) {
      leaveRoom();
      joinedRoom = roomName;
      var users = roomName.split("|");

      if(users.length > 1)
      	  yield chatDb.addPMRoom(joinedRoom, users[0], users[1]);
      else
      	  yield chatDb.addRoom(joinedRoom);

      if (rooms[roomName] == null) {
        rooms[roomName] = {
          users: {}
        };
        yield refreshRoomList();
      }
      rooms[joinedRoom].users[socket.username] = true;
      socket.join(joinedRoom);
      socket.broadcast.to(joinedRoom).emit("user joined", {
        username: socket.username,
        users: rooms[joinedRoom].users
      });
    });

    function leaveRoom() {
      if (joinedRoom == null) return;
      socket.leave(joinedRoom);
      if (rooms[joinedRoom] != null) {
        delete rooms[joinedRoom].users[socket.username];
        if (joinedRoom != generalRoom && Object.keys(rooms[joinedRoom].users).length == 0)
          delete rooms[joinedRoom];
      }
/*
      socket.broadcast.to(joinedRoom).emit("user left", {
        username: socket.username,
        users: rooms[joinedRoom].users
      });
*/
    }

    // when the client emits "new message", this listens and executes
    socket.on("new message", Q.async(function*(data) {
      var message = data.message
      var room = data.room
      var givepoints = data.givepoints
      var userType = data.userType
      var isReply = data.isReply || false
      var replyTo = data.replyTo || ""

      // we tell the client to execute "new message"
      if(room == null)
        room = joinedRoom;
      else
        joinedRoom = room

      if(givepoints == null)
	    givepoints = 0;

      var msg = {
        username: socket.username,
        userType: userType,
        msg: message,
        room: room,
        time: new Date(),
        likes: [],
        likesCount: 0,
        lastLikeDate: null,
        isReply: isReply,
        replyTo: replyTo,
        replyNum: 0
      };
      yield chatDb.addChat(msg);

      if(givepoints > 0)
        yield chatDb.updateUserpoints(socket.username, givepoints);

      if(isReply && replyTo){
        yield chatDb.updateCommentReplyNum(replyTo)
      }

      logger.info("00 mark: on 'new message', room=" + room + ", message=" + message + ", socket.username=" + socket.username)
      //io.to(room).emit("new message", msg, givepoints);
      socket.emit("new message", msg, givepoints);
    }));

    // when the client emits "typing", we broadcast it to others
    socket.on("typing", function() {
      socket.broadcast.to(joinedRoom).emit("typing", {
        username: socket.username
      });
    });

    // when the client emits "stop typing", we broadcast it to others
    socket.on("stop typing", function() {
      socket.broadcast.to(joinedRoom).emit("stop typing", {
        username: socket.username
      });
    });

    // private message
    socket.on("pm", function(data) {
      var message = data.msg;
      var to = data.to;
      var receiver = usernames[to];
      if (receiver == null) {
        socket.emit("pm fail");
        return;
      }
      var pm = {
        from: socket.username,
        to: to,
        msg: message
      };
      receiver.emit("pm", pm);
    });

    socket.on("search", Q.async(function*(msg) {
      socket.emit("search", yield chatDb.searchChat(joinedRoom, msg, usertype));
    }));

    socket.on("create room", Q.async(function*(roomName) {
      if (joinedRoom == roomName || commentsPage == roomName || (yield chatDb.roomExists(roomName)) == 1) {
        socket.emit("room existed", roomName);
        return;
      }
      yield joinRoomAfterLogin(roomName);
    }));

    var joinRoomAfterLogin = Q.async(function*(roomName) {
      if (joinedRoom == roomName) {
        socket.emit("already joined", roomName);
        return;
      }
      yield joinRoom(roomName);
      socket.emit("join room", {
        users: rooms[joinedRoom].users,
        roomName: roomName
      });
      socket.emit("history", yield chatDb.getHistory(joinedRoom, 0, 0, 5, usertype));
    });

    var joinPMRoom = Q.async(function*(user1Name) {

      var roomName = "";
      if(user1Name > socket.username)
      	  roomName = socket.username + "|" + user1Name;
      else
      	  roomName = user1Name + "|" + socket.username;

      if (joinedRoom == roomName) {
        socket.emit("already joined", roomName);
        return;
      }
      yield joinPrivateRoom(roomName);
      socket.emit("join room", {
        users: rooms[joinedRoom].users,
        roomName: roomName
      });
      socket.emit("history", yield chatDb.getHistory(joinedRoom, 0, 0, 5, usertype));
    });

    socket.on("join room", joinRoomAfterLogin);

    socket.on("joinPM", joinPMRoom);

    var sendProfile = Q.async(function*(username) {
      if (usersOnProfile[username])
        usersOnProfile[username].emit("profile", yield chatDb.getUser(username), yield chatDb.getUserChats(username, usertype));
    });

    var sendProfileUpdate = Q.async(function*(username, chatId) {
      if (usersOnProfile[username])
      usersOnProfile[username].emit("profile", yield chatDb.getUser(username), yield chatDb.getChat(chatId));
    });

    var sendCommentsStat = Q.async(function*() {
      if (Object.keys(usersOnComments).length == 0) return;
      var task1 = chatDb.getRecentLikeComments();
      var task2 = chatDb.getMostLikeComments();
      io.to(commentsPage).emit("comments", yield task1, yield task2);
    });

    socket.on("like", Q.async(function*(data) {
      var chatId = data.chatId
      joinedRoom = data.joinedRoom

      var chat = yield chatDb.likeChat(userId, chatId);
      console.log("joinedRoom=" + joinedRoom + ", userId=" + userId + ", chatId=" + chatId + ", chat.likes=" + chat.likes)
      //io.to(joinedRoom).emit("like", chatId, chat.likes);
      socket.emit("like", chatId, chat.likes);
      yield sendProfileUpdate(chat.username, chatId);
      yield sendCommentsStat();
    }));

    socket.on("unlike", Q.async(function*(data) {
      var chatId = data.chatId
      joinedRoom = data.joinedRoom

      var chat = yield chatDb.unlikeChat(userId, chatId);
      //io.to(joinedRoom).emit("unlike", chatId, chat.likes);
      socket.emit("unlike", chatId, chat.likes);
      yield sendProfileUpdate(chat.username, chatId);
      yield sendCommentsStat();
    }));

    socket.on("getCommentReplies", Q.async(function*(data) {
      var chatId = data.chatId
      socket.emit("getCommentReplies", yield chatDb.getCommentReplies(chatId));
    }));

    //socket.on("replyComment", Q.async(function*(data) {
    //  var chatId = data.chatId
    //  userId = data.userId
    //  joinedRoom = data.joinedRoom
	//
    //  var chat = yield chatDb.replyChat(userId, chatId);
    //  console.log("replyComment: chatId=" + chatId + ", chat.replies=" + chat.replies)
    //  //io.to(joinedRoom).emit("like", chatId, chat.likes);
    //  socket.emit("like", chatId, chat.likes);
    //  yield sendProfileUpdate(chat.username, chatId);
    //  yield sendCommentsStat();
    //}));

    socket.on("updatemenuprofile", Q.async(function*(username) {
      var user = usernames[username];
      //var username = socket.username;
      //usersOnProfile[username] = socket;
      user.emit("updatemenuprofile", yield chatDb.getUser(username));
    }));

    socket.on("on profile", Q.async(function*() {
      var username = socket.username;
      usersOnProfile[username] = socket;
      sendProfile(username);
    }));

    socket.on("off profile", Q.async(function*() {
      var username = socket.username;
      if (usersOnProfile[username])
        delete usersOnProfile[username];
    }));

    socket.on("on comments", Q.async(function*() {
      socket.join(commentsPage);
      usersOnComments[socket.username] = true;
      sendCommentsStat();
    }));

    socket.on("off comments", Q.async(function*() {
      socket.leave(commentsPage);
      if (usersOnComments[socket.username])
        delete usersOnComments[socket.username];
    }));

    //admin function
    socket.on("admin login", function(password) {
      if (adminSocket == null && password == "123456") {
        isAdmin = true;
        adminSocket = socket;
        socket.emit("admin login", Object.keys(usernames));
      } else
        socket.emit("admin fail");
    });

    socket.on("private list", Q.async(function*() {
      var privateRoomList = yield chatDb.getPrivateRoomList(socket.username);
      var pmUser = usernames[socket.username];
      pmUser.emit("private list", privateRoomList);
      checkPMcount(privateRoomList, 0);
    }));

    socket.on("ban", function(user) {
      if (!isAdmin) {
        socket.emit("admin fail");
        socket.disconnect();
        return;
      }
      var banUser = usernames[user];
      if (banUser == null) return;
      banUsernames.push(user);
      banUser.emit("ban");
      banUser.disconnect();
    });

    socket.on("checkpoll", Q.async(function*(data) {
      var getAnswer = yield chatDb.getAnswer(socket.username, data);
      var answerUser = usernames[socket.username];
      answerUser.emit("checkpoll", getAnswer[0]);
    }));

    socket.on("checkVideo", Q.async(function*(data) {
      console.log('checking video' + data);
      var getAnswer = yield chatDb.getAnswer(socket.username, data);
      var answerUser = usernames[socket.username];
      answerUser.emit("checkVideo", getAnswer[0]);
    }));

    socket.on("getpollresults", Q.async(function*(data) {
      //logger.info("getpoolresults! " + data.day + ", " + data.question);
      var getResults1 = yield chatDb.getPollResults(data,1);
      var getResults2 = yield chatDb.getPollResults(data,2);
      var getResults3 = yield chatDb.getPollResults(data,3);
      var getResults4 = yield chatDb.getPollResults(data,4);
      //logger.info("getpoolresults2! " + getResults1);

      //io.to(joinedRoom).emit("getpollresults", getResults1, getResults2, getResults3, getResults4);
      var answerUser = usernames[socket.username];
      answerUser.emit("getpollresults", getResults1, getResults2, getResults3, getResults4);
    }));

    socket.on("new answer", Q.async(function*(data) {

      var correctanswer = false;
      var getAnswer = yield chatDb.getAnswer(socket.username, data);

      if (getAnswer.length == 0) {
        // it is a poll, all answers are correct!
        if(data.day == 1) {
        	correctanswer = true;
        } else if (data.day == 2) {
        	if(data.question == 1 || data.question == 2)
        		correctanswer = true;
        } else if (data.day == 3) {
        	if(data.question == 1 || data.question == 2)
        		correctanswer = true;
        } else if (data.day == 4) {
        	if(data.question == 1 || data.question == 2)
        		correctanswer = true;
        } else if (data.day == 5) {
        	if(data.question == 1 || data.question == 2)
        		correctanswer = true;
        } else if (data.day == 6) {
        	correctanswer = true;
        }
      }

      var answerdata = {
        username: socket.username,
        day: data.day,
        question: data.question,
        answer: data.answer,
        points: data.points,
        status: correctanswer,
        time: new Date()
      };

      //if(correctanswer == true) {
	/*
        if(data.day == 1 && data.question == 2)
        	yield chatDb.updateAnswer(answerdata);
	else
	*/
      yield chatDb.addAnswer(answerdata);

      if(correctanswer == true) {
        yield chatDb.updateUserpoints(socket.username, answerdata.points);
      }

      if (getAnswer.length > 0) {
      	  if(getAnswer[0].answer == data.answer)
      	  	  answerdata.status = true;
      	  else
      	  	  answerdata.status = false;

          // Day 5, no points for entering Code
          if(answerdata.points == 0)
            answerdata.status = false;

      	  answerdata.points = 0;
      }

      //io.to(joinedRoom).emit("new answer", answerdata);
      var answerUser = usernames[socket.username];
      answerUser.emit("new answer", answerdata);
    }));

    // polling
    socket.on('getVideos', Q.async(function*(roomName) {
      socket.emit('getVideos', yield chatDb.getVideos(roomName));
    }));

    socket.on('getPollingList', Q.async(function*(videoId) {
      console.log('1111');
      socket.emit('getPollingList', yield chatDb.getPollingList(videoId, usertype));
    }));

    socket.on('createPolling', Q.async(function*(videoId, name, desc, answers) {
      console.log(222);
      yield chatDb.createPolling(videoId, usertype, name, desc, answers);
      socket.emit('createPolling', true);
    }));

    socket.on('searchPolling', Q.async(function*(videoId, name) {
      socket.emit('searchPolling', yield chatDb.searchPolling(videoId, usertype, name));
    }));

    socket.on('isVote', Q.async(function*(pollingId) {
      socket.emit('isVote', yield chatDb.isVote(pollingId, userId));
    }));

    socket.on('getPolling', Q.async(function*(pollingId) {
      socket.emit('getPolling', yield chatDb.getPolling(pollingId));
    }));

    socket.on('vote', Q.async(function*(pollingId, choose) {
      yield chatDb.vote(pollingId, userId, choose, usertype);
      socket.emit('vote', true);
    }));

    socket.on('initVote', Q.async(function*(pollingId) {
      var polling = yield chatDb.getPolling(pollingId);
      var pollingChoose = yield chatDb.getVote(pollingId, userId);
      var voteVount = yield chatDb.getVoteCount(pollingId, usertype);
      if (!pollingChoose) {
        socket.emit('initVote', {
          status: false
        });
      } else {
        var optionsCount = [];
        for (var i = 0; i < polling.answers.length; i++) {
          var count = yield chatDb.getVoteOptionsCount(pollingId, usertype, polling.answers[i]);
          optionsCount.push({
            [`${polling.answers[i]}`]: count
          });
        }
        socket.emit('initVote', {
          status: true,
          result: {
            polling,
            voteVount,
            pollingChoose,
            optionsCount
          }
        });
      }
    }));
  });
}
