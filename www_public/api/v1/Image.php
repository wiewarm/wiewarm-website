<?php

namespace v1;
require_once("Log.php");
require_once(__DIR__ . "/../shared.php");
require_once("Bad.php");
use \Luracast\Restler\RestException;

class Image {

    private $con;
    private $base = "/var/www/html/img";
    private $maxXres = 700;
    private $thumbXres = 150;
    private $thumbYres = 150;

    function __construct(){
       
        global $logger; 
        $logger = \Log::factory('error_log', PEAR_LOG_TYPE_SYSTEM, 'Image.php');

        // Ensure base directories exist
        // $this->ensureDirectories();
    }

    private function ensureDirectories() {
        $dirs = [
            $this->base,
            $this->base . '/baeder',
            $this->base . '/baeder-orig',
            $this->base . '/baeder-thumbnail'
        ];

        foreach ($dirs as $dir) {
            if (!file_exists($dir)) {
                mkdir($dir, 0755, true);
            }
        }
    }

    /**
     * Get a list of Images assigned to any BAD
     *
     * Get a list of Images. The returned array contains the filename relative to 
     * <a>http://www.wiewarm.ch/</a> and optionally a description text.
     *
     * A higher resolution image (in the originally uploaded resolution) may be available at the same
     * URL where *baeder* is replaced with *baeder-orig*. 
     *
     * A thumbnail image (square, 150x150px) is available at the same
     * URL where *baeder* is replaced with *baeder-thumbnail*. 
     *
     *
     * @return array of images, newest first.
     */

    function index($search = "__latest__"){

        global $logger;
        global $__latest__records;
    
        $badapi = new \v1\Bad();
        
        $badsearch = $search;
        if (preg_match("/(__latest__|__all__)/", $search)){
            $badsearch = "__all__";
        }
        $logger->debug("Search parameter: $search, Bad search: $badsearch");

        $baeder = $badapi->index($badsearch);
        $imgmatches = array();
        $index = a2index($baeder, "badid");

        $logger->debug("Generated image search index with " . count($index) . " entries");

        // Get all image files recursively using PHP's built-in functions
        $allImages = [];
        foreach (glob($this->base . "/baeder/*/[0-9]*.jpg") as $imagePath) {
            $stats = stat($imagePath);
            if ($stats === false) {
                $logger->debug("Could not stat file: $imagePath");
                continue;
            }
            $allImages[] = [
                'path' => $imagePath,
                'mtime' => $stats['mtime']
            ];
        }

        // Sort by modification time, newest first
        usort($allImages, function($a, $b) {
            return $b['mtime'] - $a['mtime'];
        });

        $logger->debug("Found " . count($allImages) . " images total");

        foreach ($allImages as $img) {
            $imagePath = $img['path'];
            $imgts = date('Y-m-d H:i', $img['mtime']);
            
            if (preg_match("!baeder/(\d+)/(\d+).jpg!", $imagePath, $matches)) {
                $badid = $matches[1];
                $imgid = $matches[2];
                
                // Construct the text file path and check if it exists
                $textFilePath = $this->base."/baeder/$badid/$imgid.txt";
                if (!file_exists($textFilePath)) {
                    $logger->debug("Description file not found: $textFilePath");
                }
                $imgdescr = file_exists($textFilePath) ? file_get_contents($textFilePath) : '';
                
                // now check if the images matches something in the search
                if (array_key_exists($badid, $index)){
                    $bad = $index[$badid];

                    $imgmatches[] = array(
                        'image' => 'img/' . str_replace($this->base . '/', '', $imagePath),
                        'thumbnail' => 'img/' . str_replace($this->base . '/', '', preg_replace("/baeder/", "baeder-thumbnail", $imagePath)),
                        'original' => 'img/' . str_replace($this->base . '/', '', preg_replace("/baeder/", "baeder-orig", $imagePath)),
                        'description' => $imgdescr, 
                        'date' => $imgts, 
                        'date_pretty' => date_pretty($imgts), 
                        'badid' => $badid, 
                        'badname' => $bad['badname'], 
                        'ort' => $bad['ort'], 
                        'plz' => $bad['plz'], 
                        'kanton' => $bad['kanton'] 
                    );
                }

                if ($search == "__latest__" && count($imgmatches) >= $__latest__records){
                    $logger->debug("Reached maximum number of latest records ($__latest__records)");
                    break; 
                }
            } else {
                $logger->debug("Skipping invalid image path: $imagePath (regex didn't match expected pattern)");
            }
        }

        $logger->debug("Returning " . count($imgmatches) . " image matches");
        return $imgmatches;
        

    }

