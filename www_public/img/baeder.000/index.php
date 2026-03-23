<html><body>
<?php
# quick & dirty...
$img = `find . -name "*.jpg"`;
$ia = array();
$ia = preg_split("/\n/", $img);

foreach($ia as $i){
	echo "image $i<br>\n";
	echo "<img src=\"$i\"><br>\n";
	echo "<br><br>";	
}
?>
</body>
</html>
