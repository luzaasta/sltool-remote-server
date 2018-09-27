var spawn = require('child_process').spawn;
var deferred = require('deferred');

/*
Pinging TRAFIWAST10 [10.90.156.162] with 32 bytes of data:

-----------------------------------------
Request timed out.

Ping statistics for 10.90.156.162:
    Packets: Sent = 1, Received = 0, Lost = 1 (100% loss),
 */

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



//console.log(child.stdout.toString('utf8'));

module.exports = ping;