    /**
     * Get a list of Images assigned to a BAD
     *
     * Get a list of Images assigned to a BAD. The returned array contains the filename relative to 
     * <a>http://www.wiewarm.ch/</a> and optionally a description text.
     *
     * @return mixed
     */
    function get($badid){
        global $logger;
        $badid = \numbersOnly($badid);
        
        $images = array();
        $pattern = $this->base . "/baeder/$badid/*.jpg";
        foreach (glob($pattern) as $image) {
            $filename = basename($image);
            $textfile = str_replace('.jpg', '.txt', $image);
            $text = '';
            if (file_exists($textfile)) {
                $text = file_get_contents($textfile);
            }
            
            $images[] = array(
                'image' => "img/baeder/$badid/$filename",
                'text' => $text,
                'thumbnail' => "img/baeder-thumbnail/$badid/$filename",
                'original' => "img/baeder-orig/$badid/$filename"
            );
        }
        
        // Sort by filename numerically
        usort($images, function($a, $b) {
            $a_num = intval(pathinfo($a['image'], PATHINFO_FILENAME));
            $b_num = intval(pathinfo($b['image'], PATHINFO_FILENAME));
            return $a_num - $b_num;
        });
        
        return $images;
    }




    /**
     * Delete an Image
     *
     * Delete an Image
     *
     * @return mixed
     */

    function delete($badid, $pincode, $imageid){
    
        global $logger;

        $badid = numbersOnly($badid);

        if (! pincodeCheck($badid, $pincode)){
            throw new RestException(401,"Nope! Bad User!");
        }

        $imageid = numbersOnly($imageid);

        $origpath = $this->base."/baeder-orig/$badid";
        $origfn = $origpath."/$imageid.jpg";
        $logger->debug("unlink $origfn");
        unlink($origfn);

        $path = $this->base."/baeder/$badid";
        $fn = $path."/$imageid.jpg";
        $tfn = $path."/$imageid.txt";

        $logger->debug("unlink $fn");
        unlink($fn);
        $logger->debug("unlink $tfn");
        unlink($tfn);

        apcu_delete("wwapi.v1.bad.get.badid.$badid");

        return array("success" => "OK");
    }



    /**
     * Submit a new image
     *
     * Submit a new image for a BAD.
     * <pre>request_data := {badid: b, pincode: p, description: text, image: data}</pre>
     *
     * @return mixed
     */

    function post($request_data){
    
        global $logger;
        $logger->debug("post input:" . print_r(\sanitizeLogContext($request_data), true));

        if (empty($request_data)) {
            throw new RestException(412, "request_data is null");
        }

        // verify login
        $badid = numbersOnly($request_data['badid']);
        $pincode = $request_data['pincode'];

        if (! pincodeCheck($badid, $pincode)){
            throw new RestException(401,"Nope! Bad User!");
        }

        $img = $request_data['image'];

        if ($img['size'] > 37000000){
            throw new RestException(401,"Image is too large, should not exceed 16MB");
        }

        try {
            $res = $this->processImage($badid, $request_data);
            
            apcu_delete("wwapi.v1.bad.get.badid.$badid");

            return array("success" => $res);
        } catch (\Exception $e) {
            global $logger;
            $logger->err("Image processing error: " . $e->getMessage());
            throw new \Luracast\Restler\RestException(500, "Image processing failed: " . $e->getMessage());
        }
    }

