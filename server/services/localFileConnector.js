var fs = require('fs');
var path = require('path');
console.log("-- loading LocalFileConnector --");

var instances = {};

var LocalFileConnector = function(filePath) {
	console.log("constructing LocalFileConnector!");
	this.filePath = filePath;
};

LocalFileConnector.prototype.load = function() {
	console.log("LOADING FILE");
	try {
		exists = fs.existsSync(this.filePath);
	} catch (e) {
		throw new Error("Problem veryfing the config location!");
	}

	if (!exists) {
		throw new Error("Config location does not exist!");
	}

	var contents = "";
	try {
		contents = fs.readFileSync(this.filePath, 'utf8');
	} catch (e) {
		throw new Error("Problem reading the config file!");
	}

	var data = {};

	try {
		data = JSON.parse(contents);
	} catch (e) {
		throw new Error("Wrong format of file contents!");
	}

	console.log("FILE LOADED");

	return data;
};

LocalFileConnector.prototype.save = function(data) {
	console.log("SAVING FILE");
	fs.writeFileSync(this.filePath, JSON.stringify(data), 'utf8', function(err) {
		if (err) {
			return console.log(err);
		}

		console.log("FILE SAVED!");
	});
};

LocalFileConnector.prototype.create = function() {
	console.log("CREATING FOLDERS");
	var pathToCreate = this.filePath.substring(0, this.filePath.lastIndexOf(path.sep));
	console.log(pathToCreate);
	pathToCreate.split(path.sep).reduce(function(currentPath, folder) {
		currentPath += folder + path.sep;
		if (!fs.existsSync(currentPath)) {
			fs.mkdirSync(currentPath);
		}
		return currentPath;
	}, '');
	console.log("FOLDERS CREATED");
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