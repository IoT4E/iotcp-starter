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

var iotApplicationClient = require("iotclient");

var washingMachineIoTFClient = exports;

// massage arrived callbacks
//override with - function(deviceID, payload, format, payloadString, topic)
//payload maybe null is format is other then json
washingMachineIoTFClient.statusReportMessageArrived = null;
washingMachineIoTFClient.failureAlertMessageArrived = null;
washingMachineIoTFClient.waterConsumptionMessageArrived = null;

//device status callbacks
//override with - function(id, payload)
washingMachineIoTFClient.onwashingMachineConnected = null;
washingMachineIoTFClient.onwashingMachineDisconnected = null;

//sending messages      
washingMachineIoTFClient.sendstartWashingMessage = function(deviceID) { 
    this.iotClient.publishDeviceCommand("washingMachine", deviceID, "startWashing", "json", JSON.stringify({}));
};      
washingMachineIoTFClient.sendstopWashingMessage = function(deviceID) { 
    this.iotClient.publishDeviceCommand("washingMachine", deviceID, "stopWashing", "json", JSON.stringify({}));
};

washingMachineIoTFClient.connectToBroker = function(credentials) {  
    this.iotClient = new iotApplicationClient("iot4electronics" + credentials.apiKey, credentials.apiKey, credentials.apiToken, credentials.mqtt_host);    
    //connect to broker
    this.iotClient.connectBroker(credentials.mqtt_u_port);  
    // Subscribe to device status
    this.iotClient.subscribeToDeviceStatus("washingMachine", "+");
    this.iotClient.callbacks.deviceStatus = washingMachineIoTFClient.dispatchDeviceStatus;
    // Subscribe to device events
    this.iotClient.callbacks.deviceEvent = washingMachineIoTFClient.dispatchDeviceEvent;
    this.iotClient.subscribeToDeviceEvents("washingMachine", "+", "statusReport", "json");
    this.iotClient.subscribeToDeviceEvents("washingMachine", "+", "failureAlert", "json");
    this.iotClient.subscribeToDeviceEvents("washingMachine", "+", "waterConsumption", "json");
};

washingMachineIoTFClient.dispatchDeviceEvent = function (type, id, event, format, payload, topic) {
    if (iotAppMonitor) {
        iotAppMonitor.sendToClient('mqtt', id, payload);
    } 
    var payloadObj = null;
    if(format == 'json')
        payloadObj = JSON.parse(payload).d;
    //connectedDevicesCache.cacheDevice(type, id, payloadObj);
    switch (event){
    case "statusReport":
        if(washingMachineIoTFClient.statusReportMessageArrived)         
            washingMachineIoTFClient.statusReportMessageArrived(id, payloadObj, format, payload, topic);
        break;
    case "failureAlert":
        if(washingMachineIoTFClient.failureAlertMessageArrived)         
            washingMachineIoTFClient.failureAlertMessageArrived(id, payloadObj, format, payload, topic);
        break;
    case "waterConsumption":
        if(washingMachineIoTFClient.waterConsumptionMessageArrived)
            washingMachineIoTFClient.waterConsumptionMessageArrived(id, payloadObj, format, payload, topic);
        break;        
    };
   
};

washingMachineIoTFClient.dispatchDeviceStatus = function (type, id, payload, topic) {   var payloadObj = JSON.parse(payload);
    switch (payloadObj.Action){
    case "Connect":
        //connectedDevicesCache.cacheDevice(type, id);
        if(washingMachineIoTFClient.onwashingMachineConnected)
            washingMachineIoTFClient.onwashingMachineConnected(id, payloadObj);
        break;
    case "Disconnect":
        //connectedDevicesCache.deleteDevice(type, id);
        if(washingMachineIoTFClient.onwashingMachineDisconnected)
            washingMachineIoTFClient.onwashingMachineDisconnected(id, payloadObj);
        break;
    }
    
};    

washingMachineIoTFClient.disconnectBroker = function(){
    if(this.iotClient) {
        this.iotClient.disconnectBroker();
        this.iotClient = null;
    }
};

washingMachineIoTFClient.getIOTFClient = function(){
    return this.iotClient;
};
