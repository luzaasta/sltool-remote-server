var Config = require('./config');

var Db_config = function(config, name) {
	Config.call(this, config, name);

	if (!config) {
		return;
	}
	this.db_type = config.db_type;
	this.db = config.db;
	this.user = config.user;
	this.pass = config.pass;
	this.host = config.host;
	this.port = config.port;
	this.schema = config.schema;
	this.table = config.table;
};

Db_config.prototype = Object.create(Config.prototype);
Db_config.prototype.constructor = Db_config;
Db_config.prototype.clone = function() {
	return new Db_config(this);
};

module.exports = Db_config;