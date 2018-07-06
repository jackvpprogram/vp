$(function() {
	//var $window = $(window);
	//$("#upload_btn").click(function() {
	//	document.getElementById("select_btn").click();
	//});
	//$("#select_btn").change(function(){
	//	readURL(this);
	//});
	//function readURL(input) {
	//
	//	if (input.files && input.files[0]) {
	//		var reader = new FileReader();
	//
	//		reader.onload = function (e) {
	//			$('#source_image').attr('src', e.target.result);
	//			$("#source_image").show();
	//		}
	//
	//		//alert(JSON.stringify(input.files[0]));
	//		reader.readAsDataURL(input.files[0]);
	//	}
	//}
	
	$.urlParam = function(name) {
			var results = new RegExp('[\?&]' + name + '=([^&#]*)').exec(window.location.href);
		if (results === null) {
			return '';
		} else {
			return results[1] || '';
		}
	};	
});

$(window).scroll(function() {
   if($(window).scrollTop() + $(window).height() == $(document).height()) {
       $("#goToSC").hide();
   }
});
