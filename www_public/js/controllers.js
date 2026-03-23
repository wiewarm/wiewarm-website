'use strict';

/* Controllers */

function StartCtrl($scope, $log, $http, $q, $location, $filter, $window, DataSharingService, ngTableParams) {

    ga('send', 'pageview', '/start'); 
    $scope.model = [];


    $scope.minilieblingsbadi = DataSharingService.getfavourite();

    $scope.fpeven = "fp-even";
    $scope.fpodd = "fp-odd";
    $scope.Math = window.Math;
    $scope.window = $window;
    $scope.isGoogle = false;


    $scope.getModel = function(searchtext){

        //$log.info("<3 " + $scope.minilieblingsbadi);

        $http.get('/api/temperature/all_current/365', {params: {'cacheScrew': Math.floor(Math.random() * 1000000)}})
        .success(function(data, headers, config){
            $scope.model = data;

            var defaultSize = 10;
            if ($scope.window.innerHeight > 1000){
                defaultSize = 25; 
            }

            if ($window.navigator.userAgent.match(/googlebot/i)){
                // seo-ing with cheap tricks like it's 1996
                $scope.isGoogle = true;
                defaultSize = 9999; 
            }

            $scope.tableParams = new ngTableParams(
                angular.extend({
                    page: 1,            // show first page
                    count: defaultSize,          // count per page
                    sorting: {
                        date: 'desc'     // initial sorting
                        //kanton: 'asc',     // initial sorting
                        //ort: 'asc'     // initial sorting
                    }
                },$location.search()), {
                
                    total: $scope.model.length, // length of data

                    getData: function($defer, params) {

                        if (params.sorting().kanton && params.sorting().kanton == 'asc'){
                            params.sorting({kanton: 'asc', ort: 'asc'})
                        }else if (params.sorting().kanton && params.sorting().kanton == 'desc'){
                            params.sorting({kanton: 'desc', ort: 'desc'})
                        }


                        $location.search(params.url());

                        var data = $scope.model;
                        var orderedData = params.sorting() ?  $filter('orderBy')(data, params.orderBy()) : data;

                        if (params.sorting().temp){

                          data.sort(function(a,b){
                            if (params.sorting().temp == 'asc'){
                                return parseFloat(a.temp) > (b.temp) ? 1 : -1;
                            }else{
                                return parseFloat(a.temp) < (b.temp) ? 1 : -1;
                            }
                          });

                          orderedData = data;
                        }

                        orderedData = params.filter ?  $filter('filter')(orderedData, params.filter()) : orderedData;
                        //params.total = orderedData.length;
                        params.total(orderedData.length);

                        var slc = orderedData.slice((params.page() - 1) * params.count(), params.page() * params.count());
                        $defer.resolve(slc);
                    }               
                
                }
            );

            $scope.tableParams.resetFilter = function(){
                $location.url("/");
            }


        });
    };

    $http.get('/api/news', {params: {search: "__latest__", 'cacheScrew': Math.floor(Math.random() * 1000000)}})
    .success(function(data, headers, config){
       $scope.news = data.slice(0,3);

    });

    $http.get('/api/image', {params: {search: "__latest__", 'cacheScrew': Math.floor(Math.random() * 1000000)}})
    .success(function(data, headers, config){
       $scope.images = data.slice(0,3);
    });

    $scope.autostart = function(){
        $scope.spinning = true;
        $scope.getModel();
        //$scope.getModel();
    }();

}




