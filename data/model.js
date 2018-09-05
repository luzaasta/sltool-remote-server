var fs = require('fs');

var Config = function(config, name) {
	if (!config) {
		this.name = name;
		return;
	}

	this.name = config.name;
};

var DbConfig = function(config, name) {
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
	this.lastRun = config.lastRun;
};

DbConfig.prototype = Object.create(Config.prototype);
DbConfig.prototype.constructor = DbConfig;
DbConfig.prototype.clone = function() {
	return new DbConfig(this);
};

var SshConfig = function(config, name) {
	Config.call(this, config, name);

	if (!config) {
		this.connectionConf = new SshConnectionConf();
		return;
	}
	this.connectionConf = new SshConnectionConf(config.connectionConf);
	this.pathTest = config.pathTest;
	this.lastRun = config.lastRun;
};

SshConfig.prototype = Object.create(Config.prototype);
SshConfig.prototype.constructor = SshConfig;
SshConfig.prototype.clone = function() {
	return new SshConfig(this);
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
	var exists = true;
	try {
		exists = fs.existsSync(this.configFilePath);
	} catch (e) {
		throw new Error("Problem veryfing the config location!\n" + e);
	}

	if (!exists) {
		this.save();
		return;
	}

	var contents = "";
	try {
		contents = fs.readFileSync(this.configFilePath, 'utf8');
	} catch (e) {
		throw new Error("Problem reading the config file");
	}

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
	EnvConfig: EnvConfig,
	Config: Config
};