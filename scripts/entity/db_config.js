var Config = require('./config');

var Db_config = function(obj) {
	Config.call(this, obj);

	this.db_type = obj && obj.db_type ? obj.db_type : null;
	this.db = obj && obj.db ? obj.db : null;
	this.user = obj && obj.user ? obj.user : null;
	this.pass = obj && obj.pass ? obj.pass : null;
	this.host = obj && obj.host ? obj.host : null;
	this.port = obj && obj.port ? obj.port : null;
	this.schema = obj && obj.schema ? obj.schema : null;
	this.table = obj && obj.table ? obj.table : null;
};

Db_config.prototype = Object.create(Config.prototype);
Db_config.prototype.constructor = Db_config;
Db_config.prototype.clone = function() {
	return new Db_config(this);
};

Db_config.TABLE_NAME = "DB_CONFIG";

module.exports = Db_config;