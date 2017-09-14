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

module.exports = simulationClient;
var _ = require("underscore");
var util = require('util');
var EventEmitter = require('events');
var WebSocket  = require("ws");
var uuid = require("node-uuid");
var Q = require("q");
var fs = require('fs-extra');
var request = require('request');
var debug = require('debug')('simulationClient');
var appEnv = require("cfenv").getAppEnv();
var Cloudant = require('cloudant');
var encryptor = require('simple-encryptor')(process.env.KEY);

var application = JSON.parse(process.env.VCAP_APPLICATION);
var region = 'US';

if(application.application_uris[0].indexOf(".eu-gb.") > -1){
	region = 'UK';
} else if(application.application_uris[0].indexOf(".au-syd.") > -1){
	region = 'AU';
}

function simulationClient(config) {
	if (!(this instanceof simulationClient)) {
		return new simulationClient(config);
	}

	EventEmitter.call(this);
	config = (config) ? config :{};
	this.simulationConfig = {
			"sessionID": (config.sessionID) ? config.sessionID : appEnv.app.application_id,
					"devicesSchemas": (config.devicesSchemas) ? config.devicesSchemas : [],
							"devices": (config.devices) ? config.devices : []
	};

	var _this = this;
	if(config.simulationConfigFile)
		this.loadConfiguration(config.simulationConfigFile, true, function(){
			_this.restartSimulation();
		});
	this.ws = null;
};


//Inherit functions from `EventEmitter`'s prototype
util.inherits(simulationClient, EventEmitter);

simulationClient.prototype.getDevicesSchemas = function(){
	return this.simulationConfig.devicesSchemas;
};

simulationClient.prototype.getDevices = function(){
	return this.simulationConfig.devices;
};

simulationClient.prototype.loadConfiguration = function(simulationConfigFile, registerDevicetypes, done){
	var _this = this;

	callSimulationEngineAPI("GET", ["db", "loadDocument", appEnv.app.application_id]).then(function(resp){
		if(resp.err){
			if(resp.err.message === 'missing' || resp.err.message === 'deleted'){
				simulationConfigFile = (simulationConfigFile) ? simulationConfigFile: "./simulationConfig.json";
	          	_.extend(_this.simulationConfig, fs.readJsonSync(simulationConfigFile));
	          	callSimulationEngineAPI("POST", ["db", "insertDocument", appEnv.app.application_id], _this.simulationConfig).then(function(resp){
	          		if(resp.err){
	          			console.error('An error occurred when trying to create the configuration file in the database:', resp.err);
	          		} else {
	          			_.extend(_this.simulationConfig, {"_id": resp.body.id, "_rev": resp.body.rev});
	            		done();
	          		}
	          	});
			}
		} else {
			_.extend(_this.simulationConfig, resp.result);
        	_this.simulationConfig._rev = resp.result._rev;
        	done();
		}

		if(!registerDevicetypes)
				return Q(true);

		var regDeviceTypeReqs = [];
		_.each(_this.simulationConfig.devicesSchemas, function(schema){
			var iotFClient = getIotfAppClient();
			regDeviceTypeReqs.push(iotFClient.callApi('POST', 200, true, ['device', 'types'], JSON.stringify({id: schema.name})).then(function onSuccess (response) {
				Q.resolve(true);

			}, function onError (error) {
				if(error.status == 409)
					return true;
				console.error(error);
				Q.reject(error);
			}));
		});
		return Q.all(regDeviceTypeReqs).then(function(res){
			return res;
		});
	});
};

simulationClient.prototype.saveSimulationConfig = function(){
	var _this = this;
	callSimulationEngineAPI("POST", ["db", "insertDocument", appEnv.app.application_id], _this.simulationConfig).then(function(resp){
		if(resp.err){
			throw new Error("Error trying to update record: " + resp.err);
		} else {
			_this.simulationConfig._rev = resp.body.rev;
		}
	});
};

