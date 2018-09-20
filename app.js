var fs = require('fs');
var deferred = require('deferred');
var express = require('express');
var app = express();
var bodyParser = require('body-parser');

require('./scripts/utils/utils.js');

var LocalFileConnector = require('./scripts/services/localFileConnector');
var RepositoryFactory = require('./scripts/services/repositoryFactory');

var EnvironmentRepository = require('./scripts/repositories/environmentRepository');
var DbConfigRepository = require('./scripts/repositories/dbConfigRepository');
var SshConfigRepository = require('./scripts/repositories/sshConfigRepository');

var Environment = require('./scripts/entity/environment');
var Db_config = require('./scripts/entity/db_config');
var Ssh_config = require('./scripts/entity/ssh_config');

var entities = require('./scripts/entity/entities');
var dtos = require('./scripts/dto/dto');
var ServerDTO = dtos.ServerDTO;
var ServerListDTO = dtos.ServerListDTO;

var CONFIG_TYPES = {
	DB: {
		ENTITY_CONSTRUCTOR: Db_config,
		REPO_CONSTRUCTOR: DbConfigRepository,
		CONNECTOR_FUNC: require('./scripts/service_connectors/db')
	},
	SSH: {
		ENTITY_CONSTRUCTOR: Ssh_config,
		REPO_CONSTRUCTOR: SshConfigRepository,
		CONNECTOR_FUNC: require('./scripts/service_connectors/ssh')
	}
};

function initDb(autoDbInit) {
	console.log("Preparing DB!");
	var conn = LocalFileConnector.getInstance(localFilePath);
	var db = {};
	try {
		db = conn.load();
	} catch (e) {
		console.log("Creating DB!");
		conn.save(db);
	}

	if (autoDbInit) {
		console.log("Automatic initialization of DB started!");
		for (constructor of entities) {
			if (!Array.isArray(db[constructor.TABLE_NAME])) {
				db[constructor.TABLE_NAME] = [];
			}
		}

		conn.save(db);
		console.log("Automatic initialization of DB ended!");
	}
}

var storeType = process.argv[2] || "local-file";
var autoDbInit = process.argv[3] || 'true';
var localFilePath;
var repoFactory;

if (storeType == "local-file") { // TODO: make some store type enum
	localFilePath = './data/data.json';
	initDb(autoDbInit);
	repoFactory = RepositoryFactory.getInstance({
		type: storeType,
		filePath: localFilePath
	});
} else if (storeType == 'mongo') { // mongo db selected
}


var envRepo = repoFactory.getRepoInstance(EnvironmentRepository);
//envRepo.save({name: "test"});
var dbRepo = repoFactory.getRepoInstance(DbConfigRepository);
//dbRepo.save({name: "db1", env_id: 1});
var sshRepo = repoFactory.getRepoInstance(SshConfigRepository);
//sshRepo.save({name: "ssh1", env_id: 1});

// static serving
// app.use(express.static(__dirname + '\\web\\public\\view'));
app.use('/scripts', express.static('./web/public/scripts/'));
app.use('/styles', express.static('./web/public/styles/'));
app.use('/angular', express.static('./node_modules/angular/'));
app.use('/bootstrap', express.static('./node_modules/bootstrap/dist/css'));
app.use('/bootstrap', express.static('./node_modules/bootstrap/dist/js'));
app.use('/fa', express.static('./node_modules/@fortawesome/fontawesome-free/css'));
app.use('/webfonts', express.static('./node_modules/@fortawesome/fontawesome-free/webfonts'));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
	extended: true
}));

var sendView = function(viewName, res) {
	res.sendFile(viewName, {
		root: __dirname + '\\web\\public\\view'
	});
};

var isError = false;

/** INDEX */
app.get('/', function(req, res) {
	if (isError) {
		sendView('error.html', res);
	} else {
		sendView('home.html', res);
	}
});

var API_BASE = /api/;
var API_VERSION = "v1";
var API_PREFIX = API_BASE + API_VERSION;

app.get(API_PREFIX + '/ping/:id', function(req, res) {

});

/** ALL DATA */

