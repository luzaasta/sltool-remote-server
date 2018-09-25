console.log("-- loading SshConfigRepository --");
var Ssh_config = require('../entity/ssh_config');

var SshConfigRepository = function() {
	console.log("constructing SshConfigRepository!");
};

SshConfigRepository.entityConstructor = Ssh_config;

module.exports = SshConfigRepository;