simulationClient.prototype.getStatus = function(){
	var deferred = Q.defer();

	callSimulationEngineAPI("GET", ["simulationStatus", appEnv.app.application_id]).then(function (resp){
		deferred.resolve(resp);
	}).fail(function(err){
		consloe.error(err.message);
		throw new Error("Cannot get simulation status " + err.message);
		deferred.reject(err);
	});

	return deferred.promise;
};

simulationClient.prototype.startSimulation = function(){
	var _this = this;
	var body = {simulationConfig: this.simulationConfig};

	return callSimulationEngineAPI("POST", ["startSimulation"], body).then(function (resp){
		return _this.createws(resp.wsurl);
	}).fail(function(err){
		consloe.error(err.message);
		throw new Error("Cannot start simulation " + err.message);
	});
};

simulationClient.prototype.restartSimulation = function(){
	var deferred = Q.defer();
	var _this = this;
	this.terminateSimulation().fin(function(){
		_.delay(function(){
			_this.startSimulation().then(function(){
				console.log("Simulation started")
				deferred.resolve("started");
			});
		},2000);
	}).fail(function(err){
		deferred.reject(err);
	});
	return deferred.promise;
};

simulationClient.prototype.unregisterDevice = function(deviceId){
	this.deleteDevice(deviceId);
	var iotFClient = getIotfAppClient();
	iotFClient.callApi('DELETE', 204, false, ['device', 'types', 'washingMachine', 'devices', deviceId], null);
}

simulationClient.prototype.terminateSimulation = function(deregisterDevices){
	var deferred = Q.defer();
	this.reconnectOnClose = false;
	callSimulationEngineAPI("DELETE", ["terminateSimulation", this.simulationConfig.sessionID]).then(function (resp){
		if(deregisterDevices){
			var schemaIndex = _.indexBy(this.simulationConfig.devicesSchemas, "guid");
			var body = [];
			_.each(this.simulationConfig.devices, function(device){
				body.push({typeId: schemaIndex[device.archDeviceGuid].name, deviceId: device.deviceID});
			});
			iotFClient.callApi('POST', 200, true, ['bulk', 'devices', 'remove'], JSON.stringify(body)).then(
					function onSuccess (response) {
						deferred.resolve();
					}, function onError (error) {
						console.error(error);
						deferred.reject(error);
					})
		}
		else
			deferred.resolve();
	}).fail(function(err){
		deferred.reject(err);
	});
	return deferred.promise;
};

simulationClient.prototype.createDevices = function(deviceType, numOfDevices, configs){
	var deferred = Q.defer();

	var iotFClient = getIotfAppClient();

	var nameIndex = _.indexBy(this.simulationConfig.devicesSchemas, "name");
	var deviceSchema = nameIndex[deviceType];
	if(!deviceSchema)
		deferred.reject(new Error("no such device schema " + deviceType));

	configs = (configs) ? configs : [];
	var bulkRegRequest = [];
	for(var i = 0 ; i < numOfDevices; i++){
		var config = (configs[i]) ? configs[i] : {};
		var regReq = {
				deviceId: (config.deviceId) ? config.deviceId : generateMacAddress(),
				typeId: deviceType,
				deviceInfo: {
					manufacturer: "Swirlmore",
					model: "wkw007ge",
					deviceClass: "Device",
					description: "Washing Machine",
					fwVersion: "1.0.0",
					hwVersion: "1.0.0"
				}
		};
		bulkRegRequest.push(regReq);
	};
	var _this = this;

	iotFClient.callApi('POST', 201, true, ['bulk', 'devices', 'add'], JSON.stringify(bulkRegRequest)).then(
			function onSuccess (responses) {
				var result = [];
				_.each(responses, function(response, index){
					var config =  (configs[index]) ? configs[index] : {};
					var device = {
							"deviceID" : response.deviceId,
							"archDeviceGuid": deviceSchema.guid,
							"lastRunAttributesValues" : [],
							"connected": (config.connected == true),
							"iotFCredentials": {
								"org":iotFClient.org,
								"password": response.authToken
							}
					};

					if(config.attributesInitialValues)
						_.each(config.attributesInitialValues, function(value, name){
							device.lastRunAttributesValues.push({name: name, value: value});
						});
					this.addDevice(device);
					result.push(device);
				}, _this);
				deferred.resolve(result);
			}, function onError (error) {
				console.error(error);
				deferred.reject(error);

			});
	return deferred.promise;
};

