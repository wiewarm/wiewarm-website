#!/bin/sh

json=/tmp/ww.latest.json
rm $json

d1=$(date --rfc-3339=seconds)

wget -nv -O $json http://www.wiewarm.ch/api/bad?search=__all__

ids=$( grep '"badid":' /tmp/ww.latest.json | sed -e 's/.*://g' | sed -e 's/,//g' | sort -nu)

for i in $ids ; do
  echo Caching $i
  echo 
  wget -nv -O /dev/null http://www.wiewarm.ch/api/bad/$i
done

echo Cache run terminated $d1 -  $(date --rfc-3339=seconds)
