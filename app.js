var fs = require('fs');
var deferred = require('deferred');
var express = require('express');
var app = express();
var bodyParser = require('body-parser');

require('./server/utils/utils.js');
var ping = require('./server/service_connectors/ping');

var LocalFileConnector = require('./server/services/localFileConnector');
var RepositoryFactory = require('./server/services/repositoryFactory');

var EnvironmentRepository = require('./server/repositories/environmentRepository');
var DbConfigRepository = require('./server/repositories/dbConfigRepository');
var SshConfigRepository = require('./server/repositories/sshConfigRepository');

var Environment = require('./server/entity/environment');
var Db_config = require('./server/entity/db_config');
var Ssh_config = require('./server/entity/ssh_config');

var entities = require('./server/entity/entities');
var dtos = require('./server/dto/dto');
var ServerDTO = dtos.ServerDTO;
var ServerListDTO = dtos.ServerListDTO;

var CONFIG_TYPES = {
	DB: {
		ENTITY_CONSTRUCTOR: Db_config,
		REPO_CONSTRUCTOR: DbConfigRepository,
		CONNECTOR_FUNC: require('./server/service_connectors/db')
	},
	SSH: {
		ENTITY_CONSTRUCTOR: Ssh_config,
		REPO_CONSTRUCTOR: SshConfigRepository,
		CONNECTOR_FUNC: require('./server/service_connectors/ssh')
	}
};

function verifyLocalFileDb(verifyDbTables, localFilePath) {
	console.log("Local file DB verification started");
	var conn = LocalFileConnector.getInstance(localFilePath);
	var db = {};
	try {
		db = conn.load();
	} catch (e) {
		console.log(e.message);
		console.log("Creating local file DB");
		conn.create();
		conn.save(db);
	}

	if (verifyDbTables) {
		console.log("Table verification started");
		var changed = false;
		for (constructor of entities) {
			if (!Array.isArray(db[constructor.TABLE_NAME])) {
				console.log("Creating table: " + constructor.TABLE_NAME);
				db[constructor.TABLE_NAME] = [];
				changed = true;
			}
		}

		if (changed) {
			conn.save(db);
		}
		console.log("Table verification ended");
	}

	console.log("Local file DB verification ended");
}

var storeTypeArg = null;
var verifyDbTablesArg = null;

function parseArgs() {
	if (process.argv[2] === "--help") {
		console.log("Arguments: [ [argName] [value]]...");
		console.log("  -storeType\t\t\tDB type. Now only 'local-file', default is 'local-file'");
		console.log("  -createTables\t\t\ttrue or false, default is true");
		process.exit(0);
	}

	var storeTypeArgI = process.argv.indexOf("-storeType");
	if (storeTypeArgI > -1) {
		storeTypeArg = process.argv[storeTypeArgI + 1];
	} else {
		storeTypeArg = "local-file";
	}

	var verifyDbTablesArgI = process.argv.indexOf("-createTables");
	if (verifyDbTablesArgI > -1) {
		verifyDbTablesArg = process.argv[verifyDbTablesArgI + 1];
	} else {
		verifyDbTablesArg = "true";
	}
}

parseArgs();

var repoFactory;
if (storeTypeArg == "local-file") { // TODO: make some store type enum
	var localFilePath = '.\\data\\data.json';
	verifyLocalFileDb(verifyDbTablesArg, localFilePath);
	repoFactory = RepositoryFactory.getInstance({
		type: storeTypeArg,
		filePath: localFilePath
	});
} else if (storeTypeArg == 'mongo') { // mongo db selected (maybe in future)
} else {
	console.log("Unsupported store type: only 'local-file' store type is now supported!");
	process.exit(1);
}


var envRepo = repoFactory.getRepoInstance(EnvironmentRepository);

// static serving
// app.use(express.static(__dirname + '\\client\\public\\view'));
app.use('/scripts', express.static('./client/public/scripts/'));
app.use('/scripts', express.static('./server/utils'));
app.use('/styles', express.static('./client/public/styles/'));
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
		root: __dirname + '\\client\\public\\view'
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

