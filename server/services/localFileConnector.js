/**
 * There is a single instance of this class for each distinct path
 * @type {[type]}
 */
var fs = require('fs');
var path = require('path');

var instances = {};

var LocalFileConnector = function(filePath) {
	console.log("constructing LocalFileConnector!");
	this.filePath = filePath;
};

LocalFileConnector.prototype.load = function() {
	console.log("Loading file");
	try {
		exists = fs.existsSync(this.filePath);
	} catch (e) {
		throw new Error("Problem veryfing the file location!");
	}

	if (!exists) {
		throw new Error("File location does not exist!");
	}

	var contents = "";
	try {
		contents = fs.readFileSync(this.filePath, 'utf8');
	} catch (e) {
		throw new Error("Problem reading the file!");
	}

	var data = {};

	try {
		data = JSON.parse(contents);
	} catch (e) {
		throw new Error("Wrong format of file contents!");
	}

	console.log("File loaded");

	return data;
};

LocalFileConnector.prototype.save = function(data) {
	console.log("Saving data to file");
	fs.writeFileSync(this.filePath, JSON.stringify(data), 'utf8', function(err) {
		if (err) {
			console.log(err);
			throw new Error("Can't save file!");
		}
	});

	console.log("Data saved");
};

LocalFileConnector.prototype.create = function() {
	console.log("Creating path to file");
	var pathToCreate = this.filePath.substring(0, this.filePath.lastIndexOf(path.sep));
	pathToCreate.split(path.sep).reduce(function(currentPath, folder) {
		currentPath += folder + path.sep;
		if (!fs.existsSync(currentPath)) {
			console.log("Creating folder at path: " + currentPath);
			fs.mkdirSync(currentPath);
		}
		return currentPath;
	}, '');
	console.log("Path to file created");
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