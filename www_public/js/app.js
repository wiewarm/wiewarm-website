'use strict';


// Declare app level module which depends on filters, and services
angular.module('myApp', ['myApp.filters', 'myApp.services', 'myApp.directives', 'ui.bootstrap', /*'google-maps',*/ 'ngUpload', 'ngTable']).
  config(['$routeProvider', '$locationProvider', '$httpProvider', function($routeProvider, $locationProvider, $httpProvider) {

    $locationProvider.html5Mode(true).hashPrefix('!');
    //$locationProvider.html5Mode(false);

    // does not seem to work, in the end needed to add a format to restler that allowed text/plain DELETE
    $httpProvider.defaults.headers["delete"] = {'Content-Type': 'text/html', 'X-Content-type-from-config': 'text/whatever'};


    $routeProvider.when('/index', {templateUrl: 'partials/index.html', controller: IndexCtrl});
    $routeProvider.when('/', {templateUrl: 'partials/start.html', controller: StartCtrl, reloadOnSearch: false});
    $routeProvider.when('/start', {templateUrl: 'partials/start.html', controller: StartCtrl, reloadOnSearch: false});
    $routeProvider.when('/info', {templateUrl: 'partials/info.html', controller: InfoCtrl});
    $routeProvider.when('/info', {templateUrl: 'partials/info.html', controller: InfoCtrl});
    $routeProvider.when('/admin', {templateUrl: 'partials/admin.html', controller: AdminCtrl});
    $routeProvider.when('/bad/:badid', {templateUrl: 'partials/bad.html', controller: BadCtrl});
    //$routeProvider.when('/bad//:badid', {templateUrl: 'partials/bad.html', controller: BadCtrl});
    $routeProvider.otherwise({redirectTo: '/start'});
  }]);