    /**
     * Reprocess images for a BAD
     *
     * Reprocess images for a BAD, recreate small version and thumbnail for 
     * all uploaded images. Requires privileged api_key.
     *
     * <pre>request_data := {badid: b, api_key: key, out: output root directory, in: input root directory}</pre>
     *
     */
    public function putReprocessImages($request_data){

        global $logger;

        $key = $request_data['api_key'] ?? null;
        $sudoPw = getenv('SECRET_SUDOPW');
        if ($sudoPw === false || $key === null || strcmp($key, $sudoPw) !== 0) {
            throw new RestException(401, "Nope! Bad User!");
        }

        $badid = $request_data['badid'];
        $in = $request_data['in'];
        $this->base = $request_data['out'] ? $request_data['out'] : $this->base;

        foreach(glob("$in/$badid/*.jpg") as $img){

            $logger->debug("$img");

            $pireq = array();
            $pireq['image']['tmp_name'] = $img;
            $descrf = preg_replace("/\.jpg$/", ".txt", $pireq['image']['tmp_name']);
            $pireq['description'] = file_get_contents($descrf);

            $this->processImage($badid, $pireq);
        }
    }

    private function processImage($badid, $request_data){

        global $logger;
        $img = $request_data['image'];

        $imageid = $this->getNextImageId($badid);

        # save original resolution, in jpg format
        $origpath = $this->base."/baeder-orig/$badid";
        if (!is_dir($origpath)) {
            $rv = mkdir($origpath, 0755, true);
            $logger->debug("mkdir $origpath -> " . $rv);
        }
        $origfn = $origpath."/$imageid.jpg";
        
        // Copy original file
        if (!copy($img['tmp_name'], $origfn)) {
            throw new \Exception("Failed to copy original image");
        }
        $logger->debug("Wrote " . $origfn);

        # save alternative version with 500 pixel max horizontal resolution
        // Detect image type and load appropriately
        $image_info = \getimagesize($img['tmp_name']);
        if (!$image_info) {
            throw new \Exception("Failed to detect image type");
        }
        
        $mime_type = $image_info['mime'];
        switch ($mime_type) {
            case 'image/jpeg':
                $source_image = \imagecreatefromjpeg($img['tmp_name']);
                break;
            case 'image/png':
                $source_image = \imagecreatefrompng($img['tmp_name']);
                break;
            case 'image/gif':
                $source_image = \imagecreatefromgif($img['tmp_name']);
                break;
            default:
                throw new \Exception("Unsupported image type: $mime_type");
        }
        
        if (!$source_image) {
            throw new \Exception("Failed to create image from uploaded file");
        }
        
        $xresolution = \imagesx($source_image);
        $yresolution = \imagesy($source_image);
        $logger->debug("res: " . print_r($xresolution, true));
        
        if ($xresolution > $this->maxXres){
            $logger->debug("scaling image down");
            $new_width = $this->maxXres;
            $new_height = ($yresolution * $this->maxXres) / $xresolution;
            
            $resized_image = \imagecreatetruecolor($new_width, $new_height);
            \imagecopyresampled($resized_image, $source_image, 0, 0, 0, 0, $new_width, $new_height, $xresolution, $yresolution);
        } else {
            $resized_image = $source_image;
        }

        $path = $this->base."/baeder/$badid";
        if (!is_dir($path)) {
            $rv = mkdir($path, 0755, true);
            $logger->debug("mkdir $path -> " . $rv);
        }
        $fn = $path."/$imageid.jpg";
        // Always save as JPEG for consistency, regardless of input format
        \imagejpeg($resized_image, $fn, 90);
        $logger->debug("Wrote " . $fn);

        # save thumbnail version with fixed size in both directions
        $thumb = $this->thumbnailBox($origfn,  $this->thumbXres, $this->thumbYres);
        $tpath = $this->base."/baeder-thumbnail/$badid";
        if (!is_dir($tpath)) {
            $rv = mkdir($tpath, 0755, true);
            $logger->debug("mkdir $tpath -> " . $rv);
        }
        $tfn = $tpath."/$imageid.jpg";
        \imagejpeg($thumb, $tfn);
        $logger->debug("Wrote " . $tfn);

        # Clean up memory
        \imagedestroy($source_image);
        if ($resized_image !== $source_image) {
            \imagedestroy($resized_image);
        }

        # store description
        $txtfn = $path."/$imageid.txt";
        file_put_contents($txtfn, $request_data['description']);

        $webfn = preg_replace("!.*public_html!", "http://www.wiewarm.ch", $fn); 

        return "OK: $webfn";
    
    }


