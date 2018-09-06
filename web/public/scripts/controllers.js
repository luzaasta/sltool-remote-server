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
	$scope.currentEnvIndex = -1;
	$scope.envNameModel = "";

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
		var index = 0;
		for (var env of $scope.envConfigs) {
			configStates[index] = {};
			configStates[index].someFailed = false;
			configStates[index].someOk = false;

			for (var type of $scope.configTypes) {
				configStates[index][type] = {};
				configStates[index][type].someFailed = false;
				configStates[index][type].someOk = false;

				configStates[index][type].configStates = [];

				// handle no children and some not run
				if (env[type].length == 0) {
					configStates[index].noChildren = true;
					configStates[index][type].noChildren = true;
					configStates[index][type].someNotRun = false;
				} else {
					configStates[index].someNotRun = true;
					configStates[index][type].noChildren = false;
					configStates[index][type].someNotRun = true;
				}

				for (var i = 0; i < env[type].length; i++) {
					configStates[index][type].configStates.push(singleConfigStates.NOT_RUN);
				}
			}
			index++;
		}

		console.log(configStates);
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
		return configStates[$scope.currentEnvIndex][type][prop];
	};

	$scope.getConfigState = function(i) {
		if (!configStates || angular.isObjectEmpty(configStates)) {
			return null;
		}
		return configStates[$scope.currentEnvIndex][$scope.currentConfigType].configStates[i];
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

				var ie = 0;
				for (var env of $scope.envConfigs) {
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
		if (index > $scope.envConfigs.length - 1 || index < 0) {
			return;
		}
		$scope.currentEnv = $scope.envConfigs[index];
		$scope.currentEnvIndex = index;
		$scope.envNameModel = $scope.currentEnv.envName;
		$scope.selectConfig(0);
	};

	$scope.newEnv = function() {
		var newEnv = {
			envName: $scope.newEnvName
		};

		restService.createNewEnv(newEnv).then(
			function(res) {
				var l = $scope.envConfigs.push(res.data.env) - 1;
				$scope.changeEnv(l);

				var envName = $scope.currentEnv.envName;

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

				$scope.newEnvName = "";
				$scope.newEnvMessage = res.data.message;
				$timeout(function() {
					$scope.newEnvMessage = "";
				}, 3000);
			},
			function() {});
	};

	$scope.renameEnv = function(index) {
		var i = index ? index : $scope.currentEnvIndex;
		var data = {
			envName: $scope.envNameModel
		};
		restService.updateEnv(i, data).then(
			function(res) {
				$scope.envConfigs[i].envName = res.data.env.envName;
			},
			function() {}
		);
	};

	$scope.removeEnv = function(index) {
		var conf = $window.confirm("Are you sure you want to delete this environment? " + $scope.currentEnv.envName);
		if (!conf) {
			return;
		}

		i = index ? index : $scope.currentEnvIndex;
		restService.removeEnv(i).then(
			function(res) {
				if (res.status != 200) {
					return;
				}

				$scope.envConfigs.splice(i, 1);
				$scope.changeEnv(i === 0 ? 0 : i - 1);
			},
			function() {});
	};

	$scope.moveCurrentEnv = function(dir) {
		var i = $scope.currentEnvIndex;
		var dstIndex = i + (dir ? 1 : -1);

		restService.reorderEnv(i, dstIndex).then(
			function(res) {
				if (res.status != 200) {
					return;
				}
				var it = $scope.envConfigs.splice(i, 1)[0];
				$scope.envConfigs.splice(dstIndex, 0, it);
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