simulationClient.prototype.getDeviceStatus= function(deviceID){
	var deferred = Q.defer();
	this.sendGetDeviceStatus(deviceID);
	this.getCommandResponse('deviceStatus', deferred);
	return deferred.promise;
};

simulationClient.prototype.getAllDevicesStatus= function(){
	var deferred = Q.defer();
	this.sendGetAllDevicesStatus();
	this.getCommandResponse('devicesStatus', deferred);
	return deferred.promise;
};

/*
 * ******************************************* Acoustic Service *****************************
 * ******************************************************************************************
 * get acoustic service status
*/

/*
 * ******************************************* Acoustic Service *****************************
 * ******************************************************************************************
 * get acoustic service status
*/

simulationClient.prototype.getAcousticStatus = function(){
	var deferred = Q.defer();
	callSimulationEngineAPI("GET", ["acoustic", "getStatus"]).then(function (resp){
		deferred.resolve(resp);
	}).fail(function(err){
		consloe.error(err.message);
		throw new Error("Cannot get acoustic service status " + err.message);
		deferred.reject(err);
	});
	return deferred.promise;
}

simulationClient.prototype.analyzeAudio = function(filename){
	var deferred = Q.defer();
	var body = {filename: filename}
	callSimulationEngineAPI("POST", ["acoustic", "analyzeAudio"], body).then(function (resp){
		deferred.resolve(resp);
	}).fail(function(err){
		consloe.error(err.message);
		throw new Error("Cannot analyze audio " + err.message);
		deferred.reject(err);
	});
	return deferred.promise;
}

/*
 * *****************************    Commands **************************
 * ********************************************************************
 * connect / disconnect
 */
simulationClient.prototype.connectDevice = function(deviceID){
	var command = {cmdType: 'connect', deviceID: deviceID};
	this.sendCommand(command);
};

simulationClient.prototype.connectAllDevices = function(){
	var command = {cmdType: 'connectAll'};
	this.sendCommand(command);
};

simulationClient.prototype.disconnectDevice = function(deviceID){
	var command = {cmdType: 'disconnect', deviceID: deviceID};
	this.sendCommand(command);
};

simulationClient.prototype.disconnectAllDevices = function(){
	var command = {cmdType: 'disconnectAll'};
	this.sendCommand(command);
};

/*
 * Add delete devices
 */
simulationClient.prototype.addDevice = function(device){
	this.simulationConfig.devices.push(device);
	if(this.ws){
		var command = {cmdType: 'addDevice', simulationDevice: device};
		this.sendCommand(command);
	}
};

simulationClient.prototype.deleteDevice = function(deviceID){
	var devices
	for(var i = 0; i < this.simulationConfig.devices.length; i++){
		if(this.simulationConfig.devices[i].deviceID == deviceID){
			this.simulationConfig.devices.splice(i, 1);
			this.saveSimulationConfig();
			break;
		}
	}
	if(this.ws){
		var command = {cmdType: 'deleteDevice', deviceID: deviceID};
		this.sendCommand(command);
	}
};

/*
 * Set attributes value
 */
simulationClient.prototype.setAttributeValue = function(deviceID, attributeName, attributeValue){
	var command = {cmdType: 'setAttribute', deviceID: deviceID, attributeName: attributeName, attributeValue: attributeValue};
	this.sendCommand(command);
};

/*
 * Update Serial Number
 */
