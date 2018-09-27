var spawn = require('child_process').spawn;
var deferred = require('deferred');

var ping = function(host) {
	var def = deferred();
	var out = "";
	var child = spawn("ping", ["-n", "1", "-w", "1000,", host]);
	child.stdout.on('data', function(data) {
		out += data.toString();
	});

	child.stderr.on('data', function(data) {
		console.error(data.toString());
	});

	child.on('exit', function() {
		if (out.indexOf("Request timed out") > -1) {
			def.reject();
			return;
		}

		def.resolve();
	});

	return def.promise;
};

module.exports = ping;