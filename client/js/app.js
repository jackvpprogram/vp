var vpStarter = angular.module("vpconf.starter", [])
	.constant('configData', {
		rootState: '',
		appPath: 'vp2017/'
	});

var vpconfApp = angular.module("vpconf.mainApp", ["vpconf.starter", "ui.router", "vpconf.utilityService", "vpconf.chatService"])
	.config(Configure)
	.run(Setup)
	.controller("mainCtrl", ["$scope", "$rootScope", function($scope, $rootScope){
		console.log("mainCtrl")
		//$scope.data = {
		//	mainAppWidth: window.innerWidth + "px",
		//	mainAppHeight: window.innerHeight + "px"
		//}
	}])

function Configure($urlRouterProvider, $stateProvider, configData){
	$stateProvider
		.state("login" , {
			url: "/login",
			templateUrl: configData.appPath + "templates/login.html",
			controller: loginController,
			controllerAs: "ctl"
		})
		.state("menu" , {
			url: "/menu",
			templateUrl: configData.appPath + "templates/menu.html",
			controller: menuController,
			controllerAs: "ctl"
		})
		.state("instructions" , {
			url: "/instructions",
			templateUrl: configData.appPath + "templates/instructions.html",
			controller: instructionController,
			controllerAs: "ctl"
		})
		.state("ask" , {
			url: "/ask_sgmc_anything",
			templateUrl: configData.appPath + "templates/ask.html",
			controller: askController,
			controllerAs: "ctl"
		})
		.state("myPage" , {
			url: "/myPage",
			templateUrl: configData.appPath + "templates/profile.html",
			controller: profileController,
			controllerAs: "ctl"
		})
		.state("day1" , {
			url: "/day1",
			templateUrl: configData.appPath + "templates/day1.html",
			controller: day1Controller,
			controllerAs: "ctl"
		})
		.state("day2" , {
			url: "/day2",
			templateUrl: configData.appPath + "templates/day1.html",
			controller: day2Controller,
			controllerAs: "ctl"
		})
		.state("day3" , {
			url: "/day3",
			templateUrl: configData.appPath + "templates/day1.html",
			controller: day3Controller,
			controllerAs: "ctl"
		})
		.state("day4" , {
			url: "/day4",
			templateUrl: configData.appPath + "templates/day1.html",
			controller: day4Controller,
			controllerAs: "ctl"
		})
		.state("day5" , {
			url: "/day5",
			templateUrl: configData.appPath + "templates/day1.html",
			controller: day5Controller,
			controllerAs: "ctl"
		})
		.state("questionList" , {
			url: "/questionList",
			templateUrl: configData.appPath + "templates/questionList.html",
			controller: questionListController,
			controllerAs: "questionList"
		})
		.state("addsearch" , {
			url: "/addsearch",
			templateUrl: configData.appPath + "templates/addSearch.html",
			controller: questionListController,
			controllerAs: "addsearch"
		})
		.state("question" , {
			url: "/question",
			templateUrl: configData.appPath + "templates/question.html",
			controller: questionController,
			controllerAs: "question"
		})
		.state("result" , {
			url: "/result",
			templateUrl: configData.appPath + "templates/result.html",
			controller: questionResultController,
			controllerAs: "result"
		})

	$urlRouterProvider.otherwise("/login")
}
Configure.$inject = ["$urlRouterProvider", "$stateProvider", "configData"];

