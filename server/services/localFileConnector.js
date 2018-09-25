var fs = require('fs');
console.log("-- loading LocalFileConnector --");

var instances = {};

var LocalFileConnector = function(filePath) {
	console.log("constructing LocalFileConnector!");
	this.filePath = filePath;
};

LocalFileConnector.prototype.load = function() {
	var exists = true;
	try {
		exists = fs.existsSync(this.filePath);
	} catch (e) {
		throw new Error("Problem veryfing the config location!\n" + e);
	}

	if (!exists) {
		this.save();
		return;
	}

	var contents = "";
	try {
		contents = fs.readFileSync(this.filePath, 'utf8');
	} catch (e) {
		throw new Error("Problem reading the config file");
	}

	var data = {};

	try {
		data = JSON.parse(contents);
	} catch (e) {
		throw new Error("Wrong format of DB!");
	}

	console.log("DB loaded");

	return data;
};

LocalFileConnector.prototype.save = function(data) {
	fs.writeFileSync(this.filePath, JSON.stringify(data), 'utf8', function(err) {
		if (err) {
			return console.log(err);
		}

		console.log("DB saved!");
	});
};

LocalFileConnector.prototype.getId = function() {
	return this.filePath;
};

LocalFileConnector.getInstance = function(filePath) {
	if (instances[filePath] === undefined) {
		instances[filePath] = new LocalFileConnector(filePath);
	}

	return instances[filePath];
};

module.exports = {
	getInstance: LocalFileConnector.getInstance
};