function IndexCtrl($scope, $log, $http, $location, DataSharingService) {

    $scope.searchtext = DataSharingService.get('searchtext');
    $scope.model = [];
    //$scope.modelIterator = [];
    $scope.news = [];
    $scope.showingLatest = false;
    $scope.nothingFound = {temp: false, news: false, images: false};
    $scope.spinner = {temp: true, news: true, images: true};
    $scope.minilieblingsbadi = DataSharingService.getfavourite();
    $scope.nothingFoundText = "Keine Resultate";

    $scope.fpeven = "fp-even";
    $scope.fpodd = "fp-odd";

    $scope.submit = function(){
        $log.info("submit: " + $scope.searchtext);
        $scope.showingLatest = false;
        $scope.nothingFound = {temp: false, news: false, images: false};

        if ($scope.searchtext === undefined || $scope.searchtext === "" ){
            $scope.getModel("__latest__");
        }else{
            $scope.getModel($scope.searchtext);
        }
    };

    $scope.getModel = function(searchtext){

        $log.info("<3 " + $scope.minilieblingsbadi);

        $http.get('/api/bad', {params: {search: searchtext}})
        .success(function(data, headers, config){
           $scope.model = data;
           $scope.spinner.temp = false;
           if ($scope.model.length == 0){
                $scope.nothingFound.temp = true; 
           }
           if (searchtext == "__latest__"){
                $scope.showingLatest = true;
           }

           /*
          angular.forEach($scope.model, function(bad, index){
                $scope.modelIterator.push({"badid": bad['badid'], "header": true});
                angular.forEach(bad['becken'], function(becken, beckenname){
                    $log.info(beckenname + " " + becken) ;
                    $scope.modelIterator.push({"badid": bad['badid'], "becken": beckenname});
                });
          });

          //$log.info($scope.modelIterator);
            */

        });

        $http.get('/api/news', {params: {search: searchtext}})
        .success(function(data, headers, config){
           $scope.spinner.news = false;
           $scope.news = data.slice(0,8);
            if ($scope.news.length == 0){
                $scope.nothingFound.news = true; 
           }
        });

        $http.get('/api/image', {params: {search: searchtext}})
        .success(function(data, headers, config){
           $scope.spinner.images = false;
           $scope.images = data.slice(0,3);
            if ($scope.images.length == 0){
                $scope.nothingFound.images = true; 
           }
        });

    }

    $scope.$on('SearchChanged', function() {
        $scope.searchtext = DataSharingService.get('searchtext');
        $log.info("must search dddd" + $scope.searchtext);
        $scope.submit();
    });

    $scope.autostart = function(){
        $scope.spinning = true;
        //$scope.getModel("__latest__");
        $scope.submit();
    }();

    $scope.showSearch = function(){

        $log.info("showSearch:" + $location.$$path)

        if ($location.$$path == "/index"){
            return true; 
        }else{
            return false;
        }
    
    }

}

function BadCtrl($scope, $log, $http, $location, $routeParams, DataSharingService) {

    $scope.model = [];
    $scope.slides = [ {image: 'img/busy.gif', text: 'Laden...'} ];
    $scope.imagesOpen = false;


    $scope.favourite = function(badid){

        DataSharingService.setfavourite(badid);
        $scope.minilieblingsbadi = badid;
    
    }

    $scope.$watch('imagesOpen', function(isOpen){
        $log.info('imagesOpen ' + isOpen); 
        if (isOpen && $scope.slides[0].text == "Laden..."){
                $scope.slides = $scope.model['bilder'];
        
        }
    });

    $scope.uvclass = function(){
        if ($scope.model.wetterort){
            return "span2"; 
        }else{
            return "span6"; 
        } 
    }

    $scope.minilieblingsbadi = DataSharingService.getfavourite(); 

    $scope.$watch("imagesOpen", function(){$log.info("im:" + $scope.imagesOpen); }, true);

    $scope.load = function(){

        $log.info("bad: " + $location.$$path);
        $log.info("rp: " + $routeParams.badid);

        ga('send', 'pageview', '/bad/'+$routeParams.badid); 

        $http.get('/api/bad/' + encodeURIComponent($routeParams.badid), {params:{'cacheScrew': Math.floor(Math.random() * 1000000)}})
            .success(function(data, headers, config){
                $log.info(data);
                $scope.model = data;
                $log.info(data['bilder']);
                //$scope.geocode();
                $scope.mapurl = $scope.geomapurl();
            });
    }();

    $scope.geomapurl = function(){
   
        var baseurl = '//maps.googleapis.com/maps/api/staticmap' 
        var gmapKey = (window.WIEWARM_CONFIG && window.WIEWARM_CONFIG.gmapKey) || "";
        var params = {

            center: $scope.model.adresse1 + " " + $scope.model.adresse2 + 
                " " + $scope.model.plz + " " + $scope.model.ort,
            size: "400x300",
            zoom: 14,
            sensor: "false",
            markers: "size:mid|color:blue|" + $scope.model.adresse1 + " " + $scope.model.adresse2 + 
                " " + $scope.model.plz + " " + $scope.model.ort
                
        
        };

        if (gmapKey) {
            params.key = gmapKey;
        }
       
        var parr = [];
        for (var p in params){
            parr.push(encodeURIComponent(p) + "=" + encodeURIComponent(params[p]));
        }
        
        var pstr = parr.join("&");     
        var url = baseurl + "?" + pstr;
        var href = "//maps.google.com/maps?q=" + encodeURIComponent(params.center);

        return { url: url, href: href};
    
    }


}


