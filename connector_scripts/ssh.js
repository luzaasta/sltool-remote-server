var path, node_ssh, fs;
var deferred = require('deferred');
var fs = require('fs');
var path = require('path');
var node_ssh = require('node-ssh');

function refreshAccess(conf, result) {

	var def = deferred();

	var ssh = new node_ssh();

	ssh.connect(conf.connectionConf).then(function() {
		ssh.exec("pwd").then(function(execResult) {
			var test = execResult == conf.pathTest;
			result.message = "Access OK and refreshed!";
			ssh.exec("exit").then(noop, noop);
			ssh.dispose();
			def.resolve(true);
		}, function(err) {
			result.failed = true;
			result.message = err.toString();
			ssh.exec("exit").then(noop, noop);
			ssh.dispose();
			def.resolve(false);
		});
	}, function(err) {
		result.failed = true;
		result.message = err.toString();
		ssh.dispose();
		def.resolve(false);
	});

	return def.promise;
}

function noop() {};

module.exports = refreshAccess;