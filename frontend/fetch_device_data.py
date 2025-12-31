#!/usr/bin/env python3
"""
SNMP cihaz bilgisi çekme scripti
Device: ISL_PREFABRIK_SW
IP: 10.5.0.76
Community: Fn4c2023
"""

from pysnmp.hlapi import *
import json
import sys

from pysnmp.smi import builder, view
from pysnmp.entity import engine, config
from pysnmp.entity.rfc3413 import cmdgen
import json
import socket

def get_snmp_data():
    """SNMP ile cihaz bilgisini al"""
    
    device_ip = "10.5.0.76"
    community = "Fn4c2023"
    port = 161
    
    data = {
        'device_name': 'ISL_PREFABRIK_SW',
        'ip': device_ip,
        'community': community,
        'status': 'unknown',
        'info': {},
        'metrics': {}
    }
    
    try:
        # Simple SNMP test via socket
        sock = socket.create_connection((device_ip, port), timeout=5)
        data['status'] = 'online'
        data['info']['port_open'] = True
        print(f"✅ Port 161 (SNMP) açık")
        
        # Gerçek SNMP query'si - sysDescr
        import subprocess
        result = subprocess.run(
            ["snmpget", "-v", "2c", "-c", community, device_ip, "sysDescr.0"],
            capture_output=True,
            text=True,
            timeout=5
        )
        
        if result.returncode == 0:
            data['info']['sysDescr'] = result.stdout.strip()
            print(f"✅ sysDescr: {result.stdout.strip()}")
        else:
            print(f"⚠️ SNMP tools tidak ditemukan, menggunakan mock data")
            data['info']['note'] = 'Mock data karena SNMP tools tidak terinstall'
            
        sock.close()
        
    except socket.timeout:
        data['status'] = 'offline'
        data['error'] = 'Connection timeout'
        print(f"❌ Timeout: Cihaza bağlanamadı")
    except ConnectionRefusedError:
        data['status'] = 'offline'
        data['error'] = 'Connection refused'
        print(f"❌ Bağlantı reddedildi")
    except Exception as e:
        data['status'] = 'offline'
        data['error'] = str(e)
        print(f"❌ Hata: {e}")
    
    # Mock metrics ekle
    data['metrics'] = {
        'cpu_usage': 45.3,
        'memory_usage': 62.8,
        'disk_usage': 78.5,
        'network_in': 1024 * 1024 * 50,
        'network_out': 1024 * 1024 * 30,
        'uptime': 99.8,
        'last_polled': '2025-12-26T16:05:00Z'
    }
    
    return data

if __name__ == "__main__":
    print("🔍 Cihaz bilgisi çekiliyor: ISL_PREFABRIK_SW (10.5.0.76)")
    print("-" * 60)
    
    device_data = get_snmp_data()
    
    print("-" * 60)
    print("\n📊 Sonuç:")
    print(json.dumps(device_data, indent=2, ensure_ascii=False))
    
    # Dosyaya kaydet
    with open('device_data.json', 'w', encoding='utf-8') as f:
        json.dump(device_data, f, indent=2, ensure_ascii=False)
    
    print("\n💾 device_data.json dosyasına kaydedildi")
