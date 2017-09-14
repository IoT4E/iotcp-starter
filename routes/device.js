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

var device = require('../lib/device.js');
var express = require('express');
var deviceRouter = express.Router();

/* *********** *********** ***********
 * *********** PARAM CHECK ***********
 * *********** *********** ***********/

deviceRouter.param('deviceID', function(req, res, next, id){
	simulationClient.getAllDevicesStatus().then(function(data){
		var found = false;
		Object.keys(data).forEach(function(key, index){
			if(key == id){
				found = true;
			}
		});
		if(found){
			next();
		} else {
			next(new Error('Invalid device ID.'));
		}
	});
});

/* ************ ************ ************
 * ************ GET REQUESTS ************
 * ************ ************ ************/

/**
 * Get the QR Code image for connecting into the Platform
 */
deviceRouter.get('/qr/getPlatformCredentials', device.QRcreds);

/**
 * Get the QR Code string for connecting into the Platform
 */
deviceRouter.get('/api/getPlatformCredentials', device.getPlatformQRstring);

/**
 * Get the QR Code image for the given device
 */
deviceRouter.get('/qr/:deviceID', device.getQrCode);

/**
 * Get status from all the devices
 */
deviceRouter.get('/washingMachine/getStatus', device.getAllDevicesStatus);

/**
 * Get the status for a specific device and render the UI, displaying the information
 */
deviceRouter.get('/washingMachine/:deviceID', device.renderUI);

/**
 * Get the status for a specific device and return the information in JSON format
 */
deviceRouter.get('/washingMachine/:deviceID/getStatus', device.getStatus);

/**
 * Get the value for a specific attribute from the given device
 */
deviceRouter.get('/washingMachine/:deviceID/getAttribute/:attributeName', device.getAttribute);

/**
 * Get all the attributes from the given device
 */
deviceRouter.get('/washingMachine/:deviceID/getAttributes', device.getAttributes);

/* ************ ************ ************
 * ************ PUT REQUESTS ************
 * ************ ************ ************/

 /**
 * Start the washing cycle for the given device
 */
deviceRouter.put('/washingMachine/:deviceID/startWashing', device.startWashing);

/**
 * Stop the washing cycle for the given device
 */
deviceRouter.put('/washingMachine/:deviceID/stopWashing', device.stopWashing);

/**
* Start the washing cycle with audio for the given device
*/
deviceRouter.put('/washingMachine/:deviceID/startWashingWithAudio', device.startWashingWithAudio);

/**
 * Change the value of a specific attribute for a specific device
 * @Param: attribute - the name of the attribute to change (program, doorOpen, currentCycle, etc)
 * @Param: value - the value to be set
 */
deviceRouter.put('/washingMachine/:deviceID/setAttribute/:attributeName', device.setAttribute);

/**
 * Change the value of multiple attributes for a specific device
 * @Param: attribute - the name of the attribute to change (program, doorOpen, currentCycle, etc)
 * @Param: value - the value to be set
 */
deviceRouter.put('/washingMachine/:deviceID/setAttributes', device.setAttributes);

/**
 * Reset the simulation client
 */
deviceRouter.put('/washingMachine/reset', device.reset);

/* ************* ************* *************
 * ************* POST REQUESTS *************
 * ************* ************* *************/

/**
 * Create specified number of devices and return its IDs
 * @Param :numberOfDevices - The number of devices to be created
 */
deviceRouter.post('/washingMachine/createDevices/:numberOfDevices', device.create);

deviceRouter.delete('/washingMachine/:deviceID', device.del);

module.exports = deviceRouter;
