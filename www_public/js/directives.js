'use strict';

/* Directives */


angular.module('myApp.directives', []).
  directive('appVersion', ['version', function(version) {
    return function(scope, elm, attrs) {
      elm.text(version);
    };
  }]).
  directive('srfWeatherWidgetLoader', ['$timeout', function($timeout) {
    return {
      restrict: 'C',
      link: function(scope, elm, attrs) {
        var src = 'https://mmz-srf.github.io/srf-weather-widget/main.js';
        var lastLocationName;

        function loadWidget(locationName) {
          if (!locationName || locationName === lastLocationName) {
            return;
          }

          lastLocationName = locationName;
          elm.empty();

          var target = document.createElement('div');
          target.className = 'srf-weather-widget';
          target.setAttribute('data-size', attrs.size || 'S');
          target.setAttribute('data-location-name', locationName);
          elm.append(target);

          // The SRF module initializes matching nodes once when it is evaluated.
          // Load a fresh module URL for each Angular-created widget target.
          var script = document.createElement('script');
          script.async = true;
          script.type = 'module';
          script.src = src + '?location=' + encodeURIComponent(locationName) + '&t=' + Date.now();
          script.onload = function() {
            target.className = '';
          };
          document.body.appendChild(script);
        }

        attrs.$observe('locationName', function(locationName) {
          $timeout(function() {
            loadWidget(locationName);
          });
        });
      }
    };
  }]);
