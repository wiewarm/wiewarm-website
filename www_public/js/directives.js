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
        var lastWidgetKey;

        function loadWidget(locationName, geolocation) {
          var widgetKey = geolocation || locationName;
          if (!widgetKey || widgetKey === lastWidgetKey) {
            return;
          }

          lastWidgetKey = widgetKey;
          elm.empty();

          var target = document.createElement('div');
          target.className = 'srf-weather-widget';
          target.setAttribute('data-size', attrs.size || 'S');

          if (geolocation) {
            target.setAttribute('data-geolocation', geolocation);
          } else if (locationName) {
            target.setAttribute('data-location-name', locationName);
          }

          elm.append(target);

          // The SRF module initializes matching nodes once when it is evaluated.
          // Load the widget module for the created target using the same pattern as the
          // published SRF example, with the location details supplied through the DOM.
          var script = document.createElement('script');
          script.async = true;
          script.type = 'module';
          script.src = src;
          script.onload = function() {
            target.className = '';
          };
          document.body.appendChild(script);
        }

        function updateWidget() {
          $timeout(function() {
            loadWidget(attrs.locationName, attrs.dataGeolocation);
          });
        }

        attrs.$observe('locationName', updateWidget);
        attrs.$observe('dataGeolocation', updateWidget);
      }
    };
  }]);
