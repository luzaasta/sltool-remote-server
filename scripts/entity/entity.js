var Entity = function(obj) {
	this.id = obj && obj.id ? obj.id : null;
	this.created = obj && obj.created ? obj.created : null;
	this.updated = obj && obj.updated ? obj.updated : null;
};

module.exports = Entity;