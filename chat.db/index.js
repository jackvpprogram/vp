var url = "mongodb://" + process.env.IP;
var userCollection = null;
var chatCollection = null;
var roomCollection = null;
var answerCollection = null;
var videoCollection = null;
var pollingMapCollection = null;
var pollingCollection = null;
var pollingChooseCollection = null;

var Q = require("q");
var MongoClient = require("mongodb").MongoClient;
var ObjectID = require('mongodb').ObjectID;
var assert = require("assert");

MongoClient.connect(url, function(err, db) {
  assert.equal(err, null);
  logger.info("Connected to mongodb server.");
  userCollection = db.collection("user");
  chatCollection = db.collection("chat");
  roomCollection = db.collection("room");
  answerCollection = db.collection("answer");
  videoCollection = db.collection('video');
  pollingMapCollection = db.collection('pollingMap');
  pollingCollection = db.collection('polling');
  pollingChooseCollection = db.collection('pollingChoose');
});

exports.getUserId = function(username) {
  return userCollection.findOne({
    username: username
  }, {
    _id: 1
  });
};

exports.getPassword = function(username) {
  return userCollection.findOne({
    username: username
  }, {
    password: 1
  });
};

exports.getUser = function(username) {
  return userCollection.findOne({
    username: username
  });
};

exports.addUsers = Q.async(function*(userArray) {
  for (var i in userArray) {
    var user = userArray[i];
    yield userCollection.updateOne({
      username: user.username
    }, user, {
      upsert: true,
      w: 1
    });
  }
});

function findOrCreateRoom(roomName) {
  return roomCollection.findOneAndUpdate({
    roomName: roomName
  }, {
    $setOnInsert: {
      roomName: roomName
    }
  }, {
    upsert: true,
    returnOriginal: false
  });
}
function findOrCreatePMRoom(roomName, user1, user2) {
  return roomCollection.findOneAndUpdate({
    roomName: roomName,
    user1: user1,
    user2: user2
  }, {
    $setOnInsert: {
      roomName: roomName,
      user1: user1,
      user2: user2
    }
  }, {
    upsert: true,
    returnOriginal: false
  });
}

exports.addRoom = Q.async(function*(roomName) {
  var result = yield findOrCreateRoom(roomName);
  return result.value._id;
});

exports.addPMRoom = Q.async(function*(roomName, user1, user2) {
  var result = yield findOrCreatePMRoom(roomName, user1, user2);
  return result.value._id;
});

exports.roomExists = Q.async(function*(roomName) {
  return roomCollection.find({
    roomName: roomName
  }).count();
});

// function getLimitData(limit, cursor) {
//   return cursor.limit(limit).toArray();
// }

exports.getRoomList = Q.async(function*(roomId) {
  var cursor;
  if (roomId == undefined)
    cursor = roomCollection.find();
  else
    cursor = roomCollection.find({
      _id: {
        $gt: roomId
      }
    });
  return yield cursor.toArray();
  //return yield getLimitData(20, cursor);
});

exports.getPrivateRoomList = Q.async(function*(username) {
  var cursor;
  cursor = roomCollection.find({
  	$or:[{user1: username},{user2: username}]
  });
  return yield cursor.toArray();
  //return yield getLimitData(20, cursor);
});

exports.addChat = function(msg) {
  return chatCollection.insertOne(msg);
};

exports.addAnswer = function(answer) {
  return answerCollection.insertOne(answer);
};

exports.updateAnswer = function(data) {
  return answerCollection.findOneAndUpdate({
      username: data.username
  }, {
    $set: {
      answer: 1,
      time: new Date()
    }
  });
};

exports.getAnswer = function(user,data) {
  return answerCollection.find({
    username: user,
    day: data.day,
    question: data.question
  }).toArray();
};
exports.getPollResults = function(data, a) {
  return answerCollection.find({
   day: data.day,
   question: data.question,
   answer: a
  }).count();
};

