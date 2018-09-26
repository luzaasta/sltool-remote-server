/**
 * REPO FOR SINGLE FILE AND AND TABLE
 * Special props for entities [ NO_UPDATE_FIELDS, TABLE_NAME ]
 */
console.log("-- loading LocalFileRepository --");

var instances = {};

/**
 * {
 *  id: {
 *    db: Object,
 *    tableIds: {
 *    	tableName: Number,
 *    	...
 *    }
 *  },
 *  ...
 * }
 * @type {Object}
 */
var dataMap = {};

var loadDbData = function(id, conn) {
	try {
		dataMap[id] = {};
		dataMap[id].db = conn.load();
	} catch (e) {
		throw new Error(e);
	}
};

var getDbData = function(id) {
	return dataMap[id] ? dataMap[id].db : undefined;
};

var getCurrentTableId = function(id, tableName) {
	var i = dataMap[id] ? (dataMap[id].tableIds ? dataMap[id].tableIds[tableName] : undefined) : undefined;
	console.log("getting increment: " + i);
	return i;
};

var incrementTableId = function(id, tableName) {
	return ++dataMap[id].tableIds[tableName];
};

var computeCurrentTableId = function(id, tableName) {
	if (Object.isEmpty(dataMap[id].tableIds)) {
		dataMap[id].tableIds = {};
	}
	var i = getDbData(id)[tableName].reduceRight(function(a, b) {
		return a.id > b.id ? a : b;
	}, {
		id: 0
	}).id;
	console.log("INCREMENT COMPUTED: " + i);
	dataMap[id].tableIds[tableName] = i;
};

var fillNoUpdateFieldsRecursivelly = function(proto, result) {
	if (proto == null) {
		return;
	}
	if (proto.NO_UPDATE_FIELDS) {
		proto.NO_UPDATE_FIELDS.filter(function(item) {
			return result.hasOwnProperty(item) ? false : (result[item] = true);
		});
	}

	fillNoUpdateFieldsRecursivelly(proto.__proto__, result);
};

// CONSTRUCTOR

var LocalFileRepository = function(connector, entityConstructor) {
	console.log("constructing LocalFileRepository!");
	this.tableName = entityConstructor.TABLE_NAME;
	this.entityConstructor = entityConstructor;
	this.conn = connector;
	this.id = connector.getId();
	this.noUpdateFields = {};
	fillNoUpdateFieldsRecursivelly((new entityConstructor()).__proto__, this.noUpdateFields);

	console.log("id: " + this.id);
	console.log("table name: " + this.tableName);
	console.log(this.noUpdateFields);

	if (getDbData(this.id) === undefined) {
		loadDbData(this.id, this.conn); // holding data in memory for all repo instances of same path
	}

	if (getCurrentTableId(this.id, this.tableName) === undefined) {
		computeCurrentTableId(this.id, this.tableName); // holding increment in memory for all repo instances of same path and db
	}

	if (getDbData(this.id)[this.tableName] === undefined) {
		throw new Error(`DB ${this.tableName} is not present!`);
	}
};

// REPO FUNC

/**
 * Modifies the parameter itself so no return!
 * @param  {[type]} entity [description]
 * @return {[type]}     [description]
 */
LocalFileRepository.prototype.save = function(entity, isUpdate) {
	var records = getDbData(this.id)[this.tableName];
	var index = records.indexOfByKeyAndValue('id', entity.id);

	if (!isUpdate) {
		for (var prop in entity) {
			if (entity.hasOwnProperty(prop) && (prop in this.noUpdateFields)) {
				entity[prop] = null;
			}
		}
		entity.id = incrementTableId(this.id, this.tableName);
		entity.created = +new Date();
		records.push(entity);
	} else {
		for (var prop in entity) {
			if (entity.hasOwnProperty(prop) && !(prop in this.noUpdateFields)) {
				records[index][prop] = entity[prop];
			}
		}
		records[index].updated = +new Date();
	}

	this.conn.save(getDbData(this.id));

	return index < 0 ? entity : records[index];
};

LocalFileRepository.prototype.delete = function(id) {
	var i = getDbData(this.id)[this.tableName].indexOfByKeyAndValue('id', id);
	if (i > 0) {
		getDbData(this.id)[this.tableName].splice(i, 1);
		this.conn.save(getDbData(this.id));
	}
};

LocalFileRepository.prototype.deleteAllByKeyAndValue = function(key, value) {
	getDbData(this.id)[this.tableName] = getDbData(this.id)[this.tableName].getAllByKeyAndValueNot(key, value);
	this.conn.save(getDbData(this.id));
};

LocalFileRepository.prototype.deleteAll = function() {
	getDbData(this.id)[this.tableName] = [];
	this.conn.save(getDbData(this.id));
};



LocalFileRepository.prototype.exists = function(id) {
	return getDbData(this.id)[this.tableName].indexOfByKeyAndValue('id', id) > -1;
};

LocalFileRepository.prototype.getAll = function() {
	var res = [];
	for (var e of getDbData(this.id)[this.tableName]) {
		res.push(new this.entityConstructor(e));
	}
	return res;
};

LocalFileRepository.prototype.getAllByKeyAndValue = function(key, value) {
	var res = [];
	for (var e of getDbData(this.id)[this.tableName].getAllByKeyAndValue(key, value)) {
		res.push(new this.entityConstructor(e));
	}
	return res;
};

LocalFileRepository.prototype.getByKeyAndValue = function(key, value) {
	var e = getDbData(this.id)[this.tableName].getByKeyAndValue(key, value);
	return e ? new this.entityConstructor(e) : null;
};

LocalFileRepository.prototype.get = function(id) {
	var e = getDbData(this.id)[this.tableName].getByKeyAndValue('id', id);
	return e ? new this.entityConstructor(e) : null;
};

LocalFileRepository.prototype.getOne = function(id) {
	return this.get(id);
};

LocalFileRepository.prototype.count = function(id) {
	return getDbData(this.id)[this.tableName].length;
};

LocalFileRepository.getInstance = function(connector, entityConstructor) {
	var id = connector.getId();
	var tableName = entityConstructor.name.toUpperCase();

	if (instances[id] === undefined) {
		instances[id] = {};
	}

	if (instances[id][tableName] === undefined) {
		instances[id][tableName] = new LocalFileRepository(connector, entityConstructor);
	}

	return instances[id][tableName];
};

module.exports = {
	getInstance: LocalFileRepository.getInstance
};