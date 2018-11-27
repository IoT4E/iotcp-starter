
(function() {

	utils = exports;

	utils.doTopicsMatch = function(topic1, topic2) {
		if(topic1 == null || topic2 == null) {
			return false;
		}

		if(topic1 == topic2) {
			return true;
		}

		var topic1Tokens = topic1.split('/');
		var topic2Tokens = topic2.split('/');
		if(topic1Tokens.length != topic2Tokens.length || topic1Tokens.length == 0) {
			return false;
		}

		var tokenMatch = true;
		for(var i = 0 ; i < topic1Tokens.length ; i++) {
			var token1 = topic1Tokens[i];
			var token2 = topic2Tokens[i];
			if(token1 != token2 && token1 != '+' && token2 != '+') {
				tokenMatch = false;
				break;
			}
		}
		return tokenMatch;
	}

	utils.getClientIdFromTopics = function(topic1, topic2) {
		if(topic1 == null || topic2 == null) {
			return null;
		}

		var topic1Tokens = topic1.split('/');
		var topic2Tokens = topic2.split('/');
		if(topic1Tokens.length != topic2Tokens.length || topic1Tokens.length == 0) {
			return false;
		}

		var clientId = null;
		for(var i = 0 ; i < topic1Tokens.length ; i++) {
			var token1 = topic1Tokens[i];
			var token2 = topic2Tokens[i];
			if(token1 == '+') {
				clientId = token2;
				break;
			}
			else if(token2 == '+') {
				clientId = token1;
				break;
			}
		}
		return clientId;
	}
}).call(this);
