var fs = require('fs');

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

	this.deserializeState(contents);
};

Model.prototype.save = function() {
	fs.writeFileSync(this.configFilePath, this.serializeState(), 'utf8', function(err) {
		if (err) {
			return console.log(err);
		}

		console.log("The file was saved!");
	});
};

Model.prototype.serializeState = function() {
	return JSON.stringify(this.envConfigs);
};

Model.prototype.deserializeState = function(contents) {
	var db = JSON.parse(contents);

	var envs = db.environments {

	}

	var config

	for (var i = 0; i < configs.length; i++) {
		this.envConfigs.push(new EnvConfig(configs[i]));
	}
};

module.exports = {
	Model: Model,
	EnvConfig: EnvConfig,
	Config: Config
};