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

var express = require('express');
var simulatorRouter = express.Router();

simulatorRouter.get('/startSimulator', function(req, res) {
	simulationClient.startSimulation();
	res.json("Simulation client is starting.");
});

simulatorRouter.get('/stopSimulator', function(req, res) {
	simulationClient.terminateSimulation();
	res.json("Simulation client is shutting down.");
});

simulatorRouter.get('/restartSimulator', function(req, res) {
	simulationClient.restartSimulation();
	res.json("Simulation client is restarting.");
});

simulatorRouter.get('/simulatorStatus', function(req, res) {
	simulationClient.getStatus().then(function (status){
		res.json(status);
	});
});

module.exports = simulatorRouter;