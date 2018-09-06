var Entity = require('./entity');

var Environment = function(obj) {
	Entity.call(this, obj);

	this.name = obj && obj.name ? obj.name : null;
};

Environment.prototype = Object.create(Entity.prototype);
Environment.prototype.constructor = Environment;

module.exports = Environment;