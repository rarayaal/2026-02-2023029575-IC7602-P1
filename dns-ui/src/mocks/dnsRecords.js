// Mock Data inicial para registros DNS adaptado al contrato oficial (docs/contrato-dns-api.md)
export const MOCK_DNS_RECORDS = [
  {
    id: 'DNS-001',
    domain: 'api.company.com',
    type: 'single',
    ttl: 300,
    isActive: true,
    targets: [
      { id: 't-001', ip: '192.168.1.50', status: 'healthy', healthCheckId: 'HC-001' },
    ],
  },
  {
    id: 'DNS-002',
    domain: 'cdn.company.com',
    type: 'multi',
    ttl: 300,
    isActive: true,
    targets: [
      { id: 't-002', ip: '10.0.0.1', status: 'healthy', healthCheckId: 'HC-002' },
      { id: 't-003', ip: '10.0.0.2', status: 'healthy', healthCheckId: null },
      { id: 't-004', ip: '10.0.0.3', status: 'unhealthy', healthCheckId: null },
    ],
  },
  {
    id: 'DNS-003',
    domain: 'app.company.com',
    type: 'weight',
    ttl: 300,
    isActive: true,
    targets: [
      { id: 't-005', ip: '172.16.0.1', weight: 70, status: 'unhealthy', healthCheckId: 'HC-003' },
      { id: 't-006', ip: '172.16.0.2', weight: 30, status: 'healthy', healthCheckId: null },
    ],
  },
  {
    id: 'DNS-004',
    domain: 'edge.company.com',
    type: 'round-trip',
    ttl: 300,
    isActive: true,
    targets: [
      {
        id: 't-007',
        ip: '198.51.100.4',
        status: 'healthy',
        healthCheckId: 'HC-004',
        avgRttMs: 12.4,
        minRttMs: 9.8,
        lastCheckAt: '2026-09-10T18:03:11Z',
      },
    ],
  },
  {
    id: 'DNS-005',
    domain: 'portal.company.com',
    type: 'geo',
    ttl: 300,
    isActive: true,
    targets: [
      { id: 't-008', ip: '203.0.113.10', country: 'US', status: 'healthy', healthCheckId: 'HC-005' },
      { id: 't-009', ip: '203.0.113.20', country: 'CR', status: 'healthy', healthCheckId: null },
    ],
  },
  {
    id: 'DNS-006',
    domain: 'test.company.com',
    type: 'single',
    ttl: 60,
    isActive: true,
    targets: [
      { id: 't-010', ip: '192.168.1.99', status: 'unknown', healthCheckId: null },
    ],
  },
];