function Setup($rootScope, $state, $timeout, utilityService, chatService){
	$rootScope.data = {
		hasLogin: false,
		showGame: false,
		showRepliesOfComment: "",
		user: {
			userId: "",
			userType: 1,
			isAdmin: false
		},
		jack_userType:null,
		comments: [],
		currentReply: "",
		currentCommentReplies: [],
		currVideoId:'',
		questionNameArray:[],
		questionArray:[],
		questionResultArray:[],
		questionAlready:true,
		questionCreateShow:true,
		addquestionName:'',
		addquestionDesc:'',
		createArray:[
			{ text: '' },
			{ text: '' },
			{ text: '' },
			{ text: '' }
		],
		resultBackInfo:null,
	}

	//$rootScope.$on("stateChangeSuccess", function (event, toState, toParams, fromState, fromParams) {
	//	console.log("stateChangeSuccess: toState.name=" + toState.name)
	//	utilityService.reloadFunctionsJS()
	//});
	 /**
	  * test
	  */
	//  $rootScope.testquiz = function(){
	// 	$state.go('questionList');
	//  }
	$rootScope.questionGoback = function(){
		//返回上一级路由
		// console.log('back11');
		history.go(-1);

	}
	// $rootScope.questionNew = function(){
	// 	console.log('222',$rootScope.data.createArray);
	// 	console.log('22',$rootScope.data.addquestionName);
	// 	socket.emit("createPolling",'$rootScope.data.currVideoId',$rootScope.data.addquestionName,'',$rootScope.data.createArray)
	// 	// console.log($rootScope.day3Controller.pageData);

	// }
	//判断跳转权限问题
	// $rootScope.questionPower = function(val){
	// 	switch(Number(val)){
	// 		case 0:
	// 			change


	// 	}
	// }

	$rootScope.showVPbtn = function(){
		var ourl = window.location.href;
		var tempArr = ourl.split('/');
		var pathName = tempArr[tempArr.length-1];
		if(pathName == 'question' || pathName == 'questionList' || pathName == 'result' || pathName== 'addsearch'){
			$('.user-type-btn').css("visibility","hidden");
		}else if(pathName == 'day1'){
			$('.user-type-btn').css("visibility","visible");
		}else{
			$('.user-type-btn').css("visibility","visible");
		}
		
		console.log();
	}

	$rootScope.updateHasLogin = function(val){
		$timeout(function(){
			$rootScope.data.hasLogin = val
		})
	}

	$rootScope.changePage = function(pageState){
		console.log('当前用户权限',$rootScope.data.user.userType)
		//
		// if(pageState == 'questionList' && $rootScope.data.questionAlready == true){
		// 	pageState = 'result';
		// }
		$state.go(pageState)

		console.log("changePage() to=" + pageState)
		$timeout(function(){
			utilityService.reloadJSFile("vp2017/js/functions.js")
			//utilityService.reloadJSFile("js/custom.js")
		}, 100)
	}

	$rootScope.showBoardGame = function() {
		$rootScope.data.showGame = true
		$timeout(function(){
			$(".game-container").css("display", "block")
		}, 500)
	}
	$rootScope.hideBoardGame = function() {
		$timeout(function(){
			$rootScope.data.showGame = false
			$(".game-container").css("display", "none")
		})
	}

	$rootScope.loadMostLikes = function(sortbylike){
		chatService.loadMostLikes(sortbylike)
	}

	$rootScope.changeUserType = function(type){
		if($rootScope.data.user.isAdmin){
			$rootScope.data.user.userType = type
			chatService.setUserType(type)
			socket.emit('getPollingList', $rootScope.data.currVideoId,$rootScope.data.user.userType);
			
			// setTimeout(function(){
				$state.reload()
			// },3000)
			

		}
	}

	$rootScope.getCommentDisplayTime = function(time){
		var m = moment(time);
		return m.fromNow();
	}

	$rootScope.toggleLike = function(comment){
		var chatId = comment._id
		if(comment.likes.indexOf($rootScope.data.user.userId) == -1){
			chatService.likeMsg(chatId)
		}else{
			chatService.unlikeMsg(chatId)
		}
	}

	$rootScope.formatCommentMsg = function(comment){
		return comment.replace(/\n/g, "<br>")
	}

	$rootScope.showReplies = function(comment){
		$rootScope.data.showRepliesOfComment = comment._id
		chatService.getCommentReplies(comment)
	}

	$rootScope.replyComment = function(comment){
		chatService.replyComment(comment)
	}

	//upload image
	$rootScope.uploadImage = function(){
		angular.element("#select_btn").trigger("click")
	}
	$rootScope.onFileSelect = function($files) {
		if ($files && $files[0]) {
			console.log("00 mark: $files[0]=" + $files[0])
			var reader = new FileReader();
			reader.onload = function (e) {
				$('#source_image').attr('src', e.target.result);
				$("#source_image").show();
			}

			//alert(JSON.stringify(input.files[0]));
			reader.readAsDataURL(input.files[0]);
		}
	}
}
Setup.$inject = ['$rootScope', '$state', '$timeout', 'utilityService', 'chatService']

function loginController($rootScope, $scope, $state, configData, utilityService, chatService){
	ga('send', 'pageview');
	utilityService.reloadJSFile("vp2017/js/functions.js")
	chatService.init()

	function getCookie(cname) {
		var name = cname + "=";
		var ca = document.cookie.split(';');
		for(var i=0; i<ca.length; i++) {
			var c = ca[i];
			while (c.charAt(0)==' ') c = c.substring(1);
			if (c.indexOf(name) == 0) return c.substring(name.length, c.length);
		}
		return "";
	}

	if(getCookie("username")){
		$rootScope.updateHasLogin(true)
		$state.go("menu")
	}else{
		$rootScope.updateHasLogin(false)
	}
}
loginController.$inject = ["$rootScope", "$scope", "$state", "configData", "utilityService", "chatService"];


