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
        var pendingWidgetKey;
        var updatePromise;
        var forecastPointCache = {};
        var locationNameCache = {};

        function hasUnresolvedTemplateValue(value) {
          return value && value.indexOf('{{') !== -1;
        }

        function isCoordinatePair(value) {
          return /^-?\d+(\.\d+)?,-?\d+(\.\d+)?$/.test(value);
        }

        function normalizeLocationName(value) {
          return (value || '').toLowerCase();
        }

        function locationNameCandidates(locationName) {
          var candidates = [locationName];
          var withoutCanton = locationName.replace(/\s+[A-Z]{2}$/, '');

          if (withoutCanton !== locationName) {
            candidates.push(withoutCanton);
          }

          return candidates;
        }

        function pickLocationNameMatch(locationName, locations) {
          var normalizedName = normalizeLocationName(locationName);
          var i;

          for (i = 0; i < locations.length; i++) {
            if (locations[i].ch && normalizeLocationName(locations[i].name) === normalizedName) {
              return locations[i];
            }
          }

          return null;
        }

        function queryLocationNameForecastPointId(locationName) {
          if (!locationName) {
            return Promise.reject(new Error('No SRF location name supplied'));
          }

          if (locationNameCache[locationName]) {
            return Promise.resolve(locationNameCache[locationName]);
          }

          var url = 'https://www.srf.ch/meteoapi/geolocationNames?name=' +
            encodeURIComponent(locationName);

          return fetch(url)
            .then(function(response) {
              if (!response.ok) {
                throw new Error('SRF location name lookup failed: ' + response.status);
              }
              return response.json();
            })
            .then(function(locations) {
              var match;

              if (!locations || !locations.length) {
                throw new Error('SRF location name lookup returned no forecast point');
              }

              match = pickLocationNameMatch(locationName, locations);
              if (!match || !match.geolocation || !match.geolocation.id) {
                throw new Error('SRF location name lookup returned no forecast point');
              }

              locationNameCache[locationName] = match.geolocation.id;
              return match.geolocation.id;
            });
        }

        function resolveLocationNameForecastPointId(locationName) {
          var candidates = locationNameCandidates(locationName);

          function resolveCandidate(index) {
            if (index >= candidates.length) {
              return Promise.reject(new Error('SRF location name lookup returned no exact forecast point'));
            }

            return queryLocationNameForecastPointId(candidates[index])
              .catch(function() {
                return resolveCandidate(index + 1);
              });
          }

          return resolveCandidate(0);
        }

        function resolveForecastPointId(geolocation) {
          if (!isCoordinatePair(geolocation)) {
            return Promise.reject(new Error('No SRF coordinate pair supplied'));
          }

          if (forecastPointCache[geolocation]) {
            return Promise.resolve(forecastPointCache[geolocation]);
          }

          var parts = geolocation.split(',');
          var url = 'https://www.srf.ch/meteoapi/geolocations?longitude=' +
            encodeURIComponent(parts[1]) + '&latitude=' + encodeURIComponent(parts[0]);

          return fetch(url)
            .then(function(response) {
              if (!response.ok) {
                throw new Error('SRF geolocation lookup failed: ' + response.status);
              }
              return response.json();
            })
            .then(function(locations) {
              if (!locations || !locations.length || !locations[0].id) {
                throw new Error('SRF geolocation lookup returned no forecast point');
              }

              forecastPointCache[geolocation] = locations[0].id;
              return locations[0].id;
            });
        }

        function resolveWidgetForecastPointId(locationName, geolocation) {
          return resolveLocationNameForecastPointId(locationName)
            .catch(function() {
              return resolveForecastPointId(geolocation);
            });
        }

        function renderWidget(locationName, forecastPointId, widgetKey) {
          if (!forecastPointId && !locationName) {
            return;
          }

          lastWidgetKey = widgetKey;
          pendingWidgetKey = null;
          elm.empty();

          var target = document.createElement('div');
          target.className = 'srf-weather-widget';
          target.setAttribute('data-size', attrs.size || 'S');

          if (forecastPointId) {
            target.setAttribute('data-geolocation', forecastPointId);
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
          script.src = src + '?location=' + encodeURIComponent(widgetKey) + '&t=' + Date.now();
          script.onload = function() {
            target.className = '';
          };
          document.body.appendChild(script);
        }

        function loadWidget(locationName, geolocation) {
          locationName = locationName || '';
          geolocation = geolocation || '';

          if (!locationName && !geolocation) {
            return;
          }

          var widgetKey = locationName + '|' + geolocation;
          if (widgetKey === lastWidgetKey || widgetKey === pendingWidgetKey) {
            return;
          }

          pendingWidgetKey = widgetKey;

          resolveWidgetForecastPointId(locationName, geolocation)
            .then(function(forecastPointId) {
              if (pendingWidgetKey === widgetKey) {
                renderWidget(locationName, forecastPointId, widgetKey);
              }
            })
            .catch(function(error) {
              if (pendingWidgetKey !== widgetKey) {
                return;
              }

              pendingWidgetKey = null;

              if (locationName) {
                renderWidget(locationName, null, widgetKey);
              } else {
                console.error(error);
              }
            });
        }

        function updateWidget() {
          if (updatePromise) {
            $timeout.cancel(updatePromise);
          }

          updatePromise = $timeout(function() {
            var locationName = attrs.locationName;
            var geolocation = attrs.geolocation || attrs.dataGeolocation;

            updatePromise = null;

            if (hasUnresolvedTemplateValue(locationName) || hasUnresolvedTemplateValue(geolocation)) {
              return;
            }

            loadWidget(locationName, geolocation);
          }, 0);
        }

        attrs.$observe('locationName', updateWidget);
        attrs.$observe('geolocation', updateWidget);
        attrs.$observe('dataGeolocation', updateWidget);
      }
    };
  }]);
