var Config = require('./config');

var Ssh_config = function(obj) {
	Config.call(this, obj);

	this.path_test = obj && obj.path_test ? obj.path_test : null;
	this.host = obj && obj.host ? obj.host : null;
	this.username = obj && obj.username ? obj.username : null;
	this.password = obj && obj.password ? obj.password : null;
	this.port = obj && obj.port ? obj.port : null;
};

Ssh_config.TABLE_NAME = "SSH_CONFIG";

Ssh_config.prototype = Object.create(Config.prototype);
Ssh_config.prototype.constructor = Ssh_config;
Ssh_config.prototype.clone = function() {
	return new Ssh_config(this);
};

module.exports = Ssh_config;