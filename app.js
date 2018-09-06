var fs = require('fs');
var deferred = require('deferred');
var express = require('express');
var app = express();
var bodyParser = require('body-parser');

var LocalFileConnector = require('./scripts/services/localFileConnector');
var RepositoryFactory = require('./scripts/services/repositoryFactory');
var EnvironmentRepository = require('./scripts/repositories/environmentRepository');
var entities = require('./scripts/entity/entities');
var Environment = require('./scripts/entity/environment');

/*var funcMap = {};
for (var type in EnvConfig.CONFIG_TYPE_TO_CONSTRUCTOR) {
	funcMap[type] = require(`./connector_scripts/${type.toLowerCase()}`);
}*/

var connectionType = process.argv[2];
var autoDbInit = process.argv[3] == 'true';
var localFilePath;

function initDb(autoDbInit) {
	var conn = LocalFileConnector.getInstance(localFilePath);
	var db = {};
	try {
		db = conn.load();
	} catch (e) {
		console.log("Creating DB!");
		conn.save(db);
	}

	if (autoDbInit) {
		for (className of entities) {
			if (!Array.isArray(db[className.toUpperCase()])) {
				db[className.toUpperCase()] = [];
			}
		}

		conn.save(db);
	}
}

if (connectionType = "local-file") {
	localFilePath = './data/data.json';
	initDb(autoDbInit);
}


var repoFactory = RepositoryFactory.getInstance({
	type: 'local-file',
	filePath: localFilePath
});

var envRepo = repoFactory.getRepoInstance(EnvironmentRepository);



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

/** INDEX */
app.get('/', function(req, res) {
	if (isError) {
		sendView('error.html', res);
	} else {
		sendView('home.html', res);
	}
});


app.get('/ping/:id', function(req, res) {

});

/** ENVIRONMENT */

// list
app.get('/env', function(req, res) {
	res.json(model.envConfigs);
});

//create
app.post('/env', function(req, res) {
	var envName = req.body.envName;

	var env = new models.EnvConfig({
		envName: envName
	});
	model.envConfigs.push(env);
	model.save();
	res.json({
		env: env,
		message: 'Env created!'
	});
});

// get one (not used)
app.get('/env/:id', function(req, res) {
	var id = req.params.id;
	var env = model.envConfigs[id];
	if (env === null) {
		res.status(404).json({
			message: 'Unknown env!'
		});
		return;
	}

	res.json(env);
});

// update
app.patch('/env/:id', function(req, res) {
	var id = req.params.id;

	var env = model.envConfigs[id];
	if (!env) {
		res.status(400).json({
			message: 'Env does not exist!'
		});
		return;
	}

	// only name is updated now
	env.envName = req.body.envName;

	model.save();
	res.json({
		env: env,
		message: "Env updated"
	});
});

// replace
app.put('/env/:id', function(req, res) {
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

app.delete('/env/:id', function(req, res) {
	var id = req.params.id;

	if (!model.envConfigs[id]) {
		res.status(404).json({
			message: 'Unknown env!'
		});
		return;
	}

	model.envConfigs.splice(id, 1);
	model.save();
	res.json({
		message: 'Env deleted!'
	});
});

/** CONFIGS */

//create
app.post('/config', function(req, res) {
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

app.delete('/config/:env/:cfg/:id', function(req, res) {
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
app.put('/config/:env/:cfg/:id', function(req, res) {
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

app.post('/func/reorderEnv', function(req, res) {
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

app.post('/func/duplicateConfig', function(req, res) {
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

app.get('/refresh', function(req, res) {
	var result = {};
	runAll(result).then(function() {
		res.json(result);
	});
});

app.get('/refresh/:env', function(req, res) {
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

app.get('/refresh/:env/:cfg', function(req, res) {
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

app.get('/refresh/:env/:cfg/:id', function(req, res) {
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