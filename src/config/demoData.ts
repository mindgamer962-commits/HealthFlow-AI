import { PHC, OperationalAlert, MedicineItem, LabTestItem, ResourceTransferRequest, DailyMetricRecord } from '../types';

export const MOCK_PHCS: any[] = [
  {
    id: 'phc-1',
    name: 'Mawphlang PHC',
    type: 'PHC',
    district: 'East Khasi Hills',
    bedsTotal: 10,
    bedsOccupied: 9,
    doctorsPresent: 1,
    doctorsTotal: 2,
    patientFootfallToday: 84,
    medicineHealthScore: 42, // Critical level
    labStatusScore: 90,
    status: 'Critical',
    lastUpdated: '10 Mins Ago',
  },
  {
    id: 'phc-2',
    name: 'Laitryngew PHC',
    type: 'PHC',
    district: 'East Khasi Hills',
    bedsTotal: 8,
    bedsOccupied: 3,
    doctorsPresent: 2,
    doctorsTotal: 2,
    patientFootfallToday: 35,
    medicineHealthScore: 85,
    labStatusScore: 50, // Warning level
    status: 'Needs Attention',
    lastUpdated: '1 Hour Ago',
  },
  {
    id: 'phc-3',
    name: 'Sohryngkham PHC',
    type: 'PHC',
    district: 'East Khasi Hills',
    bedsTotal: 12,
    bedsOccupied: 4,
    doctorsPresent: 2,
    doctorsTotal: 3,
    patientFootfallToday: 110, // Very high
    medicineHealthScore: 92,
    labStatusScore: 95,
    status: 'Healthy',
    lastUpdated: '30 Mins Ago',
  },
  {
    id: 'chc-1',
    name: 'Pynursla CHC',
    type: 'CHC',
    district: 'East Khasi Hills',
    bedsTotal: 30,
    bedsOccupied: 28, // High bed occupancy
    doctorsPresent: 2,
    doctorsTotal: 5, // Low attendance
    patientFootfallToday: 185,
    medicineHealthScore: 68,
    labStatusScore: 40,
    status: 'Critical',
    lastUpdated: '5 Mins Ago',
  },
  {
    id: 'phc-4',
    name: 'Mawsynram PHC',
    type: 'PHC',
    district: 'East Khasi Hills',
    bedsTotal: 8,
    bedsOccupied: 1,
    doctorsPresent: 0, // Critical: 0 Doctors present!
    doctorsTotal: 2,
    patientFootfallToday: 22,
    medicineHealthScore: 95,
    labStatusScore: 80,
    status: 'Critical',
    lastUpdated: '45 Mins Ago',
  },
  {
    id: 'chc-2',
    name: 'Cherrapunjee CHC',
    type: 'CHC',
    district: 'East Khasi Hills',
    bedsTotal: 25,
    bedsOccupied: 12,
    doctorsPresent: 4,
    doctorsTotal: 4,
    patientFootfallToday: 95,
    medicineHealthScore: 88,
    labStatusScore: 85,
    status: 'Healthy',
    lastUpdated: '2 Hours Ago',
  }
];

export const MOCK_ALERTS: OperationalAlert[] = [
  {
    id: 'al-1',
    phcId: 'phc-1',
    phcName: 'Mawphlang PHC',
    type: 'Medicine Stock-out',
    severity: 'Critical',
    message: 'ORS and Amoxicillin stock is below 10%. Potential stock-out in 48 hours.',
    timestamp: '2026-07-03T08:30:00Z',
    resolved: false
  },
  {
    id: 'al-2',
    phcId: 'phc-4',
    phcName: 'Mawsynram PHC',
    type: 'Doctor Absence',
    severity: 'Critical',
    message: 'Zero doctors present today. OPD running via nurse practitioner.',
    timestamp: '2026-07-03T09:10:00Z',
    resolved: false
  },
  {
    id: 'al-3',
    phcId: 'chc-1',
    phcName: 'Pynursla CHC',
    type: 'Bed Shortage',
    severity: 'Critical',
    message: 'Bed occupancy is at 93% (28/30 beds). Suggest resource redirection.',
    timestamp: '2026-07-03T09:20:00Z',
    resolved: false
  },
  {
    id: 'al-4',
    phcId: 'phc-3',
    phcName: 'Sohryngkham PHC',
    type: 'High Footfall',
    severity: 'Warning',
    message: 'OPD patient traffic is 150% higher than average (110 vs 44 daily average).',
    timestamp: '2026-07-03T09:35:00Z',
    resolved: false
  },
  {
    id: 'al-5',
    phcId: 'phc-2',
    phcName: 'Laitryngew PHC',
    type: 'Lab Shortage',
    severity: 'Warning',
    message: 'CBC reagent availability below 15%. CBC testing suspended.',
    timestamp: '2026-07-03T07:45:00Z',
    resolved: false
  }
];