simulationClient.prototype.updateSerialNumber = function(deviceID, serialNumber){
	var iotFClient = getIotfAppClient();
	var body = {deviceInfo: {serialNumber: serialNumber}};
	iotFClient.callApi('PUT', 200, true, ['device', 'types', 'washingMachine', 'devices', deviceID], JSON.stringify(body));
};

/*
 * Devices status - connection status & attributes values
 */
simulationClient.prototype.sendGetAllDevicesStatus = function(){
	var command = {cmdType: 'allDevicesStatus'};
	this.sendCommand(command);
};

simulationClient.prototype.sendGetDeviceStatus = function(deviceID){
	var command = {cmdType: 'deviceStatus', deviceID: deviceID};
	this.sendCommand(command);
};

/*
 * Architecture devices commands
 */
simulationClient.prototype.addArchitectureDevice = function(archDevice){
	var command = {cmdType: 'addArchDevice', archDevice: archDevice};
	this.sendCommand(command);
};

simulationClient.prototype.updateArchitectureDevice = function(archDevice){
	var command = {cmdType: 'updateArchDevice', archDevice: archDevice};
	this.sendCommand(command);
};

simulationClient.prototype.sendGetDevicesSchema = function(){
	var command = {cmdType: 'getArchDevices'};
	this.sendCommand(command);
};

/*
 *  * ******************************************* End Commands ***************************************
 *
 * ******************************************* Events ***************************************
 * ******************************************************************************************
 * simulation terminated
 */
simulationClient.prototype.onSimulationTerminated = function(){
	debug("Simulation event: onSimulationTerminated");
	this.emit("simulationTerminated");
};

/*
 * Connect \ Disconnect
 */

simulationClient.prototype.onDeviceConnected = function(deviceID){
	debug("Simulation event: onDeviceConnected deviceID: " + deviceID);
	this.emit("deviceConnected", deviceID);
};

simulationClient.prototype.onDeviceDisconnected = function(deviceID){
	debug("Simulation event: onDeviceDisconnected deviceID: " + deviceID);
	this.emit("deviceDisconnected", deviceID);
};

simulationClient.prototype.onDeviceDmAction = function(deviceID, action){
	debug("Simulation event: onDeviceDmAction deviceID: " + deviceID);
	this.emit("deviceDmAction", deviceID);
};

simulationClient.prototype.onDeviceFirmwareDownload = function(deviceID){
	debug("Simulation event: onDeviceFirmwareDownload deviceID: " + deviceID);
	this.emit("deviceFirmwareDownload", deviceID);
};

simulationClient.prototype.onDeviceFirmwareUpdate = function(deviceID){
	debug("Simulation event: onDeviceFirmwareUpdate deviceID: " + deviceID);
	this.emit("deviceFirmwareUpdate", deviceID);
};

simulationClient.prototype.onDeviceConnectionError = function(deviceID, errMsg, errStack){
	this.deleteDevice(deviceID);
	debug("Simulation event: onDeviceConnectionError deviceID: " + deviceID + "errMsg: " + errMsg + " stacktrace: " + errStack);
	this.emit("deviceConnectionError", deviceID, errMsg, errStack);
	this.emit("error", {errType: "deviceConnectionError", deviceID: deviceID, message: errMsg, errStack: errStack});
};

/*
 * Device Status
 */

simulationClient.prototype.onNewDeviceCreated = function(device){
	debug("Simulation event: onNewDeviceCreated : " + JSON.stringify(device, null, 4));
	this.emit("newDevice", device);
};

simulationClient.prototype.onDeviceDeleted = function(deviceID){
	debug("Simulation event: onDeviceDeleted : " + deviceID);
	this.emit("deviceDeleted", deviceID);
};



simulationClient.prototype.onDeviceStatus = function(status){
	debug("Simulation event: onDeviceStatus : " + JSON.stringify(status, null, 4));
	this.emit("deviceStatus", status);
};

