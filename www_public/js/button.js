
function wwB_updateAll(){

    var succ = function(target){
        return function(data, textStatus, jqXHR) {
            var e = $(".wiewarmTemperatur[data-beckenid='"+target.beckenid+"']"+"[data-badid='"+target.badid+"']");
            e.text(target.beckenid);


            for (var b in data.becken) {
                if(data.becken[b].beckenid == target.beckenid && data.badid == target.badid){
		    e.html(b + " " + data.becken[b].temp + "&#x2103;");
                }
            }
            
        };
    };
    
    $(".wiewarmTemperatur").each(function(index, div) {

        var target = {
            badid: $(this).attr('data-badid'),
            beckenid: $(this).attr('data-beckenid') 
        };

        jQuery.get("http://www.wiewarm.ch/api/v1/bad.json/" + $(this).attr('data-badid'), {}, succ(target), "json" );
    });



    window.setTimeout(wwB_updateAll, 300 * 1000);

}


wwB_updateAll();
