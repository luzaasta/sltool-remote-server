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
	$scope.serverIsMoving = false;

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
		$scope.selectEnv(0);
	}

	function parseAndSortData(data, shouldNotSort) {
		var env = null;
		for (var server of data) {
			env = new modelService.Environment(server.environment);
			$scope.servers.push(env);
			$scope.serverIdToConfigs[env.id] = parseAndSortConfigs(server.configs, shouldNotSort);
		}
		if (!shouldNotSort) {
			$scope.servers.sortLinked('next', 'id');
		}
	}

	function parseAndSortConfigs(confs, shouldNotSort) {
		var configs = {};
		for (var type of $scope.configTypes) {
			configs[type] = [];
			for (var config of confs[type]) {
				configs[type].push(new modelService.Config.TYPES[type](config));
			}
			if (!shouldNotSort) {
				configs[type].sortLinked('next', 'id');
			}
		}

		return configs;
	}

	// CONF STATES -----

	$scope.getConfigState = function(i) {
		/*if (!configStates || Object.isEmpty(configStates)) {
			return null;
		}
		return configStates[$scope.currentServer.id][$scope.currentConfigType].configStates[i];*/
	};


	/** CONFS */

	$scope.selectConfigType = function(index) {
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
		var curr = index > -1 ? getCurrentConfigList()[index] : $scope.currentConfig;

		restService.updateConfig($scope.currentConfigType, curr.id, curr).then(
			function() {

			},
			function() {

			});
	};

	$scope.addConfig = function() {
		var prev = getCurrentConfigList().getByNext(null);

		restService.addConfig($scope.currentConfigType, $scope.currentServer.id).then(
				function(res) {
					if (res.status != 201) {
						return;
					}

					var config = new modelService.Config.TYPES[$scope.currentConfigType](res.data);
					var l = getCurrentConfigList().push(config) - 1;
					$scope.selectConfig(l);

					if (prev) {
						return restService.updateConfig($scope.currentConfigType, prev.id, {
							next: $scope.currentConfig.id
						});
					}

					return $q.reject();
				},
				function() {
					return $q.reject();
				})
			.then(
				function(res) {
					if (res.status != 204) {
						return;
					}
					prev.next = $scope.currentConfig.id;
				},
				function() {});
	};

	$scope.removeConfig = function(index) {
		var config = index > -1 ? getCurrentConfigList()[index] : $scope.currentConfig;
		var confirmed = $window.confirm("Are you sure you want to delete this config? " + config.name);
		if (!confirmed) {
			return;
		}

		var promise = null;
		var prev = getCurrentConfigList().getByNext(config.id);
		if (prev) {
			promise = restService.updateConfig($scope.currentConfigType, prev.id, {
				next: config.next
			});
		} else {
			promise = $q.resolve({
				status: 204
			});
		}

		promise
			.then(
				function(res) {
					if (res.status != 204) {
						return $q.reject();
					}
					if (prev) {
						prev.next = config.next;
					}
					return restService.removeConfig($scope.currentConfigType, config.id);
				},
				function() {
					return $q.reject();
				})
			.then(
				function(res) {
					if (res.status != 204) {
						return;
					}

					var i = index > -1 ? index : getCurrentConfigList().indexOfByKeyAndValue('id', config.id);
					if (config.id == $scope.currentConfig.id) {
						$scope.selectConfig(i === 0 ? 0 : i - 1);
					}
					getCurrentConfigList().splice(i, 1);
				},
				function() {});
	};

	// TODO
	$scope.duplicateConfig = function(index) {
		var prev = getCurrentConfigList().getByNext(null);
		var newOne = (index > -1 ? getCurrentConfigList()[index] : $scope.currentConfig).clone();
		newOne.next = null;

		restService.addConfig($scope.currentConfigType, $scope.currentServer.id, newOne).then(
				function(res) {
					if (res.status != 201) {
						return;
					}

					var config = new modelService.Config.TYPES[$scope.currentConfigType](res.data);
					var l = getCurrentConfigList().push(config) - 1;
					$scope.selectConfig(l);

					if (prev) {
						return restService.updateConfig($scope.currentConfigType, prev.id, {
							next: $scope.currentConfig.id
						});
					}

					return $q.reject();
				},
				function() {
					return $q.reject();
				})
			.then(
				function(res) {
					if (res.status != 204) {
						return;
					}
					prev.next = $scope.currentConfig.id;
				},
				function() {});
	};

	/** ENVS */

	$scope.selectEnv = function(index) {
		if (index > $scope.servers.length - 1 || index < 0) {
			return;
		}
		$scope.currentServer = $scope.servers[index];
		$scope.currentServerNameModel = $scope.currentServer.name;
		$scope.selectConfig(0);
	};



	$scope.newEnv = function() {
		var prev = $scope.servers.getByNext(null);
		restService.addEnv({
				name: $scope.newServerNameModel
			}).then(function(res) {
					if (res.status != 201) {
						return $q.reject();
					}

					parseAndSortData([res.data], true);
					$scope.selectEnv($scope.servers.length - 1);
					$scope.newServerNameModel = "";

					if (prev) {
						return restService.updateEnv(prev.id, {
							next: $scope.currentServer.id
						});
					}

					return $q.reject();
				},
				function() {
					return $q.reject();
				})
			.then(
				function(res) {
					if (res.status != 204) {
						return;
					}
					prev.next = $scope.currentServer.id;
				},
				function() {});
	};

	$scope.renameEnv = function(index) {
		var data = {
			name: $scope.currentServerNameModel
		};
		var id = index > -1 ? $scope.servers[index] : $scope.currentServer.id;
		restService.updateEnv(id, data).then(
			function(res) {
				if (res.status != 204) {
					return;
				}

				$scope.currentServer.name = $scope.currentServerNameModel;
			},
			function() {}
		);
	};

	$scope.removeEnv = function(index) {
		var conf = $window.confirm("Are you sure you want to delete this environment? All configs will be removed!" + $scope.currentServer.name);
		if (!conf) {
			return;
		}

		var server = index > -1 ? $scope.servers[i] : $scope.currentServer;

		var promise = null;
		var prev = $scope.servers.getByNext(server.id);
		if (prev) {
			promise = restService.updateEnv(prev.id, {
				next: server.next
			});
		} else {
			promise = $q.resolve({
				status: 204
			});
		}

		promise
			.then(
				function(res) {
					if (res.status != 204) {
						return $q.reject();
					}
					if (prev) {
						prev.next = server.next;
					}
					return restService.removeEnv(server.id);
				},
				function() {
					return $q.reject();
				})
			.then(
				function(res) {
					if (res.status != 204) {
						return;
					}

					var i = index > -1 ? index : $scope.servers.indexOfByKeyAndValue('id', server.id);
					$scope.servers.splice(i, 1);
					$scope.selectEnv(i === 0 ? 0 : i - 1);
				},
				function() {});
	};

	$scope.moveEnv = function(dir, index) {
		var currD, prevD, prevPrevD, nextD, d1, d2, d3;
		var curr, prev, prevPrev, next;
		curr = index > -1 ? $scope.servers[index] : $scope.currentServer;

		if (dir) { // right
			prev = $scope.servers.getByNext(curr.id);
			next = $scope.servers.getById(curr.next);
			currD = {
				id: curr.id,
				next: next.next
			};
			if (prev) {
				prevD = {
					id: prev.id,
					next: next.id
				};
			}
			nextD = {
				id: next.id,
				next: curr.id
			};

			d1 = currD;
			d2 = nextD;
			d3 = prevD;
		} else { // left
			prev = $scope.servers.getByNext(curr.id);
			prevPrev = prev ? $scope.servers.getByNext(prev.id) : null;
			currD = {
				id: curr.id,
				next: prev ? prev.id : null
			};
			if (prev) {
				prevD = {
					id: prev.id,
					next: curr.next
				};
			}
			if (prevPrev) {
				prevPrevD = {
					id: prevPrev.id,
					next: curr.id
				};
			}
			d1 = currD;
			d2 = prevD;
			d3 = prevPrevD;
		}

		$scope.serverIsMoving = true;
		restService.updateEnv(d1.id, d1)
			.then(
				function(res) {
					$scope.servers.getById(d1.id).next = d1.next;
					return restService.updateEnv(d2.id, d2);
				},
				function() {
					return $q.reject();
				}
			)
			.then(
				function(res) {
					$scope.servers.getById(d2.id).next = d2.next;
					if (d3) {
						return restService.updateEnv(d3.id, d3);
					}
					return $q.reject();
				},
				function() {
					return $q.reject();
				}
			)
			.then(
				function(res) {
					$scope.servers.getById(d3.id).next = d3.next;
					return $q.resolve();
				},
				function() {
					return $q.resolve();
				}
			).then(function() {
				$scope.servers.sortLinked('next', 'id');
				$scope.serverIsMoving = false;
			}, function() {
				console.error("something bad happened");
			});
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
		if (!conf || !conf.last_run_date) {
			return "never";
		}

		return (new Date(conf.last_run_date)).toLocaleString();
	};

}]);