simulationClient.prototype.onAllDevicesStatus = function(status){
	debug("Simulation event: onAllDevicesStatus : " + JSON.stringify(status, null, 4));
	this.emit("devicesStatus", status);
};

/*
 * Attributes change
 */
simulationClient.prototype.onAttributeValueChange = function(deviceID, attrNames2Values){
	debug("Simulation event: onAttributeValueChange deviceID : " + deviceID + " attrNames2Values: " +JSON.stringify(attrNames2Values, null, 4));
	this.emit("attributeValueChange", deviceID, attrNames2Values);
};

/*
 * Architecture devices events
 */
simulationClient.prototype.onDevicesSchema = function(schemas){
	debug("Simulation event:  onArchitectureDevices: " + JSON.stringify(archDevices, null, 4));
	this.emit("devicesSchema", schemas);
};

simulationClient.prototype.onDevicesSchemaUpdated = function(schema){
	debug("Simulation event:  onArchitectureDeviceUpdated: " + JSON.stringify(archDevice, null, 4));
	this.emit("deviceSchemaUpdated", schema);
};

simulationClient.prototype.onNewDeviceSchema = function(schema){
	debug("Simulation event:  onNewArchitectureDevice: " + JSON.stringify(archDevice, null, 4));
	this.emit("newDeviceSchema", schema);
};

/*
 * user code errors
 */
simulationClient.prototype.onUserCodeError = function(deviceID, hookName, errMsg, errStack){
	debug("Simulation event: onUserCodeError deviceID: " + deviceID + " hookname:" + hookName + " errMsg: " + errMsg + " stacktrace: " + errStack);
	this.emit("userCodeError",deviceID, hookName, errMsg, errStack);
	this.emit("error", {errType: "userCodeError", deviceID: deviceID, message: errMsg, errStack: errStack, behaviourType: hookName});
};

simulationClient.prototype.onUserCodeRuntimeError = function(deviceID, hookName, errMsg, errStack){
	debug("Simulation event: onUserCodeRuntimeError deviceID: " + deviceID + " hookname:" + hookName + " errMsg: " + errMsg + " stacktrace: " + errStack);
	this.emit("userCodeRuntimeError",deviceID, hookName, errMsg, errStack);
	this.emit("error", {errType: "userCodeRuntimeError", deviceID: deviceID, message: errMsg, errStack: errStack, behaviourType: hookName});

};
/*
 * ************************************************* End Events ***************************************************8
 */


//internals

simulationClient.prototype.getCommandResponse= function(eventName, deferred){
	var _this = this;
	var responselistener = function(){
		_this.removeListener(eventName, responselistener);
		_this.removeListener('error', errorlistener);
		_this.removeListener('connectionClose', errorlistener);
		_this.removeListener('simulationTerminated', errorlistener);
		deferred.resolve.apply(deferred, arguments);
	};

	var errorlistener = function(){
		_this.removeListener('error', errorlistener);
		_this.removeListener('connectionClose', errorlistener);
		_this.removeListener('simulationTerminated', errorlistener);
		_this.removeListener(eventName, responselistener);
		deferred.reject.apply(deferred, arguments);
	};

	this.on(eventName, responselistener);
	this.on('error', errorlistener);
	this.on('connectionClose', errorlistener);
	this.on('simulationTerminated', errorlistener);
};

simulationClient.prototype.createws = function(wsurl){
	var deferred = Q.defer();

	if(this.ws){
		this.ws.terminate();
		delete this.ws;
	}
	this.reconnectOnClose = true;
	debug("createws "  + wsurl);
	this.ws = new WebSocket(wsurl);

	this.ws.on('open', _.bind(function (){
		if(deferred){
			deferred.resolve('connectted');
			deferred = null;
		}
		console.log("********************** connection open *****************");
		this.emit("connectionOpen");
	}, this));
	this.ws.on('close', _.bind(function(code, message) {
		this.emit("connectionClose", code, message);
		console.log("********************** connection closed *****************");
		if(this.reconnectOnClose)
			this.createws(wsurl);
	}, this));
	this.ws.on('error', _.bind(function(error) {
		this.emit("connectionError", error.code, error.message);
		this.emit("error", {errType: "connectionError", code: error.code, message: error.message});
		if(deferred){
			deferred.reject(error);
			deferred = null;
		}
	}, this));
	this.ws.on('message', _.bind(this.onMessage, this));
	return deferred.promise;
};


