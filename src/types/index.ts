export type UserRole = 'District Health Administrator' | 'PHC Staff' | 'CHC Staff';

export interface User {
  uid: string;
  id: string; // Keep for interface backward compatibility
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  districtId?: string;
  phcId?: string;
  healthCenterId?: string;
  status?: string;
  profilePhoto?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  lastLogin?: string; // For layout rendering
}

export interface MedicineItem {
  id: string;
  name: string;
  stock: number;
  minThreshold: number;
  unit: string;
  status: 'Critical' | 'Warning' | 'Good';
  category: string;
  lastUpdated: string;
}

export interface Medicine {
  medicineId: string;
  medicineName: string;
  genericName: string;
  brandName: string;
  category: string;
  form: 'Tablet' | 'Capsule' | 'Injection' | 'Syrup' | 'Cream' | 'Drops';
  manufacturer: string;
  strength: string;
  packSize: string;
  minStockLevel: number;
  maxStockLevel: number;
  reorderLevel: number;
  storageTemp: string;
  description: string;
  barcode: string;
  qrCode: string;
  imageUrl?: string;
}

export interface MedicineStock {
  stockId: string;
  medicineId: string;
  phcId: string;
  batchNumber: string;
  expiryDate: string;
  currentQuantity: number;
  receivedQuantity: number;
  issuedQuantity: number;
  reservedQuantity: number;
  supplier: string;
  purchaseDate: string;
  purchasePrice: number;
  lastUpdated: string;
}

export interface StockTransaction {
  transactionId: string;
  medicineId: string;
  medicineName?: string;
  phcId: string;
  phcName?: string;
  batchNumber?: string;
  type: 'Stock In' | 'Stock Out' | 'Dispense' | 'Transfer In' | 'Transfer Out' | 'Adjustment' | 'Expired' | 'Damaged' | 'Returned';
  quantity: number;
  userId: string;
  userName: string;
  performedBy?: string;
  reason: string;
  remarks?: string;
  dateTime?: string;
  timestamp: string;
  stockId?: string;
}

export interface StockPrediction {
  predictionId: string;
  medicineId: string;
  phcId: string;
  estimatedStockOutDate: string;
  daysRemaining: number;
  confidenceScore: number;
  reasoning: string;
}

export interface StockTransferRequest {
  requestId: string;
  medicineId: string;
  sourcePhcId: string;
  sourcePhcName: string;
  targetPhcId: string;
  targetPhcName: string;
  quantity: number;
  distance: number;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Completed';
  reason: string;
  createdAt: string;
}

export interface Doctor {
  id: string;
  name: string;
  specialization: string;
  phone: string;
  attendance: 'Present' | 'Absent' | 'On Leave' | 'On Duty';
  phcId: string;
}

export interface LabTestItem {
  id: string;
  name: string;
  available: boolean;
  dailyCapacity: number;
  testsPending: number;
  status: 'Good' | 'Warning' | 'Critical';
  phcId?: string;
}

export interface HealthCenter {
  centerId: string;
  centerName: string;
  centerType: 'PHC' | 'CHC';
  district: string;
  taluka: string;
  village: string;
  address: string;
  latitude: number;
  longitude: number;
  phoneNumber: string;
  email: string;
  medicalOfficerName: string;
  medicalOfficerPhone: string;
  totalDoctors: number;
  totalNurses: number;
  totalStaff: number;
  totalBeds: number;
  icuBeds: number;
  emergencyBeds: number;
  currentPatients: number;
  status: 'Healthy' | 'Needs Attention' | 'Critical';
  openingTime: string;
  closingTime: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  isArchived?: boolean;
  bedsOccupied?: number;
  doctorsPresent?: number;
}

export interface PHC extends HealthCenter {
  id: string;
  name: string;
  type: 'PHC' | 'CHC';
  bedsTotal: number;
  bedsOccupied: number;
  doctorsPresent: number;
  doctorsTotal: number;
  patientFootfallToday: number;
  medicineHealthScore: number;
  labStatusScore: number;
  lastUpdated: string;
}

export interface OperationalAlert {
  id: string;
  phcId: string;
  phcName: string;
  type: 'Medicine Stock-out' | 'High Footfall' | 'Bed Shortage' | 'Doctor Absence' | 'Lab Shortage';
  severity: 'Critical' | 'Warning' | 'Info';
  message: string;
  timestamp: string;
  resolved: boolean;
}

export interface ResourceTransferRequest {
  id: string;
  fromPhcId: string;
  fromPhcName: string;
  toPhcId: string;
  toPhcName: string;
  resourceType: 'Beds' | 'Medicines' | 'Doctors' | 'Lab Kits';
  details: string;
  quantity: number;
  status: 'Pending' | 'Approved' | 'Rejected';
  timestamp: string;
}