function menuController($scope, $state, configData, chatService){
	ga('send', 'pageview');
	chatService.init()
}
menuController.$inject = ["$scope", "$state", "configData", "chatService"];

function instructionController($scope, $state, configData, chatService){
	ga('send', 'pageview');
	chatService.init()
}
instructionController.$inject = ["$scope", "$state", "configData", "chatService"];

function askController($scope, $state, $timeout, chatService){
	ga('send', 'pageview');
	$timeout(function(){
		chatService.init()
		chatService.loadMostLikes(false)
	}, 500)

	//var mobilecheck = function() {
	//	var check = false;
	//	(function(a){if(/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(a)||/1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0,4))) check = true;})(navigator.userAgent||navigator.vendor||window.opera);
	//	return check;
	//};

	var mobileAndTabletcheck = function() {
		var check = false;
		(function(a){if(/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino|android|ipad|playbook|silk/i.test(a)||/1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0,4))) check = true;})(navigator.userAgent||navigator.vendor||window.opera);
		return check;
	};

	$(document).ready(function() {
		//(function(p,i,g,e,o,n,s){p[o]=p[o]||function(){(p[o].q=p[o].q||[]).push(arguments)},
		//	n=i.createElement(g),s=i.getElementsByTagName(g)[0];n.async=1;n.src=e;
		//	s.parentNode.insertBefore(n,s);})
		//(window,document,'script','https://static.pigeonhole.at/widget/pigeon-widget.js','phl');
		//phl("create", {
		//	height: "800px",
		//	width: $(".pigeonhole-iframe").width()+"px",
		//	passcode: "W9B5T4",
		//	className: "pigeonhole-iframe",
		//	sessionId: 66541
		//});

		//if is web
		if(!mobileAndTabletcheck()){
			$(window).resize(function(){
				console.log("window resize");
				$state.reload();
			});
		}

		window.addEventListener("orientationchange", function() {
			$state.reload();
		});
	});
}
askController.$inject = ["$scope", "$state", "$timeout", "chatService"];

function day1Controller($scope, $timeout, chatService){
	ga('send', 'pageview');
	$timeout(function(){
		chatService.init()
		chatService.loadMostLikes(false)
	}, 500)

	$scope.pageData = {
		day: 1,
		title: "Reimagine Banking",
		text1: "What makes DBS the World's Best Digital Bank? Our digital transformation pervades every part of the bank. We are driven by one relentless purpose, which is to live and breathe innovation to Make Banking Joyful. It starts with reimagining banking.",
		text2: "What can we do to help DBS on this quest? Watch this video to hear what Sim and members of his management team have to say.",
		videos: [
			{videoId:'1a', poster: "vp2017/images/day1vid1.png", src: "https://s3-ap-southeast-1.amazonaws.com/dbsvp2017/DBS_Reimagine_Banking_Day_1_Video_170721.mp4"}
		],
		previousBtnText: "",
		nextBtnText: "Reimagine the Way We Work",
		commentQuestion: "What are your thoughts after watching the video? Do you agree with the things said? Tell us here.",
		questionBtn:true
	}
}
day1Controller.$inject = ["$scope", "$timeout", "chatService"];

function day2Controller($scope, $timeout, chatService){
	ga('send', 'pageview');
	$timeout(function(){
		chatService.init()
		chatService.loadMostLikes(false)
	}, 500)

	$scope.pageData = {
		day: 2,
		title: "Reimagine the Way We Work",
		text1: "What does it take to be a successful company? The answer lies in the culture. Culture breeds success. To truly become a 22,000-person start-up, we must first create a start-up culture.",
		text2: "And the way to create a start-up culture? Truly live our PRIDE! values. Let Piyush tell you how!",
		videos: [
			{poster: "vp2017/images/dbs2017_day2.jpg", src: "https://s3-ap-southeast-1.amazonaws.com/dbsvp2017/DBS_Reimagine_Banking_Day_2_Video_22000_start_up.mp4"}
		],
		previousBtnText: "Reimagine Banking",
		nextBtnText: "Reimagine Ourselves",
		commentQuestion: "The start-up attributes are nothing new: Being Obsessed with the Customer, Nimble, Data-driven, Empowered & Agile and Challenging the Status Quo, is what we do everyday. Take a picture that showcases any of these attributes in action and send it in! It can be you, or the colleague sitting across the table. Get creative and show us!"
	}
}
day2Controller.$inject = ["$scope", "$timeout", "chatService"];

