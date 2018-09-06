/**
 * REPO FOR SINGLE FILE AND AND TABLE
 */
console.log("-- loading LocalFileRepository --");

var instances = {};

/**
 * {
 *  id: {
 *    db: Object,
 *    tableIncrements: {
 *    	tableName: Number,
 *    	...
 *    }
 *  },
 *  ...
 * }
 * @type {Object}
 */
var dataMap = {};

var loadData = function(id, conn) {
	try {
		dataMap[id] = {};
		dataMap[id].db = conn.load();
	} catch (e) {
		throw new Error(e);
	}
};

var getData = function(id) {
	return dataMap[id] ? dataMap[id].db : undefined;
};

var getIcrement = function(id, tableName) {
	return dataMap[id] ? (dataMap[id].tableIncrements ? dataMap[id].tableIncrements[tableName] : undefined) : undefined;
};

var increment = function(id, tableName) {
	return ++dataMap[id].tableIncrements[tableName];
};

var computeStartIncrement = function(id, tableName) {
	dataMap[id].tableIncrements = {};
	dataMap[id].tableIncrements[tableName] = getData(id)[tableName].reduceRight(function(a, b) {
		return a.id > b.id ? a : b;
	}, {
		id: 0
	}).id;
};

// CONSTRUCTOR

var LocalFileRepository = function(connector, entityConstructor) {
	console.log("constructing LocalFileRepository!");
	this.tableName = entityConstructor.name.toUpperCase();
	this.entityConstructor = entityConstructor;
	this.conn = connector;
	this.id = connector.getId();

	if (getData(this.id) === undefined) {
		loadData(this.id, this.conn); // holding data in memory for all repo instances of same path
	}

	if (getIcrement(this.id, this.tableName) === undefined) {
		computeStartIncrement(this.id, this.tableName); // holding increment in memory for all repo instances of same path and db
	}

	if (getData(this.id)[this.tableName] === undefined) {
		throw new Error(`DB ${this.tableName} is not present!`);
	}
};

// REPO FUNC

LocalFileRepository.prototype.save = function(env) {
	var records = getData(this.id)[this.tableName];
	var index = records.indexOfByKeyAndValue('id', env.id);

	if (index < 0) {
		env.id = increment(this.id, this.tableName);
		records.push(env);
	} else {
		records[index] = env;
	}

	this.conn.save(getData(this.id));
};

LocalFileRepository.prototype.delete = function(id) {
	var db = getData(this.id)[this.tableName];
	if (db === undefined) {
		//error
		return;
	}

	getData(this.id)[this.tableName].splice(id, 1);
	this.conn.save();
};

LocalFileRepository.prototype.getAll = function() {
	var res = [];
	for (var e of getData(this.id)[this.tableName]) {
		res.push(new this.entityConstructor(e));
	}
	return res;
};

LocalFileRepository.prototype.get = function(id) {
	return this.getOne(id);
};

LocalFileRepository.prototype.getOne = function(id) {
	var e = getData(this.id)[this.tableName].getByKeyAndValue('id', id);
	return e ? new this.entityConstructor(e) : null;
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