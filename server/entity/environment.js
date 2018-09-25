var Entity = require('./entity');
var Linked = require('./linked');

var Environment = function(obj) {
	Entity.call(this, obj);
	Linked.call(this, obj);

	this.name = obj && obj.name ? obj.name : null;
	this.os = obj && obj.os ? obj.os : null;
};

Environment.TABLE_NAME = "ENVIRONMENT";

Environment.prototype = Object.create(Entity.prototype);
Environment.prototype.constructor = Environment;
Environment.prototype.clone = function() {
	return new Environment(this);
};

module.exports = Environment;