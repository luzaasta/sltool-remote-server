angular.module('controllers', []).

controller('mainController', ['$rootScope', '$scope', '$http', '$timeout', '$window', '$q', 'restService', 'modelService', function($rootScope, $scope, $http, $timeout, $window, $q, restService, modelService) {

	var singleConfigStates = {
		FAILED: 'text-danger',
		OK: 'text-success',
		NOT_RUN: 'text-warning'
	};

	var configStates = null;

	$scope.dbTypes = ["PostgreSQL", "DB2"];
	$scope.configTypes = Object.keys(modelService.Config.TYPES);
	$scope.currentConfigType = $scope.configTypes[0];

	$scope.serverIdToConfigs = {};
	$scope.servers = [];
	$scope.currentServer = null;
	$scope.currentConfig = null;

	$scope.currentServerNameModel = "";
	$scope.newServerNameModel = "";

	$scope.kaukoOn = true;

	/** UTILS */
	function getCurrentConfigList() {
		return $scope.serverIdToConfigs[$scope.currentServer.id][$scope.currentConfigType];
	}

	/** INIT PARTS */

	restService.getAllData().then(
		function(res) {
			init(res.data);
		},
		function() {
			console.log("Error occured when getting configs!");
		}
	);

	function init(data) {
		parseAndSortData(data);
		// initConfigStates();
		$scope.changeEnv(0);
	}

	function parseAndSortData(data) {
		var env = null;
		for (var server of data) {
			env = new modelService.Environment(server.environment);
			$scope.servers.push(env);
			$scope.serverIdToConfigs[env.id] = parseAndSortConfigs(server.configs);
		}
		$scope.servers.sortLinked('next', 'id');
	}

	function parseAndSortConfigs(confs) {
		var configs = {};
		for (var type of $scope.configTypes) {
			configs[type] = [];
			for (var config of confs[type]) {
				configs[type].push(new modelService.Config.TYPES[type](config));
			}
			configs[type].sortLinked('next', 'id');
		}

		return configs;
	}

	// CONF STATES -----

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
		if (!configStates || Object.isEmpty(configStates)) {
			return null;
		}
		return configStates[index][prop];
	};

	$scope.getConfigListState = function(type, prop) {
		if (!configStates || Object.isEmpty(configStates)) {
			return null;
		}
		return configStates[$scope.currentServer.order - 1][type][prop];
	};

	$scope.getConfigState = function(i) {
		if (!configStates || Object.isEmpty(configStates)) {
			return null;
		}
		return configStates[$scope.currentServer.id][$scope.currentConfigType].configStates[i];
	};


	/** CONFS */

	$scope.changeConfigType = function(index) {
		if (index > $scope.configTypes.length - 1 || index < 0) {
			return;
		}
		$scope.currentConfigType = $scope.configTypes[index];
		$scope.selectConfig(0);
	};

	$scope.selectConfig = function(index) {
		if (index < 0 || index > getCurrentConfigList().length - 1) {
			$scope.currentConfig = null;
			return;
		}
		$scope.currentConfig = getCurrentConfigList()[index];
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

		restService.addConfig($scope.currentConfigType, $scope.currentServer.id).then(
			function(res) {
				if (res.status != 200) {
					return;
				}

				var config = new modelService.Config.TYPES[$scope.currentConfigType].ENTITY_CONSTRUCTOR(res.data);
				var l = $scope.currentServer.configs[$scope.currentConfigType].push(config) - 1;
				$scope.selectConfig(l);
				//configStates[$scope.currentServer.name][$scope.currentConfigType].configStates[l] = singleConfigStates.NOT_RUN;
				//refreshConfigStates();
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

	/** ENVS */

	$scope.changeEnv = function(index) {
		if (index > $scope.servers.length - 1 || index < 0) {
			return;
		}
		$scope.currentServer = $scope.servers[index];
		$scope.currentServerNameModel = $scope.currentServer.name;
		$scope.selectConfig(0);
	};



	$scope.newEnv = function() {

		var newEnv = new modelService.Environment();
		newEnv.name = $scope.newServerNameModel;

		restService.createNewEnv(newEnv).then(
			function(res) {

				$scope.servers[$scope.servers.length - 1].next = res.data.environment.id;

				parseAndSortData([res.data]);

				$scope.changeEnv($scope.servers.length - 1);

				$scope.newServerNameModel = "";
			},
			function() {});
	};

	$scope.renameEnv = function(index) {
		var data = $scope.currentServer.clone();
		data.name = $scope.currentServerNameModel;
		restService.updateEnv(data.id, data).then(
			function(res) {
				copyOwnProps(new modelService.Environment(res.data), $scope.currentServer);
			},
			function() {}
		);
	};

	$scope.removeEnv = function(index) {
		var conf = $window.confirm("Are you sure you want to delete this environment? All configs will be removed!" + $scope.currentServer.name);
		if (!conf) {
			return;
		}

		var id = index >= 0 ? $scope.servers[i].id : $scope.currentServer.id;

		restService.removeEnv(id).then(
			function(res) {
				if (!res.status.toString().startsWith("20")) {
					return;
				}

				var i = index >= 0 || $scope.servers.indexOfByKeyAndValue('id', id);
				if (i > 0) {
					var next = $scope.servers[i].next;
					$scope.servers[i - 1].next = next;
				}
				$scope.servers.splice(i, 1);
				$scope.servers.sortLinked('next', 'id');
				$scope.changeEnv(i === 0 ? 0 : i - 1);
			},
			function() {});
	};

	$scope.moveCurrentEnv = function(dir) {
		var oldOrder = $scope.currentServer.order;
		var newOrder = oldOrder + (dir ? 1 : -1);
		var data1 = {
			order: newOrder
		};
		var data2 = {
			order: oldOrder
		};

		restService.updateEnv($scope.currentServer.id, data1)
			.then(
				function(res) {
					$scope.currentServer.order = res.data.order;
					return restService.updateEnv($scop.servers[newOrder - 1].id, data2);
				},
				function() {}
			)
			.then(
				function(res) {
					$scop.servers[newOrder - 1].order = res.data.order;
					$scope.servers.sortLinked('next', 'id');
					$scope.changeEnv(newOrder - 1);
				},
				function() {}
			);
	};

	function copyOwnProps(src, dst) {
		for (prop in src) {
			if (src.hasOwnProperty(prop)) {
				dst[prop] = src[prop];
			}
		}
	}

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

				if (Object.isEmpty(data)) {
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

				if (Object.isEmpty(data)) {
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

				if (Object.isEmpty(data)) {
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

	/** OTHER */

	$scope.getDate = function(conf) {
		if (!conf || !conf.lastRun) {
			return "never";
		}

		return (new Date(conf.lastRun)).toLocaleString();
	};

}]);