app.get(API_PREFIX + '/data', function(req, res) {
	var list = [];
	var configs = {};

	var envs = envRepo.getAll();

	for (var env of envs) {
		configs = {};
		for (var type in CONFIG_TYPES) {
			configs[type] = repoFactory.getRepoInstance(CONFIG_TYPES[type].REPO_CONSTRUCTOR).getAllByKeyAndValue('env_id', env.id);
		}

		list.push(new ServerDTO(env, configs));
	}

	res.json(new ServerListDTO(list));
});

/** ENVIRONMENT */

// list
app.get(API_PREFIX + '/env', function(req, res) {
	res.json(envRepo.getAll());
});

//create +
app.post(API_PREFIX + '/env', function(req, res) {
	//TODO: validate env
	var env = new Environment(req.body);
	env.order = envRepo.count() + 1;
	envRepo.save(env);
	var configs = {};
	for (var cfg in CONFIG_TYPES) {
		configs[cfg] = [];
	}
	res.json({
		data: new ServerDTO(env, configs),
		message: 'Env created!'
	});
});

// get one +
app.get(API_PREFIX + '/env/:id', function(req, res) {
	var id = req.params.id;
	var env = envRepo.get(id);
	if (env === null) {
		res.status(404).json(null);
		return;
	}

	res.json(env);
});

// update
app.patch(API_PREFIX + '/env/:id', function(req, res) {
	var id = req.params.id;

	// TODO: validate

	if (!envRepo.exists(id)) {
		res.status(400).json(null);
		return;
	}

	var env = envRepo.save(env);

	res.json(env);
});

// replace
app.put(API_PREFIX + '/env/:id', function(req, res) {
	//validate req body

	var msg = "";
	var id = req.params.id;
	var env = new models.EnvConfig(req.body);

	if (!model.envConfigs[id]) {
		model.envConfigs.push(env);
		msg = "New env created";
	} else {
		model.envConfigs[id] = env;
		msg = "Env replaced";
	}

	model.save();
	res.json({
		newConfig: env,
		message: msg
	});
});

// delete +
app.delete(API_PREFIX + '/env/:id', function(req, res) {
	var id = req.params.id;
	var env = envRepo.get(id);

	if (!env) {
		res.status(404).json(null);
		return;
	}

	for (var type in CONFIG_TYPES) {
		repoFactory.getRepoInstance(CONFIG_TYPES[type].REPO_CONSTRUCTOR).deleteAllByKeyAndValue('env_id', env.id);
	}
	envRepo.delete(id);
	res.json(id);
});

/** CONFIGS */

//create
app.post(API_PREFIX + '/config', function(req, res) {
	var envName = req.body.envName;
	var configType = req.body.configType;
	var configName = req.body.configName;
	var env = model.envConfigs.getByKeyAndValue('envName', envName);
	if (env === null) {
		res.status(400).json({
			message: 'Env does not exist!'
		});
		return;
	}

	var config = new EnvConfig.CONFIG_TYPE_TO_CONSTRUCTOR[configType](null, configName);
	env[configType].push(config);
	model.save();
	res.json({
		config: config,
		message: 'Config created!'
	});
});

app.delete(API_PREFIX + '/config/:env/:cfg/:id', function(req, res) {
	var envName = req.params.env;
	var configType = req.params.cfg;
	var index = req.params.id;
	var env = model.envConfigs.getByKeyAndValue('envName', envName);
	if (env === null) {
		res.status(404).json({
			message: 'Unknown env!'
		});
		return;
	}

	env[configType].splice(index, 1);
	model.save();
	res.json({
		index: index,
		message: 'Config removed!'
	});
});

// replace
app.put(API_PREFIX + '/config/:env/:cfg/:id', function(req, res) {
	var envName = req.params.env;
	var configType = req.params.cfg;
	var index = req.params.id;
	var env = model.envConfigs.getByKeyAndValue('envName', envName);
	if (env === null) {
		res.status(404).json({
			message: 'Unknown env!'
		});
		return;
	}

	var data = req.body;

	for (var prop in data) {
		env[configType][index][prop] = data[prop];
	}

	model.save();
	res.json({
		config: env[configType][index],
		message: 'Config created!'
	});
});

/** FUNCTIONS */

