var Entity = require('./entity');

var Config = function(config, name) {
	Entity.call(this);

	if (!config) {
		this.name = name;
		return;
	}

	this.name = config.name;
	this.lastRun = config.lastRun;
};

Config.prototype = Object.create(Entity.prototype);
Config.prototype.constructor = Config;

module.exports = Config;