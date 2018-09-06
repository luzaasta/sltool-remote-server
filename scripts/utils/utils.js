Array.prototype.indexOfByKeyAndValue = function(key, value) {
	var i = -1;
	this.some(function(ele, index) {
		if (ele[key] == value) {
			i = index;
			return;
		}
	});
	return i;
};

Array.prototype.getByKeyAndValue = function(key, value) {
	var obj = null;
	this.some(function(ele, index) {
		if (ele[key] == value) {
			obj = ele;
			return;
		}
	});
	return obj;
};