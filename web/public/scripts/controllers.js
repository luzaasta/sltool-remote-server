angular.module('controllers', []).

controller('mainController', ['$rootScope', '$scope', '$http', '$timeout', '$window', '$q', function($rootScope, $scope, $http, $timeout, $window, $q) {

	var singleConfigStates = {
		FAILED: 'text-danger',
		OK: 'text-success',
		NOT_RUN: 'text-warning'
	};

	$scope.newEnvName = "";

	$scope.dbTypes = ["PostgreSQL", "DB2"];
	$scope.configTypes = ["DB", "SSH"];

	$scope.currentConfigType = "DB";
	$scope.currentConfig = null;
	$scope.currentConfigIndex = -1;

	$scope.envConfigs = [];
	$scope.currentEnv = null;

	var configStates = null;


	/** REST */
	$scope.kaukoOn = true;

	var pingKauko = function() {
		return $http.get('/ping/kauko');
	};

	var getEnvList = function() {
		return $http.get('/env');
	};

	var postNewEnv = function(newEnv) {
		return $http.post('/env', newEnv);
	};

	var putCurrentEnv = function() {
		return $http.put(`/env/${$scope.currentEnv.envName}`, $scope.currentEnv);
	};

	var reorderCurrentEnv = function(newIndex) {
		return $http.post('/func/reorderEnv', {
			envName: $scope.currentEnv.envName,
			newIndex: newIndex
		});
	};

	var removeCurrentEnv = function() {
		return $http.delete(`/env/${$scope.currentEnv.envName}`);
	};

	var duplicateConfig = function(index) {
		var data = {
			envName: $scope.currentEnv.envName,
			configType: $scope.currentConfigType,
			index: index
		};

		return $http.post('/func/duplicateConfig', data);
	};

	var runSingleInEnv = function(index) {
		if (!$scope.kaukoOn) {
			return $q.reject("KAUKO is off");
		}
		return $http.get(`/refresh/${$scope.currentEnv.envName}/${$scope.currentConfigType}/${index}`);
	};

	/** INIT PARTS */

	getEnvList().then(
		function(res) {
			init(res.data);
		},
		function() {
			console.log("get configs error");
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
		$scope.currentConfigType = $scope.configTypes[index];
		$scope.selectConfig(0);
	};

	// call rest and assign new one!!!
	$scope.addConfig = function() {
		var newConf = $scope.currentConfigType == "SSH" ? {
			name: "new config",
			connectionConf: {}
		} : {
			name: "new config"
		};
		var l = $scope.currentEnv[$scope.currentConfigType].push(newConf) - 1;
		putCurrentEnv().then(function() {
			$scope.selectConfig(l);
			configStates[$scope.currentEnv.envName][$scope.currentConfigType].configStates[l] = singleConfigStates.NOT_RUN;
			refreshConfigStates();
		});
	};

	$scope.removeConfig = function(index) {
		var it = null;
		var i = index ? index : $scope.currentConfigIndex;
		it = $scope.currentEnv[$scope.currentConfigType].splice(i, 1)[0];

		putCurrentEnv().then(
			function() {
				var ind = i > 0 ? i - 1 : ($scope.currentEnv[$scope.currentConfigType].length > 0 ? 0 : -1);
				$scope.selectConfig(ind);
				configStates[$scope.currentEnv.envName][$scope.currentConfigType].configStates.splice(i, 1);
				refreshConfigStates();
			},
			function() {
				$scope.currentEnv[$scope.currentConfigType].splice(i, 0, it);
				$scope.currentConfig = it;
			});
	};

	$scope.duplicateConfig = function(index) {
		var i = index ? index : $scope.currentConfigIndex;
		duplicateConfig(index).then(
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
		}
		$scope.currentConfig = $scope.currentEnv[$scope.currentConfigType][index];
		$scope.currentConfigIndex = index;
	};

	/** RUNS */

	$scope.runSingleInEnv = function(index) {
		var i = index ? index : $scope.currentConfigIndex;
		runSingleInEnv(i).then(function(res) {
			if (res.status != 200) {
				return;
			}

			var data = res.data;
			var failed = data[$scope.currentEnv.envName][$scope.currentConfigType][i].failed;
			var state = failed === true ? singleConfigStates.FAILED : (failed === false ? singleConfigStates.OK : singleConfigStates.NOT_RUN);
			configStates[$scope.currentEnv.envName][$scope.currentConfigType].configStates[i] = state;
			refreshConfigStates();
		}, function() {
			console.log("run error");
		});
	};

	$scope.runAllOfTypeInEnv = function() {
		$http.get(`/refresh/${$scope.currentEnv.envName}/${$scope.currentConfigType}`).then(function(res) {
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
		}, function() {
			console.log("run error");
		});
	};

	$scope.runAllInEnv = function() {
		$http.get(`/refresh/${$scope.currentEnv.envName}`).then(function(res) {
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
		}, function() {
			console.log("run error");
		});
	};

	$scope.runAll = function() {
		$http.get('/refresh').then(function(res) {
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
		}, function() {
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
			envName: $scope.newEnvName,
			DB: [],
			SSH: []
		};

		postNewEnv(newEnv).then(
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
		removeCurrentEnv().then(
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
		reorderCurrentEnv(dstIndex).then(function(res) {
				if (res.status != 200) {
					return;
				}
				var it = $scope.envConfigs.splice(srcIndex, 1)[0];
				$scope.envConfigs.splice(dstIndex, 0, it);
			},
			function() {});
	};

}]);