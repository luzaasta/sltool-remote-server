var Config = require('./config');

var Ssh_config = function(obj) {
	Config.call(this, obj);

	this.connection_conf = obj && obj.connection_conf ? new SshConnectionConf(obj.connection_conf) : null;
	this.path_test = obj && obj.path_test ? obj.path_test : null;
};

Ssh_config.TABLE_NAME = "SSH_CONFIG";

Ssh_config.prototype = Object.create(Config.prototype);
Ssh_config.prototype.constructor = Ssh_config;
Ssh_config.prototype.clone = function() {
	return new Ssh_config(this);
};

var SshConnectionConf = function(obj) {
	this.host = obj && obj.host ? obj.host : null;
	this.username = obj && obj.username ? obj.username : null;
	this.password = obj && obj.password ? obj.password : null;
	this.port = obj && obj.port ? obj.port : null;
};

SshConnectionConf.prototype.SshConnectionConf = function() {
	return new SshConnectionConf(this);
};

module.exports = Ssh_config;