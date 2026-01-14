import socket
from pysnmp.hlapi import *
import sys

def check_snmp(ip, community, timeout=5):
    print(f"--- SNMP Connection Check for {ip} ---")
    
    # 1. Basic UDP Port Check
    print(f"[*] Checking UDP port 161 on {ip}...")
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    sock.settimeout(timeout)
    try:
        # UDP is connectionless, so this just checks if we can 'send'
        sock.sendto(b'', (ip, 161))
        print("[+] UDP packet sent successfully.")
    except Exception as e:
        print(f"[-] Failed to send UDP packet: {e}")
    finally:
        sock.close()

    # 2. SNMP GET Test (System Description)
    print(f"[*] Attempting SNMP v2c GET (1.3.6.1.2.1.1.1.0) with community '{community}'...")
    error_indication, error_status, error_index, var_binds = next(
        getCmd(SnmpEngine(),
               CommunityData(community),
               UdpTransportTarget((ip, 161), timeout=timeout, retries=2),
               ContextData(),
               ObjectType(ObjectIdentity('1.3.6.1.2.1.1.1.0')))
    )

    if error_indication:
        print(f"[!] SNMP Error: {error_indication}")
        if "timeout" in str(error_indication).lower():
            print("    TIP: This usually means:")
            print("    1. The IP is unreachable (check routing/firewall).")
            print("    2. SNMP is not enabled on the device.")
            print("    3. The device is blocking requests from this IP (172.18.x.x or host IP).")
    elif error_status:
        print(f"[!] SNMP Error Status: {error_status.prettyPrint()} at {error_index}")
    else:
        print("[+] SNMP Response Received!")
        for var_bind in var_binds:
            print(f"    Result: {var_bind.prettyPrint()}")

if __name__ == "__main__":
    ip = "10.5.0.66"
    community = "Nat3k20May17"
    if len(sys.argv) > 1:
        ip = sys.argv[1]
    if len(sys.argv) > 2:
        community = sys.argv[2]
        
    check_snmp(ip, community)
