console.log("-- loading RepositoryFactory --");
var LocalFileConnector = require('../services/localFileConnector');
var LocalFileRepository = require('../services/localFileRepository');

var instances = {};
var repoInstances = {};

function RepositoryFactory(config) {
	console.log("constructing RepositoryFactory!");
	this.type = config.type;
	this.conn = null;

	if (this.type == 'local-file') {
		this.conn = LocalFileConnector.getInstance(config.filePath);
	}
}

RepositoryFactory.prototype.getRepoInstance = function(repoConstructor) {
	var id = repoConstructor.name;

	if (repoInstances[id] === undefined) {
		var repo = LocalFileRepository.getInstance(this.conn, repoConstructor.entityConstructor);

		for (var f in repo.constructor.prototype) {
			repoConstructor.prototype[f] = repo.constructor.prototype[f].bind(repo);
		}

		repoInstances[id] = new repoConstructor();
	}

	return repoInstances[id];
};

RepositoryFactory.getInstance = function(config) {
	var id = `${config.type}_${config.filePath}`;
	if (instances[id] === undefined) {
		instances[id] = new RepositoryFactory(config);
	}

	return instances[id];
};

module.exports = {
	getInstance: RepositoryFactory.getInstance
};