function NavCtrl($scope, $log, $location, DataSharingService) {

    $scope.year = new Date().getFullYear();
    $scope.searchtext = "";

    $scope.getNavClass = function(whatWasClickedOn){

        if ($location.$$path == whatWasClickedOn){
            return "active"; 
        }else{
            return "";
        }

    }


    $scope.submitSearch = function(){
        $log.info("NC submitSearch: " + $scope.searchtext);
        DataSharingService.set('searchtext', $scope.searchtext);
        $scope.$broadcast('SearchChanged');
    };


    $scope.showSearch = function(){

        if ($location.$$path == "/index"){
            return true; 
        }else{
            return false;
        }
    
    }



}



function InfoCtrl($scope, $log, $location ) {

    ga('send', 'pageview', '/info'); 

    $scope.acctab = {};
    $scope.acctab.wie = false; 
    $scope.acctab.wer = false; 
    $scope.acctab.cc = false; 
    $scope.acctab.api = false; 
    $scope.acctab.exp = false; 
    $scope.acctab.apps = false; 
    $scope.acctab.links = false; 

    var params = $location.search();

    if (params && params.tab){
        $scope.acctab[params.tab] = true;
    }
    
    

    
}

function SmitterCtrl($scope, $log, $location, $http) {

    ga('send', 'pageview', '/sms'); 

    $scope.model = [];
    $scope.spinner = true;

    $scope.findKeywords = function(){

        var keywords = {};
   
        for(var bad in $scope.model){
            var badid = $scope.model[bad].badid;
            for(var beckenname in $scope.model[bad].becken){
                var bk = $scope.model[bad].becken[beckenname];
                var kw = (bk.smskeywords + "").split(";");
                kw = kw.filter(function(v){if (v && v != "null"){ return 1;}})
                if (kw && kw[0]){
                    keywords[badid] =  kw[0];
                }
            }
        }  

        return keywords;
    
    };


    $scope.load = function(){

        $log.info("load");
        $http.get('/api/bad/', {params: {search: "__all__"}})
            .success(function(data, headers, config){
                $scope.model = data;
                $scope.keywords = $scope.findKeywords();
                $scope.spinner = false;
            });

    }();



}


