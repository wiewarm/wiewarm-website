# Imports with Byterot

## getUVIndex.php no longer working due to 404 on admin.ch Site

## getWetter.php stopped working in 2021 no more input deliver, was e.g

```
wiewarm@flo5:~$ cat /home/wiewarm/meteotest/wiewarm_werte.txt.1706
Bern,15,10
Zuerich,15,3
Luzern,15,3
Arbon,15,3
Sion,16,3
Basel,16,10

Aktualisiert: 22.4.2008
```

## xmlCache, xmlCacheFull, xmlAndroidCache

```
view-source:https://www.wiewarm.ch/cache/xmlCacheFull.xml
<?xml version="1.0" encoding="ISO-8859-1"?>
<!--
  Sämtliche Daten dürfen nur für nicht kommerzielle Zwecke verwendet werden und die Quelle
  www.wiewarm.ch ist immer anzugeben.
  Werden die Daten auf einer Internetseite veröffentlicht, ist auf der entsprechenden Seite jeweils
  ein gut sichtbarer Link auf die Seite www.wiewarm.ch anzubringen.

  Die Daten von den meisten offenen Gewässern stammen vom Bundesamt für Wasser und Geologie BWG
  http://www.bwg.admin.ch/

-->
<WIEWARM created="2025-08-24T14:36:01">
<BAD id="110" name="Schwimmbad" ort="Auenstein" plz="5105" kanton="AG" adresse1="Schwimmbad Rupperswil - Auenstein" adresse2="Werkstrasse 1" >
<BECKEN id="257" name="Schwimmbecken" temperatur="24" geaendert="24.8. - 8:16" changed="1756016208" typ="Freibad" ></BECKEN>
  </BAD>
<BAD id="189" name="Strandbad" ort="Beinwil am See" plz="5712" kanton="AG" adresse1="Strandbad Beinwil am See" adresse2="" >
<BECKEN id="393" name="Hallwilersee" temperatur="25" geaendert="26.6.2017" changed="1498491960" typ="See" ></BECKEN>
  </BAD>
<BAD id="44" name="Aare" ort="Brugg" plz="5200" kanton="AG" adresse1="" adresse2="" >
<BECKEN id="129" name="Aare" temperatur="20.6" geaendert="24.8. - 14:30" changed="1756038622" typ="Fluss" ></BECKEN>
  </BAD>


wiewarm@flo5:~$ head -30 public_html/cache/xmlAndroidCache.xml
<?xml version="1.0" encoding="ISO-8859-1"?>
<!--
... as above
-->
<WIEWARM>
<BAD id="110" name="Schwimmbad" ort="Auenstein" plz="5105" kanton="AG" adresse1="Schwimmbad Rupperswil - Auenstein" adresse2="Werkstrasse 1" longitude="47.690419444444" latitude="8.201925" >
<BECKEN id="257" name="Schwimmbecken" typ="Freibad" ></BECKEN>
  </BAD>
<BAD id="189" name="Strandbad" ort="Beinwil am See" plz="5712" kanton="AG" adresse1="Strandbad Beinwil am See" adresse2="" longitude="0" latitude="0" >
<BECKEN id="393" name="Hallwilersee" typ="See" ></BECKEN>
  </BAD>
<BAD id="44" name="Aare" ort="Brugg" plz="5200" kanton="AG" adresse1="" adresse2="" longitude="47.809058333333" latitude="8.3364305555556" >
<BECKEN id="129" name="Aare" typ="Fluss" ></BECKEN>
  </BAD>


wiewarm@flo5:~$ head -30 public_html/cache/xmlCache.xml
<?xml version="1.0" encoding="ISO-8859-1"?>
<!--
 ... as above
-->
<WIEWARM created="2025-08-24T14:36:01">
<BAD id="110" name="Schwimmbad" ort="Auenstein" plz="5105" kanton="AG" >
<BECKEN id="257" name="Schwimmbecken" temperatur="24" geaendert="24.8. - 8:16" changed="1756016208" ></BECKEN>
  </BAD>
<BAD id="189" name="Strandbad" ort="Beinwil am See" plz="5712" kanton="AG" >
<BECKEN id="393" name="Hallwilersee" temperatur="25" geaendert="26.6.2017" changed="1498491960" ></BECKEN>
  </BAD>
<BAD id="44" name="Aare" ort="Brugg" plz="5200" kanton="AG" >
<BECKEN id="129" name="Aare" temperatur="20.6" geaendert="24.8. - 14:30" changed="1756038622" ></BECKEN>
  </BAD>
<BAD id="220" name="Hallen- und Freibad" ort="Brugg" plz="5200" kanton="AG" >
<BECKEN id="464" name="Hallenbad" temperatur="28.3" geaendert="14.6.2017" changed="1497426604" ></BECKEN>
<BECKEN id="465" name="Schwimmbecken (50m)" temperatur="25" geaendert="19.6.2017" changed="1497905421" ></BECKEN>
  </BAD>
<BAD id="123" name="Badi" ort="D�ttingen" plz="5312" kanton="AG" >
<BECKEN id="284" name="Schwimmerbecken (50m)" temperatur="25" geaendert="12.6.2015" changed="1434113160" ></BECKEN>
  </BAD>
```

## MySwitzerland

Seems to have stopped working ages ago, not sure if salvage possible
