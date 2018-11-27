
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
