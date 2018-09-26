var Entity = require('./entity');
var Linked = require('./linked');

var Config = function(obj) {
	Entity.call(this, obj);
	Linked.call(this, obj);

	this.env_id = obj && obj.env_id ? obj.env_id : null;
	this.name = obj && obj.name ? obj.name : null;
	this.last_run_date = obj && obj.last_run_date ? obj.last_run_date : null;
	this.last_run_state = obj && obj.last_run_state !== undefined ? obj.last_run_state : null;
	this.last_run_message = obj && obj.last_run_message ? obj.last_run_message : null;
};

Config.prototype = Object.create(Entity.prototype);
Config.prototype.constructor = Config;

Config.prototype.NO_CLIENT_UPDATE_FIELDS = ['last_run_date', 'last_run_state', 'last_run_message'];

module.exports = Config;