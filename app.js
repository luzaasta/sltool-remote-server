var fs = require('fs');
var deferred = require('deferred');
var express = require('express');
var app = express();
var bodyParser = require('body-parser');

require('./server/utils/utils.js');

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
		});
});

/** FUNC */

function runSingleInEnv(configType, config) {
	var def = deferred();
	var result = {};

	CONFIG_TYPES[configType].CONNECTOR_FUNC(config, result).then(
		function() {
			config.last_run_date = +new Date();
			config.last_run_state = !!result.failed;
			config.last_run_message = result.message;
			def.resolve();
		},
		function() {
			def.resolve("CONNECTOR FAILED");
		});

	return def.promise;
}

/** LISTEN */

app.listen(3000, function() {
	console.log('App listening on port 3000!');
});