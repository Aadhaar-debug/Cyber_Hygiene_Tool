var _gaq = _gaq || [];
_gaq.push(['_setAccount', 'UA-104199888-3']);
_gaq.push(['_trackPageview']);

(function() {
  var ga = document.createElement('script'); ga.type = 'text/javascript'; ga.async = true;
  ga.src = 'https://ssl.google-analytics.com/ga.js';
  var s = document.getElementsByTagName('script')[0]; s.parentNode.insertBefore(ga, s);
})();


let stubsMap = {};
let notificationsMap = {};

chrome.runtime.onInstalled.addListener(function() {	
	//window.open("http://doc2google.com/", '_blank');
	_gaq.push(['_trackEvent', 'Install', 'first']);
});


chrome.downloads.onCreated.addListener(function(downloadItem) {
	////console.log(downloadItem)
	if (downloadItem.mime.indexOf("application") > -1) {
		stubsMap[downloadItem.id] = downloadItem.finalUrl ? downloadItem.finalUrl : downloadItem.url;
	}
});

chrome.notifications.onClicked.addListener(function(notificationId) {
	let notifType = notificationsMap[notificationId];
	////console.log('notification: ', notificationId, ' was clicked (',notifType,')');

	chrome.windows.getLastFocused({}, function(win) {
		chrome.windows.update(win.id, {focused:true});
	});

	chrome.notifications.clear(notificationId, function(wasCleared) {
		////console.log('notification: ', notificationId, ' was cleared? ' + wasCleared);
		delete notificationsMap[notificationId];
	});

	//console.log("notif URL: " + vtUrl + " notifType: " + notifType)
	//window.open(notifType, '_blank');
	_gaq.push(['_trackEvent', 'Action', 'notificationClick']);
	window.open("results.html?r="+notifType, '_blank');
});

chrome.downloads.onChanged.addListener(function(downloadDelta){
	////console.log(downloadDelta)

	if(downloadDelta.state && downloadDelta.state.current == "complete" && stubsMap[downloadDelta.id]) {
		let origFileUrl = stubsMap[downloadDelta.id];
		checkFile(origFileUrl)
		delete stubsMap[downloadDelta.id];
	}
});


chrome.webNavigation.onBeforeNavigate.addListener(function(navObj){
	//console.log(navObj);
	var isMainFrame = navObj.parentFrameId == -1 ? true : false;
	var frameUrl = navObj.url;
	if (frameUrl != "about:blank" && isMainFrame) {
		var urlObj = new URL(frameUrl);
		var frameDomainUrl = urlObj.protocol + '//'+ urlObj.hostname;
		//console.log("scan url: "+ frameDomainUrl)
		//scanForAVs(frameDomainUrl, true, frameDomainUrl);
	}

});


// Download a file form a url.
function checkFile(url) {
	var filename = url.substring(url.lastIndexOf('/')+1);
	if (filename.match(/.*(.zip|.dmg|.exe)$/)||filename.lastIndexOf('.') == -1) {
		var xhr = new XMLHttpRequest();
		xhr.open('GET', url, true);
		xhr.responseType = 'arraybuffer';
		xhr.onload = function(e) {
			if (this.status == 200) {
				var responseArray = new Uint8Array(this.response); 
				var resAsStr = new TextDecoder("utf-8").decode(responseArray);
				crypto.subtle.digest("SHA-256", responseArray).then(function (hash) {
					var a = hex(hash);
					//console.log('hash:',a)
					scanForAVs(a, false, filename);
				});	  
			}
		};
		xhr.send();
	}
}


function scanForAVs(objToScan, isURL, fileName) {
	var vtApiUrl = "https://www.virustotal.com/vtapi/v2/file/report";
	var apiKey = "b341d8a65f87cd7f53de9084fc631f6c4335c32e6bed99f59d9dc8a42940d146";
	if (isURL) {
		vtApiUrl = "https://www.virustotal.com/vtapi/v2/url/report";
	}
	console.log("scanForAVs: " + fileName)
	$.post( vtApiUrl, { apikey: apiKey, resource:  objToScan}, function( data ) {
			let msg = '';
			let icon = '';
			if (data) {
				var scanID = data.scan_id;
				var scanLink = data.permalink;
				if(data.response_code == 1) {
					if (data.positives == 0) {
						msg = fileName+' is clean!'
						icon = 'good.png';
						if (!isURL) {
							_gaq.push(['_trackEvent', 'Info', 'clean']);
							displayNotification(scanID, scanLink, msg, icon);
						}
					}
					else {
						msg = fileName+' is marked by '+data.positives+'/'+data.total+' AVs';
						if (isURL) {
							msg = 'Dangerous site detected';
						}
						icon = 'bad.png';	
						_gaq.push(['_trackEvent', 'Info', 'marked']);
						displayNotification(scanID, scanLink, msg, icon) 
					}
					
				}
				else if (data.response_code == 0) {
					msg = fileName+' was not scanned';
					icon = 'unknown.png';
					if (!isURL) {							
						_gaq.push(['_trackEvent', 'Info', 'unknown']);
						displayNotification(scanID, 'unknown', msg, icon);
					}
				}
			}
			else {
				msg = fileName+' was not scanned';
				icon = 'unknown.png';
				if (!isURL) {							
					_gaq.push(['_trackEvent', 'Info', 'unreachable']);
					displayNotification(scanID, 'unknown', msg, icon);
				}
			}
		}, "json");
}


function displayNotification(scanID, scanLink, msg, icon) {
	console.log("displayNotification: " + msg)
	msg += ' click for details.';
	chrome.notifications.create(scanID,{iconUrl: icon, 
								type: "basic",
								title: "Virus Scan", 
								message: msg, 
								isClickable: true, 
								requireInteraction: true}, function(notificationId) {
									notificationsMap[notificationId] = scanLink
								});
}

function hex(buffer) {
  var hexCodes = [];
  var view = new DataView(buffer);
  for (var i = 0; i < view.byteLength; i += 4) {
    // Using getUint32 reduces the number of iterations needed (we process 4 bytes each time)
    var value = view.getUint32(i)
    // toString(16) will give the hex representation of the number without padding
    var stringValue = value.toString(16)
    // We use concatenation and slice for padding
    var padding = '00000000'
    var paddedValue = (padding + stringValue).slice(-padding.length)
    hexCodes.push(paddedValue);
  }

  // Join all the hex strings into one
  return hexCodes.join("");
}