export const MOCK_MEDICINES: Record<string, MedicineItem[]> = {
  'phc-1': [
    { id: 'med-1', name: 'Paracetamol 500mg', stock: 120, minThreshold: 200, unit: 'Tablets', status: 'Critical', category: 'Analgesics', lastUpdated: '10 Mins Ago' },
    { id: 'med-2', name: 'Amoxicillin 250mg', stock: 15, minThreshold: 100, unit: 'Capsules', status: 'Critical', category: 'Antibiotics', lastUpdated: '10 Mins Ago' },
    { id: 'med-3', name: 'Oral Rehydration Salts (ORS)', stock: 8, minThreshold: 50, unit: 'Sachets', status: 'Critical', category: 'Rehydration', lastUpdated: '10 Mins Ago' },
    { id: 'med-4', name: 'Metformin 500mg', stock: 350, minThreshold: 150, unit: 'Tablets', status: 'Good', category: 'Antidiabetics', lastUpdated: '10 Mins Ago' },
    { id: 'med-5', name: 'Amlodipine 5mg', stock: 240, minThreshold: 100, unit: 'Tablets', status: 'Good', category: 'Antihypertensives', lastUpdated: '10 Mins Ago' }
  ],
  'phc-2': [
    { id: 'med-1', name: 'Paracetamol 500mg', stock: 350, minThreshold: 200, unit: 'Tablets', status: 'Good', category: 'Analgesics', lastUpdated: '1 Hour Ago' },
    { id: 'med-2', name: 'Amoxicillin 250mg', stock: 120, minThreshold: 100, unit: 'Capsules', status: 'Good', category: 'Antibiotics', lastUpdated: '1 Hour Ago' },
    { id: 'med-3', name: 'Oral Rehydration Salts (ORS)', stock: 25, minThreshold: 50, unit: 'Sachets', status: 'Warning', category: 'Rehydration', lastUpdated: '1 Hour Ago' },
  ]
};

export const MOCK_LABS: Record<string, LabTestItem[]> = {
  'phc-1': [
    { id: 'lab-1', name: 'Malaria Rapid Test Kit', available: true, dailyCapacity: 30, testsPending: 2, status: 'Good' },
    { id: 'lab-2', name: 'Complete Blood Count (CBC)', available: true, dailyCapacity: 15, testsPending: 8, status: 'Good' },
    { id: 'lab-3', name: 'Pregnancy Test Kit (hCG)', available: true, dailyCapacity: 50, testsPending: 1, status: 'Good' },
    { id: 'lab-4', name: 'Widal (Typhoid Test)', available: true, dailyCapacity: 20, testsPending: 5, status: 'Good' }
  ],
  'phc-2': [
    { id: 'lab-1', name: 'Malaria Rapid Test Kit', available: true, dailyCapacity: 30, testsPending: 0, status: 'Good' },
    { id: 'lab-2', name: 'Complete Blood Count (CBC)', available: false, dailyCapacity: 15, testsPending: 12, status: 'Critical' },
    { id: 'lab-3', name: 'Pregnancy Test Kit (hCG)', available: true, dailyCapacity: 50, testsPending: 3, status: 'Good' }
  ]
};

export const MOCK_TRANSFERS: ResourceTransferRequest[] = [
  {
    id: 'tr-1',
    fromPhcId: 'phc-2',
    fromPhcName: 'Laitryngew PHC',
    toPhcId: 'phc-1',
    toPhcName: 'Mawphlang PHC',
    resourceType: 'Medicines',
    details: 'Amoxicillin 250mg - 50 Capsules, ORS - 20 Sachets',
    quantity: 70,
    status: 'Pending',
    timestamp: '2026-07-03T09:40:00Z'
  },
  {
    id: 'tr-2',
    fromPhcId: 'chc-2',
    fromPhcName: 'Cherrapunjee CHC',
    toPhcId: 'chc-1',
    toPhcName: 'Pynursla CHC',
    resourceType: 'Beds',
    details: 'Foldable Emergency Cot Beds with Mattresses',
    quantity: 5,
    status: 'Pending',
    timestamp: '2026-07-03T09:45:00Z'
  },
  {
    id: 'tr-3',
    fromPhcId: 'phc-3',
    fromPhcName: 'Sohryngkham PHC',
    toPhcId: 'phc-4',
    toPhcName: 'Mawsynram PHC',
    resourceType: 'Doctors',
    details: 'General Physician duty delegation (Dr. Wanbor Rymbai - 2 Days)',
    quantity: 1,
    status: 'Approved',
    timestamp: '2026-07-02T14:30:00Z'
  }
];

export const MOCK_TRENDS: DailyMetricRecord[] = [
  { date: 'Jun 27', patientCount: 380, bedsOccupied: 40, doctorsPresent: 12, medicineShortagesCount: 5 },
  { date: 'Jun 28', patientCount: 420, bedsOccupied: 44, doctorsPresent: 11, medicineShortagesCount: 4 },
  { date: 'Jun 29', patientCount: 490, bedsOccupied: 48, doctorsPresent: 13, medicineShortagesCount: 3 },
  { date: 'Jun 30', patientCount: 410, bedsOccupied: 51, doctorsPresent: 10, medicineShortagesCount: 4 },
  { date: 'Jul 01', patientCount: 510, bedsOccupied: 55, doctorsPresent: 12, medicineShortagesCount: 6 },
  { date: 'Jul 02', patientCount: 580, bedsOccupied: 59, doctorsPresent: 11, medicineShortagesCount: 7 },
  { date: 'Jul 03', patientCount: 456, bedsOccupied: 57, doctorsPresent: 11, medicineShortagesCount: 8 }
];
