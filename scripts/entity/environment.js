var Entity = require('./entity');

var Environment = function(obj) {
	Entity.call(this, obj);

	this.name = obj && obj.name ? obj.name : null;
	this.order = obj && obj.order ? obj.order : null;
	this.os = obj && obj.os ? obj.os : null;
};

Environment.TABLE_NAME = "ENVIRONMENT";

Environment.prototype = Object.create(Entity.prototype);
Environment.prototype.constructor = Environment;

module.exports = Environment;