//function AdminCtrl($scope, $log, $location, $dialog, AuthService, $http({method: 'DELETE', headers: {'Content-type': 'text/html'}})) {
function AdminCtrl($scope, $log, $location, $dialog, AuthService, $http) {

    /*
    $scope.name = "ngfileinputhack";
    AdminCtrl.prototype.$scope = $scope;
    */

    //$httpProvider.defaults.headers["delete"] = {'Content-Type': 'text/html;charset=utf-8'};

    $scope.authorized = AuthService.getauthorized();
    $scope.badid = AuthService.getbadid();
    $scope.pincode = AuthService.getpincode();
    $scope.authfail = "";
    $scope.spinner = {tempupdate: false, newsupdate: false, image: false, imagerefresh: false, basedataupdate: false};

    $scope.tempupdate = {};
    $scope.statusupdate = {};
    $scope.newsupdate = "";

    $scope.image = {};
    $scope.imageerror = "";

    $scope.slides = [];



    $scope.beckenstatusMap = {"geöffnet":1, "gesperrt":2, "geschlossen":3};


    $scope.loadNews = function(){

       $http.get('/api/news', {params: {search: "__latest__", badid: $scope.badid, 'cacheScrew': Math.floor(Math.random() * 1000000)}})
        .success(function(data, headers, config){
           $log.info(data);
           $scope.news = data;

        });
    
    };
 

    $scope.loadmodel = function(){

        ga('send', 'pageview', '/admin/'+ $scope.badid); 

        $http.get('/api/bad/' + $scope.badid, {params:{'cacheScrew': Math.floor(Math.random() * 1000000)}})
            .success(function(data, headers, config){
                $log.info(data);
                $scope.model = data;
                $scope.slides = data['bilder'];

                for(var b in $scope.model.becken){
                    $log.info(b);
                    var becken = $scope.model.becken[b];
                    $scope.statusupdate[becken.beckenid] = $scope.beckenstatusMap[becken['status']];

                }
            
                $log.info("Status init:");
                $log.info($scope.statusupdate);
        });


        $scope.loadNews();

    };


    $scope.checkAuth = function(badid, pincode){

        $log.info(AuthService.auth);
        $scope.authfail = "";
        $http.put('/api/login/' + badid + "/" + pincode  , {})
            .success(function(data, headers, config){
                $log.info(data);
                if (data['success']){
                    AuthService.setauth(badid, pincode);
                    $scope.authorized = AuthService.getauthorized();
                    $scope.badid = AuthService.getbadid();
                    $scope.pincode = AuthService.getpincode();

                    $log.info(AuthService.auth);
                    $scope.loadmodel();
                }else{
                    $scope.authorized = false;
                    $scope.authfail = "Anmeldung fehlgeschlagen";
                
                }
            });
    };

    if ($location.search().pincode){
        $log.info("Login with URL parameters", $location.search().badid, $location.search().pincode);
        //AuthService.setauth($location.search().badid, $location.search().pincode);
        $scope.checkAuth($location.search().badid, $location.search().pincode);
    } 

    $scope.logout = function(){
        AuthService.logout(); 
        $scope.authorized = AuthService.getauthorized();
        $scope.badid = AuthService.getbadid();
        $scope.pincode = AuthService.getpincode();
    };

    $scope.saveTempAndStatusUpdate = function(t){

        $scope.spinner.tempupdate = true;

        var post = {
            "badid": $scope.badid,
            "pincode": $scope.pincode,
            "temp": $scope.tempupdate,
            "status": $scope.statusupdate
        };

        $log.info(post);

        $http.post('/api/temperature', post, {})
            .success(function(data, headers, config){
                $log.info("success");
                $log.info(data);
                $scope.spinner.tempupdate = false;

        });
    };

    $scope.saveNews = function(t, i){

        $scope.spinner.newsupdate = true;

        var post = {
            "badid": $scope.badid,
            "pincode": $scope.pincode,
            "info": i 
        };

        $http.post('/api/news', post, {})
            .success(function(data, headers, config){
                $log.info("success");
                $log.info(data);
                $scope.spinner.newsupdate = false;
                $scope.loadNews();

        });
    };

    $scope.deleteNews = function(infoid){

        $log.info("delete infoid " + infoid);

        $http.delete('/api/news/' + $scope.badid + "/" + $scope.pincode  + "/" + infoid, { 

                // noop
        }).success(function(data, headers, config){
                $log.info("delete success");
                $log.info(data);
                $scope.loadNews();

        });
    };

    $scope.saveBasedataUpdate = function(model){

        $scope.spinner.basedataupdate = true;

        model.pincode = $scope.pincode;
        $log.info(model);

        $http.put('/api/bad', model, {})
            .success(function(data, headers, config){
                $log.info("success");
                $log.info(data);
                $scope.spinner.basedataupdate = false;

        });
    };

    $scope.saveImage = function(content, completed){
        $scope.spinner.image = true;
        $scope.imageerror = "";

        if (completed && content.length > 0){
            $log.info("completed-if:" + completed);
            $scope.spinner.image = false;

            var cj = JSON.parse(content);
            if (cj.error){
                $scope.imageerror = cj['error']['code'] + " - " + cj['error']['message'];
            }else{
                $scope.imageerror = cj['success'];
            }
            $scope.updateImages();
         }else{
            $log.info("completed-else:" + completed);
            $scope.spinner.image = true;


        }
    };

    $scope.deleteImage = function(filename){
      
        var msgbox = $dialog.messageBox('Bild löschen bestätigen', 
                'Wirklich wirklich für immer löschen?', 
                [{label:'Ja', result: 'yes'},{label:'Nein', result: 'no'}]);

        msgbox.open().then(function(result){
            if(result === 'yes'){

                var id = filename.replace(/.*\//, "").replace(/\.jpg/, "");
                $log.info("delete " + filename + " -> " + id);

                var body = {"badid": $scope.badid, "pincode": $scope.pincode, "image": id};

                $http.delete('/api/image/' + $scope.badid + "/" + $scope.pincode  + "/" + id, { 

                    transformRequest: function(data,headersGetter){
                        //var headers = headersGetter();
                        //headers['Content-Type'] = "text/html";
                        headersGetter()['Content-Type'] = "text/csv";
                        headersGetter()['X-Content-Type-from-trq'] = "text/csv";
                        data = "<h1>html</h1>";
                    }

                }).success(function(data, headers, config){
                        $log.info("delete success");
                        $log.info(data);
                        $scope.updateImages();

                });

            }
        });
    };

    $scope.updateImages = function(){
        $scope.spinner.imagerefresh = true;
        $http.get('/api/image/' + $scope.badid, {params:{'cacheScrew': Math.floor(Math.random() * 1000000)}})
        .success(function(data, headers, config){
            $log.info(data);
            $scope.slides = data;
            $scope.spinner.imagerefresh = false;
        });
    };





}

/*
AdminCtrl.prototype.setFile = function(element) {
    var $scope = this.$scope;
    $scope.$apply(function() {
        $scope.theFile = element.files[0];
    });
};*/