function day3Controller($scope, $timeout, chatService){
	ga('send', 'pageview');
	$timeout(function(){
		chatService.init()
		chatService.loadMostLikes(false)
	}, 500)

	$scope.pageData = {
		day: 3,
		title: "Reimagine Ourselves",
		text1: "",
		text2: "Not sure what it means? Let Sim and two of your peers (Harish and Lauren) inspire you with their experiences!",
		videos: [
			{poster: "vp2017/images/dbs2017_day3.jpg", src: "https://s3-ap-southeast-1.amazonaws.com/dbsvp2017/DBS_Reimagine_Banking_Day_3_video_Reimagine_Ourselves.mp4"}
		],
		previousBtnText: "Reimagine the Way We Work",
		nextBtnText: "Tips & Tricks from Sim",
		commentQuestion: "What are your thoughts after watching the video? Do you agree with the things said? Tell us here."
	}
}
day3Controller.$inject = ["$scope", "$timeout", "chatService"];

function day4Controller($scope, $timeout, chatService){
	ga('send', 'pageview');
	$timeout(function(){
		chatService.init()
		chatService.loadMostLikes(false)
	}, 500)

	$scope.pageData = {
		day: 4,
		title: "Tips & Tricks from Sim",
		text1: "There are many things that have made Sim the man he is today.",
		text2: "Now, let him share with you, these philosophies that have guided him throughout his life.",
		videos: [
			{poster: "vp2017/images/dbs2017_day4.jpg", src: "https://s3-ap-southeast-1.amazonaws.com/dbsvp2017/DBS+Reimagine+Banking+Day+4+video+Tips+%26+Tricks.mp4.mp4"}
		],
		previousBtnText: "Reimagine Ourselves",
		nextBtnText: "You Have a Say!",
		commentQuestion: "Which of Sim’s tips and tricks would you apply in your life? Tell us why! (Sim would love to hear from you, so keep writing!)"
	}
}
day4Controller.$inject = ["$scope", "$timeout", "chatService"];

function day5Controller($scope, $timeout, chatService){
	ga('send', 'pageview');
	$timeout(function(){
		chatService.init()
		chatService.loadMostLikes(false)
	}, 500)

	$scope.pageData = {
		day: 5,
		title: "You have a say! Ask SGMC anything!",
		text1: "Is there anything inhibiting you / DBS from becoming #BBIW? What road blocks, if any, do you face in your work? To get the answers to all your questions, join the SGMC at a special townhall today at MBFC Level 3 auditorium from 3.00pm.",
		text2: "",
		videos: [],
		previousBtnText: "Tips & Tricks from Sim",
		nextBtnText: "",
		commentQuestion: "Join SGMC at townhall at MBFC auditorium"
	}
}
day5Controller.$inject = ["$scope", "$timeout", "chatService"];

function questionListController($scope, $timeout, chatService){
	ga('send', 'pageview');
	$timeout(function(){
		chatService.init()
		chatService.loadMostLikes(false)
	}, 500)

	$scope.pageData = {
		List:[
			{id:1,content:'11111'},
			{id:2,content:'2222'}
		]
	}
}
questionListController.$inject = ["$scope", "$timeout", "chatService"];

function addSearchController($scope, $timeout, chatService){
	ga('send', 'pageview');
	$timeout(function(){
		chatService.init()
		chatService.loadMostLikes(false)
	}, 500)

	$scope.pageData = {
		List:[
			{id:1,content:'11111'},
			{id:2,content:'2222'}
		]
	}
}
addSearchController.$inject = ["$scope", "$timeout", "chatService"];
function questionController($scope, $timeout, chatService){
	ga('send', 'pageview');
	$timeout(function(){
		chatService.init()
		chatService.loadMostLikes(false)
	}, 500)

	$scope.pageData = {
		questionList:['question1','question2',],
		questionAnswer:null,
	}
}
questionController.$inject = ["$scope", "$timeout", "chatService"];
function questionResultController($scope, $timeout, chatService){
	ga('send', 'pageview');
	$timeout(function(){
		chatService.init()
		chatService.loadMostLikes(false)
	}, 500)

	$scope.pageData = {
		result:[
			{progress:30,num:80}
		]
	}
}
questionResultController.$inject = ["$scope", "$timeout", "chatService"];

function profileController($scope, $state, configData, chatService){
	ga('send', 'pageview');
	chatService.init()
}
profileController.$inject = ["$scope", "$state", "configData", "chatService"];
