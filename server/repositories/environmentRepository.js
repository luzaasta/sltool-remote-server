var Environment = require('../entity/environment');

var EnvironmentRepository = function() {
	console.log("constructing EnvironmentRepository!");
};

EnvironmentRepository.entityConstructor = Environment;

module.exports = EnvironmentRepository;