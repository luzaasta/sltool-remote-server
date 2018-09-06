angular.module('services', []).

factory('restService', ['$http', function($http) {

	var ret = {};

	ret.pingKauko = function() {
		return $http.get('/ping/kauko');
	};

	/** ENV */

	ret.getEnvList = function() {
		return $http.get('/env');
	};

	ret.createNewEnv = function(newEnv) {
		return $http.post('/env', newEnv);
	};

	ret.updateEnv = function(id, data) {
		return $http.patch(`/env/${id}`, data);
	};

	ret.reorderEnv = function(id, newIndex) {
		return $http.post('/func/reorderEnv', {
			id: id,
			newIndex: newIndex
		});
	};

	ret.removeEnv = function(id) {
		return $http.delete(`/env/${id}`);
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
		var url = `/config/${env.envName}/${configType}/${index}`;
		// var url = '/config/par/DB/1';
		var data = env[configType][index];
		return $http.put(url, data);
	};

	ret.removeConfig = function(env, configType, index) {
		var url = `/config/${env.envName}/${configType}/${index}`;
		return $http.delete(url);
	};

	ret.duplicateConfig = function(env, configType, index) {
		var data = {
			envName: env.envName,
			configType: configType,
			index: index
		};

		return $http.post('/func/duplicateConfig', data);
	};

	/** RUN */

	ret.runSingleConfig = function(env, configType, index) {
		return $http.get(`/refresh/${env.envName}/${configType}/${index}`);
	};

	ret.runAllInEnvForConfigType = function(env, configType) {
		return $http.get(`/refresh/${env.envName}/${configType}`);
	};

	ret.runAllInEnv = function(env) {
		return $http.get(`/refresh/${env.envName}`);
	};

	ret.runAll = function() {
		return $http.get('/refresh');
	};

	return ret;

}]);