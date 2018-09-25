var Linked = function(obj) {
	this.next = obj && obj.next ? obj.next : null;
};

module.exports = Linked;