var Entity = require('./entity');

var Config = function(obj) {
	Entity.call(this, obj);

	this.env_id = obj && obj.env_id ? obj.env_id : null;
	this.name = obj && obj.name ? obj.name : null;
	this.order = obj && obj.order ? obj.order : null;
	this.last_run_date = obj && obj.last_run_date ? obj.last_run_date : null;
	this.last_run_state = obj && obj.last_run_state ? obj.last_run_state : null;
};

Config.prototype = Object.create(Entity.prototype);
Config.prototype.constructor = Config;

module.exports = Config;