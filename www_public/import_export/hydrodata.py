#!/usr/bin/python3
# 3.6 minimum for f-strings

import requests
import sys
import os
import datetime
from xml.etree import ElementTree

# mapping on bafu stationsnummer
config = {
    "2070": { 'beckenid': 128, 'remarks': "Emme Emmenmat STRNR=2070", 'badid': 43},
    "2135": { 'beckenid': 52, 'remarks': "Aare Bern STRNR=2135", 'badid': 17},
    "2016": { 'beckenid': 129, 'remarks': "Aare Brugg STRNR=2016 badID=44", 'badid': 44},
    "2030": { 'beckenid': 98, 'remarks': "Aare Thun STRNR=2030  badID=7", 'badid': 7},
    "2152": { 'beckenid': 132, 'remarks': "Reuss Luzern STRNR=2152 badID=47", 'badid': 47},
    "2018": { 'beckenid': 133, 'remarks': "Reuss Mellingen STRNR=2018 badID=48", 'badid': 48},
    "2613": { 'beckenid': 134, 'remarks': "Rhein Basel, Wert aus Weil STRNR=2613 badID=49", 'badid': 49},
    "2091": { 'beckenid': 135, 'remarks': "Rhein Rheinfelden STRNR=2091 badID=50", 'badid': 50},
    "2011": { 'beckenid': 136, 'remarks': "Rhone - Sion STRNR=2011 badID=51", 'badid': 51},
    "2058": { 'beckenid': 288, 'remarks': "Aare - Hagneck STRNR=2058 badID=124", 'badid': 124},
    "2462": { 'beckenid': 289, 'remarks': "Inn - S-chanf STRNR=2462 badID=125", 'badid': 125},
    "2159": { 'beckenid': 290, 'remarks': "Guerbe - Belp STRNR=2159 badID=126", 'badid': 126},
}

def get_sudo_password():
    return os.environ.get("SECRET_SUDOPW")

def get_hydro_auth():
    hydro_user = os.environ.get("HYDRO_USER")
    hydro_pw = os.environ.get("HYDRO_PW")
    if not hydro_user or not hydro_pw:
        print("HYDRO_USER and HYDRO_PW must be set")
        sys.exit(1)
    return (hydro_user, hydro_pw)

def api_post(badid, beckenid, pincode, value):
    api_url = os.environ["API_URL"]
    doc = {'badid': badid, 'pincode': pincode, 'temp': {str(beckenid): value}}
    r = requests.post(f'https://{api_url}/api/v1/temperature.json', json=doc)
    print(r.status_code, doc)

sudo_password = get_sudo_password()
if not sudo_password:
    print("SECRET_SUDOPW must be set")
    sys.exit(1)

hydro_auth = get_hydro_auth()

r = requests.get('https://www.hydrodata.ch/data/xml/hydroweb.xml', auth=hydro_auth)
print("\n", "\n", r.status_code,  r.headers['content-type'], "fetch date", datetime.datetime.now())
root = ElementTree.fromstring(r.content)

parent_map = {c:p for p in root.iter() for c in p}
nodes = root.findall(".//value/..[@name='Wassertemperatur']")

for n in nodes:
    try:
        station = parent_map[n]
        snr = station.attrib['number']
        if snr in config:
            val =  float(n.find("value").text)
            dt =  n.find("datetime").text
            badid = config[snr]['badid']
            print(f"{dt} insert station {snr} {config[snr]['remarks']} {val}")
            api_post(badid, config[snr]['beckenid'], sudo_password, val)
    except:
        e = sys.exc_info()
        print(f"caught {e}, skipping node")
