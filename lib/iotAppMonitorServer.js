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
// Monitor for http and mqtt messages using WebSocket library 'socket.io'
//  

module.exports = function (server) {
	
	var io = require('socket.io')(server, {
			  serveClient: true,
			  path: '/socket.io'
			});
	io.set('transports', ['websocket']);

	io.on('connection', function(socket){
		//socket.emit('iotwb-http', { message: 'Connected to application. Waiting for http calls.' });
		//socket.emit('iotwb-mqtt', { message: 'Connected to application. Waiting for mqtt calls.' });
		//socket.on('event', function(data){});
		//socket.on('disconnect', function(){});
	});
	
	return {
		sendToClient: function(protocol, id, msg){
			io.sockets.emit('iotwb-' + protocol, { id: id, message: msg });
		}
	}
} 