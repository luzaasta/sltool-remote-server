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
		out += data.toString();
		def.reject(out);
	});

	child.on('exit', function(data) {
		if (out.indexOf("Request timed out") > -1) {
			def.reject(out);
			return;
		}

		def.resolve(out);
	});

	return def.promise;
};

module.exports = ping;