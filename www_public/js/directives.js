'use strict';

/* Directives */


angular.module('myApp.directives', []).
  directive('appVersion', ['version', function(version) {
    return function(scope, elm, attrs) {
      elm.text(version);
    };
  }]).
  directive('srfWeatherWidget', [function() {
    return {
      restrict: 'C',
      link: function(scope, elm) {
        var src = 'https://mmz-srf.github.io/srf-weather-widget/main.js';
        if (!document.querySelector('script[data-srf-weather-widget-script]')) {
          var script = document.createElement('script');
          script.async = true;
          script.type = 'module';
          script.src = src;
          script.setAttribute('data-srf-weather-widget-script', '1');
          document.body.appendChild(script);
        }
      }
    };
  }]);
