var fs = require('fs');

var DbConfig = function(config) {
	this.name = config.name;
	this.db_type = config.db_type;
	this.db = config.db;
	this.user = config.user;
	this.pass = config.pass;
	this.host = config.host;
	this.port = config.port;
	this.schema = config.schema;
	this.table = config.table;
};

DbConfig.prototype.clone = function() {
	return new DbConfig(this);
};

var SshConfig = function(config) {
	this.name = config.name;
	this.connectionConf = new SshConnectionConf(config.connectionConf);
	this.pathTest = config.pathTest;
};

SshConfig.prototype.clone = function() {
	return new SshConfig(this);
};

var SshConnectionConf = function(config) {
	this.host = config.host;
	this.username = config.username;
	this.password = config.password;
	this.port = config.port;
};

SshConnectionConf.prototype.SshConnectionConf = function() {
	return new SshConnectionConf(this);
};

var EnvConfig = function(config) {
	this.envName = config.envName;

	for (var type in EnvConfig.CONFIG_TYPE_TO_CONSTRUCTOR) {
		this[type] = [];
	}

	for (type in EnvConfig.CONFIG_TYPE_TO_CONSTRUCTOR) {
		if (!config[type]) {
			return;
		}
	}

	for (type in EnvConfig.CONFIG_TYPE_TO_CONSTRUCTOR) {
		for (var i = 0; i < config[type].length; i++) {
			this[type].push(new EnvConfig.CONFIG_TYPE_TO_CONSTRUCTOR[type](config[type][i]));
		}
	}
};

/**
 * Register new config types here!
 */
EnvConfig.CONFIG_TYPE_TO_CONSTRUCTOR = {
	"DB": DbConfig,
	"SSH": SshConfig
};

var Model = function(configFilePath) {
	this.configFilePath = configFilePath;
	this.envConfigs = [];
};

Model.prototype.load = function() {
	var contents = fs.readFileSync(this.configFilePath, 'utf8');
	var configs = JSON.parse(contents);
	for (var i = 0; i < configs.length; i++) {
		this.envConfigs.push(new EnvConfig(configs[i]));
	}
};
Model.prototype.save = function() {
	fs.writeFileSync(this.configFilePath, JSON.stringify(this.envConfigs), 'utf8', function(err) {
		if (err) {
			return console.log(err);
		}

		console.log("The file was saved!");
	});
};

module.exports = {
	Model: Model,
	EnvConfig: EnvConfig
};