var API_BASE = "/api/";
var API_VERSION = "v1";
var API_PREFIX = API_BASE + API_VERSION;

// TODO?
app.get(API_PREFIX + '/ping/:id', function(req, res) {});

/** GET ALL DATA */

app.get(API_PREFIX + '/data', function(req, res) {
	var list = [];
	var configs = {};

	var envs = envRepo.getAll();

	// get related configs to environment
	for (var env of envs) {
		configs = {};
		for (var type in CONFIG_TYPES) {
			configs[type] = repoFactory.getRepoInstance(CONFIG_TYPES[type].REPO_CONSTRUCTOR).getAllByKeyAndValue('env_id', env.id);
		}

		list.push(new ServerDTO(env, configs));
	}

	res.json(list);
});

/** ENVIRONMENT */

// create +
app.post(API_PREFIX + '/env', function(req, res) {
	//TODO: validate env

	// check if env does not already exists
	var env = new Environment(req.body);
	if (env.id && envRepo.exists(env.id)) {
		res.status(400).send();
	}

	envRepo.save(env, false, true);

	// create relations for DTO
	var configs = {};
	for (var cfg in CONFIG_TYPES) {
		configs[cfg] = [];
	}
	// if this fails, then rollback the whole shit! :D
	var dto = new ServerDTO(env, configs);

	res.status(201).json(dto);
});

// update +
app.patch(API_PREFIX + '/env/:id', function(req, res) {
	var id = req.params.id;
	var data = req.body;
	data.id = id;
	// we won't create new object of env type as the update is going through all props, even with null value
	// TODO: validate

	if (!envRepo.exists(id)) {
		res.status(400).send();
		return;
	}

	envRepo.save(data, true, true);

	res.status(204).send();
});

// delete +
app.delete(API_PREFIX + '/env/:id', function(req, res) {
	var id = req.params.id;
	if (!id) {
		res.status(404).send();
		return;
	}

	// cascade delete
	for (var type in CONFIG_TYPES) {
		repoFactory.getRepoInstance(CONFIG_TYPES[type].REPO_CONSTRUCTOR).deleteAllByKeyAndValue('env_id', id);
	}

	envRepo.delete(id);

	res.status(204).send();
});

/** CONFIGS */

// create +
app.post(API_PREFIX + '/config/:type', function(req, res) {
	var type = req.params.type;
	var envId = req.query.env_id;
	var data = req.body;
	if (!type || !envId || !envRepo.exists(envId)) {
		res.status(400).send();
		return;
	}

	var repo = repoFactory.getRepoInstance(CONFIG_TYPES[type].REPO_CONSTRUCTOR);

	var config = new CONFIG_TYPES[type].ENTITY_CONSTRUCTOR(data);
	if (data.name == undefined) {
		config.name = "NEW CONFIG";
	}

	config.env_id = Number.parseInt(envId);
	repo.save(config, false, true);

	res.status(201).json(config);
});

// update +
app.patch(API_PREFIX + '/config/:type/:id', function(req, res) {
	var type = req.params.type;
	var id = req.params.id;
	var config = req.body;
	config.id = id;
	// we won't create new object of config type as the update is going through all props, even with null value
	// TODO: validate

	var repo = repoFactory.getRepoInstance(CONFIG_TYPES[type].REPO_CONSTRUCTOR);
	if (!type || !id || !repo.exists(id)) {
		res.status(400).send();
		return;
	}

	repo.save(config, true, true);

	res.status(204).send();
});

// delete +
app.delete(API_PREFIX + '/config/:type/:id', function(req, res) {
	var type = req.params.type;
	var id = req.params.id;
	var repo = repoFactory.getRepoInstance(CONFIG_TYPES[type].REPO_CONSTRUCTOR);
	if (!type || !id || !repo.exists(id)) {
		res.status(400).send();
	}

	repo.delete(id);

	res.status(204).send();
});


