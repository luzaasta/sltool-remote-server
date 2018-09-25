angular.module('services', []).

factory('restService', ['$http', function($http) {

	var ret = {};

	var API_PREFIX = "/api/v1";

	ret.pingKauko = function() {
		return $http.get(API_PREFIX + '/ping/kauko');
	};

	/** DATA */

	ret.getAllData = function() {
		return $http.get(API_PREFIX + '/data');
	};

	/** ENV */

	ret.getEnvList = function() {
		return $http.get(API_PREFIX + '/env');
	};

	ret.createNewEnv = function(newEnv) {
		return $http.post(API_PREFIX + '/env', newEnv);
	};

	ret.updateEnv = function(id, data) {
		return $http.patch(API_PREFIX + `/env/${id}`, data);
	};

	ret.removeEnv = function(id) {
		return $http.delete(API_PREFIX + `/env/${id}`);
	};

	/** CONF */

	ret.addConfig = function(configType, envId) {
		return $http.post(API_PREFIX + `/config/${configType}?env_id=${envId}`);
	};

	ret.updateConfig = function(env, configType, index) {
		var url = API_PREFIX + `/config/${env.envName}/${configType}/${index}`;
		// var url = '/config/par/DB/1';
		var data = env[configType][index];
		return $http.put(url, data);
	};

	ret.removeConfig = function(configType, id) {
		return $http.delete(API_PREFIX + `/config/${configType}/${id}`);
	};

	/** RUN */

	ret.runSingleConfig = function(env, configType, index) {
		return $http.get(API_PREFIX + `/refresh/${env.envName}/${configType}/${index}`);
	};

	ret.runAllInEnvForConfigType = function(env, configType) {
		return $http.get(API_PREFIX + `/refresh/${env.envName}/${configType}`);
	};

	ret.runAllInEnv = function(env) {
		return $http.get(API_PREFIX + `/refresh/${env.envName}`);
	};

	ret.runAll = function() {
		return $http.get(API_PREFIX + '/refresh');
	};

	return ret;

}]).

factory('modelService', function() {

	var State = function() {

	};

	var Linked = function(obj) {
		this.next = obj && obj.next ? obj.next : null;
	};

	/**
	 * [Entity description]
	 * @param {[type]} obj [description]
	 */
	var Entity = function(obj) {
		this.id = obj && obj.id ? obj.id : null;
		this.created = obj && obj.created ? obj.created : null;
		this.updated = obj && obj.updated ? obj.updated : null;
	};

	/**
	 * [Environment description]
	 * @param {[type]} obj [description]
	 */
	var Environment = function(obj) {
		Entity.call(this, obj);
		Linked.call(this, obj);

		this.name = obj && obj.name ? obj.name : null;
		this.os = obj && obj.os ? obj.os : null;
	};

	/**
	 * [Config description]
	 * @param {[type]} obj [description]
	 */
	var Config = function(obj) {
		Entity.call(this, obj);
		Linked.call(this, obj);

		this.env_id = obj && obj.env_id ? obj.env_id : null;
		this.name = obj && obj.name ? obj.name : null;
		this.last_run_date = obj && obj.last_run_date ? obj.last_run_date : null;
		this.last_run_state = obj && obj.last_run_state ? obj.last_run_state : null;
	};

	/**
	 * [Db_config description]
	 * @param {[type]} obj [description]
	 */
	var Db_config = function(obj) {
		Config.call(this, obj);

		this.db_type = obj && obj.db_type ? obj.db_type : null;
		this.db = obj && obj.db ? obj.db : null;
		this.user = obj && obj.user ? obj.user : null;
		this.pass = obj && obj.pass ? obj.pass : null;
		this.host = obj && obj.host ? obj.host : null;
		this.port = obj && obj.port ? obj.port : null;
		this.schema = obj && obj.schema ? obj.schema : null;
		this.table = obj && obj.table ? obj.table : null;
	};

	/**
	 * [Ssh_config description]
	 * @param {[type]} obj [description]
	 */
	var Ssh_config = function(obj) {
		Config.call(this, obj);

		this.connection_conf = obj && obj.connection_conf ? new SshConnectionConf(obj.connection_conf) : null;
		this.path_test = obj && obj.path_test ? obj.path_test : null;
	};

	var SshConnectionConf = function(obj) {
		this.host = obj && obj.host ? obj.host : null;
		this.username = obj && obj.username ? obj.username : null;
		this.password = obj && obj.password ? obj.password : null;
		this.port = obj && obj.port ? obj.port : null;
	};

	Environment.API = "env";
	Environment.prototype = Object.create(Entity.prototype);
	Environment.prototype.constructor = Environment;
	Environment.prototype.clone = function() {
		return new Environment(this);
	};

	//------------------------------------------------
	Config.API = "config";
	Config.prototype = Object.create(Entity.prototype);
	Config.prototype.constructor = Config;
	Config.TYPES = {
		"DB": Db_config,
		"SSH": Ssh_config
	};

	//------------------------------------------------
	Db_config.API = Config.API + "/db";
	Db_config.prototype = Object.create(Config.prototype);
	Db_config.prototype.constructor = Db_config;
	Db_config.prototype.clone = function() {
		return new Db_config(this);
	};

	//------------------------------------------------
	Ssh_config.prototype = Object.create(Config.prototype);
	Ssh_config.prototype.constructor = Ssh_config;
	Ssh_config.prototype.clone = function() {
		return new Ssh_config(this);
	};

	//------------------------------------------------
	Ssh_config.API = Config.API + "/ssh";
	SshConnectionConf.prototype.SshConnectionConf = function() {
		return new SshConnectionConf(this);
	};


	var e = new Environment();
	Object.keys(e).addGetByFunctions();

	//------------------------------------------------
	return {
		Environment: Environment,
		Config: Config,
		Db_config: Db_config,
		Ssh_config: Ssh_config
	};
});