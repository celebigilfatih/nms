import { NextRequest, NextResponse } from 'next/server';

interface Vendor {
  id: number;
  name: string;
  display_name: string;
  category: string;
  active: boolean;
  description?: string;
}

// This will be shared with the main route
let vendors: Vendor[] = [
  // Networking
  { id: 1, name: 'Cisco', display_name: 'Cisco', category: 'Networking', active: true, description: 'Leading networking equipment manufacturer' },
  { id: 2, name: 'Juniper', display_name: 'Juniper Networks', category: 'Networking', active: true },
  { id: 3, name: 'Arista', display_name: 'Arista Networks', category: 'Networking', active: true },
  { id: 4, name: 'Fortinet', display_name: 'Fortinet', category: 'Networking', active: true },
  { id: 5, name: 'Palo Alto', display_name: 'Palo Alto Networks', category: 'Networking', active: true },
  { id: 6, name: 'MikroTik', display_name: 'MikroTik', category: 'Networking', active: true },
  { id: 7, name: 'Ubiquiti', display_name: 'Ubiquiti Networks', category: 'Networking', active: true },
  { id: 8, name: 'Ruijie', display_name: 'Ruijie Networks', category: 'Networking', active: true, description: 'Chinese networking equipment' },
  
  // Switching & Routing
  { id: 9, name: 'HPE', display_name: 'HPE (Hewlett Packard Enterprise)', category: 'Switching & Routing', active: true },
  { id: 10, name: 'Dell', display_name: 'Dell Technologies', category: 'Switching & Routing', active: true },
  { id: 11, name: 'Extreme', display_name: 'Extreme Networks', category: 'Switching & Routing', active: true },
  { id: 12, name: 'Mellanox', display_name: 'Mellanox Technologies', category: 'Switching & Routing', active: true },
  { id: 13, name: 'NVIDIA', display_name: 'NVIDIA Networking', category: 'Switching & Routing', active: false },
  
  // Security & Firewalls
  { id: 14, name: 'Checkpoint', display_name: 'Check Point Software', category: 'Security & Firewalls', active: true },
  { id: 15, name: 'Barracuda', display_name: 'Barracuda Networks', category: 'Security & Firewalls', active: true },
  { id: 16, name: 'Sophos', display_name: 'Sophos', category: 'Security & Firewalls', active: true },
  { id: 17, name: 'Watchguard', display_name: 'WatchGuard Technologies', category: 'Security & Firewalls', active: false },
  
  // Storage & Computing
  { id: 18, name: 'NetApp', display_name: 'NetApp', category: 'Storage & Computing', active: true },
  { id: 19, name: 'EMC', display_name: 'EMC (Dell EMC)', category: 'Storage & Computing', active: true },
  { id: 20, name: 'IBM', display_name: 'IBM', category: 'Storage & Computing', active: true },
  { id: 21, name: 'Hitachi', display_name: 'Hitachi Vantara', category: 'Storage & Computing', active: false },
  { id: 22, name: 'Pure Storage', display_name: 'Pure Storage', category: 'Storage & Computing', active: true },
  
  // Servers & Infrastructure
  { id: 23, name: 'HP', display_name: 'HP (Hewlett Packard)', category: 'Servers & Infrastructure', active: true },
  { id: 24, name: 'Lenovo', display_name: 'Lenovo', category: 'Servers & Infrastructure', active: true },
  { id: 25, name: 'Supermicro', display_name: 'Supermicro', category: 'Servers & Infrastructure', active: true },
  { id: 26, name: 'QNAP', display_name: 'QNAP', category: 'Servers & Infrastructure', active: true },
  { id: 27, name: 'Synology', display_name: 'Synology', category: 'Servers & Infrastructure', active: true },
  
  // Wireless & WiFi
  { id: 28, name: 'Ruckus', display_name: 'Ruckus Wireless', category: 'Wireless & WiFi', active: true },
  { id: 29, name: 'Aruba', display_name: 'Aruba Networks', category: 'Wireless & WiFi', active: true, description: 'Enterprise wireless solutions' },
  { id: 30, name: 'Meraki', display_name: 'Cisco Meraki', category: 'Wireless & WiFi', active: true },
  
  // Cloud & Virtualization
  { id: 31, name: 'VMware', display_name: 'VMware', category: 'Cloud & Virtualization', active: true },
  { id: 32, name: 'Hyperv', display_name: 'Microsoft Hyper-V', category: 'Cloud & Virtualization', active: true },
  { id: 33, name: 'KVM', display_name: 'KVM', category: 'Cloud & Virtualization', active: false },
  
  // Monitoring & Infrastructure
  { id: 34, name: 'Prometheus', display_name: 'Prometheus', category: 'Monitoring & Infrastructure', active: true },
  { id: 35, name: 'Grafana', display_name: 'Grafana', category: 'Monitoring & Infrastructure', active: true },
  { id: 36, name: 'Zabbix', display_name: 'Zabbix', category: 'Monitoring & Infrastructure', active: true },
  { id: 37, name: 'ELK', display_name: 'Elastic Stack (ELK)', category: 'Monitoring & Infrastructure', active: false },
  
  // Telecommunications
  { id: 38, name: 'Ericsson', display_name: 'Ericsson', category: 'Telecommunications', active: true },
  { id: 39, name: 'Nokia', display_name: 'Nokia', category: 'Telecommunications', active: true },
  { id: 40, name: 'Huawei', display_name: 'Huawei', category: 'Telecommunications', active: true },
  
  // Other
  { id: 41, name: 'Apple', display_name: 'Apple', category: 'Other', active: true },
  { id: 42, name: 'Google', display_name: 'Google', category: 'Other', active: true },
  { id: 43, name: 'Amazon', display_name: 'Amazon AWS', category: 'Other', active: true },
  { id: 44, name: 'Microsoft', display_name: 'Microsoft Azure', category: 'Other', active: true },
  { id: 45, name: 'Linux', display_name: 'Linux', category: 'Other', active: true },
  { id: 46, name: 'Other', display_name: 'Other', category: 'Other', active: true },
];

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const vendorId = parseInt(params.id);
  const vendor = vendors.find(v => v.id === vendorId);

  if (!vendor) {
    return NextResponse.json(
      { success: false, error: 'Vendor not found' },
      { status: 404 }
    );
  }

  return NextResponse.json({
    success: true,
    data: vendor,
  });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const vendorId = parseInt(params.id);
    const body = await request.json();
    
    const vendorIndex = vendors.findIndex(v => v.id === vendorId);
    
    if (vendorIndex === -1) {
      return NextResponse.json(
        { success: false, error: 'Vendor not found' },
        { status: 404 }
      );
    }

    vendors[vendorIndex] = {
      ...vendors[vendorIndex],
      ...body,
      id: vendorId, // Ensure ID doesn't change
    };

    return NextResponse.json({
      success: true,
      data: vendors[vendorIndex],
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to update vendor' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const vendorId = parseInt(params.id);
  const vendorIndex = vendors.findIndex(v => v.id === vendorId);

  if (vendorIndex === -1) {
    return NextResponse.json(
      { success: false, error: 'Vendor not found' },
      { status: 404 }
    );
  }

  const deletedVendor = vendors.splice(vendorIndex, 1)[0];

  return NextResponse.json({
    success: true,
    data: deletedVendor,
  });
}
