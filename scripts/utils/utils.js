Array.prototype.indexOfByKeyAndValue = function(key, value) {
	return this.findIndex(function(ele) {
		return ele[key] == value;
	});
};

Array.prototype.getByKeyAndValue = function(key, value) {
	return this.find(function(ele) {
		return ele[key] == value;
	});
};

Array.prototype.getAllByKeyAndValue = function(key, value) {
	return this.filter(function(ele) {
		return ele[key] == value;
	});
};

Array.prototype.getAllByKeyAndValueNot = function(key, value) {
	return this.filter(function(ele) {
		return ele[key] != value;
	});
};

// make polyfill for object.assign
if (typeof Object.assign != 'function') {
	// Must be writable: true, enumerable: false, configurable: true
	Object.defineProperty(Object, "assign", {
		value: function assign(target, varArgs) { // .length of function is 2
			'use strict';
			if (target == null) { // TypeError if undefined or null
				throw new TypeError('Cannot convert undefined or null to object');
			}

			var to = Object(target);

			for (var index = 1; index < arguments.length; index++) {
				var nextSource = arguments[index];

				if (nextSource != null) { // Skip over if undefined or null
					for (var nextKey in nextSource) {
						// Avoid bugs when hasOwnProperty is shadowed
						if (Object.prototype.hasOwnProperty.call(nextSource, nextKey)) {
							to[nextKey] = nextSource[nextKey];
						}
					}
				}
			}
			return to;
		},
		writable: true,
		configurable: true
	});
}

// make polyfill for object.assign
if (typeof Object.isEmpty != 'function') {
	// Must be writable: true, enumerable: false, configurable: true
	Object.defineProperty(Object, "isEmpty", {
		value: function isEmpty(obj) { // .length of function is 2
			'use strict';
			if (obj) {
				for (var prop in obj) {
					if (obj.hasOwnProperty(prop)) {
						return false;
					}
				}
			}
			return true;
		},
		writable: true,
		configurable: true
	});
}

JSON.withoutNullValues = function(key, value) {
	if (value === null) {
		return undefined;
	}

	return value;
};