exports.getHistory = function(roomName, sortbylike, skip, limit, userType) {

  if(sortbylike == true) {

    return chatCollection.find({
      room: roomName,
      userType: userType,
      isReply: false
    }).sort({
      likesCount: -1
    }).skip(skip).limit(limit).toArray();

  } else {

    return chatCollection.find({
      room: roomName,
      userType: userType,
      isReply: false
    }).sort({
      time: -1
    }).skip(skip).limit(limit).toArray();
  }

};

exports.getTotalMessage = function(roomName, userType) {
  return chatCollection.find({
    room: roomName,
    userType: userType,
    isReply: false
  }).count();
};

exports.searchChat = function(roomName, search, userType) {
  return chatCollection.find({
    room: roomName,
    userType: userType,
    $text: {
      $search: search
    }
  }).sort({
    time: 1
  }).toArray();
};

function updateChatLikes(userId, chatId) {
  return chatCollection.findOneAndUpdate({
    _id: new ObjectID(chatId),
    likes: {
      $nin: [new ObjectID(userId)]
    }
  }, {
    $push: {
      likes: new ObjectID(userId)
    },
    $inc: {
      likesCount: 1
    },
    $set: {
      lastLikeDate: new Date()
    }
  }, {
    returnOriginal: false
  });
}

function updateChatUnlikes(userId, chatId) {
  return chatCollection.findOneAndUpdate({
    _id: new ObjectID(chatId),
    likes: {
      $in: [new ObjectID(userId)]
    }
  }, {
    $pull: {
      likes: new ObjectID(userId)
    },
    $inc: {
      likesCount: -1
    }
  }, {
    returnOriginal: false
  });
}

function updateUserPoints(username, points) {
  return userCollection.updateOne({
    username: username
  }, {
    $inc: {
      points: points
    }
  });
}

exports.updateUserpoints = Q.async(function*(username, points) {
  return yield updateUserPoints(username, points);
});

exports.updateCommentReplyNum = Q.async(function*(chatId) {
  return yield updateCommentReplyNum(chatId);
});

exports.getCommentReplies = Q.async(function*(chatId) {
  return yield getCommentReplies(chatId);
});

function updateCommentReplyNum(chatId) {
  return chatCollection.update({
    _id: new ObjectID(chatId)
  }, {
    $inc: {
      replyNum: 1
    }
  });
}

function getCommentReplies(chatId) {
  return chatCollection.find({
    isReply: true,
    replyTo: chatId
  }).toArray();
}

function updateUserLoginTime(username) {
  return userCollection.updateOne({
    username: username
  }, {
    $set: {
      login: new Date()
    }
  });
}

function updateUserPassword(username, salt, password) {
  return userCollection.updateOne({
    username: username
  }, {
    $set: {
      salt: salt,
      password: password
    }
  });
}

exports.setPassword = Q.async(function*(username, salt, password) {
  return yield updateUserPassword(username, salt, password);
});

exports.updateUserLogintime = Q.async(function*(username) {
  return yield updateUserLoginTime(username);
});

exports.likeChat = Q.async(function*(userId, chatId) {
  var result = yield updateChatLikes(userId, chatId);
  var chat = result.value;
  console.log("userId=" + userId + ", chatId=" + chatId + ", chat=" + JSON.stringify(chat))
  yield updateUserPoints(chat.username, 5);
  return chat;
});

exports.unlikeChat = Q.async(function*(userId, chatId) {
  var result = yield updateChatUnlikes(userId, chatId);
  var chat = result.value;
  yield updateUserPoints(chat.username, -5);
  return chat;
});

exports.getUserChats = Q.async(function*(username, userType) {
  return chatCollection.find({
    username: username,
    userType: userType
  }).sort({
    time: -1
  }).toArray();
});

exports.getChat = Q.async(function*(chatId) {
  return chatCollection.findOne({
    _id: new ObjectID(chatId)
  });
});

exports.getRecentLikeComments = Q.async(function*() {
  return chatCollection.find({
    lastLikeDate: {
      $ne: null
    }
  }).sort({
    lastLikeDate: -1
  }).limit(100).toArray();
});

