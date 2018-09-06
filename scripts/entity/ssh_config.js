var Config = require('./config');

var Ssh_config = function(config, name) {
	Config.call(this, config, name);

	if (!config) {
		this.connectionConf = new SshConnectionConf();
		return;
	}
	this.connectionConf = new SshConnectionConf(config.connectionConf);
	this.pathTest = config.pathTest;
};

Ssh_config.prototype = Object.create(Config.prototype);
Ssh_config.prototype.constructor = Ssh_config;
Ssh_config.prototype.clone = function() {
	return new Ssh_config(this);
};

var SshConnectionConf = function(config) {
	if (!config) {
		return;
	}
	this.host = config.host;
	this.username = config.username;
	this.password = config.password;
	this.port = config.port;
};

SshConnectionConf.prototype.SshConnectionConf = function() {
	return new SshConnectionConf(this);
};

module.exports = Ssh_config;