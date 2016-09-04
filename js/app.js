var homeApp = angular.module('homeApp', [
  'ngRoute'
]);

homeApp.config(['$routeProvider',
  function($routeProvider) {
    $routeProvider.
      when('/', {
        templateUrl: 'partials/home.html',
        controller: 'controllerHome'
      }).
      otherwise({
        redirectTo: '/'
      });
  }]);

homeApp.controller('controllerHome', ['$scope', '$http', '$timeout',
  function ($scope, $http, $timeout) {
    
    $scope.currentMatch = null;

    $scope.increment = function() {
      window.vcScene.declined();
    };

    $scope.accept = function() {
      window.vcScene.accepted();
    };
  }
]);