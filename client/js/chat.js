angular.module("vpconf.chatService", []).factory("chatService", [
	"$timeout", "$q", "$rootScope", "$state",
	function ($timeout, $q, $rootScope, $state) {
		var $window = $(window);
		//var sideBar = new MobileSideBar();
		var FADE_TIME = 150; // ms
		var TYPING_TIMER_LENGTH = 400; // ms
		var COLORS = [
			"#FF491D", "#C88F46", "#F8A700", "#B8F14D",
			"#2ADC00", "#4DF0F1", "#4DF181", "#52ECC8",
			"#3BB9EB", "#9579FF", "#FF64FF", "#F1DE4D"
		];
		var daysarray = ["day1", "day2", "day3", "day4", "day5"];
		var scratcharray = [2072, 2078, 2076, 2077, 2079];

		var username, userId, joinedRoom, onProfile = false, onComments = false;
		var current_sortbylike = false;
		var stopBlinking = false;
		var reconnect_count = 0;
		var socket = io();

		var localusername;
		//var currentLoc = window.location.pathname;
		var checkPMflag;

		var currentLoc
		var $messages, $roomlist
		var typing = false;
		var lastTypingTime;
		var isAdmin, dow, userType;

		/*******************************************************************
		 * init() function must be called in every state to make sure:
		 * - joinedRoom and currentLoc are up to date
		 * - bind events to html elements of the template of the new state
		 *******************************************************************/
		var init = function () {
			onProfile = false, onComments = false
			current_sortbylike = false;
			stopBlinking = false;
			reconnect_count = 0;
			typing = false;
			localusername = getCookie("username");
			console.log("00 mark: localusername=", localusername)
			userId = $rootScope.data.user.userId
			isAdmin = $rootScope.data.user.isAdmin;
			userType = $rootScope.data.user.userType

			//currentLoc = currentLoc.substring(currentLoc.lastIndexOf("/"));
			joinedRoom = currentLoc = getCurrentLoc()
			if (currentLoc == "login") {
				//do nothing
				localusername = "";
				document.cookie = "username=; expires=Thu, 01 Jan 1970 00:00:00 UTC";
			} else if (!localusername && currentLoc != "login" && currentLoc != "user") {
				console.log("00 mark: go to login")
				$state.go("login");
			} else if (localusername) {
				console.log("checklogin: " + localusername);
				socket.emit("checklogin", localusername, 0);
			}

			$messages = $(".messages");
			//$messages.empty();

			var $usernameInput = $(".usernameInput");
			$usernameInput.on("keydown", function (event) {
				if (event.which === 13) {
					checkUsername();
					return;
				}
			});

			//jack
			//btn quiz
			$rootScope.gotoquestionList = function(val){
				console.log('333',val);
				$rootScope.data.currVideoId = val;
				socket.emit('getPollingList', $rootScope.data.currVideoId,$rootScope.data.user.userType);
			}
			// $("#questionquiz").on("click",function(){
				
				
				
			// })
			//question skip
			// $(".questionListItem").on("click",function(val){
			// 	console.log($rootScope);
				
			// 	// $state.go('question');


			// })
			$rootScope.skipquestion = function(val){
				console.log();
				console.log('444',val);
				$rootScope.data.questionArray = val;
				socket.emit("isVote",val._id,$rootScope.data.user.userType)
				// $state.go('question');
			}
			$rootScope.questionVote = function(val){
				console.log(val);
				console.log( 'sss',$rootScope.data.questionArray._id);
				socket.emit("vote",$rootScope.data.questionArray._id,val,$rootScope.data.user.userType);
				
			}
			$rootScope.questionNew = function(){
				// console.log('222',$rootScope.data.createArray);
				// console.log('22',$rootScope.data.addquestionName);
				console.log('send',$rootScope.data.user.userType);
				console.log($rootScope.data.currVideoId);
				if($rootScope.data.addquestionName != ''&&$rootScope.data.addquestionDesc != ''){
					var okey = '';
					for(var i = 0 ; i < $rootScope.data.createArray.length; i++){
						if($rootScope.data.createArray[i].text != ''){
							
						}else{
							okey = false;
						}
					}
					if(okey){
						socket.emit("createPolling",$rootScope.data.currVideoId,$rootScope.data.user.userType,$rootScope.data.addquestionName,$rootScope.data.addquestionDesc,$rootScope.data.createArray)	
					}else{
						alertbox('输入框不能为空');
					}
				}
				// socket.emit("createPolling",'$rootScope.data.currVideoId', 0, 'dsdsd', '11', ['a', 'b'])
				// console.log($rootScope.day3Controller.pageData);
		
			}


			$(".loginBtn").on("click", function () {
				
				if(currentLoc == "login"){
					checkUsername();
				}
				return;
			});
			$("#logout").on("click", function () {
				logout();
				return;
			});

			var $inputMessage = $(".inputMessage");
			$inputMessage.on("input", function () {
				if (!typing) {
					typing = true;
					//socket.emit("typing");
				}
				lastTypingTime = (new Date()).getTime();

				setTimeout(function () {
					var typingTimer = (new Date()).getTime();
					var timeDiff = typingTimer - lastTypingTime;
					if (timeDiff >= TYPING_TIMER_LENGTH && typing) {
						//socket.emit("stop typing");
						typing = false;
					}
				}, TYPING_TIMER_LENGTH);
			});
			/*
			 .on("keydown", function(event) {
			 if (event.which === 13) {
			 sendMessage("inputMessage",joinedRoom);
			 //socket.emit("stop typing");
			 typing = false;
			 return;
			 }
			 });
			 */
			var $sendMessage = $("#sendMessage");
			$sendMessage.on("click", function () {
				//$("#source_image").attr("src", "");
				console.log("sendMessage clicked");
				sendMessage("inputComment", joinedRoom);
				//socket.emit("stop typing");
				typing = false;
				return;
			});
			var $submitComment = $("#submitComment");
			$submitComment.on("click", function () {
				//console.log("Comment clicked");
				sendMessage("inputComment", joinedRoom);
				//socket.emit("stop typing");
				typing = false;
				return;
			});


			//Comments page - events
			var $btnCreateRoom = $(".btnCreateRoom");
			$btnCreateRoom.click(function () {
				var roomName = prompt("Please enter the room name?");
				if (roomName != null && roomName != "") {
					socket.emit("create room", roomName);
				} else if (roomName != null) {
					alert("Invalid room name");
				}
			});

			//socket.on('connect', function () {
			//	bindSocketEvents()
			//});
		}

		bindSocketEvents()
		function bindSocketEvents(){
			socket.on("getPollingList",function(data){
				
				$rootScope.data.questionNameArray = [];
				for(var i = 0 ;i < data.length; i++){
					$rootScope.data.questionNameArray.push({name:data[i].name,info:data[i]})
				}
				
				console.log('11',$rootScope.data.questionArray);
				$state.go('questionList');
			})
			socket.on("vote",function(data){
				console.log('vote',data);
				if(data){
					socket.emit("initVote",$rootScope.data.questionArray._id,$rootScope.data.user.userType);
					
				}
			})
			socket.on("initVote",function(data){
				console.log('333',data);
				if(data.status){
					$rootScope.data.questionResultArray = [];
					for(var i in data.result.optionsCount){
						var temp = {};
						temp.name = i;
						temp.num = Math.floor(data.result.optionsCount[i]/data.result.voteVount)*100,
						
						temp.total = data.result.voteVount
						$rootScope.data.questionResultArray.push(temp);
					}
					console.log($rootScope.data.questionResultArray);

					$state.go('result');
				}else{

				}
				
			})
			socket.on("createPolling",function(data){
				console.log(data);
				if(data){
					console.log('aa',$rootScope.data.user.userType);
					$state.go('day1');
					
					// socket.emit('getPollingList',$rootScope.data.currVideoId,$rootScope.data.user.userType);
					// setTimeout(function(){
					// 	
					// },500)
				}else{
					console.log('创建失败');
				}
			})
			socket.on("isVote",function(data){
				console.log(data);
				if(data){
					socket.emit("initVote",$rootScope.data.questionArray._id,$rootScope.data.user.userType)
					// $state.go('result');
					
				}else{
					setTimeout(function(){
						$state.go('question');
					},500)
					
				}

			})
			socket.on("login", function (data) {
				// console.log('111',data);
				$rootScope.jack_userType = data.userType;
				console.log($rootScope.jack_userType);
				$rootScope.updateHasLogin(true)
				console.log("in login..." + data.username);
				username = data.username;
				setCookie("username", username, 1);

				$("#usernameSpan").text(username);
				//$fullpage.off("click").fadeOut();
				//$usernameInput.off("keydown");
				$rootScope.data.user.userId = userId = data._id;
				joinedRoom = data.roomName;

				isAdmin = data.isAdmin;
				dow = data.dow;
				if(data.userType == 0){
					$rootScope.data.user.isAdmin = true
					$rootScope.data.user.userType = userType = 1;
				}else{
					$rootScope.data.user.userType = userType = data.userType;
				}

				/*
				 if(userType != 2) {
				 alertBox("Sorry, access denied.", {relogin:true});
				 }
				 */

				if (isAdmin) {
					for (var i = 0; i <= daysarray.length; i++) {
						var button = "#" + daysarray[i] + "button";
						$(button).removeAttr("disabled");
						var lock = "#" + daysarray[i] + "lock";
						$(lock).text("");
					}
				} else {
					for (var i = 0; i < dow; i++) {
						var button = "#" + daysarray[i] + "button";
						$(button).removeAttr("disabled");
						var lock = "#" + daysarray[i] + "lock";
						$(lock).text("");
					}
				}

				if (username == "hello1@123.com")
					toChatPage(data);
				else
					toCorrectPage(data);
			});

			//socket.on("join room", toChatPage);
			socket.on("join room", function (data) {
				$messages = $(".messages");
				//$messages.empty();
				joinedRoom = data.roomName;
				console.log("in " + joinedRoom);
				$inputMessage.focus();
				//alert(data.roomName);
			});

			socket.on("login failed", function () {
				console.log("hello 1");
				alertBox("Invalid email/password. Please try again!", {relogin: true});
			});

			socket.on("username not exists", function () {
				console.log("hello 2");
				alertBox("Invalid email address. Please try again!", {reload: true});
			});

			socket.on("already joined", function (roomName) {
				alertBox("already joined " + roomName);
			});

			// Whenever the server emits "new message", update the chat body
			socket.on("new message", function (data, givepoints) {
				if (data.room == joinedRoom) {
					if (data.username == username) {
						if (givepoints > 0)
							congratBox("Thank you, you've earned " + givepoints + " points.");
					}

					//addChatMessage(data, {prepend: true});

					//angular way of updating new comment & reply
					$timeout(function(){
						if(data.isReply){
							//if user is opening the same comment's reply list, update it
							if($rootScope.data.showRepliesOfComment == data.replyTo){
								$rootScope.data.currentCommentReplies.push(data)
							}

							//update the comment's replyNum
							$.each($rootScope.data.comments, function(i, item){
								if(item._id == data.replyTo){
									item.replyNum++
								}
							})
						}else{
							$rootScope.data.comments.unshift(data)
						}

						//reset
						//$rootScope.data.showRepliesOfComment = ""
						$rootScope.data.currentReply = ""
					})

				} else if (data.room == "/ask") {
					if (data.username == username) {
						congratBox("Thank you, your question has been submitted. <br>You've earned " + givepoints + " points.");
						$("#day1submitask").val('');
					}
				} else if (data.room == "/day2quiz") {
					if (data.username == username) {
						congratBox("Thank you for your submission. <br>You've earned " + givepoints + " points.");
						$("#day2submitquiz").val('');
					}
				} else if (data.room == "/day3quiz") {
					if (data.username == username) {
						congratBox("Thank you for your submission. <br>You've earned " + givepoints + " points.");
						$("#day3submitquiz").val('');
					}
				} else if (data.room == "/day4quiz") {

					if (data.username == username) {
						congratBox("Thank you for your submission. <br>You've earned " + givepoints + " points.");
						$("#day4submitquiz").val('');
					}
				} else if (data.room == "/fbquestion3") {
					if (data.username == username) {
						setCookie("feedback3", 1, 10);
						fbsubmitq4();
						processAnswer(data);
					}
				} else if (data.room == "/fbquestion4") {
					if (data.username == username) {
						setCookie("feedback4", 1, 10);
						showThankyou();
						processAnswer(data);
					}
				}
			});

			// Whenever the server emits "user joined", log it in the chat body
			socket.on("user joined", function (data) {
				//log(data.username + " joined");
				//addParticipants(data);
			});

			// Whenever the server emits "user left", log it in the chat body
			socket.on("user left", function (data) {
				//log(data.username + " left");
				//addParticipants(data);
				removeChatTyping(data);
			});

			socket.on("room existed", function () {
				alertBox("room existed");
			});

			// Whenever the server emits "typing", show the typing message
			socket.on("typing", function (data) {
				addChatTyping(data);
			});

			// Whenever the server emits "stop typing", kill the typing message
			socket.on("stop typing", removeChatTyping);

			socket.on("dologin", function (data) {
				console.log("dologin: " + data.username);
				setUsername(data.username);
			});

			socket.on("doPassword", function (data) {
				$(".usernameInput").off();
				$(".loginBtn").off();
				$(".usernameInput").on("keydown", function (event) {
					if (event.which === 13) {
						console.log("what is the data with keydown 13", data)
						doLoginWithPassword(data);
						return;
					}
				});

				$(".loginBtn").on("click", function (event) {
					console.log("what is the data with login btn", data);
					doLoginWithPassword(data);
					return;
				});

				enterPassword(data);
			});

			socket.on("invalidaccess", function () {
				alertBox("Sorry! Invalid Access.", {relogin: true});
				username = null;
			});

			socket.on("already login", function (name) {
				alertBox("You <b>(" + name + ")</b> have logged on another browser. Please try again.");
				username = null;
			});

			socket.on("forcelogout", function () {
				var displayname = username;
				username = null;
				document.cookie = "username=; expires=Thu, 01 Jan 1970 00:00:00 UTC";
				alertBox("You <b>(" + displayname + ")</b> have been logged out. Please sign in again.", {relogin: true});
			});

			socket.on("already ban", function () {
				alertBox("already ban");
				username = null;
			});

			socket.on("ban", function () {
				alertBox("being ban");
			});

			socket.on("disconnect", function () {
				//alertBox("You're disconnected, the page will now reload.", {reload:true});
				//localusername = getCookie("username");
				//document.cookie = "username=; expires=Thu, 01 Jan 1970 00:00:00 UTC";

				if (socket.connected === false &&
					socket.disconnected === true) {
					reconnect_count++;
					console.log("reconnecting: " + reconnect_count);
					localusername = getCookie("username");
					if (localusername) {

						if (reconnect_count <= 5) {
							console.log("reconnecting...");
							setTimeout(function () {
								socket.connect();
							}, 1000);

							setTimeout(function () {
								socket.emit("checklogin", localusername, reconnect_count);
							}, 2000);
						} else {
							alertBox("Reconnecting failed. Please check your internet connection and sign in again.", {relogin: true});
						}
					}
				}

			});

			socket.on("pm", function (data) {
				addChatMessage({
					username: data.from + " whisper to " + data.to,
					msg: data.msg
				});
			});

			socket.on("pm fail", function () {
				alert("cannot find the user");
			});

			socket.on("search", function (data) {
				var str = "search result:<br/>";
				for (var i in data) {
					var temp = data[i];
					str += temp.user + " " + temp.msg + "<br/>";
				}
				showSearchMsg(str);
			});

			socket.on("gettotalmessage", function (data) {
				if (data <= 5) {
					$("#previousmsg").hide();
				} else {
					var messagecount = 0;
					messagecount = $(".messages div").length;
					//console.log("messagecount: " + messagecount);
					//console.log("data: " + data);

					/*
					 if(messagecount >= 10 && $("#refreshlist").length == 0) {
					 var $refreshmsg = $("<a href='#' id='refreshlist' onclick='refreshlist();return false;' class='black-text text-left'/>").text("Refresh list");
					 $("#previousmsg").before($refreshmsg);
					 }
					 */
					var remains = data - messagecount;
					$("#previousmsg").show();

					if (remains > 0)
						$("#totalmessage").text(" (" + remains + ")");
					else
						$("#previousmsg").hide();
				}
			});

			socket.on("history", function (data) {
				console.log("00 mark: socket on 'history', data=", data)

				//todo: this auto add "replies" part can be removed when all data format is updated
				$.each(data, function(i, item){
					if(!item.replyNum){
						item.replyNum = 0
					}
				})

				$timeout(function(){
					$rootScope.data.comments = data
				})
				//for (var i in data) {
				//	if (data[i].room != "/gallery"){
				//		addChatMessage(data[i], {prepend: false});
				//	}else{
				//		//gallery handler here
				//		console.log("add gallery", data[i]);
				//		console.log("message", data[i].msg);
				//		gallery(data[i]);
				//	}
				//}
				socket.emit("gettotalmessage", joinedRoom, userType);
			});

			socket.on("loadprevious", function (data) {
				//todo: this auto add "replies" part can be removed when all data format is updated
				$.each(data, function(i, item){
					if(!item.replyNum){
						item.replyNum = 0
					}
				})

				$timeout(function(){
					$rootScope.data.comments = $rootScope.data.comments.concat(data)
				})
				socket.emit("gettotalmessage", joinedRoom, userType);
			});

			function gallery(data) {
				// Load demo images from flickr:
				var origin = window.location.origin;
				if (origin.indexOf("localhost") > 0)
					origin = "http://demo-dbsvp-app.vocohub.com:3090";
				var linksContainer = $('#links');
				var imgUrl = origin + data.msg.substring(data.msg.indexOf("/images"), data.msg.length - 2);
				$('<a/>')
					.append($('<img class="img-thumbnail" style="height:60px;width:60px;">').prop('src', imgUrl))
					.prop('href', imgUrl)
					.attr('data-gallery', '')
					.appendTo(linksContainer)

				// $.ajax({
				//     url: 'https://api.flickr.com/services/rest/',
				//     data: {
				//     format: 'json',
				//     method: 'flickr.interestingness.getList',
				//     api_key: '7617adae70159d09ba78cfec73c13be3' // jshint ignore:line
				//     },
				//     dataType: 'jsonp',
				//     jsonp: 'jsoncallback'
				// }).done(function (result) {
				//     var linksContainer = $('#links')
				//     var baseUrl
				//     // Add the demo images as links with thumbnails to the page:
				//     $.each(result.photos.photo, function (index, photo) {
				//     baseUrl = 'https://farm' + photo.farm + '.static.flickr.com/' +
				//     photo.server + '/' + photo.id + '_' + photo.secret
				//     $('<a/>')
				//         .append($('<img class="img-thumbnail" style="height:60px;width:60px;">').prop('src', baseUrl + '_b.jpg'))
				//         .prop('href', baseUrl + '_b.jpg')
				//         // .prop('title', photo.title)
				//         .attr('data-gallery', '')
				//         .appendTo(linksContainer)
				//     })
				// });
			}

			socket.on("room list", refreshRoomList);
			socket.on("private list", refreshPrivateRoomList);
			socket.on("checkPMcount", function (pmlist) {
				for (var i = 0; i < pmlist.length; i++) {
					var pmcount = pmlist[i].count;
					//console.log("pmid " + roomId + ", " + pmcount);
					$("#pm" + i).text(pmcount);
				}
			})

			socket.on("like", function (chatId, likes) {
				//var $likeButton = $("#" + chatId);
				//var totalLikes = $likeButton.data("likecount");
				//var $likeDiv = $likeButton.parent();
				//var likeDone = likes.indexOf(userId) != -1;
				//makeLikeDiv($likeDiv, chatId, totalLikes + 1, likeDone);
				updateCommentLikes(chatId, likes)
			});

			socket.on("unlike", function (chatId, likes) {
				//var $likeButton = $("#" + chatId);
				//var totalLikes = $likeButton.data("likecount");
				//var $likeDiv = $likeButton.parent();
				//var likeDone = likes.indexOf(userId) != -1;
				//makeLikeDiv($likeDiv, chatId, totalLikes - 1, likeDone);
				updateCommentLikes(chatId, likes)
			});

			function updateCommentLikes(chatId, likes){
				//update likes of a comment
				$.each($rootScope.data.comments, function(i, item){
					if(item._id == chatId){
						$timeout(function(){
							item.likes = likes
						})
						return false
					}
				})

				//update likes of a comment's reply
				$.each($rootScope.data.currentCommentReplies, function(i, item){
					if(item._id == chatId){
						$timeout(function(){
							item.likes = likes
						})
						return false
					}
				})
			}

			socket.on("getCommentReplies", function(replies){
				$timeout(function(){
					$rootScope.data.currentCommentReplies = replies
				})
			})

			socket.on("updatemenuprofile", function (user) {
				var $profileUsername = $("#menuUsername");
				var $profileUserType = $("#menuUserType");
				var $profilePoints = $("#menuUserPoints");
				$profileUsername.text(user.username);
				$profileUserType.text(user.userType);
				$profilePoints.text(user.points + " points");
			});

			socket.on("new answer", function (data) {
				if (data == null)
					return;

				if (data.username == username) {

					if (data.day == 6) {
						if (data.question == 1) {
							//if(data.status) {
							setCookie("feedback1", 1, 10);
							submitfeedback(2);
							//}
						} else if (data.question == 2) {
							//if(data.status) {
							setCookie("feedback2", 1, 10);
							fbsubmitq3();
							//}
						}
					}
					processAnswer(data);
				}
			});
			socket.on("checkVideo", function (data) {
				console.log("checkVideo", data);
				if (data == null)
					return;

				if (data.username == username) {
					console.log(JSON.stringify(data));
					if (data.question == 1 && data.answer == 1) {
						var sid = scratcharray[data.day - 1];
						$("#scratchlabel").show();
						$("#goToSC").show();
						$("#playSC").on("click", function () {
							var communicatorData = Base64.encodeURI(username + ":" + sid + ":" + Date.now().toString());
							// window.location.href="https://demo-dbsvp-app.3radical.com/dbsconf/main/app/index.html?email="+username+"&sid="+sid
							window.location.href = "https://demo-dbsvp-app.3radical.com/dbsconf/main/app/index.html?data=" + communicatorData;
							return;
						});
					}
				}
			});
			socket.on("checkpoll", function (data) {
				if (data == null)
					return;

				if (data.username == username) {
					//if(data.status) {
					if (data.day == 1 && data.status) {
						showday1poll1(data);
						socket.emit("getpollresults", data);

					} else if (data.day == 2) {
						if (data.question == 3) {
							var day2quiz1ans = {answer: 2};
							showday2quiz1(data, day2quiz1ans);

						} else if (data.question == 4) {
							var day2quiz2ans = {answer: 1};
							showday2quiz2(data, day2quiz2ans);
						}
					} else if (data.day == 3) {
						if (data.question == 3) {
							var day3quiz1ans = {answer: 2};
							showday3quiz1(data, day3quiz1ans);
						}

					} else if (data.day == 4) {
						if (data.question == 3) {
							var day4quiz1ans = {answer: 3};
							showday4quiz1(data, day4quiz1ans);
						}

					} else if (data.day == 5) {
						if (data.question == 2) {
							var day5quiz1ans = {answer: 2};
							showday5quiz1(data, day5quiz1ans);

						} else if (data.question == 3) {
							var day5quiz2ans = {answer: 1};
							showday5quiz2(data, day5quiz2ans);
						}
					}
					//}
				}
			});
			socket.on("getpollresults", function (a1, a2, a3, a4) {
				showday1poll1results(a1, a2, a3, a4);
			});

			socket.on("loadlb", function (data) {
				var members = "<table class='table'><thead><tr>";
				members += "<th>No</th><th>Name</th><th>Department</th><th>Points</th>";
				members += "</tr></thead><tbody>";

				if (members == "")
					members += "<tr><td colspan=4>No record found</td></tr>";

				for (var i = 0; i < data.length; i++) {
					if (data[i].points > 0) {
						var j = i + 1;
						members += "<tr><td>" + j + "</td>";
						members += "<td>" + data[i].displayname + "</td>";
						members += "<td>" + data[i].department + "</td>";
						members += "<td>" + data[i].points + "</td></tr>";
					}
				}

				members += "</tbody></table>";

				$("#leaderboard").html(members);
			});



			// Profile page
			socket.on("profile", function (user, chats) {
				var $profileUsername = $(".profileUsername");
				//var $profileUserType = $(".profileUserType");
				var $profilePoints = $(".profilePoints");
				var $profileChats = $(".profileChats");

				console.log("chats", chats);
				console.log("point", user.points);
				console.log("username ", user.username);
				$profileUsername.text(user.username);
				//$profileUserType.text(user.userType);
				$profilePoints.text(user.points + " points");
				var chat;
				if (Array.isArray(chats)) {
					for (var i in chats) {
						chat = chats[i];
						$profileChats.append(makeChatMessage(chat, false));
					}
				} else {
					chat = chats;
					var $chat = $("#profile" + chat._id).parent();
					$chat.replaceWith($(createChatString(chat)));
				}
			});

			//Comments page - socket event
			socket.on("comments", function (chats1, chats2) {
				var $recentLikes = $(".recentLikes");
				var $mostLikes = $(".mostLikes");
				var i, chat, chatString = "";
				for (i in chats1) {
					chat = chats1[i];
					chatString += createChatString(chat) + " and recent like on " + moment(chat.lastLikeDate).format("dddd, MMMM Do YYYY, h:mm:ss a");
				}
				$recentLikes.html(chatString);
				chatString = "";
				for (i in chats2) {
					chat = chats2[i];
					chatString += createChatString(chat) + " and recent like on " + moment(chat.lastLikeDate).format("dddd, MMMM Do YYYY, h:mm:ss a");
				}
				$mostLikes.html(chatString);
			});
		}
		//begin 
		// function quiz(){
			// socket.emit("getPollingList",'$rootScope.data.currVideoId')
		// }


		///jacklin
		function getCurrentLoc(){
			var locArray = $state.current.name.split(".")
			console.log("=== 00 mark: getCurrentLoc: " + locArray[locArray.length - 1]);
			return locArray[locArray.length - 1]
		}

		function setCookie(cname, cvalue, exdays) {
			var d = new Date();
			d.setTime(d.getTime() + (exdays * 24 * 60 * 60 * 1000));
			var expires = "expires=" + d.toUTCString();
			document.cookie = cname + "=" + cvalue + "; " + expires;
		}

		function getCookie(cname) {
			var name = cname + "=";
			var ca = document.cookie.split(';');
			for (var i = 0; i < ca.length; i++) {
				var c = ca[i];
				while (c.charAt(0) == ' ') c = c.substring(1);
				if (c.indexOf(name) == 0) return c.substring(name.length, c.length);
			}
			return "";
		}

		function alertBox(msg, options) {
			$("#alertbox").html(msg);
			$("#sm-alertbox").modal("show");
			redirect("sm-alertbox", options)
		}

		function congratBox(msg, options) {
			$("#congratbox").html(msg);
			$("#sm-congratBox").modal("show");
			redirect("sm-congratBox", options)
		}

		function redirect(id, options){
			options = options || {};
			$('#' + id).on('hidden.bs.modal', function (e) {
				if (options.reload == true) {
					$state.reload();
				} else if (options.relogin == true) {
					$state.go("login");
				} else if (options.gomenu == true) {
					$state.go("menu");
				}
			})
		}

		function blink(selector) {
			if (stopBlinking) {
				$("#mark").hide();
			} else {
				$("#mark").show();
			}
		}


		function checkUsername() {
			console.log("checkUsername");
			var usernameInput = $(".usernameInput").val() || ""
			console.log('111',usernameInput);
			username = cleanInput(usernameInput.trim());
			console.log("222",username);
			$(".usernameInput").val("");
			if (username && validateEmail(username)) {
				socket.emit("checkUsername", username);
			} else {
				username = null;
				document.cookie = "username=; expires=Thu, 01 Jan 1970 00:00:00 UTC";
				alertBox("Please enter a valid email", {relogin: true});
			}
		}

		function enterPassword(user) {
			console.log("enterPassword");
			if (user.username && validateEmail(user.username)) {
				if (user.passwordSet == 1) {
					$("#loginlabel").html("Please enter your password to Continue");
				} else if (user.passwordSet == 0) {
					$("#loginlabel").html("Please set your password <br /><small>Please enter a password of your choice that you can use to login to the site – but don’t forget this password! If you log out, you’ll need to enter it again to access the site.</small>");
				}
				$("#paswordInstruction").show();
				$(".usernameInput").attr("placeholder", "Password");
				$(".usernameInput").attr("type", "password");
				$("#loginsample").hide();
				$("#loginheader").slideUp(500);
			} else {
				username = null;
				document.cookie = "username=; expires=Thu, 01 Jan 1970 00:00:00 UTC";
				alertBox("Please enter a valid email", {relogin: true});
			}
		}

		function doLoginWithPassword(user) {
			console.log("doLoginWithPassword", $(".usernameInput").val());

			var password = cleanInput($(".usernameInput").val().trim());

			console.log(user, password);
			socket.emit("loginWithPassword", user, password);
		}

		function setUsername() {
			//console.log(localusername);
			if (localusername && localusername.length > 0)
				username = localusername;
			else
				username = cleanInput($(".usernameInput").val().trim());

			console.log("setUsername " + username);
			if (username && validateEmail(username)) {
				//var dayRoom = currentLoc.split(".html");
				//dayRoom = dayRoom[0];
				var dayRoom = currentLoc

				console.log("socket emit login: " + username + ", room: " + dayRoom);
				socket.emit("login", username, dayRoom);

			} else {
				username = null;
				document.cookie = "username=; expires=Thu, 01 Jan 1970 00:00:00 UTC";
				alertBox("Please enter a valid email", {relogin: true});
			}
		}

		function validateEmail(email) {
			var re = /^([\w-]+(?:\.[\w-]+)*)@((?:[\w-]+\.)*\w[\w-]{0,66})\.([a-z]{2,6}(?:\.[a-z]{2})?)$/i;
			return re.test(email);
		}

		function addParticipants(data) {
			var $userArea = $("#sidebar-wrapper-right ul.sidebar-nav");
			var message = "";
			var numUsers = Object.keys(data.users).length;
			if (data.numUsers === 1)
				message += "there's 1 participant";
			else
				message += "there are " + numUsers + " participants";
			log(message);
			var userData = "";
			for (var i in data.users)
				userData += "<li><a href='javascript:void(0)' onclick='whisper(event)'>" + i + "</a></li>";
			$userArea.html(userData);
		}

		/*
		 window.whisper = function(event) {
		 if (event.target.innerHTML == username) return;
		 location.hash = "#chat@" + encodeURI(joinedRoom);
		 $window.hashchange();
		 $inputMessage.val("/w " + event.target.innerHTML + " ").focus();
		 sideBar.closeSidebar();
		 };
		 */

		function sendMessage(field, room) {
			var message = $("." + field).val();
			// Prevent markup from being injected into the message
			if (field == "inputMessage")
				message = cleanInput(message);

			if ($("#source_image").is(":visible"))
				return;
			//if($("#source_image").src && $("#source_image").src.length > 0)
			//return;

			if (message.length == 0) {
				alertBox("Your message is empty");
				return;
			}
			if (message.length < 10) {
				alertBox("Please elaborate more.");
				return;
			}

			// if there is a non-empty message and a socket connection
			if (message) {
				$("." + field).val("");
				var matchPrivateMessage = /\/w ([^\s]+) (.+)/.exec(message);
				console.log('00 mark: matchPrivateMessage=' + matchPrivateMessage)
				if (matchPrivateMessage != null) {
					if (matchPrivateMessage[1] == username) {
						alertBox("cannot private message yourself");
						return;
					}
					var data = {
						to: matchPrivateMessage[1],
						msg: matchPrivateMessage[2]
					};
					addChatMessage({
						username: username + " whisper to " + data.to,
						msg: data.msg
					});
					socket.emit("pm", {
						to: matchPrivateMessage[1],
						msg: matchPrivateMessage[2]
					});
					return;
				}
				var matchSearch = /\/search (.+)/.exec(message);
				if (matchSearch != null) {
					socket.emit("search", matchSearch[1]);
					return;
				}

				//var givepoints = 20;
				//if (room == "ask" || room == "/haiku" || room == "/day2quiz" || room == "/day3quiz" || room == "/day4quiz")
				//	givepoints = 10;
				var givepoints = getGivePoints();

				console.log('00 mark: b4 emit "new message", message=' + message + ", room=" + room)
				socket.emit("new message", {
					message: message,
					room: room,
					givepoints: givepoints,
					userType: userType,
					isReply: false,
					replyTo: "",
					replyNum: 0
				});
			}
		}

		function replyComment(comment){
			var message = $rootScope.data.currentReply
			console.log("00 mark: reply to comment: " + message)
			checkMessageInput(message)

			var givepoints = getGivePoints();
			socket.emit("new message", {
				message: message,
				room: joinedRoom,
				givepoints: givepoints,
				userType: userType,
				isReply: true,
				replyTo: comment._id,
				replyNum: 0
			});
		}

		function getGivePoints(){
			if(joinedRoom == "ask"){
				return 10
			}else{
				return 20
			}
		}

		function checkMessageInput(message){
			if (message.length == 0) {
				alertBox("Your message is empty");
				return;
			}
			if (message.length < 10) {
				alertBox("Please elaborate more.");
				return;
			}
		}

		// Log a message
		function log(message, options) {
			var $el = $("<li>").addClass("log").text(message);
			addMessageElement($el, options);
		}

		function showSearchMsg(message) {
			var $el = $("<li>").html(message);
			addMessageElement($el);
		}

		function likeMsg(chatId) {
			socket.emit("like", {chatId: chatId || $(this).attr("id"), joinedRoom: joinedRoom});
		}

		function unlikeMsg(chatId) {
			socket.emit("unlike", {chatId: chatId || $(this).attr("id"), joinedRoom: joinedRoom});
		}

		function getCommentReplies(comment){
			socket.emit("getCommentReplies", {chatId: comment._id, joinedRoom: joinedRoom});
		}

		function makeLikeDiv($likeDiv, chatId, totalLikes, likeDone) {
			$likeDiv.empty();
			var $likeButton = $("<a class='red-text text-right' id='" + chatId + "' href='javascript:void(0)' data-likecount='" + totalLikes + "'>").text(likeDone ? "Unlike" : "Like");
			if (likeDone)
				$likeButton.click(unlikeMsg);
			else
				$likeButton.click(likeMsg);
			var $likeCount = $("<span class='black-text text-right'/>").text(totalLikes + ((totalLikes > 1) ? " likes" : " like"));
			$likeDiv.append($likeCount);
			$likeDiv.append("<br>");
			$likeDiv.append($likeButton);
		}

		function makeChatMessage(data, showUsername) {
			var m = moment(data.time);
			var displayDate = "";
			displayDate = m.fromNow();

			var roomDiv = "In <a class='red-text' href='" + data.room + ".html'>" + data.room + ".html</a> ";

			if (showUsername) {
				var $usernameDiv = $("<span class='red-text'/>")
					.text(data.username + " ");
			} else {
				var $usernameDiv = roomDiv;
			}

			var $messageTs = $("<small class='black-text'>").text(displayDate);

			var newmsg = data.msg.replace(/\n/g, "<br>");
			var $messageBodyDiv = $("<span class='messageBody black-text'/>")
				.html(newmsg);

			var $likeDiv = "";
			if (data.likes) {
				$likeDiv = $("<span style='float:right' class='likesDiv'/>");
				var totalLikes = Object.keys(data.likes).length;
				var likeDone = data.likes.indexOf(userId) != -1;
				makeLikeDiv($likeDiv, data._id, totalLikes, likeDone);
			}

			var numMessage = $(".profileChats div").length;
			var $messageDiv = "";

			if (numMessage % 2)
				$messageDiv = $("<div align='left' class='message panel-body grey'/>")
					.data("username", data.username)
					.append($usernameDiv, $messageTs, $likeDiv, "<br>", $messageBodyDiv);
			else
				$messageDiv = $("<div align='left' style='border:1px solid lightgrey' class='message panel-body white'/>")
					.data("username", data.username)
					.append($usernameDiv, $messageTs, $likeDiv, "<br>", $messageBodyDiv);

			return ($messageDiv);
		}

		// Adds the visual chat message to the message list
		function addChatMessage(data, options) {
			// Don't fade the message in if there is an "X was typing"
			var $typingMessages = getTypingMessages(data);

			var m = moment(data.time);
			var displayDate = "";
			displayDate = m.fromNow();

			options = options || {};
			if ($typingMessages.length !== 0) {
				options.fade = false;
				$typingMessages.remove();
			}

			/*
			 var $usernameDiv = $("<span class='username'/>")
			 .text(data.username)
			 .css("color", getUsernameColor(data.username));
			 */
			var $usernameDiv = $("<span class='black-text'/>")
				.html("<b>" + data.username + "</b> ");

			var $messageTs = $("<small class='black-text'>").text(displayDate);

			var newmsg = data.msg.replace(/\n/g, "<br>");
			var $messageBodyDiv = $("<span class='messageBody black-text'/>")
				.html(newmsg);

			var $likeDiv = "";
			if (data.likes) {
				$likeDiv = $("<span style='float:right' class='likesDiv'/>");
				var totalLikes = Object.keys(data.likes).length;
				var likeDone = data.likes.indexOf(userId) != -1;
				makeLikeDiv($likeDiv, data._id, totalLikes, likeDone);
			}

			var typingClass = data.typing ? "typing" : "";

			var numMessage = $(".messages div").length;
			var $messageDiv = "";

			if (numMessage % 2)
				$messageDiv = $("<div align='left' class='message panel-body grey'/>")
					.data("username", data.username)
					.addClass(typingClass)
					.append($usernameDiv, $messageTs, $likeDiv, "<br>", $messageBodyDiv);
			else
				$messageDiv = $("<div align='left' style='border:1px solid lightgrey' class='message panel-body white'/>")
					.data("username", data.username)
					.addClass(typingClass)
					.append($usernameDiv, $messageTs, $likeDiv, "<br>", $messageBodyDiv);


			addMessageElement($messageDiv, options);
		}

		// Adds the visual chat typing message
		function addChatTyping(data) {
			data.typing = true;
			data.msg = "is typing";
			addChatMessage(data);
		}

		// Removes the visual chat typing message
		function removeChatTyping(data) {
			getTypingMessages(data).fadeOut(function () {
				$(this).remove();
			});
		}

		// Adds a message element to the messages and scrolls to the bottom
		// el - The element to add as a message
		// options.fade - If the element should fade-in (default = true)
		// options.prepend - If the element should prepend
		//   all other messages (default = false)
		function addMessageElement(el, options) {
			$messages = $(".messages");
			var $el = $(el);

			// Setup default options
			if (!options) {
				options = {};
			}
			if (typeof options.fade === "undefined") {
				options.fade = true;
			}
			if (typeof options.prepend === "undefined") {
				options.prepend = false;
			}

			// Apply options
			if (options.fade) {
				$el.hide().fadeIn(FADE_TIME);
			}
			if (options.prepend) {
				$messages.prepend($el);
			} else {
				$messages.append($el);
			}
			$messages[0].scrollTop = $messages[0].scrollHeight;
		}

		// Prevents input from having injected markup
		function cleanInput(input) {
			console.log("clean input", input);
			return $("<div/>").text(input).text();
		}

		// Gets the "X is typing" messages of a user
		function getTypingMessages(data) {
			return $(".typing.message").filter(function () {
				return $(this).data("username") === data.username;
			});
		}

		// Gets the color of a username through our hash function
		function getUsernameColor(username) {
			// Compute hash code
			var hash = 7;
			for (var i = 0; i < username.length; i++) {
				hash = username.charCodeAt(i) + (hash << 5) - hash;
			}
			// Calculate color
			var index = Math.abs(hash % COLORS.length);
			return COLORS[index];
		}

		// Socket events

		// Whenever the server emits "login", log the login message
		function toCorrectPage(data) {
			//$messages = $(".messages");
			//$messages.empty();

			var targetState
			console.log("toCorrectPage - currentLoc=" + currentLoc)
			if (currentLoc == "login") {
				targetState = "instructions";
				$state.go(targetState)
				return
			} else if (currentLoc == "") {
				targetState = "menu";
				$state.go(targetState)
				return
			}

			console.log("what is data .dow", data, data.dow);
			if (data.isAdmin == false) {
				if (currentLoc == "day2" && data.dow < 2)
					targetState = "menu";
				if (currentLoc == "day3" && data.dow < 3)
					targetState = "menu";
				if (currentLoc == "day4" && data.dow < 4)
					targetState = "menu";
				if (currentLoc == "day5" && data.dow < 5)
					targetState = "menu";

				$state.go(targetState)
				return
			}


			//menulist control
			dayControlTopMenu(data.dow);
			dayControlPortfolioMenu(data.dow);
			dayControlPostNext(data.dow, currentLoc);

			clearTimeout(checkPMflag);
			if (currentLoc == "pm") {
				socket.emit("private list");
				setTimeout(checkPM, 10000);
			}
			if (currentLoc == "leaderboard") {
				socket.emit("loadlb");
				//setTimeout(checkPM, 10000);
			}

			//prizeData="+Base64.encodeURI($scope.msg.systemId+":"+$scope.findPrize($scope.currentPoint.id).humanId);
			var prizeParam = decodeURIComponent($.urlParam('data'));
			var prizeData = Base64.decode(prizeParam);
			var dataarr = prizeData.split(":");
			var prize = dataarr[1];
			var scratchid = dataarr[0];
			var matchedday = 0;
			if (scratchid && scratchid > 0) {
				$.each(scratcharray, function (i, sid) {
					if (scratchid == sid) {
						matchedday = i + 1;
					}
				});

				if (matchedday > 0) {
					if (prize == "Send10points") {
						socket.emit("new answer", {day: matchedday, question: 2, answer: 1, points: 10});
					} else if (prize == "FoodPanda") {
						congratBox("Congratulation! You've won a FoodPanda Voucher.<br><br>Visit My Page now to get your voucher code");
					}
				}
			}

			if (currentLoc == "day1") {
				socket.emit("checkVideo", {day: 1, question: 1});
			} else if (currentLoc == "day2") {
				socket.emit("checkVideo", {day: 2, question: 1});
			} else if (currentLoc == "day3") {
				socket.emit("checkVideo", {day: 3, question: 1});
			} else if (currentLoc == "day4") {
				socket.emit("checkVideo", {day: 4, question: 1});
			} else if (currentLoc == "day5") {
				socket.emit("checkVideo", {day: 5, question: 1});
			}
			if (currentLoc == "feedback") {
				var answer1 = getCookie("feedback1");
				var answer2 = getCookie("feedback2");
				var answer3 = getCookie("feedback3");
				var answer4 = getCookie("feedback4");

				if (answer1 == 1 && answer2 == 1 && answer3 == 1 && answer4 == 1) {
					alertBox("Thank you for your visit! You have submitted feedback earlier. <br>You'll be redirected to main page.", {gomenu: true});
				}
			}

			if (currentLoc == "profile") {
				console.log("on profile");
				socket.emit("on profile");
				onProfile = true;
			} else {
				onProfile = false;
			}

		}

		function dayControlTopMenu(day) {
			for (i = day; i < $("#menu-list li").length; i++) {
				var elem = $("#menu-list li").eq(i);
				elem.addClass("not-ready").children().removeAttr("href");
			}
		}

		function dayControlPortfolioMenu(day) {
			for (i = day; i < $(".portfolio-item").length; i++) {
				var elem = $(".portfolio-item").eq(i);
				elem.addClass("not-ready").find($(".portfolio-image")).children().removeAttr("href")
				elem.find($(".portfolio-description")).children().removeAttr("href");
			}
		}

		function dayControlPostNext(day, location) {
			console.log("day location", day, location[4]);
			if (day == location[4] && parseInt(location[4])) {
				$(".post-next").remove();
			}

		}

		function checkPM() {
			console.log("Checking PM list");
			socket.emit("private list");

			checkPMflag = setTimeout(checkPM, 10000);
		}

		function toChatPage(data) {
			$messages = $(".messages");
			//$messages.empty();
			joinedRoom = data.roomName;
			var message = "Welcome to " + joinedRoom;
			log(message, {
				prepend: true
			});
			//addParticipants(data);
			location.hash = "#chat@" + encodeURI(joinedRoom);
			//$(window).hashchange();
			$inputMessage.focus();
			if (data.rooms)
				refreshRoomList(data.rooms);
		}



		function createChatString(chat) {
			var room = chat.room;
			var m = moment(chat.time);
			var displayDate = "";
			displayDate = m.fromNow();
			var newmsg = chat.msg.replace(/\n/g, "<br>");

			var $likeDiv = "";
			if (chat.likes) {
				$likeDiv = $("<span style='float:right' class='likesDiv'/>");
				var totalLikes = Object.keys(data.likes).length;
				var likeDone = data.likes.indexOf(userId) != -1;
				makeLikeDiv($likeDiv, data._id, totalLikes, likeDone);
			}
			//addChatMessage(chat);

			var totalLikes = Object.keys(chat.likes).length;
			return "<div>In <a class='red-text' href='" + room + ".html'>" + room + ".html</a> " + displayDate + "<br>" + newmsg;
			// +  with " + totalLikes + ((totalLikes > 1) ? " likes" : " like") + "</div>";
		}

		//Comments page - functions
		function refreshRoomList(data) {
			$roomlist = $(".roomlist");
			var roomData = "";
			for (var i in data) {
				var room = data[i];
				roomData += "<li><a href='javascript:void(0)' onclick='joinRoom(event)'>" + room.roomName + "</a></li>";
			}
			$roomlist.html(roomData);
		}
		function refreshPrivateRoomList(data) {
			$roomlist = $(".roomlist");
			var roomData = "";
			if (data.length == 0)
				roomData = "No Chat found.";

			for (var i in data) {
				var room = data[i];

				var names = room.roomName.split("|");
				var displayRoom;
				if (names[0] == username)
					displayRoom = names[1];
				else
					displayRoom = names[0];

				roomData += "<a href='javascript:void(0)' class='list-group-item' onclick='joinPM(\"" + displayRoom + "\")'>" + displayRoom + "<span class='badge' id='pm" + i + "'></span></a>";
			}
			$roomlist.html(roomData);
		}

		window.enterRoom = function (roomName) {
			//var roomName = event.target.innerHTML;
			//if (roomName == joinedRoom) alert("already joined " + roomName);
			//if (confirm("Are you sure to join room " + roomName + "?"))
			socket.emit("join room", roomName);
		};

		window.joinRoom = function (event) {
			var roomName = event.target.innerHTML;
			if (roomName == joinedRoom) alert("already joined " + roomName);
			//if (confirm("Are you sure to join room " + roomName + "?")) {
			$("#chat").show();
			socket.emit("join room", roomName);
			//}
		};
		window.joinPM = function (roomName) {
			//var roomName = event.target.innerHTML; 	// + "@dbs.com";
			//roomName = cleanInput(roomName);
			//console.log("Join PM " + roomName);
			//if (roomName == joinedRoom) alert("already joined " + roomName);
			//if (confirm("Are you sure to join room " + roomName + "?"))
			$("#chat").show();
			socket.emit("joinPM", roomName);
		};

		window.loginformsubmit = function () {
			localusername = "";
			document.cookie = "username=; expires=Thu, 01 Jan 1970 00:00:00 UTC";
			//setUsername();
			setLogin();
		}
		window.updateMenuProfile = function () {
			$("#mark").hide();
			stopBlinking = true;

			if (socket.connected === false &&
				socket.disconnected === true) {

				alertBox("You <b>(" + username + ")</b> is disconnected. The page will now reload.", {reload: true});
				return;
			}
			socket.emit("updatemenuprofile", username);
		}

		window.refreshlist = function () {
			//$(".messages").empty();
			socket.emit("refreshlist", joinedRoom, current_sortbylike);
		}
		window.submitAnswer = function (data) {
			setCookie("pausevideo", 1, 1);
			socket.emit("new answer", data);
		}
		window.pauseVideo = function () {
			var pausevideo = getCookie("pausevideo");
			if (!pausevideo || pausevideo == null) {
				alertBox("You need to complete the video to earn your points!");
				setCookie("pausevideo", 1, 1);
			}
		}
		window.checkPoll = function (data) {
			socket.emit("checkpoll", data);
		}
		window.checkVideo = function (data) {
			socket.emit("checkVideo", data);
		}
		window.submitPoll = function (data) {
			socket.emit("new answer", data);
		}
		window.alertbox = function (msg) {
			alertBox(msg);
		}
		window.congratbox = function (msg) {
			congratBox(msg);
		}
		window.fbsubmitq3 = function () {
			var msg = $("#fbcomment1").val();
			socket.emit("new message", msg, "/fbquestion3", 0, userType);
		}
		window.fbsubmitq4 = function () {
			var msg = $("#fbcomment2").val();
			socket.emit("new message", msg, "/fbquestion4", 0, userType);
		}
		window.loadPreviousMessage = function () {
			var messagecount = 0;
			messagecount = $(".messages div").length;
			console.log("00 mark: loadPreviousMessage - joinedRoom=" + joinedRoom + ", current_sortbylike=" + current_sortbylike)
			socket.emit("loadprevious", joinedRoom, current_sortbylike, messagecount, userType);
		}
		window.showThankyou = function () {
			var answer1 = getCookie("feedback1");
			var answer2 = getCookie("feedback2");
			var answer3 = getCookie("feedback3");
			var answer4 = getCookie("feedback4");

			if (answer1 == 1 && answer2 == 1 && answer3 == 1 && answer4 == 1) {
				alertBox("Thank you for your feedback!", {gomenu: true});
			} else {
				alertBox("Error while submitting to server, please try submit again!");
				$("#feedbacksubmit").show();
			}
		}
		var loadMostLikes = function (sortbylike) {
			$timeout(function(){
				$rootScope.data.showRepliesOfComment = ""
			})

			current_sortbylike = sortbylike
			if (sortbylike) {
				$("#viewmostlikes").text("View Recent");
				$("#loadpreviousmsg").text("View more comments");
				socket.emit("loadmostlikes", joinedRoom, userType);
			} else {
				$("#viewmostlikes").text("View Most Likes");
				$("#loadpreviousmsg").text("View earlier comments");
				socket.emit("loadhistory", joinedRoom, userType);
			}
			//$(".messages").empty();
			return false;
		}

		window.newImage = function (imagefile, inputComment) {
			console.log(imagefile.pathName);
			var pathName = imagefile.pathName;

			var message = "<img class='img-responsive' src='/images/uploads/resize/" + pathName + "'>";
			if (inputComment.length > 0) {
				message += "<p>" + inputComment + "</p>";
				$(".inputComment").val('');
			}
			socket.emit("new message", {
				message: message,
				room: joinedRoom,
				givepoints: 0,
				userType: userType,
				isReply: false,
				replyTo: "",
				replyNum: 0
			});
		}

		window.logout = function () {
			$state.go("login");
		}

		window.checkVideo = function (day) {
			socket.emit("checkVideo", {day: day, question: 1});
		}

		//window.scrollToBottom = function () {
		//	//var height = $(window).height();
		//	var topx = $("#scratchlabel").offset().top;
		//	$('html, body').animate({
		//		scrollTop: topx + 200
		//	}, 1000);
		//}

		window.getCurrentLoc = function(){
			return currentLoc
		}

		function setUserType(type){
			userType = type
		}

		return {
			init: init,
			loadMostLikes: loadMostLikes,
			setUserType: setUserType,
			likeMsg: likeMsg,
			unlikeMsg: unlikeMsg,
			getCommentReplies: getCommentReplies,
			replyComment: replyComment
		};
	}
]);



