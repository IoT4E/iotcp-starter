/********************************************************* {COPYRIGHT-TOP} ***
* IBM Confidential
* OCO Source Materials
* IoT for Electronics - SVL720160500
*
* (C) Copyright IBM Corp. 2016  All Rights Reserved.
*
* The source code for this program is not published or otherwise  
* divested of its trade secrets, irrespective of what has been 
* deposited with the U.S. Copyright Office.
********************************************************* {COPYRIGHT-END} **/

//
// client library for receiving monitor messages. 
//
var iotAppMonitorClient = (function () {
	
	var result = {};
	
	var socket = io.connect(window.location.host, {transports:['websocket']});
	
	if (socket){
		
		socket.on('iotwb-http', function (data) {
			if (typeof result.http === 'function'){
				result.http(data.message);
			}
  		});
  		
  		socket.on('iotwb-mqtt', function (data) {
			if (typeof result.mqtt === 'function'){
				result.mqtt(data.id, data.message);
			}
  		});
    }
	
	return result;
})();


  