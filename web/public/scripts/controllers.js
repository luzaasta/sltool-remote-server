angular.module('controllers', []).

controller('mainController', ['$rootScope', '$scope', '$http', '$timeout', '$window', '$q', 'restService', function($rootScope, $scope, $http, $timeout, $window, $q, restService) {

	var singleConfigStates = {
		FAILED: 'text-danger',
		OK: 'text-success',
		NOT_RUN: 'text-warning'
	};

	var configStates = null;

	$scope.newEnvName = "";

	$scope.dbTypes = ["PostgreSQL", "DB2"];
	$scope.configTypes = ["DB", "SSH"];

	$scope.currentConfigType = "DB";
	$scope.currentConfig = null;
	$scope.currentConfigIndex = -1;

	$scope.envConfigs = [];
	$scope.currentEnv = null;

	$scope.kaukoOn = true;

	/** INIT PARTS */

	restService.getEnvList().then(
		function(res) {
			init(res.data);
		},
		function() {
			console.log("Error occured when getting configs!");
		}
	);

	function init(data) {
		$scope.envConfigs = data;
		initConfigStates();
		$scope.changeEnv(0);
	}

	/** CONF STATES */

	function initConfigStates() {
		configStates = {};
		var envName = "";
		for (var env of $scope.envConfigs) {
			envName = env.envName;
			configStates[envName] = {};
			configStates[envName].someFailed = false;
			configStates[envName].someOk = false;

			for (var type of $scope.configTypes) {
				configStates[envName][type] = {};
				configStates[envName][type].someFailed = false;
				configStates[envName][type].someOk = false;

				configStates[envName][type].configStates = [];

				// handle no children and some not run
				if (env[type].length == 0) {
					configStates[envName].noChildren = true;
					configStates[envName][type].noChildren = true;
					configStates[envName][type].someNotRun = false;
				} else {
					configStates[envName].someNotRun = true;
					configStates[envName][type].noChildren = false;
					configStates[envName][type].someNotRun = true;
				}

				for (var i = 0; i < env[type].length; i++) {
					configStates[envName][type].configStates.push(singleConfigStates.NOT_RUN);
				}
			}
		}

		console.log(configStates);
	}

	// no children in type is the same as configstates.length == 0
	function refreshConfigStates() {
		console.log(configStates);
		var failedE = okE = notRunE = noChildrenE = failedT = okT = notRunT = 0;
		for (var envName in configStates) {

			failedE = okE = notRunE = noChildrenE = 0;

			for (var type of $scope.configTypes) {

				failedT = okT = notRunT = 0;

				if (configStates[envName][type].configStates.length == 0) {
					configStates[envName][type].noChildren = true;
					noChildrenE++;
				} else {
					configStates[envName][type].noChildren = false;
				}

				for (var i = 0; i < configStates[envName][type].configStates.length; i++) {

					var state = configStates[envName][type].configStates[i];

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
				configStates[envName][type].someFailed = failedT > 0;
				configStates[envName][type].someOk = okT > 0;
				configStates[envName][type].someNotRun = notRunT > 0;

			}
			configStates[envName].noChildren = noChildrenE > 0;
			configStates[envName].someFailed = failedE > 0;
			configStates[envName].someOk = okE > 0;
			configStates[envName].someNotRun = notRunE > 0;
		}

		console.log(configStates);
	}

	$scope.getEnvConfigState = function(envName, prop) {
		if (!configStates || angular.isObjectEmpty(configStates)) {
			return null;
		}
		return configStates[envName][prop];
	};

	$scope.getConfigListState = function(type, prop) {
		if (!configStates || angular.isObjectEmpty(configStates)) {
			return null;
		}
		return configStates[$scope.currentEnv.envName][type][prop];
	};

	$scope.getConfigState = function(i) {
		if (!configStates || angular.isObjectEmpty(configStates)) {
			return null;
		}
		return configStates[$scope.currentEnv.envName][$scope.currentConfigType].configStates[i];
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

		restService.updateConfig($scope.currentEnv, $scope.currentConfigType, i).then(
			function() {

			},
			function() {

			});
	};

	$scope.addConfig = function(index) {
		var i = index ? index : $scope.currentConfigIndex;

		restService.addConfig($scope.currentEnv, $scope.currentConfigType).then(
			function(res) {
				if (res.status != 200) {
					return;
				}

				var config = res.data.config;
				var l = $scope.currentEnv[$scope.currentConfigType].push(config) - 1;
				$scope.selectConfig(l);
				configStates[$scope.currentEnv.envName][$scope.currentConfigType].configStates[l] = singleConfigStates.NOT_RUN;
				refreshConfigStates();
			},
			function() {});
	};

	$scope.removeConfig = function(index) {
		var i = index ? index : $scope.currentConfigIndex;

		restService.removeConfig($scope.currentEnv, $scope.currentConfigType, i).then(
			function(res) {
				if (res.status != 200) {
					return;
				}

				it = $scope.currentEnv[$scope.currentConfigType].splice(i, 1)[0];
				var ind = i > 0 ? i - 1 : ($scope.currentEnv[$scope.currentConfigType].length > 0 ? 0 : -1);
				$scope.selectConfig(ind);
				configStates[$scope.currentEnv.envName][$scope.currentConfigType].configStates.splice(i, 1);
				refreshConfigStates();
			},
			function() {});
	};

	$scope.duplicateConfig = function(index) {
		var i = index ? index : $scope.currentConfigIndex;

		restService.duplicateConfig($scope.currentEnv, $scope.currentConfigType, i).then(
			function(res) {
				if (res.status != 200) {
					return;
				}
				var data = res.data;
				var l = $scope.currentEnv[$scope.currentConfigType].push(data) - 1;
				$scope.selectConfig(l);
				configStates[$scope.currentEnv.envName][$scope.currentConfigType].configStates[l] = singleConfigStates.NOT_RUN;
				refreshConfigStates();
			},
			function() {}
		);
	};

	$scope.selectConfig = function(index) {
		if (index < 0 || index > $scope.currentEnv[$scope.currentConfigType].length - 1) {
			$scope.currentConfig = null;
			$scope.currentConfigIndex = -1;
			return;
		}
		$scope.currentConfig = $scope.currentEnv[$scope.currentConfigType][index];
		$scope.currentConfigIndex = index;
	};

	/** RUNS */

	$scope.runSingleInEnv = function(index) {
		var i = index ? index : $scope.currentConfigIndex;

		restService.runSingleConfig($scope.currentEnv, $scope.currentConfigType, i).then(
			function(res) {
				if (res.status != 200) {
					return;
				}

				var data = res.data;
				$scope.currentEnv[$scope.currentConfigType][i].lastRun = data[$scope.currentEnv.envName][$scope.currentConfigType][i].lastRun;

				var failed = data[$scope.currentEnv.envName][$scope.currentConfigType][i].failed;
				var state = failed === true ? singleConfigStates.FAILED : (failed === false ? singleConfigStates.OK : singleConfigStates.NOT_RUN);
				configStates[$scope.currentEnv.envName][$scope.currentConfigType].configStates[i] = state;
				refreshConfigStates();
			},
			function() {
				console.log("run error");
			});
	};

	$scope.runAllOfTypeInEnv = function() {
		restService.runAllInEnvForConfigType($scope.currentEnv, $scope.currentConfigType).then(
			function(res) {
				if (res.status != 200) {
					return;
				}

				var data = res.data;

				if (angular.isObjectEmpty(data)) {
					return;
				}

				for (var i in data[$scope.currentEnv.envName][$scope.currentConfigType]) {
					var failed = data[$scope.currentEnv.envName][$scope.currentConfigType][i].failed;
					var state = failed === true ? singleConfigStates.FAILED : (failed === false ? singleConfigStates.OK : singleConfigStates.NOT_RUN);
					configStates[$scope.currentEnv.envName][$scope.currentConfigType].configStates[i] = state;
				}

				refreshConfigStates();
			},
			function() {
				console.log("run error");
			});
	};

	$scope.runAllInEnv = function() {
		restService.runAllInEnv($scope.currentEnv).then(
			function(res) {
				if (res.status != 200) {
					return;
				}

				var data = res.data;

				if (angular.isObjectEmpty(data)) {
					return;
				}

				for (var type of $scope.configTypes) {
					for (var i in data[$scope.currentEnv.envName][type]) {
						var failed = data[$scope.currentEnv.envName][type][i].failed;
						var state = failed === true ? singleConfigStates.FAILED : (failed === false ? singleConfigStates.OK : singleConfigStates.NOT_RUN);
						configStates[$scope.currentEnv.envName][type].configStates[i] = state;
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

				for (var env of $scope.envConfigs) {
					for (var type of $scope.configTypes) {
						for (var i in data[env.envName][type]) {
							var failed = data[env.envName][type][i].failed;
							var state = failed === true ? singleConfigStates.FAILED : (failed === false ? singleConfigStates.OK : singleConfigStates.NOT_RUN);
							configStates[env.envName][type].configStates[i] = state;
						}
					}
				}

				refreshConfigStates();
			},
			function() {
				console.log("run error");
			});
	};

	/** ENVS */

	$scope.changeEnv = function(index) {
		if (index > $scope.envConfigs.length - 1 || index < 0) {
			return;
		}
		$scope.currentEnv = $scope.envConfigs[index];
		$scope.selectConfig(0);
	};

	$scope.newEnv = function() {
		var newEnv = {
			envName: $scope.newEnvName
		};

		restService.createNewEnv(newEnv).then(
			function(res) {
				var l = $scope.envConfigs.push(res.data.newConfig) - 1;
				$scope.changeEnv(l);

				var envName = $scope.currentEnv.envName;
				// create conf state
				configStates[envName] = {};
				configStates[envName].someFailed = false;
				configStates[envName].someOk = false;
				configStates[envName].someNotRun = false;
				configStates[envName].noChildren = true;
				for (var type of $scope.configTypes) {
					configStates[envName][type] = {};
					configStates[envName][type].someFailed = false;
					configStates[envName][type].someOk = false;
					configStates[envName][type].someNotRun = false;
					configStates[envName][type].noChildren = true;

					configStates[envName][type].configStates = [];
				}

				refreshConfigStates();

				$scope.newEnvName = "";
				$scope.newEnvMessage = res.data.message;
				$timeout(function() {
					$scope.newEnvMessage = "";
				}, 3000);
			},
			function() {});

	};

	$scope.removeEnv = function() {
		var conf = $window.confirm("Are you sure you want to delete this environment? " + $scope.currentEnv.envName);
		if (!conf) {
			return;
		}
		restService.removeCurrentEnv($scope.currentEnv.envName).then(
			function(res) {
				if (res.status != 200) {
					return;
				}
				var i = $scope.envConfigs.indexOfByKeyAndValue('envName', $scope.currentEnv.envName);
				$scope.envConfigs.splice(i, 1);
				$scope.changeEnv(i === 0 ? 0 : i - 1);
			},
			function() {});
	};

	$scope.moveCurrentEnv = function(dir) {
		var srcIndex = $scope.envConfigs.indexOfByKeyAndValue('envName', $scope.currentEnv.envName);
		var dstIndex = srcIndex + (dir ? 1 : -1);

		restService.reorderCurrentEnv($scope.currentEnv.envName, dstIndex).then(function(res) {
				if (res.status != 200) {
					return;
				}
				var it = $scope.envConfigs.splice(srcIndex, 1)[0];
				$scope.envConfigs.splice(dstIndex, 0, it);
			},
			function() {});
	};


	$scope.getDate = function(conf) {
		if (!conf || !conf.lastRun) {
			return "never";
		}

		return (new Date(conf.lastRun)).toLocaleString();
	};

}]);