simulationClient.prototype.sendCommand = function(cmd){
	if(!this.ws)
		throw new Error("Not connected - cannot send command");
	this.ws.send(JSON.stringify(cmd));
};

simulationClient.prototype.onMessage = function(msg){
	message = JSON.parse(msg);
	if(message.error){
		this.emit("simulationError", message.error);
		message.error.errType = "simulationError";
		this.emit("error", message.error);
		console.error("Simulation message error: " + message.error);
		return;
	}

	switch (message.messageType) {
	case "simulationTerminated":
		this.onSimulationTerminated();
		break;
	case "deviceStatus":
		delete message.messageType;
		this.onDeviceStatus(message);
		break;
	case "devicesStatus":
		delete message.messageType;
		this.onAllDevicesStatus(message);
		break;
	case "deviceConnected":
		this.onDeviceConnected(message.deviceID);
		break;
	case "newDeviceCreated":
		this.onNewDeviceCreated(message.device);
	case "deviceDeleted":
		this.onDeviceDeleted(message.deviceID);
		break;
	case "deviceAttributesChange":
		this.onAttributeValueChange(message.deviceID, message.changedAttributes);
		break;
	case "deviceConnected":
		this.onDeviceConnected(message.deviceID);
		break;
	case "deviceDisconnected":
		this.onDeviceDisconnected(message.deviceID);
		break;
	case "deviceDmAction":
		this.onDeviceDmAction(message.deviceID, message.action);
		break;
	case "deviceFirmwareDownload":
		this.onDeviceFirmwareDownload(message.deviceID);
		break;
	case "deviceFirmwareUpdate":
		this.onDeviceFirmwareUpdate(message.deviceID);
		break;
	case "architectureDevices":
		this.onDevicesSchema(message.archDevices);
		break;
	case "architectureDeviceUpdated":
		this.onDevicesSchemaUpdated(message.archDevice);
		break;
	case "newArchitectureDevice":
		this.onNewDeviceSchema(message.archDevice);
		break;
	case "deviceConnectionError":
		this.onDeviceConnectionError(message.deviceID, message.message ,message.stack);
		break;
	case "deviceBehaviorCodeError":
		this.onUserCodeError(message.deviceID, message.hookName, message.message ,message.stack);
		break;
	case "deviceBehaviorRuntimeError":
		this.onUserCodeRuntimeError(message.deviceID, message.hookName, message.message ,message.stack);
		break;
	default:
		break;
	};
};




function callSimulationEngineAPI(method, paths, body){

	var uri = "https://simulationengine-uss-iot4e.electronics.internetofthings.ibmcloud.com/api";

	switch(region){
		case 'UK':
			uri = "https://iot4esimulationengine.eu-gb.mybluemix.net/api";
			break;
	}

	var apiKey = encryptor.decrypt('adb33b3b7e023efcb10ad68a8977d0c78d2ae6aa7e37d37331d56d33ccf67562b66fa079f14b21d49e56de4ea8924de7UcHcMC5d9fv2rkXJjka2cPR3+l8/5NPHBH8vOBoKDRX57AhzUCgFT5Dqmjmd6qhv');
	var apiToken = encryptor.decrypt('55febf36e62bdb74bc4464e834c0c4fe10627dff7a5eb9911e0bfd122dab6bacf22fe75126aafaa36ec6130e0e39ab79veloJdh8Sp4SxPSa366uATBsM0lw8YOacPj92RKSbtpZqbEhcbI2H/UG3MJNHg2G');
	if(paths){
		for(i in paths){
			uri += '/'+paths[i];
		}
	}
	return callRestApi(uri, apiKey, apiToken, method, JSON.stringify(body));
};




