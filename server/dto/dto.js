var fs = require('fs');

var ServerDTO = function(env, configs, view) {
	this.environment = env;
	this.configs = configs;
	/*this.toJSON = function() {
		return this.environment;
	};*/
};

module.exports = {
	ServerDTO: ServerDTO
};