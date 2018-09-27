var fs = require('fs');

var ServerDTO = function(env, configs, view) {
	this.environment = env;
	this.configs = configs;
};

module.exports = {
	ServerDTO: ServerDTO
};