var Db_config = require('../entity/db_config');

var DbConfigRepository = function() {
	console.log("constructing DbConfigRepository!");
};

DbConfigRepository.entityConstructor = Db_config;

module.exports = DbConfigRepository;