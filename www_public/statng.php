<?php
#-------------------------------------------------------------------------------
# Temperature statistics page
# Updated to use modern API structure
#-------------------------------------------------------------------------------

require_once("api/shared.php");
require_once("api/v1/Bad.php");

// Start output buffering to prevent header issues
ob_start();

$id = numbersOnly($_GET['id']);
$days = numbersOnly($_GET['days'] ?? 60);

if (!$days || $days == 1){
    $days = 60;
}

if (!$id){
    die("invalid input");
}

// Get bad information using the API
$badapi = new \v1\Bad();
$bad = $badapi->get($id);

if (!$bad) {
    die("Bad not found");
}

// Get becken information
$becken = array();
if (isset($bad['becken']) && is_array($bad['becken'])) {
    foreach ($bad['becken'] as $beckenData) {
        $becken[$beckenData['beckenid']] = $beckenData['beckenname'];
    }
}

if (empty($becken)) {
    die("No becken found for this bad");
}

$beckenid_in = "(" . implode(",", array_keys($becken)) . ")";

// Connect to database
$conn = pconnect();

// Get the latest date from the temperature data for this bad's becken
$latest_sql = "SELECT MAX(datum) as latest_date FROM temperatur WHERE beckenid IN $beckenid_in";
$latest_result = query($conn, $latest_sql);
$latest_row = fetch_assoc($latest_result);

if ($latest_row['latest_date']) {
    $latest_timestamp = strtotime($latest_row['latest_date']);
    $t_now = $latest_timestamp;
    $t_start = $latest_timestamp - $days * 86400;
} else {
    // Fallback to current time if no data found
    $t_start = time() - $days * 86400;
    $t_now = time();
}

$stat_start = date("Y-m-d", $t_start);

$data_line = array();

// Get temperature data
$sql = "
    SELECT beckenid, 
           TO_CHAR(datum, 'YYYY-MM-DD') as d, 
           AVG(wert) as avg_temp
    FROM temperatur 
    WHERE beckenid IN $beckenid_in 
    AND datum > $1
    GROUP BY beckenid, TO_CHAR(datum, 'YYYY-MM-DD')
    ORDER BY d, beckenid";

$result = query($conn, $sql, array($stat_start));

while ($row = fetch_assoc($result)) {
    $data_line[$row['d']][$row['beckenid']] = $row['avg_temp'];
}

?>

    <div id="chart_div" style="width: 700px; height: 400px;"></div>

    <script type="text/javascript" src="https://www.google.com/jsapi"></script>
    <script type="text/javascript">
      google.load("visualization", "1", {packages:["corechart"]});
      google.setOnLoadCallback(drawChart);
      function drawChart() {

        var data = new google.visualization.DataTable();
       
        data.addColumn('string', 'Tag'); // Implicit domain label col.
    
        <?php foreach (array_keys($becken) as $bid): ?>
        data.addColumn('number', '<?php echo htmlspecialchars($becken[$bid]); ?>'); // Implicit series 1 data col.
        <?php endforeach; ?>

        var options = {
            title: '<?php echo htmlspecialchars($bad['badname'] . ', ' . $bad['ort']); ?>: Temperaturen der letzen <?php echo $days; ?> Tage',
          interpolateNulls: true,
          curveType: 'function',
          pointSize: 5,
          chartArea:{left:60,top:40,width:"70%",height:"80%"},
          backgroundColor:{fill:'ffffff'},
          hAxis:{minorGridlines:{color: '#000000'}},
          vAxis:{minorGridlines:{color: '#000000'}},
          hAxis:{gridlines:{color: '#000000'}},
          vAxis:{gridlines:{color: '#000000'}},
        };

        data.addRows([
  
            <?php for ($t = $t_start; $t <= $t_now; $t += 86400): ?>
                <?php $did = date("Y-m-d", $t); ?>
                <?php $pretty = date("d.m.y", $t); ?>
                [ '<?php echo $pretty; ?>',
                <?php foreach (array_keys($becken) as $bid): ?>
                    <?php echo isset($data_line[$did][$bid]) ? ($data_line[$did][$bid] / 10) : "null"; ?>,
                <?php endforeach; ?>
                ],
            <?php endfor; ?>
             
        ]);
        
        var chart = new google.visualization.LineChart(document.getElementById('chart_div'));
        chart.draw(data, options);
      }
    </script>