    private function getNextImageId($badid){
    
        global $logger;
        $existing = glob($this->base."/baeder/$badid/*.jpg");

        $id = 99999999;

        if (!$existing){
            $id = 1; 
        }else{

            $ids = array(); 
            foreach($existing as $e){
                $ids[] = \numbersOnly(basename($e));
            }

            sort($ids, SORT_NUMERIC);
            $logger->debug(print_r($ids, true));

            $id = (array_pop($ids) + 1);

        
        }

        $logger->debug(print_r($existing, true) . " --> id = $id");
        return $id;
    
    }


    private function thumbnailBox($imgf, $box_w, $box_h) {

        // http://stackoverflow.com/a/747277/571215
        
        // Detect image type and load appropriately
        $image_info = \getimagesize($imgf);
        if (!$image_info) {
            return null;
        }
        
        $mime_type = $image_info['mime'];
        switch ($mime_type) {
            case 'image/jpeg':
                $img = \imagecreatefromjpeg($imgf);
                break;
            case 'image/png':
                $img = \imagecreatefrompng($imgf);
                break;
            case 'image/gif':
                $img = \imagecreatefromgif($imgf);
                break;
            default:
                return null;
        }

        //create the image, of the required size
        $new = \imagecreatetruecolor($box_w, $box_h);
        if($new === false) {
            //creation failed -- probably not enough memory
            return null;
        }


        //Fill the image with a light grey color
        //(this will be visible in the padding around the image,
        //if the aspect ratios of the image and the thumbnail do not match)
        //Replace this with any color you want, or comment it out for black.
        //I used grey for testing =)
        $fill = \imagecolorallocate($new, 0, 0, 0);
        \imagefill($new, 0, 0, $fill);

        //compute resize ratio
        $hratio = $box_h / \imagesy($img);
        $wratio = $box_w / \imagesx($img);
        $ratio = min($hratio, $wratio);

        //if the source is smaller than the thumbnail size, 
        //don't resize -- add a margin instead
        //(that is, dont magnify images)
        if($ratio > 1.0)
            $ratio = 1.0;

        //compute sizes
        $sy = floor(\imagesy($img) * $ratio);
        $sx = floor(\imagesx($img) * $ratio);

        //compute margins
        //Using these margins centers the image in the thumbnail.
        //If you always want the image to the top left, 
        //set both of these to 0
        $m_y = floor(($box_h - $sy) / 2);
        $m_x = floor(($box_w - $sx) / 2);

        //Copy the image data, and resample
        //
        //If you want a fast and ugly thumbnail,
        //replace imagecopyresampled with imagecopyresized
        if(!\imagecopyresampled($new, $img,
            $m_x, $m_y, //dest x, y (margins)
            0, 0, //src x, y (0,0 means top left)
            $sx, $sy,//dest w, h (resample to this size (computed above)
            \imagesx($img), \imagesy($img)) //src w, h (the full size of the original)
        ) {
            //copy failed
            \imagedestroy($new);
            return null;
        }
        //copy successful
        return $new;
    }

}

?>