export interface DailyMetricRecord {
  date: string;
  patientCount: number;
  bedsOccupied: number;
  doctorsPresent: number;
  medicineShortagesCount: number;
}

export interface PatientFootfall {
  footfallId: string;
  healthCenterId: string;
  date: string; // YYYY-MM-DD
  day: number;
  month: number;
  year: number;
  malePatients: number;
  femalePatients: number;
  childrenPatients: number;
  seniorCitizens: number;
  totalPatients: number;
  emergencyPatients: number;
  opdPatients: number;
  ipdPatients: number;
  createdBy: string;
  createdAt: string;
}

export interface BedManagement {
  bedId: string;
  healthCenterId: string;
  bedType: 'General' | 'ICU' | 'Emergency' | 'Isolation' | 'Maternity' | 'Pediatric';
  TotalBeds: number;
  OccupiedBeds: number;
  AvailableBeds: number;
  ReservedBeds: number;
  MaintenanceBeds: number;
  UpdatedBy: string;
  UpdatedAt: string;
}

export interface DoctorProfile {
  doctorId: string;
  doctorName: string;
  photo: string;
  specialization: string;
  qualification: string;
  registrationNumber: string;
  phone: string;
  email: string;
  assignedHealthCenter: string;
  joiningDate: string;
  employmentType: 'Full-time' | 'Part-time' | 'Contract' | 'Consultant';
  status: 'Active' | 'On Leave' | 'Suspended';
}

export interface DoctorAttendance {
  attendanceId: string;
  doctorId: string;
  healthCenterId: string;
  date: string;
  checkIn: string;
  checkOut: string;
  workingHours: number;
  attendanceStatus: 'Present' | 'Absent' | 'On Leave' | 'Late' | 'On Duty';
  lateMinutes: number;
  remarks: string;
}

export interface DoctorSchedule {
  scheduleId: string;
  doctorId: string;
  dayOfWeek: string;
  shiftStart: string;
  shiftEnd: string;
  roomNumber: string;
}

export interface DoctorTransferHistory {
  transferId: string;
  doctorId: string;
  doctorName: string;
  sourceHealthCenter: string;
  destHealthCenter: string;
  transferDate: string;
  durationDays: number;
  reason: string;
  approvedBy: string;
}

export interface LabTestMaster {
  testId: string;
  testName: string;
  category: string;
  sampleType: string;
  estimatedTimeMins: number;
  price: number;
  dailyCapacity: number;
  equipmentRequired: string;
  reagentRequired: string;
  description: string;
}

export interface LabTestInventory {
  inventoryId: string;
  healthCenterId: string;
  testId: string;
  testName: string;
  isAvailable: boolean;
  dailyCapacity: number;
  todayCompleted: number;
  todayPending: number;
  reagentStockLevel: number; // percentage
  updatedAt: string;
}

export interface LabEquipment {
  equipmentId: string;
  healthCenterId: string;
  equipmentName: string;
  status: 'Working' | 'Maintenance' | 'Offline';
  installationDate: string;
  lastServiceDate: string;
  nextServiceDate: string;
  manufacturer: string;
}

export interface LabTestRequest {
  requestId: string;
  patientId: string;
  patientName: string;
  testId: string;
  testName: string;
  healthCenterId: string;
  status: 'Pending' | 'Completed' | 'Referred';
  referredToCenterId?: string;
  requestDate: string;
}

export interface CommandCenterAction {
  actionId: string;
  healthCenterId: string;
  centerName: string;
  actionType: 'Transfer Medicine' | 'Transfer Doctor' | 'Refer Patients' | 'Maintenance' | 'Order Reagents';
  title: string;
  description: string;
  sourceCenterId?: string;
  sourceCenterName?: string;
  resourceDetails: string;
  estimatedImpact: string;
  status: 'Pending' | 'Approved' | 'Assigned' | 'Scheduled' | 'Ignored';
  officerName?: string;
  createdAt: string;
}

export interface CopilotMessage {
  messageId: string;
  sender: 'user' | 'copilot';
  content: string;
  timestamp: string;
  cardData?: {
    summary: string;
    reasoning: string;
    supportingData: string[];
    actions: {
      actionType: 'Transfer Medicine' | 'Transfer Doctor' | 'Inspection' | 'Notification';
      description: string;
      details: string;
    }[];
    priority: 'Low' | 'Medium' | 'High' | 'Critical';
    confidence: number;
    expectedOutcome: string;
  };
}

export interface CopilotSession {
  sessionId: string;
  title: string;
  messages: CopilotMessage[];
  createdAt: string;
}

export interface CopilotNotification {
  notificationId: string;
  type: 'Medicine Shortage' | 'Patient Surge' | 'Doctor Deficit' | 'Bed Critical' | 'Lab Offline';
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
}



