'use strict';

/* Services */


// Demonstrate how to register services
// In this case it is a simple value service.
//angular.module('myApp.services', []).
//  value('version', '0.1');

//var myApp = angular.module('myApp.services',[]);
//
//myApp.factory('UserService', function() {
//  return {
//      name : 'anonymous',
//      name : 'anonymous',
//      name : 'anonymous'
//  };
//});



var serviceModule = angular.module('myApp.services', []);

serviceModule.service('AuthService', function() {

    this.auth = {pincode: "", badid: "", authorized: false};

    this.getpincode = function() {
    	
        return this.auth.pincode;
    };

    this.getbadid = function() {
    	
        return this.auth.badid;
    };

    this.getauthorized = function() {
    	
        return this.auth.authorized;
    };

    this.setauth = function(badid, pincode){
        this.auth.pincode = pincode; 
        this.auth.badid = badid; 
        this.auth.authorized = true; 
    };

    this.logout = function(){
        this.auth.pincode = ""; 
        this.auth.badid = ""; 
        this.auth.authorized = false; 
    };
});

serviceModule.service('DataSharingService', function() {

    this.data = {};

    this.set = function(key, value){
        this.data[key] = value; 
    };

    this.get = function(key){
        return this.data[key];
    }

    this.getfavourite = function(){
    
        var re = new RegExp('[; ]minilieblingsbadi=([^\\s;]*)');
        var sMatch = (' '+document.cookie).match(re);
        if (sMatch){
            var minilieblingsbadi = unescape(sMatch[1]);
            //$log.info("<3 " + minilieblingsbadi);
            return minilieblingsbadi; 
        }else{
            return 0; 
        }
    }

    this.setfavourite = function(badid){

        var today = new Date();
        var expire = new Date();
        var days = 3650;
        expire.setTime(today.getTime() + 3600000 * 24 * days);
        var cstring = "minilieblingsbadi="+ badid + ";expires="+expire.toGMTString() + ";path=/";
        document.cookie = cstring;
    
    }

});
