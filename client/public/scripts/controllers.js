angular.module('controllers', []).

controller('mainController', ['$rootScope', '$scope', '$http', '$timeout', '$window', '$q', 'restService', 'modelService', function($rootScope, $scope, $http, $timeout, $window, $q, restService, modelService) {

	var singleConfigStates = {
		FAILED: 'text-danger',
		OK: 'text-success',
		NOT_RUN: 'text-warning'
	};

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
	$scope.states = null;

	var states = null;

	$scope.kaukoOn = true;

	/** UTILS */

	function getCurrentConfigList() {
		return $scope.serverIdToConfigs[$scope.currentServer.id][$scope.currentConfigType];
	}

	function getConfigList(envId, type) {
		return $scope.serverIdToConfigs[envId][type];
	}

	function updateStates() {
		$scope.states = states.initStates($scope.serverIdToConfigs).states;
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
		states = new modelService.States($scope.serverIdToConfigs);
		$scope.states = new modelService.States($scope.serverIdToConfigs).states;
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

	$scope.getConfigState = function(conf) {
		var state = conf.last_run_state;
		if (state == null) return singleConfigStates.NOT_RUN;
		else if (state == false) return singleConfigStates.OK;
		else if (state == true) return singleConfigStates.FAILED;
	};

	$scope.getRunMessage = function(config) {
		return config.last_run_message != null ? config.last_run_message : "This config has not run yet!";
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
					updateStates();

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
					updateStates();
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
					updateStates();

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
			}).then(
				function(res) {
					if (res.status != 201) {
						return $q.reject();
					}

					parseAndSortData([res.data], true);
					$scope.selectEnv($scope.servers.length - 1);
					updateStates();
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
		var conf = $window.confirm("Are you sure you want to delete this environment? (All child configs will be removed too!) " + $scope.currentServer.name);
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
					updateStates();
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

	$scope.runSingleConfig = function(index) {
		var config = index > -1 ? getCurrentConfigList()[index] : $scope.currentConfig;

		restService.runSingleConfig($scope.currentConfigType, config.id).then(
			function(res) {
				if (res.status != 200) {
					return;
				}

				var data = res.data;
				config.last_run_date = data.last_run_date;
				config.last_run_state = data.last_run_state;
				config.last_run_message = data.last_run_message;

				updateStates();
			},
			function() {
				console.log("run error");
			});
	};

	$scope.runAllOfTypeInEnv = function() {
		var configs = getCurrentConfigList();
		var promises = [];
		for (var conf of configs) {
			promises.push(restService.runSingleConfig($scope.currentConfigType, conf.id));
		}

		$q.all(promises).then(
			function(resArray) {
				var data = null;
				var i = 0;
				for (var res of resArray) {
					data = res.data;
					configs[i].last_run_date = data.last_run_date;
					configs[i].last_run_state = data.last_run_state;
					configs[i].last_run_message = data.last_run_message;
					i++;
				}

				updateStates();
			},
			function() {});
	};

	$scope.runAllInEnv = function() {
		var configs = [];
		var promises = [];
		var typeConfs = null;
		for (var confType in modelService.Config.TYPES) {
			typeConfs = getConfigList($scope.currentServer.id, confType);
			for (var conf of typeConfs) {
				promises.push(restService.runSingleConfig(confType, conf.id));
			}
			configs = configs.concat(typeConfs);
		}

		$q.all(promises).then(
			function(resArray) {
				var data = null;
				var i = 0;
				for (var res of resArray) {
					data = res.data;
					configs[i].last_run_date = data.last_run_date;
					configs[i].last_run_state = data.last_run_state;
					configs[i].last_run_message = data.last_run_message;
					i++;
				}

				updateStates();
			},
			function() {});
	};

	$scope.runAll = function() {
		var configs = [];
		var promises = [];
		var typeConfs = null;
		for (var envId in $scope.serverIdToConfigs) {
			for (var confType in modelService.Config.TYPES) {
				typeConfs = getConfigList(envId, confType);
				for (var conf of typeConfs) {
					promises.push(restService.runSingleConfig(confType, conf.id));
				}
				configs = configs.concat(typeConfs);
			}
		}

		$q.all(promises).then(
			function(resArray) {
				var data = null;
				var i = 0;
				for (var res of resArray) {
					data = res.data;
					configs[i].last_run_date = data.last_run_date;
					configs[i].last_run_state = data.last_run_state;
					configs[i].last_run_message = data.last_run_message;
					i++;
				}

				updateStates();
			},
			function() {});
	};

	/** OTHER */

	$scope.getDate = function(conf) {
		if (!conf || !conf.last_run_date) {
			return "never";
		}

		return (new Date(conf.last_run_date)).toLocaleString("cs-CZ");
	};

}]);