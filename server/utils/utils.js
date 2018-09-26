JSON.withoutNullValues = function(key, value) {
	if (value === null) {
		return undefined;
	}

	return value;
};

String.prototype.capitalize = function() {
	return this[0].toUpperCase() + this.substr(1);
};

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

Array.prototype.addGetByFunctions = function() {
	var createFunc = function(fnName, key) {
		Array.prototype[fnName] = function(value) {
			return this.getByKeyAndValue(key, value);
		};
	};

	var funcName = null;
	for (var name of this) {
		funcName = 'getBy' + name.capitalize();
		if (funcName in Array.prototype) {
			continue;
		}
		createFunc(funcName, name);
	}
};

// return new array
Array.prototype.sortLinked = function(nextKey, searchFieldKey) {
	if (this.length < 2) {
		return;
	}
	var list = [];
	var searchFieldValue = null;
	head = this.getByKeyAndValue(nextKey, searchFieldValue);
	do {
		if (head) {
			list.unshift(head);
			searchFieldValue = head[searchFieldKey];
			head = this.getByKeyAndValue(nextKey, searchFieldValue);
		}
	} while (head != null);

	Array.prototype.splice.apply(this, [0, list.length].concat(list));
};

// make polyfill
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

// make new
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