/** RUNS */

app.get(API_PREFIX + '/refresh/:type/:id', function(req, res) {
	var type = req.params.type;
	var id = req.params.id;

	var repo = repoFactory.getRepoInstance(CONFIG_TYPES[type].REPO_CONSTRUCTOR);
	if (!type || !id || !repo.exists(id)) {
		res.status(400).send();
		return;
	}

	var conf = repo.get(id);

	runSingleInEnv(type, conf).then(
		function() {
			repo.save(conf, true);
			res.json(conf);
		},
		function(res) {
			console.log("RUN SINGLE FAILED: " + res);
		}
	);
});

/** FUNC */

function runSingleInEnv(configType, config) {
	var def = deferred();
	var result = {};

	ping(config.host)
		.then(
			function(res) {
				return CONFIG_TYPES[configType].CONNECTOR_FUNC(config);
			},
			function(err) {
				var msg = `-- RUN SINGLE: PING FAILED\n`;
				return deferred.reject(msg + err);
			})
		.then(
			function(res) {
				console.log(res + `\n-- RUN SINGLE OK_OK: CONFIG '${config.name}' OF TYPE '${configType}'`);
				config.last_run_date = +new Date();
				config.last_run_state = false;
				config.last_run_message = res;
				def.resolve(config);
			},
			function(err) {
				console.error(err + `\n-- RUN SINGLE FAILED: CONFIG '${config.name}' OF TYPE '${configType}'`);
				config.last_run_date = +new Date();
				config.last_run_state = true;
				config.last_run_message = err;
				def.resolve(config);
			});

	return def.promise;
}

function runAll() {
	var def = deferred();

	var configs = null;
	var configType = null;

	var envs = envRepo.getAll();
	var configRunPromises = [];

	for (var env of envs) {
		for (configType in CONFIG_TYPES) {
			configs = repoFactory.getRepoInstance(CONFIG_TYPES[configType].REPO_CONSTRUCTOR).getAllByKeyAndValue('env_id', env.id);
			for (var config of configs) {
				configRunPromises.push(
					runSingleInEnv(configType, config).then(
						getResolveConfigTypeRunFunction(configType),
						function(err) {
							console.log("Problem resolving auto run for config!");
							def.reject(err);
						}
					)
				);
			}
		}
	}

	deferred.map(configRunPromises, function(promise) {
		return promise;
	}).then(
		function() {
			def.resolve();
		},
		function(err) {
			def.reject(err);
		}
	);

	return def.promise;
}

function getResolveConfigTypeRunFunction(configType) {
	return function(conf) {
		console.log(`Saving result of auto run for config '${conf.name}' of type '${configType}'`);
		repoFactory.getRepoInstance(CONFIG_TYPES[configType].REPO_CONSTRUCTOR).save(conf, true);
	};
}

/*function getResolveConfigTypeRunFunction(configType) {
	return function(array) {
		console.log("Resolving auto run for config type: " + configType);
		for (var conf of array) {
			repoFactory.getRepoInstance(CONFIG_TYPES[configType].REPO_CONSTRUCTOR).save(conf, true);
		}
	};
}*/

var schedule = null;

function scheduleAutoRun() {
	schedule = setInterval(function() {
		console.log("Scheduled auto run started");
		runAllScheduled();
		console.log("Scheduled auto run ended");
	}, 1000 * 60 * 60 * 24);
}

/** LISTEN */
function runAllScheduled(callback) {
	runAll().then(
		function() {
			if (callback) {
				callback();
			}
		},
		function(res) {
			console.error("SOMETHING BAD HAPPENED ON AUTORUN!")
			console.error(res);
		}
	);
}

function listen() {
	app.listen(3001, function() {
		console.log('App listening on port 3001!');
	});
}

scheduleAutoRun();
runAllScheduled(listen);