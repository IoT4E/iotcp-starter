
var _ = require('underscore');

cached_devices = {};

var connectedDevicesCache = exports;

connectedDevicesCache.cacheDevice = function (type, deviceID, payload){
	if(!cached_devices[type])
		cached_devices[type] = {};

	if(!cached_devices[type][deviceID]) {
		cached_devices[type][deviceID]={deviceID:deviceID, deviceType: type};
		cached_devices[type][deviceID].lastUpdateTime = -1; // no data yet
	}
	if(payload)	{
		for (var key in payload)		{
			if (payload[key] != cached_devices[type][deviceID][key]){
				var d = new Date();
				var currentTime = d.getTime();
				cached_devices[type][deviceID].lastUpdateTime = currentTime;
				_.extend(cached_devices[type][deviceID], payload);
				break;
			}
		}
	}
};

connectedDevicesCache.deleteDevice = function(type, deviceID){
	if (cached_devices[type] && cached_devices[type][deviceID])
		delete cached_devices[type][deviceID];
};

connectedDevicesCache.getConnectedDevices = function(){
	var devices = [];
	for (var type in cached_devices){
		for (var deviceID in cached_devices[type]){
			devices.push(cached_devices[type][deviceID]);
		}
	}
	return devices;
};

connectedDevicesCache.getConnectedDevicesOfType = function(type){
	var devices = [];
	for (var deviceID in cached_devices[type]){
		devices.push(cached_devices[type][deviceID]);
	}
	return devices;
};

connectedDevicesCache.getConnectedDevice = function(id){
	for (var type in cached_devices){
		if(cached_devices[type][id])
			return cached_devices[type][id];
	}
};

connectedDevicesCache.getConnectedDevicesCache = function(){
	return cached_devices;
};
