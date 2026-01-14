import sys
import os
from datetime import datetime
from pysnmp.hlapi import *
import sqlalchemy
from sqlalchemy import create_engine, text

# Add the parent directory to sys.path to import nms_service modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from nms_service.core.config import config

def get_snmp_data(ip, community, oid):
    results = {}
    print(f"[*] Walking OID {oid} on {ip}...")
    for (error_indication, error_status, error_index, var_binds) in nextCmd(
        SnmpEngine(),
        CommunityData(community),
        UdpTransportTarget((ip, 161), timeout=5, retries=2),
        ContextData(),
        ObjectType(ObjectIdentity(oid)),
        lexicographicMode=False
    ):
        if error_indication:
            print(f"[-] SNMP Error: {error_indication}")
            break
        elif error_status:
            print(f"[-] SNMP Error Status: {error_status.prettyPrint()}")
            break
        else:
            for var_bind in var_binds:
                oid_res = str(var_bind[0])
                value = var_bind[1]
                # Extract index from OID (the last part)
                index = oid_res.split('.')[-1]
                
                # Convert value to string/int
                if hasattr(value, 'prettyPrint'):
                    val_str = value.prettyPrint()
                    if val_str.isdigit():
                        results[index] = int(val_str)
                    else:
                        results[index] = val_str
                else:
                    results[index] = value
    return results

def sync_device_7():
    ip = "10.5.0.66"
    community = "Nat3k20May17"
    device_id = 7

    print(f"--- Manual Interface Sync for Device {device_id} ({ip}) ---")

    # 1. Fetch data from SNMP
    names = get_snmp_data(ip, community, '1.3.6.1.2.1.2.2.1.2') # ifDescr
    oper_statuses = get_snmp_data(ip, community, '1.3.6.1.2.1.2.2.1.8') # ifOperStatus
    speeds = get_snmp_data(ip, community, '1.3.6.1.2.1.2.2.1.5') # ifSpeed
    in_octets = get_snmp_data(ip, community, '1.3.6.1.2.1.2.2.1.10') # ifInOctets
    out_octets = get_snmp_data(ip, community, '1.3.6.1.2.1.2.2.1.16') # ifOutOctets

    if not names:
        print("[-] No interfaces found via SNMP. Check connectivity/community.")
        return

    print(f"[+] Found {len(names)} interfaces. Syncing to database...")

    # 2. Connect to Database
    db_url = config.database.connection_string
    # Inside container, 'localhost' might need to be 'postgres'
    if "localhost" in db_url and os.getenv("DB_HOST"):
        db_url = db_url.replace("localhost", os.getenv("DB_HOST"))
    
    engine = create_engine(db_url)
    
    with engine.begin() as conn:
        # Clear existing interfaces for a clean start if desired, or just UPSERT
        # Let's UPSERT based on (device_id, name)
        
        count = 0
        for idx, name in names.items():
            oper_status_raw = oper_statuses.get(idx, 2) # default down
            status = "up" if oper_status_raw == 1 else "down"
            speed = speeds.get(idx, 0)
            in_oct = in_octets.get(idx, 0)
            out_oct = out_octets.get(idx, 0)
            
            # Use SQL text for UPSERT
            # PostgreSQL 9.5+ syntax
            query = text("""
                INSERT INTO interfaces (device_id, name, status, speed, in_octets, out_octets, last_updated)
                VALUES (:device_id, :name, :status, :speed, :in_oct, :out_oct, NOW())
                ON CONFLICT (device_id, name) 
                DO UPDATE SET 
                    status = EXCLUDED.status,
                    speed = EXCLUDED.speed,
                    in_octets = EXCLUDED.in_octets,
                    out_octets = EXCLUDED.out_octets,
                    last_updated = NOW();
            """)
            
            conn.execute(query, {
                "device_id": device_id,
                "name": name,
                "status": status,
                "speed": speed,
                "in_oct": in_oct,
                "out_oct": out_oct
            })
            count += 1
            
        print(f"[+] Successfully synced {count} interfaces to database.")

if __name__ == "__main__":
    sync_device_7()