app.post(API_PREFIX + '/func/reorderEnv', function(req, res) {
	var id = req.body.id;
	var newIndex = req.body.newIndex;
	if (!model.envConfigs[id]) {
		res.status(404).json({
			message: 'Unknown env!'
		});
		return;
	}

	var it = model.envConfigs.splice(id, 1)[0];
	model.envConfigs.splice(newIndex, 0, it);
	model.save();
	res.json({
		message: 'Env reordered!'
	});
});

app.post(API_PREFIX + '/func/duplicateConfig', function(req, res) {
	var envName = req.body.envName;
	var configType = req.body.configType;
	var index = req.body.index;

	var env = model.envConfigs.getByKeyAndValue('envName', envName);
	var newConfig = env[configType][index].clone();
	env[configType].push(newConfig);
	model.save();

	res.json(newConfig);
});

/** RUNS */

app.get(API_PREFIX + '/refresh', function(req, res) {
	var result = {};
	runAll(result).then(function() {
		res.json(result);
	});
});

app.get(API_PREFIX + '/refresh/:env', function(req, res) {
	var envName = req.params.env;
	var env = model.envConfigs.getByKeyAndValue('envName', envName);
	if (env === null) {
		res.status(404).json({
			message: 'Unknown env!'
		});
		return;
	}

	var result = {};
	runAllInEnv(env, result).then(function() {
		res.json(result);
	});
});

app.get(API_PREFIX + '/refresh/:env/:cfg', function(req, res) {
	var envName = req.params.env;
	var configType = req.params.cfg;
	var env = model.envConfigs.getByKeyAndValue('envName', envName);
	if (env === null) {
		res.status(404).json({
			message: 'Unknown env!'
		});
		return;
	}

	var result = {};
	runAllOfTypeInEnv(model.envConfigs.getByKeyAndValue('envName', envName), configType, result).then(function() {
		res.json(result);
	});
});

app.get(API_PREFIX + '/refresh/:env/:cfg/:id', function(req, res) {
	var envName = req.params.env;
	var configType = req.params.cfg;
	var index = req.params.id;
	var env = model.envConfigs.getByKeyAndValue('envName', envName);
	if (env === null) {
		res.status(404).json({
			message: 'Unknown env!'
		});
		return;
	}

	var result = {};
	runSingleInEnv(env, configType, index, result).then(function() {
		res.json(result);
	});
});

/** LISTEN */

app.listen(3000, function() {
	console.log('Example app listening on port 3000!');
});

/** FUNC */

function runSingleInEnv(envConfig, configType, index, result) {
	var def = deferred();

	/*if (!envConfig[configType] || !envConfig[configType][i]) {
		def.reject();
		return def.promise;
	}*/

	result[envConfig.envName] = result[envConfig.envName] ? result[envConfig.envName] : {};
	result[envConfig.envName][configType] = result[envConfig.envName][configType] ? result[envConfig.envName][configType] : {};
	result[envConfig.envName][configType][index] = {};
	result[envConfig.envName][configType][index].failed = false;
	result[envConfig.envName][configType][index].message = "";

	funcMap[configType](envConfig[configType][index], result[envConfig.envName][configType][index]).then(function() {
		var date = +new Date();
		result[envConfig.envName][configType][index].lastRun = date;
		envConfig[configType][index].lastRun = date;
		def.resolve();
	});

	return def.promise;
}

function runAllOfTypeInEnv(envConfig, configType, result) {
	var def = deferred();

	result[envConfig.envName] = result[envConfig.envName] ? result[envConfig.envName] : {};
	result[envConfig.envName][configType] = {};

	deferred.map(envConfig[configType], function(config, i) {
		return runSingleInEnv(envConfig, configType, i, result);
	})(function(result) {
		def.resolve();
	});

	return def.promise;
}

function runAllInEnv(envConfig, result) {
	var def = deferred();

	result[envConfig.envName] = {};

	deferred.map(Object.keys(EnvConfig.CONFIG_TYPE_TO_CONSTRUCTOR), function(configType) {
		return runAllOfTypeInEnv(envConfig, configType, result);
	})(function(result) {
		def.resolve();
	});

	return def.promise;
}

function runAll(result) {
	var def = deferred();

	console.log(model.envConfigs);

	deferred.map(model.envConfigs, function(envConfig) {
		return runAllInEnv(envConfig, result);
	})(function(result) {
		def.resolve();
	});

	return def.promise;
}