function callRestApi(uri, apiKey, apiToken, method, body, expectedHttpCode, expectJsonContent){
	expectedHttpCode = (expectedHttpCode) ? expectedHttpCode : 200;
	expectJsonContent = (expectJsonContent) ? expectJsonContent : true;
	if(!_.isArray(expectedHttpCode))
		expectedHttpCode = [expectedHttpCode];

	var deferred = Q.defer();

	request(
			uri,
			{
				method: method,
				rejectUnauthorized: true,
				body: body,
				auth: {
					user: apiKey,
					pass: apiToken,
					sendImmediately: true
				},
				headers: {'Content-Type': 'application/json'}
			},
			function (error, response, body) {
				if(error){
					deferred.reject(error);
				}else{
					if(expectedHttpCode.indexOf(response.statusCode) != -1){
						if(expectJsonContent){
							try{
								deferred.resolve(JSON.parse(body));
							} catch (ex){
								deferred.reject(ex);
							}
						}else{
							deferred.resolve(body);
						}
					}else{
						deferred.reject(new Error(method+" "+uri+": Expected HTTP "+expectedHttpCode+" from server but got HTTP "+response.statusCode));
					}
				}
			}
	);
	return deferred.promise;
};



var iotfAppClient = null;
function getIotfAppClient(){
	if(iotfAppClient)
		return iotfAppClient;
	var iotfAppClientCtor = require("ibmiotf").IotfApplication;
	var iotFcreds = null;
	try{
		iotFcreds = VCAP_SERVICES["iotf-service"][0].credentials;

	}catch (e) {
		throw new Error("Cannot get IoT-Foundation credentials");
	};
	var config = {
			"org" : iotFcreds.apiKey.split("-")[1],
			"id" : "hi",
			"auth-key" : iotFcreds.apiKey,
			"auth-token" : iotFcreds.apiToken
	};

	iotfAppClient = new iotfAppClientCtor(config);
	return iotfAppClient;
};

function generateMacAddress(){
	var mac = Math.floor(Math.random() * 16).toString(16) +
	Math.floor(Math.random() * 16).toString(16) +
	Math.floor(Math.random() * 16).toString(16) +
	Math.floor(Math.random() * 16).toString(16) +
	Math.floor(Math.random() * 16).toString(16) +
	Math.floor(Math.random() * 16).toString(16) +
	Math.floor(Math.random() * 16).toString(16) +
	Math.floor(Math.random() * 16).toString(16) +
	Math.floor(Math.random() * 16).toString(16) +
	Math.floor(Math.random() * 16).toString(16) +
	Math.floor(Math.random() * 16).toString(16) +
	Math.floor(Math.random() * 16).toString(16);
	var macStr = mac[0].toUpperCase() + mac[1].toUpperCase() + mac[2].toUpperCase() + mac[3].toUpperCase() +
	mac[4].toUpperCase() + mac[5].toUpperCase() + mac[6].toUpperCase() + mac[7].toUpperCase() +
	mac[8].toUpperCase() + mac[9].toUpperCase() + mac[10].toUpperCase() + mac[11].toUpperCase();
	return macStr;
};

process.on('uncaughtException', function(err){
  console.log('An error has occured.');
});

//get service credentials
/*
var userProviedServices = [0].credentials;
var simulationCreds = null;
if(VCAP_SERVICES["user-provided"]){
	for (var i = 0; i < VCAP_SERVICES["user-provided"].length; i++) {
		if(VCAP_SERVICES["user-provided"][i].name == 'DevicesSimulation'){
			simulationCreds = VCAP_SERVICES["user-provided"][i].credentials;
			break;
		}
	}
}
if(!simulationCreds)
	throw new Error("cannot get  Devices-Simulation service credentials");*/
