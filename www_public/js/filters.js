'use strict';

var myApp = angular.module('myApp.filters', []);

myApp.filter('linkfilter', function() {
    return function(input, scope) {
        if (input){
            return input.replace(/<\/?a.*?>/g, '');
        }
    };
});

myApp.filter('truncate', function () {
        return function (text, length, end) {
            if (isNaN(length))
                length = 10;

            if (end === undefined)
                end = "...";

            if (text.length <= length || text.length - end.length <= length) {
                return text;
            }
            else {
                return String(text).substring(0, length-end.length) + end;
            }

        };
});

myApp.filter('ceil', function () {
        return function (input) {
            return Math.ceil(input);

        };
});

