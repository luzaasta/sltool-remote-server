angular.module('controllers', []).

controller('mainController', ['$rootScope', '$scope', '$http', '$timeout', '$window', '$q', 'restService', 'modelService', function($rootScope, $scope, $http, $timeout, $window, $q, restService, modelService) {

	var CONFIG_TYPES = {
		DB: {
			ENTITY_CONSTRUCTOR: modelService.Db_config
		},
		SSH: {
			ENTITY_CONSTRUCTOR: modelService.Ssh_config
		}
	};

	var singleConfigStates = {
		FAILED: 'text-danger',
		OK: 'text-success',
		NOT_RUN: 'text-warning'
	};

	var configStates = null;

	$scope.newServerName = "";

	$scope.dbTypes = ["PostgreSQL", "DB2"];
	$scope.configTypes = ["DB", "SSH"]; // take from server?

	$scope.currentConfigType = "DB";
	$scope.currentConfig = null;
	$scope.currentConfigIndex = -1;

	$scope.servers = [];
	$scope.currentServer = null;
	$scope.currentServerIndex = -1;
	$scope.serverNameModel = "";

	$scope.kaukoOn = true;

	/** INIT PARTS */

	restService.getAllData().then(
		function(res) {
			init(parseData(res.data));
		},
		function() {
			console.log("Error occured when getting configs!");
		}
	);

	function parseData(data) {
		for (var server of data) {
			server.environment = new modelService.Environment(server.environment);
			for (var configType in server.configs) {
				for (var i = 0; i < server.configs[configType].length; i++) {
					server.configs[configType][i] = new CONFIG_TYPES[configType].ENTITY_CONSTRUCTOR(server.configs[configType][i]);
				}
			}
		}

		return data;
	}

	function orderSort1(a, b) {
		return a.environment.order < b.environment.order ? -1 : 1;
	}

	function orderSort2(a, b) {
		return a.order < b.order ? -1 : 1;
	}

	function init(data) {
		$scope.servers = data.sort(orderSort1);
		for (var server of $scope.servers) {
			for (var configType of $scope.configTypes) {
				server.configs[configType].sort(orderSort2);
			}
		}
		initConfigStates();
		$scope.changeEnv(0);
	}

	/** CONF STATES */

	function initConfigStates() {
		configStates = {};
		var index = 0;
		for (var server of $scope.servers) {
			configStates[index] = {};
			configStates[index].someFailed = false;
			configStates[index].someOk = false;

			for (var type of $scope.configTypes) {
				configStates[index][type] = {};
				configStates[index][type].someFailed = false;
				configStates[index][type].someOk = false;

				configStates[index][type].configStates = [];

				// handle no children and some not run
				if (server.configs[type].length == 0) {
					configStates[index].noChildren = true;
					configStates[index][type].noChildren = true;
					configStates[index][type].someNotRun = false;
				} else {
					configStates[index].someNotRun = true;
					configStates[index][type].noChildren = false;
					configStates[index][type].someNotRun = true;
				}

				for (var i = 0; i < server.configs[type].length; i++) {
					configStates[index][type].configStates.push(singleConfigStates.NOT_RUN);
				}
			}
			index++;
		}

		// console.log(configStates);
	}

	// no children in type is the same as configstates.length == 0
	function refreshConfigStates() {
		console.log(configStates);
		var failedE = okE = notRunE = noChildrenE = failedT = okT = notRunT = 0;
		for (var index in configStates) {

			failedE = okE = notRunE = noChildrenE = 0;

			for (var type of $scope.configTypes) {

				failedT = okT = notRunT = 0;

				if (configStates[index][type].configStates.length == 0) {
					configStates[index][type].noChildren = true;
					noChildrenE++;
				} else {
					configStates[index][type].noChildren = false;
				}

				for (var i = 0; i < configStates[index][type].configStates.length; i++) {

					var state = configStates[index][type].configStates[i];

					if (state === singleConfigStates.NOT_RUN) {
						notRunE++;
						notRunT++;
					} else if (state === singleConfigStates.FAILED) {
						failedE++;
						failedT++;
					} else if (state === singleConfigStates.OK) {
						okE++;
						okT++;
					}
				}
				configStates[index][type].someFailed = failedT > 0;
				configStates[index][type].someOk = okT > 0;
				configStates[index][type].someNotRun = notRunT > 0;

			}
			configStates[index].noChildren = noChildrenE > 0;
			configStates[index].someFailed = failedE > 0;
			configStates[index].someOk = okE > 0;
			configStates[index].someNotRun = notRunE > 0;
		}

		console.log(configStates);
	}

	$scope.getEnvConfigState = function(index, prop) {
		if (!configStates || angular.isObjectEmpty(configStates)) {
			return null;
		}
		return configStates[index][prop];
	};

	$scope.getConfigListState = function(type, prop) {
		if (!configStates || angular.isObjectEmpty(configStates)) {
			return null;
		}
		return configStates[$scope.currentServerIndex][type][prop];
	};

	$scope.getConfigState = function(i) {
		if (!configStates || angular.isObjectEmpty(configStates)) {
			return null;
		}
		return configStates[$scope.currentServerIndex][$scope.currentConfigType].configStates[i];
	};


	/** CONFS */

	$scope.changeConfigType = function(index) {
		if (index > $scope.configTypes.length - 1 || index < 0) {
			return;
		}
		$scope.currentConfigType = $scope.configTypes[index];
		$scope.selectConfig(0);
	};

	$scope.saveConfig = function(index) {
		var i = index ? index : $scope.currentConfigIndex;

		restService.updateConfig($scope.currentServer, $scope.currentConfigType, i).then(
			function() {

			},
			function() {

			});
	};

	$scope.addConfig = function(index) {
		var i = index ? index : $scope.currentConfigIndex;

		restService.addConfig($scope.currentServer, $scope.currentConfigType).then(
			function(res) {
				if (res.status != 200) {
					return;
				}

				var config = res.data.config;
				var l = $scope.currentServer.configs[$scope.currentConfigType].push(config) - 1;
				$scope.selectConfig(l);
				configStates[$scope.currentServer.name][$scope.currentConfigType].configStates[l] = singleConfigStates.NOT_RUN;
				refreshConfigStates();
			},
			function() {});
	};

	$scope.removeConfig = function(index) {
		var i = index ? index : $scope.currentConfigIndex;

		restService.removeConfig($scope.currentServer, $scope.currentConfigType, i).then(
			function(res) {
				if (res.status != 200) {
					return;
				}

				it = $scope.currentServer.configs[$scope.currentConfigType].splice(i, 1)[0];
				var ind = i > 0 ? i - 1 : ($scope.currentServer[$scope.currentConfigType].length > 0 ? 0 : -1);
				$scope.selectConfig(ind);
				configStates[$scope.currentServer.envName][$scope.currentConfigType].configStates.splice(i, 1);
				refreshConfigStates();
			},
			function() {});
	};

	$scope.duplicateConfig = function(index) {
		var i = index ? index : $scope.currentConfigIndex;

		restService.duplicateConfig($scope.currentServer, $scope.currentConfigType, i).then(
			function(res) {
				if (res.status != 200) {
					return;
				}
				var data = res.data;
				var l = $scope.currentSever.configs[$scope.currentConfigType].push(data) - 1;
				$scope.selectConfig(l);
				configStates[$scope.currentServer.envName][$scope.currentConfigType].configStates[l] = singleConfigStates.NOT_RUN;
				refreshConfigStates();
			},
			function() {}
		);
	};

	$scope.selectConfig = function(index) {
		if (index < 0 || index > $scope.currentServer.configs[$scope.currentConfigType].length - 1) {
			$scope.currentConfig = null;
			$scope.currentConfigIndex = -1;
			return;
		}
		$scope.currentConfig = $scope.currentServer.configs[$scope.currentConfigType][index];
		$scope.currentConfigIndex = index;
	};

	/** RUNS */

	$scope.runSingleInEnv = function(index) {
		var i = index ? index : $scope.currentConfigIndex;

		restService.runSingleConfig($scope.currentServer, $scope.currentConfigType, i).then(
			function(res) {
				if (res.status != 200) {
					return;
				}

				var data = res.data;
				$scope.currentServer.configs[$scope.currentConfigType][i].lastRun = data[$scope.currentServer.envName][$scope.currentConfigType][i].lastRun;

				var failed = data[$scope.currentServer.envName][$scope.currentConfigType][i].failed;
				var state = failed === true ? singleConfigStates.FAILED : (failed === false ? singleConfigStates.OK : singleConfigStates.NOT_RUN);
				configStates[$scope.currentServer.envName][$scope.currentConfigType].configStates[i] = state;
				refreshConfigStates();
			},
			function() {
				console.log("run error");
			});
	};

	$scope.runAllOfTypeInEnv = function() {
		restService.runAllInEnvForConfigType($scope.currentServer, $scope.currentConfigType).then(
			function(res) {
				if (res.status != 200) {
					return;
				}

				var data = res.data;

				if (angular.isObjectEmpty(data)) {
					return;
				}

				for (var i in data[$scope.currentServer.envName][$scope.currentConfigType]) {
					var failed = data[$scope.currentServer.envName][$scope.currentConfigType][i].failed;
					var state = failed === true ? singleConfigStates.FAILED : (failed === false ? singleConfigStates.OK : singleConfigStates.NOT_RUN);
					configStates[$scope.currentServer.envName][$scope.currentConfigType].configStates[i] = state;
				}

				refreshConfigStates();
			},
			function() {
				console.log("run error");
			});
	};

	$scope.runAllInEnv = function() {
		restService.runAllInEnv($scope.currentServer).then(
			function(res) {
				if (res.status != 200) {
					return;
				}

				var data = res.data;

				if (angular.isObjectEmpty(data)) {
					return;
				}

				for (var type of $scope.configTypes) {
					for (var i in data[$scope.currentServer.envName][type]) {
						var failed = data[$scope.currentServer.envName][type][i].failed;
						var state = failed === true ? singleConfigStates.FAILED : (failed === false ? singleConfigStates.OK : singleConfigStates.NOT_RUN);
						configStates[$scope.currentServer.envName][type].configStates[i] = state;
					}
				}

				refreshConfigStates();
			},
			function() {
				console.log("run error");
			});
	};

	$scope.runAll = function() {
		restService.runAll().then(
			function(res) {
				if (res.status != 200) {
					return;
				}

				var data = res.data;

				if (angular.isObjectEmpty(data)) {
					return;
				}

				var ie = 0;
				for (var env of $scope.servers) {
					for (var type of $scope.configTypes) {
						for (var i in data[ie][type]) {
							var failed = data[ie][type][i].failed;
							var state = failed === true ? singleConfigStates.FAILED : (failed === false ? singleConfigStates.OK : singleConfigStates.NOT_RUN);
							configStates[ie][type].configStates[i] = state;
						}
					}
					ie++;
				}

				refreshConfigStates();
			},
			function() {
				console.log("run error");
			});
	};

	/** ENVS */

	$scope.changeEnv = function(index) {
		if (index > $scope.servers.length - 1 || index < 0) {
			return;
		}
		$scope.currentServer = $scope.servers[index];
		$scope.currentServerIndex = index;
		$scope.serverNameModel = $scope.currentServer.environment.name;
		$scope.selectConfig(0);
	};

	$scope.newEnv = function() {
		var newEnv = {
			name: $scope.newServerName
		};

		restService.createNewEnv(newEnv).then(
			function(res) {
				var l = $scope.servers.push(res.data.data) - 1;
				$scope.changeEnv(l);

				var envName = $scope.currentServer.name;

				// create conf state
				configStates[l] = {};
				configStates[l].someFailed = false;
				configStates[l].someOk = false;
				configStates[l].someNotRun = false;
				configStates[l].noChildren = true;
				for (var type of $scope.configTypes) {
					configStates[l][type] = {};
					configStates[l][type].someFailed = false;
					configStates[l][type].someOk = false;
					configStates[l][type].someNotRun = false;
					configStates[l][type].noChildren = true;

					configStates[l][type].configStates = [];
				}

				refreshConfigStates();

				$scope.newServerName = "";
				/*$scope.newEnvMessage = res.data.message;
				$timeout(function() {
					$scope.newEnvMessage = "";
				}, 3000);*/
			},
			function() {});
	};

	$scope.renameEnv = function(index) {
		var data = $scope.currentServer.environment.clone();
		data.name = $scope.serverNameModel;
		restService.updateEnv(data.id, data).then(
			function(res) {
				$scope.currentServer.environment = res.data;
			},
			function() {}
		);
	};

	$scope.removeEnv = function(index) {
		var conf = $window.confirm("Are you sure you want to delete this environment? All configs will be removed!" + $scope.currentServer.environment.name);
		if (!conf) {
			return;
		}

		i = index ? index : $scope.currentServerIndex;
		restService.removeEnv($scope.currentServer.environment.id).then(
			function(res) {
				if (res.status != 200) {
					return;
				}

				$scope.servers.splice(i, 1);
				$scope.changeEnv(i === 0 ? 0 : i - 1);
			},
			function() {});
	};

	$scope.moveCurrentEnv = function(dir) {
		var i = $scope.currentServerIndex;
		var dstIndex = i + (dir ? 1 : -1);

		restService.reorderEnv(i, dstIndex).then(
			function(res) {
				if (res.status != 200) {
					return;
				}
				var it = $scope.servers.splice(i, 1)[0];
				$scope.servers.splice(dstIndex, 0, it);
				$scope.changeEnv(dstIndex);
			},
			function() {});
	};

	/** OTHER */

	$scope.getDate = function(conf) {
		if (!conf || !conf.lastRun) {
			return "never";
		}

		return (new Date(conf.lastRun)).toLocaleString();
	};

}]);