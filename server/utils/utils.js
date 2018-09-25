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
	var funcName = null;
	for (var name of this) {
		funcName = 'getBy' + name.capitalize();
		if (funcName in Array.prototype) {
			continue;
		}
		Array.prototype[funcName] = function(value) {
			return this.getByKeyAndValue(name, value);
		};
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

var LinkedList = function() {
	this.head = null;
	this.tail = null;
};
LinkedList.fromArrayOfobjects = function(array) {
	var head = array.getByKeyAndValue('next', null);
	if (!head) {
		return;
	}
	list.unshift(head);
	while (head.next != null) {
		head = array.getByKeyAndValue('id', head.next);
		list.push(head);
	}
};
LinkedList.prototype = Object.create(Array.prototype);
LinkedList.prototype.constructor = LinkedList;
LinkedList.prototype.oldPush = Array.prototype.push;
LinkedList.prototype.push = function(linkedObj) {
	var newNode = {
		value: linkedObj,
		next: null
	};

	if (this.length === 0) {
		this.head = newNode;
	}

	if (this.tail) {
		this.tail.next = newNode;
	}
	this.tail = newNode;

	this.oldPush(linkedObj);

	return this;
};
LinkedList.prototype.oldUnshift = Array.prototype.unshift;
LinkedList.prototype.unshift = function(value) {
	var newNode = {
		value: value
	};
	newNode.next = this.head;

	if (this.length === 0) {
		this.tail = newNode;
	}
	this.head = newNode;

	this.oldUnshift(linkedObj);

	return this;
};

/*removeFromHead() {
	if (this.length === 0) {
		return undefined;
	}

	const value = this.head.value;
	this.head = this.head.next;
	this.length--;

	return value;
}

find(val) {
	let thisNode = this.head;

	while (thisNode) {
		if (thisNode.value === val) {
			return thisNode;
		}

		thisNode = thisNode.next;
	}

	return thisNode;
}

remove(val) {
	if (this.length === 0) {
		return undefined;
	}

	if (this.head.value === val) {
		return this.removeFromHead();
	}

	let previousNode = this.head;
	let thisNode = previousNode.next;

	while (thisNode) {
		if (thisNode.value === val) {
			break;
		}

		previousNode = thisNode;
		thisNode = thisNode.next;
	}

	if (thisNode === null) {
		return undefined;
	}

	previousNode.next = thisNode.next;
	this.length--;
	return this;
}*/


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