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
var router = express.Router();
var appEnv = require("cfenv").getAppEnv();
var request = require('request');

/* GET home page. */
router.get('/', function(req, res) {

	var platformDashboard = 'https://new-console.ng.bluemix.net/apps/' + appEnv['app'].application_id + '?paneId=connected-objects';
	var mobileDownload = req.__('main_page.download_app_p2.text');
	var mobileDownloadLink = req.__('main_page.download_app_p2.link_on');
	var mobileInstructions = req.__('main_page.instructions.text');
	var mobileInstructionsLink = req.__('main_page.instructions.link_on');

	mobileDownload = mobileDownload.replace(mobileDownloadLink, '<a href="https://itunes.apple.com/us/app/ibm-iot-for-electronics/id1103404928" target="_blank">' + mobileDownloadLink + '</a>');
	mobileInstructions = mobileInstructions.replace(mobileInstructionsLink, '<a href="https://new-console.ng.bluemix.net/docs/starters/IotElectronics/iotelectronics_overview.html#iotforelectronics_getmobileapp" target="_blank">' + mobileInstructionsLink + '</a>');

	res.render('index', {
		platformDashboard: platformDashboard,
		mobileDownload: mobileDownload,
		mobileInstructions: mobileInstructions
	});
});

router.get('/contact', function(req, res) {
  res.render('contactForm');
});

router.post('/contact', function(req, res){
	request({
   		url: 'https://simulationengine-uss-iot4e.electronics.internetofthings.ibmcloud.com/contact',
		json: req.body,
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
  		},
	}, function(error, response, body){
		if(error){
    		res.status(500).send();
		} else {
    		res.status(200).send();
	}});
});

router.get('/appEnv', function(req, res) {
  res.json(appEnv);
});
module.exports = router;
