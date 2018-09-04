var builderApp = angular.module('configApp', [
	'controllers'
]);

builderApp.run(['$rootScope', '$location', '$timeout',
	function($rootScope, $location, $timeout) {

		'use strict';

		console.log('calling run method');

		Array.prototype.indexOfByKeyAndValue = function(key, value) {
			var i = -1;
			this.some(function(ele, index) {
				if (ele[key] == value) {
					i = index;
					return;
				}
			});
			return i;
		};

		Array.prototype.getByKeyAndValue = function(key, value) {
			var obj = null;
			this.some(function(ele, index) {
				if (ele[key] == value) {
					obj = ele;
					return;
				}
			});
			return obj;
		};

		if (angular && typeof angular.isObjectEmpty != 'function') {
			// exnteds angular object by this function
			angular.isObjectEmpty = function(obj) {
				if (obj) {
					for (var prop in obj) {
						if (obj.hasOwnProperty(prop)) {
							return false;
						}
					}
				}
				return true;
			};
		}

		//setup listeners
		$rootScope.$on('$routeChangeStart', function(ev, next, current) {
			console.log("route change start: " + $location.url());
		});
		$rootScope.$on('$routeChangeSuccess', function(ev, next, current) {
			console.log("route change suc: " + $location.url());
		});
		$rootScope.$on('$routeChangeError', function(ev, next, current) {
			console.log("route change errr: " + $location.url());
		});
	}
]);

builderApp.config(['$httpProvider', function($httpProvider) { //$routeProvider

	'use strict';

	console.log('configuring');

	//TODO: fetch routes from server
	// $routeProvider.
	// when('/', {
	// 	redirectTo: '/login'
	// }).
	// otherwise({
	// 	redirectTo: '/'
	// });

	// $httpProvider.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';
	// $locationProvider.html5Mode(true);

	// register the interceptor via an anonymous factory
	$httpProvider.interceptors.push(['$q', '$location', '$rootScope', function($q, $location, $rootScope) {
		return {
			'request': function(config) {
				$rootScope.loading = true;
				// do something on success
				return config;
			},

			'requestError': function(rejection) {
				$rootScope.loading = true;
				console.log("REQUEST ERROR FOUND");
				// do something on error
				// if (canRecover(rejection)) {
				// 	return responseOrNewPromise;
				// }
				return $q.reject(rejection);
			},

			'response': function(response) {
				$rootScope.loading = false;
				if (response.status === 401) {
					console.log('RESPONSE: found 401, back to login');
					$rootScope.doAuth();
					//$location.path('/login');
					return $q.reject(response);
				} else if (response.status === 500) {
					console.log('RESPONSE: found 500, back to login');
					$rootScope.doAuth();
					//$location.path('/login');
					return $q.reject(response);
				}
				return response || $q.when(response);
			},

			'responseError': function(rejection) {
				$rootScope.loading = false;
				if (rejection.status === 401) {
					$rootScope.doAuth();
					console.log('RESPONSE ERROR: found 401, back to login');
					//redirect them back to login page
					$location.path('/login');

					return $q.reject(rejection);
				} else if (rejection.status === 500) {
					console.log('RESPONSE ERROR: found 500, back to login');
					$rootScope.doAuth();
					$location.path('/login');

					return $q.reject(rejection);
				}
				console.log("SOMETHING BAD HAPPEND ON RESPONSE ERROR");
			}
		};
	}]);
}]);