var fs = require('fs');

var ServerDTO = function(env, configs, view) {
	this.environment = env;
	this.configs = configs;
};

var ServerListDTO = function(envs /** [ServerDTO, ...] */) {
	this.envs = envs;
	this.toJSON = function() {
		return this.envs;
	};
};

module.exports = {
	ServerDTO: ServerDTO,
	ServerListDTO: ServerListDTO
};