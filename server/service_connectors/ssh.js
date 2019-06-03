var path, node_ssh, fs;
var deferred = require('deferred');
var fs = require('fs');
var path = require('path');
var node_ssh = require('node-ssh');

function refreshAccess(conf) {

	var def = deferred();

	var ssh = new node_ssh();

	ssh.connect(conf).then(
		function(res) {
			ssh.exec("pwd").then(
				function(execResult) {
					var test = execResult == conf.path_test;
					ssh.exec("exit").then(noop, noop);
					ssh.dispose();
					def.resolve("OK: Test=" + test);
				},
				function(err) {
					ssh.exec("exit").then(noop, noop);
					ssh.dispose();
					def.reject(err.toString());
				});
		},
		function(err) {
			ssh.dispose();
			def.reject(err.toString());
		}
	);

	return def.promise;
}

function noop() {};

module.exports = refreshAccess;