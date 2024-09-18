var _gaq = _gaq || [];
_gaq.push(['_setAccount', 'UA-104199888-3']);
_gaq.push(['_trackPageview']);

(function() {
  var ga = document.createElement('script'); ga.type = 'text/javascript'; ga.async = true;
  ga.src = 'https://ssl.google-analytics.com/ga.js';
  var s = document.getElementsByTagName('script')[0]; s.parentNode.insertBefore(ga, s);
})();

document.addEventListener("DOMContentLoaded", function(event) {
	var urlObj = new URL(window.location.href);
	var r = urlObj.searchParams.get("r");
	var button = document.getElementById('vtres');
	if (r == "unknown") {
		button.style.display = "none";
		document.getElementById("res_msg").innerText="Ooops... the downloaded file could not be scanned."
	}
	button.style.cursor = 'pointer';
	button.onclick = function() {
		_gaq.push(['_trackEvent', 'Action', 'donate button clicked']);
		window.location.replace(r);		
	};
	var rnd = Math.floor(Math.random() * 4) + 1;
	var img_path = rnd+'.jpg'
	document.body.style.backgroundImage = "url('"+img_path+"')";
});
 