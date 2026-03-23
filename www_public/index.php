<?php

    // Initialize variables and error handling
    error_reporting(E_ERROR);
    ini_set('display_errors', 0);
    
    $beta = preg_match('/^beta/i', $_SERVER['HTTP_HOST'] ?? '') === 1;

    $shorthost = 'localhost';
    if (isset($_SERVER['HTTP_HOST'])) {
        $shorthost = preg_replace("/\..*/", "", $_SERVER['HTTP_HOST']);
    }

    $gtagId = getenv('ENV_GTAG') ?: 'not-set';
    $guaId = getenv('ENV_GUA') ?: 'not-set';
    $gmapKey = getenv('ENV_GMAPKEY') ?: '';

    // Serve static version of page for Google Bot
    //

    require_once("Log.php");
    $logger = \Log::factory('error_log', PEAR_LOG_TYPE_SYSTEM, 'index.php');

    $logger->debug("index.php");

    // _escaped_fragment workarounds to support non-js crawlers but the crawl infrastructure 
    // to prerender static sites is removed, do we still need something like this
    if (isset($_GET['_escaped_fragment_'])) {
        $logger->debug("escaped fragment");
        $reqfrag = $_GET['_escaped_fragment_'];
        $page = preg_replace("/[^a-z0-9-]/", "", $reqfrag);
        $page = $page ? $page : "index"; // fallback for /
        $page = "crawl/pages/$page.html";

        if (file_exists($page)) {
            $logger->debug("$reqfrag -> $page OK");
            readfile($page);
            exit;
        } else {
            $logger->debug("$reqfrag -> $page FAILED");
            exit;
        }
    }

?>
<!doctype html>
<html lang="en" ng-app="myApp" ng-controller="NavCtrl">

    <?php if (!$beta): ?>

    <!-- Google tag (gtag.js) -->
    <script async src="https://www.googletagmanager.com/gtag/js?id=<?php echo rawurlencode($gtagId); ?>"></script>
    <script>
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', '<?php echo addslashes($gtagId); ?>');
    </script>

	<?php endif; ?>

    <base href="/">

    <title>wiewarm.ch - das Schweizer Badi-Portal</title>
    <link href="//netdna.bootstrapcdn.com/twitter-bootstrap/2.3.1/css/bootstrap-combined.min.css" rel="stylesheet">
    
    <!--
    <link data-require="bootstrap-css@*" data-semver="3.0.0" rel="stylesheet" href="//netdna.bootstrapcdn.com/bootstrap/3.0.0/css/bootstrap.min.css" />
    <link href='//fonts.googleapis.com/css?family=Oleo+Script+Swash+Caps:400,700' rel='stylesheet' type='text/css'>  original  
    <link href='//fonts.googleapis.com/css?family=Press+Start+2P' rel='stylesheet' type='text/css'>
    <link href='//fonts.googleapis.com/css?family=VT323' rel='stylesheet' type='text/css'>
    <link href='//fonts.googleapis.com/css?family=Gloria+Hallelujah' rel='stylesheet' type='text/css'>
    <link href='//fonts.googleapis.com/css?family=Coda+Caption:800' rel='stylesheet' type='text/css'>
    -->
    <link href='//fonts.googleapis.com/css?family=Englebert' rel='stylesheet' type='text/css'>
    <link rel="stylesheet" href="lib/ng-table/ng-table.css"/>
    <link rel="stylesheet" href="css/app.css"/>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <!--meta name="fragment" content="!" -->
    <meta charset="utf-8">
</head>

<body>

<div class="container-fluid" id="wrap"><!-- foo -->
<div class="navbar" >
    <div class="navbar-inner">
      <a id="logo" class="brand gfont" href="#!">wiewarm.ch</a>
      <ul class="nav">
        <li ng-class="getNavClass('/index')"><a href="/start">Liste</a></li>
        <li ng-class="getNavClass('/info')"><a href="/info">Info</a></li>
        <li ng-class="getNavClass('/admin')"><a href="/admin">Login</a></li>
      </ul>
      <form class="navbar-search pull-right" ng-show="showSearch()"  ng-submit="submitSearch()">
          <input type="text" ng-model="searchtext" id="searchbox" class="input-medium search-query" placeholder="Bad, Ort, PLZ, Kanton...">
          <!-- <input type="submit" class="btn search-query" value="Los!"> -->
      </form>
    </div>
</div>


<div ng-view id="main"></div>
</div>


	<footer class="footer text-right" ng-controller="NavCtrl">
<div class="pull-left">&copy; wiewarm.ch 2001 - <?php echo date("Y"); ?> 
	<?php if ($beta): ?>
		beta site <?php echo htmlspecialchars($_SERVER["SCRIPT_FILENAME"]); ?>
	<?php endif; ?>
    </div> 
    <div class="pull-right hidden-phone" id="cctext">Daten unterstehen Creative Commons <img title="CC by-sa 3.0" id="cclogo" src="/img/by-sa.png"></div>
    <div class="pull-right visible-phone" id="cctext"><img id="cclogo" src="/img/by-sa.png"></div>
</footer>

	  <script src="//ajax.googleapis.com/ajax/libs/jquery/1.8.3/jquery.min.js"></script>
	  <script src="//ajax.googleapis.com/ajax/libs/angularjs/1.1.4/angular.min.js"></script>

<script>
window.WIEWARM_CONFIG = window.WIEWARM_CONFIG || {};
window.WIEWARM_CONFIG.gmapKey = <?php echo json_encode($gmapKey, JSON_HEX_TAG | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_HEX_AMP); ?>;
</script>

<!--
<script src="//ajax.googleapis.com/ajax/libs/angularjs/1.2.0/angular.min.js"></script>
 -->


    <?php

    $inlinejs = $_GET['inline'] ??  1;
    $localjs = array(
        "lib/bootstrap-gh-pages/ui-bootstrap-tpls-0.3.0.min.js",
        "lib/ngUpload/ng-upload.min.js",
        "lib/ng-table/ng-table.min.js",
        "js/app.js",
        "js/services.js",
        "js/controllers.js",
        "js/filters.js",
        "js/directives.js"
    );

    if ($inlinejs){
        foreach($localjs as $lib){
            echo "\n<script>\n";
            echo " // inlined: " . htmlspecialchars($lib) . "\n";
            @readfile($lib);
            echo "\n</script>\n";
        }
    }else{

        foreach($localjs as $lib){
            echo "<script src='" . htmlspecialchars($lib) . "'></script>\n";
        }
    }
    ?>

<script>
  (function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
  (i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
  m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
  })(window,document,'script','//www.google-analytics.com/analytics.js','ga');

  <?php if (!$beta): ?>
  ga('create', '<?php echo addslashes($guaId); ?>', 'wiewarm.ch');
  <?php endif; ?>
  ga('send', 'pageview');

</script>

</body>
</html>
