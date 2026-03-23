<?php
        error_reporting(0);
        header("Content-Type: text/xml");
	include "shared.php";
	include "v1/Bad.php";
	$b = new \v1\Bad();
	$blist = $b->index("__all__");	

        $frag = array('start', 'info');

        foreach($blist as $b){
            $frag[] = "bad/" . $b['badid_text'];
        }

        if (preg_match("/beta_html/", __FILE__)){
	    $site = "beta";
        }else{
            $site = "www";
        }

        $base = "http://$site.wiewarm.ch";

        $sitemap[] = array('url' => array('loc' => "$base"));

        foreach($frag as $f){
            $sitemap[] = array('url' => array('loc'  => $base . "/" . $f));
        }

        $xml = new SimpleXMLElement("<?xml version=\"1.0\" encoding=\"UTF-8\"?><urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\"></urlset>");
    
        array_to_xml($sitemap, $xml);

        $dom = dom_import_simplexml($xml)->ownerDocument;
        $dom->formatOutput = TRUE;
        $formatted = $dom->saveXML();
        echo "$formatted";

        $file = "/tmp/sitemap_$site.xml";
        file_put_contents($file, $formatted);
        #$fp = fopen($file, 'rb');
        #fpassthru($fp);
        #exit;

        function array_to_xml($student_info, &$xml_student_info) {
            foreach($student_info as $key => $value) {
                if(is_array($value)) {
                    if(!is_numeric($key)){
                        $subnode = $xml_student_info->addChild("$key");
                        array_to_xml($value, $subnode);
                    }
                    else{
                        array_to_xml($value, $xml_student_info);
                    }
                }
                else {
                    $xml_student_info->addChild("$key","$value");
                }
            }
        }

?>
