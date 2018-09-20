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

	ret.reorderEnv = function(id, newIndex) {
		return $http.post(API_PREFIX + '/func/reorderEnv', {
			id: id,
			newIndex: newIndex
		});
	};

	ret.removeEnv = function(id) {
		return $http.delete(API_PREFIX + `/env/${id}`);
	};

	/** CONF */

	ret.addConfig = function(env, configType) {
		var data = {
			envName: env.envName,
			configType: configType,
			configName: "New Config"
		};
		return $http.post('/config', data);
	};

	ret.updateConfig = function(env, configType, index) {
		var url = API_PREFIX + `/config/${env.envName}/${configType}/${index}`;
		// var url = '/config/par/DB/1';
		var data = env[configType][index];
		return $http.put(url, data);
	};

	ret.removeConfig = function(env, configType, index) {
		var url = API_PREFIX + `/config/${env.envName}/${configType}/${index}`;
		return $http.delete(url);
	};

	ret.duplicateConfig = function(env, configType, index) {
		var data = {
			envName: env.envName,
			configType: configType,
			index: index
		};

		return $http.post(API_PREFIX + '/func/duplicateConfig', data);
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
	var returnObject = {};

	returnObject.State = function() {

	};

	/**
	 * [Entity description]
	 * @param {[type]} obj [description]
	 */
	returnObject.Entity = function(obj) {
		this.id = obj && obj.id ? obj.id : null;
		this.created = obj && obj.created ? obj.created : null;
		this.updated = obj && obj.updated ? obj.updated : null;
	};

	/**
	 * [Environment description]
	 * @param {[type]} obj [description]
	 */
	returnObject.Environment = function(obj) {
		returnObject.Entity.call(this, obj);

		this.name = obj && obj.name ? obj.name : null;
		this.order = obj && obj.order ? obj.order : null;
		this.os = obj && obj.os ? obj.os : null;
	};
	returnObject.Environment.API = "env";
	returnObject.Environment.prototype = Object.create(returnObject.Entity.prototype);
	returnObject.Environment.prototype.constructor = returnObject.Environment;

	/**
	 * [Config description]
	 * @param {[type]} obj [description]
	 */
	returnObject.Config = function(obj) {
		returnObject.Entity.call(this, obj);

		this.env_id = obj && obj.env_id ? obj.env_id : null;
		this.name = obj && obj.name ? obj.name : null;
		this.order = obj && obj.order ? obj.order : null;
		this.last_run_date = obj && obj.last_run_date ? obj.last_run_date : null;
		this.last_run_state = obj && obj.last_run_state ? obj.last_run_state : null;
	};
	returnObject.Config.prototype = Object.create(returnObject.Entity.prototype);
	returnObject.Config.prototype.constructor = returnObject.Config;
	returnObject.Config.API = "config";

	/**
	 * [Db_config description]
	 * @param {[type]} obj [description]
	 */
	returnObject.Db_config = function(obj) {
		returnObject.Config.call(this, obj);

		this.db_type = obj && obj.db_type ? obj.db_type : null;
		this.db = obj && obj.db ? obj.db : null;
		this.user = obj && obj.user ? obj.user : null;
		this.pass = obj && obj.pass ? obj.pass : null;
		this.host = obj && obj.host ? obj.host : null;
		this.port = obj && obj.port ? obj.port : null;
		this.schema = obj && obj.schema ? obj.schema : null;
		this.table = obj && obj.table ? obj.table : null;
	};
	returnObject.Db_config.prototype = Object.create(returnObject.Config.prototype);
	returnObject.Db_config.prototype.constructor = returnObject.Db_config;
	returnObject.Db_config.prototype.clone = function() {
		return new returnObject.Db_config(this);
	};
	returnObject.Db_config.API = returnObject.Config.API + "/db";

	/**
	 * [Ssh_config description]
	 * @param {[type]} obj [description]
	 */
	returnObject.Ssh_config = function(obj) {
		returnObject.Config.call(this, obj);

		this.connection_conf = obj && obj.connection_conf ? new SshConnectionConf(obj.connection_conf) : null;
		this.path_test = obj && obj.path_test ? obj.path_test : null;
	};
	returnObject.Ssh_config.prototype = Object.create(returnObject.Config.prototype);
	returnObject.Ssh_config.prototype.constructor = returnObject.Ssh_config;
	returnObject.Ssh_config.prototype.clone = function() {
		return new returnObject.Ssh_config(this);
	};
	var SshConnectionConf = function(obj) {
		this.host = obj && obj.host ? obj.host : null;
		this.username = obj && obj.username ? obj.username : null;
		this.password = obj && obj.password ? obj.password : null;
		this.port = obj && obj.port ? obj.port : null;
	};
	SshConnectionConf.prototype.SshConnectionConf = function() {
		return new SshConnectionConf(this);
	};
	returnObject.Ssh_config.API = returnObject.Config.API + "/ssh";

	return returnObject;
});