exports.getMostLikeComments = Q.async(function*() {
  return chatCollection.find({
    likesCount: {
      $ne: 0
    }
  }).sort({
    likesCount: -1
  }).limit(100).toArray();
});

exports.loadLB = function(data) {
  return userCollection.find({
  }).sort({
        points: -1
  }).skip(0).limit(data.limit).toArray();
};

// polling
function getRoom(roomName) {
  return roomCollection.findOne({
    roomName: roomName
  })
}
exports.getVideos = Q.async(function*(roomName) {
  var room = yield getRoom(roomName);
  if (!room) {
    return [];
  }
  return videoCollection.find({
    roomId: new ObjectID(room._id)
  }).toArray();
});

function getPollingMap(videoId, userType) {
  return pollingMapCollection.findOne({
    videoId: new ObjectID(videoId),
    userType: userType
  })
}
exports.getPollingList = Q.async(function*(videoId, userType) {
  var pollingMap = yield getPollingMap(videoId, userType);
  if (!pollingMap) {
    return [];
  }
  return pollingCollection.find({
    pollingMapId: new ObjectID(pollingMap._id)
  }).toArray();
});

function findOrCreatePollingMap(videoId, userType) {
  return pollingMapCollection.findOneAndUpdate({
    videoId: new ObjectID(videoId),
    userType: userType
  }, {
    $setOnInsert: {
      videoId: new ObjectID(videoId),
      userType: userType,
      createAt: new Date()
    }
  }, {
    upsert: true,
    returnOriginal: false
  });
}
exports.createPolling = Q.async(function*(videoId, userType, name, desc, answers) {
  var pollingMap = yield findOrCreatePollingMap(videoId, userType);
  return pollingCollection.updateOne({
    pollingMapId: new ObjectID(pollingMap.value._id),
    name: name
  }, {
    pollingMapId: new ObjectID(pollingMap.value._id),
    name: name,
    desc: desc,
    answers: answers,
    createAt: new Date()
  }, {
    upsert: true,
    w: 1
  })
});

exports.searchPolling = Q.async(function*(videoId, userType, name) {
  var pollingMap = yield getPollingMap(videoId, userType);
  if (!pollingMap) {
    return [];
  }
  var where = {
    pollingMapId: new ObjectID(pollingMap._id)
  };
  where['name'] = new RegExp(name);
  return pollingCollection.find(where).toArray();
});

function getPollingChoose(pollingId, userId, userType) {
  return pollingChooseCollection.findOne({
    pollingId: new ObjectID(pollingId),
    userId: new ObjectID(userId),
    userType: userType
  })
}
exports.isVote = Q.async(function*(pollingId, userId, userType) {
  var pollingChoose = yield getPollingChoose(pollingId, userId, userType);
  if (pollingChoose) {
    return true;
  }
  return false;
});

exports.getPolling = Q.async(function*(pollingId) {
  return pollingCollection.findOne({
    _id: new ObjectID(pollingId)
  })
});

exports.vote = Q.async(function*(pollingId, userId, choose, userType) {
  var isVote = yield exports.isVote(pollingId, userId, userType);
  if (isVote) {
    return;
  }
  return pollingChooseCollection.insertOne({
    pollingId: new ObjectID(pollingId),
    userId: new ObjectID(userId),
    choose: choose,
    userType: userType,
    createAt: new Date()
  })
});

exports.getVote = Q.async(function*(pollingId, userId, userType) {
  return getPollingChoose(pollingId, userId, userType);
});

exports.getVoteCount = Q.async(function*(pollingId, userType) {
  return pollingChooseCollection.find({
    pollingId: new ObjectID(pollingId),
    userType: userType
  }).count();
});

exports.getVoteOptionsCount = Q.async(function*(pollingId, userType, choose) {
  return pollingChooseCollection.find({
    pollingId: new ObjectID(pollingId),
    userType: userType,
    choose: choose
  }).count();
});
