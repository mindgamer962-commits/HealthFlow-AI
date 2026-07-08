import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Plus,
  Filter,
  ArrowRight,
  Pill,
  Bed,
  UserCheck,
  FlaskConical,
  Building2,
  Phone,
  Mail,
  User,
  Clock,
  MapPin,
  Trash2,
  Archive,
  RotateCcw,
  Edit,
  Download,
  Printer,
  X,
  FileSpreadsheet,
  CheckCircle2,
  Loader2,
  Database
} from 'lucide-react';
import { usePhcStore } from '../../store/phcStore';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import { useUserStore } from '../../store/userStore';
import { HealthCenter, PHC } from '../../types';
import { db, IS_MOCK_ENV } from '../../config/firebase';
import { doc, setDoc } from 'firebase/firestore';

export const PhcListPage: React.FC = () => {
  const navigate = useNavigate();
  const { setSelectedPHCId } = useUIStore();
  const { user } = useAuthStore();
  const {
    centers,
    subscribeToCenters,
    createCenter,
    updateCenter,
    deleteCenter,
    archiveCenter,
    restoreCenter,
    loading
  } = usePhcStore();

  // Load centers on component mount
  useEffect(() => {
    const unsubscribe = subscribeToCenters();
    return () => unsubscribe();
  }, []);

  // Filter & Search states
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [talukaFilter, setTalukaFilter] = useState('all');
  const [viewArchived, setViewArchived] = useState(false);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  // Modal triggers
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedCenter, setSelectedCenter] = useState<PHC | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [credentialsModal, setCredentialsModal] = useState<{ email: string; password: string; name: string } | null>(null);

  // Form states (Add)
  const [addName, setAddName] = useState('');
  const [addType, setAddType] = useState<'PHC' | 'CHC'>('PHC');
  const [addDistrict, setAddDistrict] = useState('East Khasi Hills');
  const [addTaluka, setAddTaluka] = useState('');
  const [addVillage, setAddVillage] = useState('');
  const [addAddress, setAddAddress] = useState('');
  const [addLat, setAddLat] = useState(25.45);
  const [addLng, setAddLng] = useState(91.75);
  const [addPhone, setAddPhone] = useState('');
  const [addEmail, setAddEmail] = useState('');
  const [addMoName, setAddMoName] = useState('');
  const [addMoPhone, setAddMoPhone] = useState('');
  const [addDocs, setAddDocs] = useState(2);
  const [addNurses, setAddNurses] = useState(4);
  const [addBeds, setAddBeds] = useState(10);
  const [addStatus, setAddStatus] = useState<'Healthy' | 'Needs Attention' | 'Critical'>('Healthy');
  const [addOpenTime, setAddOpenTime] = useState('09:00 AM');
  const [addCloseTime, setAddCloseTime] = useState('04:00 PM');

  // Staff Account Fields
  const [staffName, setStaffName] = useState('');
  const [staffEmail, setStaffEmail] = useState('');
  const [staffPassword, setStaffPassword] = useState('');
  const [staffPhone, setStaffPhone] = useState('');

  // Form states (Edit)
  const [editName, setEditName] = useState('');
  const [editType, setEditType] = useState<'PHC' | 'CHC'>('PHC');
  const [editTaluka, setEditTaluka] = useState('');
  const [editVillage, setEditVillage] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editLat, setEditLat] = useState(25.45);
  const [editLng, setEditLng] = useState(91.75);
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editMoName, setEditMoName] = useState('');
  const [editMoPhone, setEditMoPhone] = useState('');
  const [editDocs, setEditDocs] = useState(2);
  const [editNurses, setEditNurses] = useState(4);
  const [editBeds, setEditBeds] = useState(10);
  const [editStatus, setEditStatus] = useState<'Healthy' | 'Needs Attention' | 'Critical'>('Healthy');
  const [editOpenTime, setEditOpenTime] = useState('09:00 AM');
  const [editCloseTime, setEditCloseTime] = useState('04:00 PM');

  // Helper trigger for UI toast notifications
  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const [isSeeding, setIsSeeding] = useState(false);

  const handleSeedDatabase = async () => {
    setIsSeeding(true);
    try {
      const centersList = [
        { centerId: 'phc-1', centerName: 'Mawphlang PHC', centerType: 'PHC', district: 'East Khasi Hills', taluka: 'Mawphlang', village: 'Mawphlang', address: 'Near Sacred Grove, Mawphlang', latitude: 25.45, longitude: 91.75, phoneNumber: '+91-364-28502', email: 'mawphlang.phc@gov.in', medicalOfficerName: 'Dr. L. Khongwir', medicalOfficerPhone: '+91-94361-02845', totalDoctors: 2, totalNurses: 4, totalStaff: 8, totalBeds: 10, icuBeds: 0, emergencyBeds: 2, currentPatients: 24, status: 'Critical', openingTime: '09:00', closingTime: '17:00', createdBy: 'system-seed', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), medicineHealthScore: 35, labStatusScore: 40, bedsTotal: 10, bedsOccupied: 9, doctorsPresent: 1, doctorsTotal: 2 },
        { centerId: 'phc-2', centerName: 'Laitryngew PHC', centerType: 'PHC', district: 'East Khasi Hills', taluka: 'Sohra', village: 'Laitryngew', address: 'Sohra Road, Laitryngew', latitude: 25.32, longitude: 91.72, phoneNumber: '+91-364-28503', email: 'laitryngew.phc@gov.in', medicalOfficerName: 'Dr. A. Lyngdoh', medicalOfficerPhone: '+91-94361-02846', totalDoctors: 2, totalNurses: 3, totalStaff: 7, totalBeds: 8, icuBeds: 0, emergencyBeds: 1, currentPatients: 8, status: 'Healthy', openingTime: '09:00', closingTime: '17:00', createdBy: 'system-seed', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), medicineHealthScore: 85, labStatusScore: 90, bedsTotal: 8, bedsOccupied: 2, doctorsPresent: 2, doctorsTotal: 2 },
        { centerId: 'phc-3', centerName: 'Sohryngkham PHC', centerType: 'PHC', district: 'East Khasi Hills', taluka: 'Mawryngkneng', village: 'Sohryngkham', address: 'Jowai Road, Sohryngkham', latitude: 25.56, longitude: 91.98, phoneNumber: '+91-364-28504', email: 'sohryngkham.phc@gov.in', medicalOfficerName: 'Dr. M. War', medicalOfficerPhone: '+91-94361-02847', totalDoctors: 3, totalNurses: 5, totalStaff: 10, totalBeds: 12, icuBeds: 0, emergencyBeds: 2, currentPatients: 18, status: 'Needs Attention', openingTime: '09:00', closingTime: '17:00', createdBy: 'system-seed', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), medicineHealthScore: 65, labStatusScore: 70, bedsTotal: 12, bedsOccupied: 7, doctorsPresent: 2, doctorsTotal: 3 },
        { centerId: 'phc-4', centerName: 'Nongspung PHC', centerType: 'PHC', district: 'East Khasi Hills', taluka: 'Mawphlang', village: 'Nongspung', address: 'Nongspung Main Road', latitude: 25.48, longitude: 91.64, phoneNumber: '+91-364-28505', email: 'nongspung.phc@gov.in', medicalOfficerName: 'Dr. S. Sangma', medicalOfficerPhone: '+91-94361-02848', totalDoctors: 2, totalNurses: 3, totalStaff: 6, totalBeds: 6, icuBeds: 0, emergencyBeds: 1, currentPatients: 5, status: 'Healthy', openingTime: '09:00', closingTime: '17:00', createdBy: 'system-seed', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), medicineHealthScore: 80, labStatusScore: 85, bedsTotal: 6, bedsOccupied: 1, doctorsPresent: 2, doctorsTotal: 2 },
        { centerId: 'phc-5', centerName: 'Mylliem PHC', centerType: 'PHC', district: 'East Khasi Hills', taluka: 'Mylliem', village: 'Mylliem', address: 'Cherrapunjee Road, Mylliem', latitude: 25.49, longitude: 91.82, phoneNumber: '+91-364-28506', email: 'mylliem.phc@gov.in', medicalOfficerName: 'Dr. T. Rani', medicalOfficerPhone: '+91-94361-02849', totalDoctors: 2, totalNurses: 4, totalStaff: 8, totalBeds: 8, icuBeds: 0, emergencyBeds: 2, currentPatients: 10, status: 'Healthy', openingTime: '09:00', closingTime: '17:00', createdBy: 'system-seed', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), medicineHealthScore: 78, labStatusScore: 80, bedsTotal: 8, bedsOccupied: 3, doctorsPresent: 2, doctorsTotal: 2 },
        { centerId: 'phc-6', centerName: 'Nongkrem PHC', centerType: 'PHC', district: 'East Khasi Hills', taluka: 'Mylliem', village: 'Nongkrem', address: 'Nongkrem Center', latitude: 25.51, longitude: 91.92, phoneNumber: '+91-364-28507', email: 'nongkrem.phc@gov.in', medicalOfficerName: 'Dr. J. Shylla', medicalOfficerPhone: '+91-94361-02850', totalDoctors: 2, totalNurses: 3, totalStaff: 7, totalBeds: 8, icuBeds: 0, emergencyBeds: 1, currentPatients: 6, status: 'Healthy', openingTime: '09:00', closingTime: '17:00', createdBy: 'system-seed', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), medicineHealthScore: 82, labStatusScore: 88, bedsTotal: 8, bedsOccupied: 2, doctorsPresent: 2, doctorsTotal: 2 },
        { centerId: 'phc-7', centerName: 'Laitlyngkot PHC', centerType: 'PHC', district: 'East Khasi Hills', taluka: 'Mylliem', village: 'Laitlyngkot', address: 'Jowai bypass Laitlyngkot', latitude: 25.41, longitude: 91.89, phoneNumber: '+91-364-28508', email: 'laitlyngkot.phc@gov.in', medicalOfficerName: 'Dr. R. Marbaniang', medicalOfficerPhone: '+91-94361-02851', totalDoctors: 2, totalNurses: 4, totalStaff: 8, totalBeds: 10, icuBeds: 0, emergencyBeds: 2, currentPatients: 14, status: 'Needs Attention', openingTime: '09:00', closingTime: '17:00', createdBy: 'system-seed', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), medicineHealthScore: 55, labStatusScore: 68, bedsTotal: 10, bedsOccupied: 5, doctorsPresent: 1, doctorsTotal: 2 },
        { centerId: 'phc-8', centerName: 'Pynthorumkhrah PHC', centerType: 'PHC', district: 'East Khasi Hills', taluka: 'Mylliem', village: 'Pynthorumkhrah', address: 'Golf Links Road, Shillong', latitude: 25.59, longitude: 91.90, phoneNumber: '+91-364-28509', email: 'pynthor.phc@gov.in', medicalOfficerName: 'Dr. K. Dkhar', medicalOfficerPhone: '+91-94361-02852', totalDoctors: 4, totalNurses: 6, totalStaff: 12, totalBeds: 15, icuBeds: 0, emergencyBeds: 3, currentPatients: 28, status: 'Healthy', openingTime: '09:00', closingTime: '17:00', createdBy: 'system-seed', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), medicineHealthScore: 90, labStatusScore: 92, bedsTotal: 15, bedsOccupied: 6, doctorsPresent: 4, doctorsTotal: 4 },
        { centerId: 'phc-9', centerName: 'Pomlakrai PHC', centerType: 'PHC', district: 'East Khasi Hills', taluka: 'Mylliem', village: 'Pomlakrai', address: 'Mawphlang Road Pomlakrai', latitude: 25.49, longitude: 91.95, phoneNumber: '+91-364-28510', email: 'pomlakrai.phc@gov.in', medicalOfficerName: 'Dr. P. Roy', medicalOfficerPhone: '+91-94361-02853', totalDoctors: 2, totalNurses: 3, totalStaff: 6, totalBeds: 6, icuBeds: 0, emergencyBeds: 1, currentPatients: 4, status: 'Healthy', openingTime: '09:00', closingTime: '17:00', createdBy: 'system-seed', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), medicineHealthScore: 84, labStatusScore: 85, bedsTotal: 6, bedsOccupied: 1, doctorsPresent: 2, doctorsTotal: 2 },
        { centerId: 'phc-10', centerName: 'Nongkynrih PHC', centerType: 'PHC', district: 'East Khasi Hills', taluka: 'Laitkroh', village: 'Nongkynrih', address: 'Laitkroh Center Nongkynrih', latitude: 25.37, longitude: 91.80, phoneNumber: '+91-364-28511', email: 'nongkynrih.phc@gov.in', medicalOfficerName: 'Dr. V. Basaiawmoit', medicalOfficerPhone: '+91-94361-02854', totalDoctors: 2, totalNurses: 4, totalStaff: 8, totalBeds: 8, icuBeds: 0, emergencyBeds: 2, currentPatients: 9, status: 'Healthy', openingTime: '09:00', closingTime: '17:00', createdBy: 'system-seed', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), medicineHealthScore: 80, labStatusScore: 82, bedsTotal: 8, bedsOccupied: 2, doctorsPresent: 2, doctorsTotal: 2 },
        { centerId: 'chc-1', centerName: 'Pynursla CHC', centerType: 'CHC', district: 'East Khasi Hills', taluka: 'Pynursla', village: 'Pynursla', address: 'Dawki Road, Pynursla', latitude: 25.30, longitude: 91.90, phoneNumber: '+91-364-28601', email: 'pynursla.chc@gov.in', medicalOfficerName: 'Dr. R. Synmon', medicalOfficerPhone: '+91-94361-02860', totalDoctors: 5, totalNurses: 10, totalStaff: 25, totalBeds: 30, icuBeds: 2, emergencyBeds: 5, currentPatients: 45, status: 'Healthy', openingTime: '00:00', closingTime: '23:59', createdBy: 'system-seed', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), medicineHealthScore: 88, labStatusScore: 89, bedsTotal: 30, bedsOccupied: 12, doctorsPresent: 5, doctorsTotal: 5 },
        { centerId: 'chc-2', centerName: 'Cherrapunjee CHC', centerType: 'CHC', district: 'East Khasi Hills', taluka: 'Sohra', village: 'Cherrapunjee', address: 'Sohra Market Road', latitude: 25.28, longitude: 91.70, phoneNumber: '+91-364-28602', email: 'sohra.chc@gov.in', medicalOfficerName: 'Dr. E. Laloo', medicalOfficerPhone: '+91-94361-02861', totalDoctors: 4, totalNurses: 8, totalStaff: 20, totalBeds: 25, icuBeds: 1, emergencyBeds: 4, currentPatients: 20, status: 'Healthy', openingTime: '00:00', closingTime: '23:59', createdBy: 'system-seed', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), medicineHealthScore: 85, labStatusScore: 87, bedsTotal: 25, bedsOccupied: 8, doctorsPresent: 4, doctorsTotal: 4 },
        { centerId: 'chc-3', centerName: 'Central CHC Shillong', centerType: 'CHC', district: 'East Khasi Hills', taluka: 'Mylliem', village: 'Shillong', address: 'Laitumkhrah Main Road', latitude: 25.57, longitude: 91.91, phoneNumber: '+91-364-28603', email: 'central.chc@gov.in', medicalOfficerName: 'Dr. H. Rymbai', medicalOfficerPhone: '+91-94361-02862', totalDoctors: 8, totalNurses: 15, totalStaff: 40, totalBeds: 50, icuBeds: 4, emergencyBeds: 8, currentPatients: 65, status: 'Healthy', openingTime: '00:00', closingTime: '23:59', createdBy: 'system-seed', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), medicineHealthScore: 92, labStatusScore: 94, bedsTotal: 50, bedsOccupied: 15, doctorsPresent: 8, doctorsTotal: 8 }
      ];

      // 1. Write Centers
      for (const hc of centersList) {
        if (IS_MOCK_ENV) {
          const current = localStorage.getItem('hf_phc_centers') || '[]';
          const list = JSON.parse(current);
          if (!list.some((c: any) => c.centerId === hc.centerId)) {
            list.push(hc);
            localStorage.setItem('hf_phc_centers', JSON.stringify(list));
          }
        } else {
          await setDoc(doc(db, 'health_centers', hc.centerId), hc);
        }

        // 2. Initialize default bed pools for this center
        const bedTypes = ['General', 'ICU', 'Emergency', 'Isolation', 'Maternity', 'Pediatric'] as const;
        const defaultBeds = bedTypes.map(t => {
          const total = t === 'General' ? hc.totalBeds : t === 'Emergency' ? hc.emergencyBeds : t === 'ICU' ? hc.icuBeds : 2;
          return {
            bedId: `bm-${hc.centerId}-${t.toLowerCase()}`,
            healthCenterId: hc.centerId,
            bedType: t,
            TotalBeds: total,
            OccupiedBeds: t === 'General' ? hc.bedsOccupied : 0,
            AvailableBeds: t === 'General' ? Math.max(0, total - hc.bedsOccupied) : total,
            ReservedBeds: 0,
            MaintenanceBeds: 0,
            UpdatedBy: 'system-seed',
            UpdatedAt: new Date().toISOString()
          };
        });

        for (const bed of defaultBeds) {
          if (IS_MOCK_ENV) {
            const current = localStorage.getItem('healthflow_beds') || '[]';
            const list = JSON.parse(current);
            if (!list.some((b: any) => b.bedId === bed.bedId)) {
              list.push(bed);
              localStorage.setItem('healthflow_beds', JSON.stringify(list));
            }
          } else {
            await setDoc(doc(db, 'bed_management', bed.bedId), bed);
          }
        }

        // 3. Initialize default lab inventories
        const defaultTests = [
          { testId: 't-cbc', testName: 'CBC (Complete Blood Count)', dailyCapacity: 30 },
          { testId: 't-malaria', testName: 'Malaria Smear Test', dailyCapacity: 25 },
          { testId: 't-glucose', testName: 'Blood Glucose Test', dailyCapacity: 40 },
          { testId: 't-xray', testName: 'Chest X-Ray', dailyCapacity: 15 },
          { testId: 't-widal', testName: 'Typhoid Widal Test', dailyCapacity: 20 }
        ];
        const defaultInventories = defaultTests.map(t => ({
          inventoryId: `inv-${hc.centerId}-${t.testId}`,
          healthCenterId: hc.centerId,
          testId: t.testId,
          testName: t.testName,
          isAvailable: !(hc.centerId === 'phc-1' && t.testId === 't-xray'),
          dailyCapacity: t.dailyCapacity,
          todayCompleted: 0,
          todayPending: 0,
          reagentStockLevel: 80,
          updatedAt: new Date().toISOString()
        }));

        for (const inv of defaultInventories) {
          if (IS_MOCK_ENV) {
            const current = localStorage.getItem('hf_lab_inventories') || '[]';
            const list = JSON.parse(current);
            if (!list.some((i: any) => i.inventoryId === inv.inventoryId)) {
              list.push(inv);
              localStorage.setItem('hf_lab_inventories', JSON.stringify(list));
            }
          } else {
            await setDoc(doc(db, 'test_inventory', inv.inventoryId), inv);
          }
        }

        // 3b. Seed default lab diagnostic kits (lab_tests collection)
        const labKits = [
          { id: `lab-${hc.centerId}-1`, name: 'Malaria Rapid Test Kit', available: true, dailyCapacity: 30, testsPending: 2, status: 'Good' as const, phcId: hc.centerId },
          { id: `lab-${hc.centerId}-2`, name: 'Complete Blood Count (CBC)', available: true, dailyCapacity: 15, testsPending: 8, status: 'Good' as const, phcId: hc.centerId },
          { id: `lab-${hc.centerId}-3`, name: 'Pregnancy Test Kit (hCG)', available: true, dailyCapacity: 50, testsPending: 1, status: 'Good' as const, phcId: hc.centerId },
          { id: `lab-${hc.centerId}-4`, name: 'Widal (Typhoid Test)', available: true, dailyCapacity: 20, testsPending: 5, status: 'Good' as const, phcId: hc.centerId }
        ];

        for (const lab of labKits) {
          if (IS_MOCK_ENV) {
            const current = localStorage.getItem('healthflow_labs') || '[]';
            const list = JSON.parse(current);
            if (!list.some((l: any) => l.id === lab.id)) {
              list.push(lab);
              localStorage.setItem('healthflow_labs', JSON.stringify(list));
            }
          } else {
            await setDoc(doc(db, 'lab_tests', lab.id), lab);
          }
        }

        // 4. Initialize default equipment
        const defaultEquipment = [
          { equipmentId: `eq-${hc.centerId}-cbc`, healthCenterId: hc.centerId, equipmentName: 'Hematology Analyzer', status: 'Working' as const, installationDate: '2023-01-10', lastServiceDate: '2026-03-01', nextServiceDate: '2026-09-01', manufacturer: 'Sysmex' },
          { equipmentId: `eq-${hc.centerId}-xray`, healthCenterId: hc.centerId, equipmentName: 'X-Ray Machine', status: hc.centerId === 'phc-1' ? ('Offline' as const) : ('Working' as const), installationDate: '2021-06-15', lastServiceDate: '2025-11-20', nextServiceDate: '2026-05-20', manufacturer: 'Siemens' }
        ];

        for (const eq of defaultEquipment) {
          if (IS_MOCK_ENV) {
            const current = localStorage.getItem('hf_lab_equipments') || '[]';
            const list = JSON.parse(current);
            if (!list.some((e: any) => e.equipmentId === eq.equipmentId)) {
              list.push(eq);
              localStorage.setItem('hf_lab_equipments', JSON.stringify(list));
            }
          } else {
            await setDoc(doc(db, 'laboratory_equipment', eq.equipmentId), eq);
          }
        }
      }

      // 5. Seed default medicines master index
      const defaultMeds = [
        { medicineId: 'med-1', medicineName: 'Paracetamol 500mg', genericName: 'Acetaminophen', brandName: 'Crocin', category: 'Analgesics', form: 'Tablet', manufacturer: 'GSK', strength: '500mg', packSize: '10x15 Tablets', minStockLevel: 200, maxStockLevel: 2000, reorderLevel: 500, storageTemp: '20-25C', description: 'Pain and fever reliever.', barcode: '8901', qrCode: 'QR-P' },
        { medicineId: 'med-2', medicineName: 'Amoxicillin 250mg', genericName: 'Amoxicillin', brandName: 'Novamox', category: 'Antibiotics', form: 'Capsule', manufacturer: 'Alkem', strength: '250mg', packSize: '10x10 Capsules', minStockLevel: 100, maxStockLevel: 1000, reorderLevel: 250, storageTemp: '15-30C', description: 'Bacterial infections.', barcode: '8902', qrCode: 'QR-A' },
        { medicineId: 'med-3', medicineName: 'Oral Rehydration Salts', genericName: 'ORS WHO formula', brandName: 'Electral', category: 'Rehydration', form: 'Syrup', manufacturer: 'FDC', strength: '21.8g', packSize: '50 Sachets', minStockLevel: 50, maxStockLevel: 500, reorderLevel: 100, storageTemp: 'Below 30C', description: 'Rehydration.', barcode: '8903', qrCode: 'QR-O' }
      ];

      for (const m of defaultMeds) {
        if (IS_MOCK_ENV) {
          const current = localStorage.getItem('hf_medicines') || '[]';
          const list = JSON.parse(current);
          if (!list.some((med: any) => med.medicineId === m.medicineId)) {
            list.push(m);
            localStorage.setItem('hf_medicines', JSON.stringify(list));
          }
        } else {
          await setDoc(doc(db, 'medicines', m.medicineId), m);
        }
      }

      // 6. Seed medicine stocks for each center
      for (const hc of centersList) {
        const defaultStocks = [
          { stockId: `stk-${hc.centerId}-1`, medicineId: 'med-1', phcId: hc.centerId, batchNumber: 'B-PARA-01', expiryDate: new Date(Date.now() + 30 * 24 * 3600000).toISOString().split('T')[0], currentQuantity: 120, receivedQuantity: 500, issuedQuantity: 380, reservedQuantity: 0, supplier: 'MSMS', purchaseDate: '2026-04-01', purchasePrice: 1.5, lastUpdated: 'Just Now' },
          { stockId: `stk-${hc.centerId}-2`, medicineId: 'med-2', phcId: hc.centerId, batchNumber: 'B-AMOX-01', expiryDate: new Date(Date.now() + 15 * 24 * 3600000).toISOString().split('T')[0], currentQuantity: 15, receivedQuantity: 200, issuedQuantity: 185, reservedQuantity: 0, supplier: 'Apex', purchaseDate: '2026-05-01', purchasePrice: 4.0, lastUpdated: 'Just Now' },
          { stockId: `stk-${hc.centerId}-3`, medicineId: 'med-3', phcId: hc.centerId, batchNumber: 'B-ORS-01', expiryDate: new Date(Date.now() + 120 * 24 * 3600000).toISOString().split('T')[0], currentQuantity: 8, receivedQuantity: 100, issuedQuantity: 92, reservedQuantity: 0, supplier: 'MSMS', purchaseDate: '2026-06-01', purchasePrice: 2.2, lastUpdated: 'Just Now' }
        ];

        for (const s of defaultStocks) {
          if (IS_MOCK_ENV) {
            const current = localStorage.getItem('hf_stocks') || '[]';
            const list = JSON.parse(current);
            if (!list.some((st: any) => st.stockId === s.stockId)) {
              list.push(s);
              localStorage.setItem('hf_stocks', JSON.stringify(list));
            }
          } else {
            await setDoc(doc(db, 'medicine_stock', s.stockId), s);
          }
        }
      }

      // 7. Seed 5 Doctors for each clinic
      const specs = ['General Medicine', 'Pediatrics', 'Gynecology', 'General Surgery', 'Cardiology'];
      const quals = ['MBBS, MD', 'MBBS, DCH', 'MBBS, MD (OBG)', 'MBBS, MS', 'MBBS, MD, DM'];
      const doctorNamesPool = [
        ['Dr. Sarah Lyngdoh', 'Dr. John Mawlong', 'Dr. Wanboklang Kurkalang', 'Dr. Daphne Sohkhlet', 'Dr. Sildora Nongrum'],
        ['Dr. Ribor Syiem', 'Dr. Badap Rani', 'Dr. Rebecca Synrem', 'Dr. V. Basaiawmoit', 'Dr. P. Roy'],
        ['Dr. K. Dkhar', 'Dr. R. Marbaniang', 'Dr. J. Shylla', 'Dr. T. Rani', 'Dr. S. Sangma']
      ];

      let docCounter = 1;
      for (const hc of centersList) {
        for (let i = 0; i < 5; i++) {
          const spec = specs[i];
          const qual = quals[i];
          const baseName = doctorNamesPool[docCounter % 3][i];
          const docName = `${baseName} (${hc.centerName})`;
          const docId = `doc-${hc.centerId}-${i + 1}`;
          
          const docObj = {
            id: docId,
            doctorId: docId,
            name: docName,
            doctorName: docName,
            specialization: spec,
            qualification: qual,
            registrationNumber: `MCI-${10000 + docCounter}`,
            phone: `+91-94361-${20000 + docCounter}`,
            email: `${baseName.toLowerCase().replace(/[^a-z]/g, '')}@healthflow.gov.in`,
            phcId: hc.centerId,
            assignedHealthCenter: hc.centerId,
            attendance: 'Present' as const,
            attendanceStatus: 'Present' as const,
            status: 'Active' as const,
            photo: `https://images.unsplash.com/photo-1559839734?auto=format&fit=crop&q=80&w=150`,
            joiningDate: '2023-05-10',
            employmentType: 'Full-time' as const
          };

          if (IS_MOCK_ENV) {
            const current = localStorage.getItem('hf_doctors') || '[]';
            const list = JSON.parse(current);
            if (!list.some((doc: any) => doc.doctorId === docObj.doctorId)) {
              list.push(docObj);
              localStorage.setItem('hf_doctors', JSON.stringify(list));
            }
          } else {
            await setDoc(doc(db, 'doctors', docObj.doctorId), docObj);
          }
          docCounter++;
        }
      }

      triggerToast("Demo dataset seeded to database successfully!");
      subscribeToCenters();
    } catch (e) {
      console.error(e);
      triggerToast("Failed to seed database.");
    } finally {
      setIsSeeding(false);
    }
  };

  // Filter centers list based on permissions, search, and filter parameters
  const processedCenters = useMemo(() => {
    return centers.filter((c) => {
      // 1. Role restrictions: PHC/CHC Staff only sees their assigned node
      if ((user?.role === 'PHC Staff' || user?.role === 'CHC Staff') && c.centerId !== user.phcId) {
        return false;
      }

      // 2. Archive states
      const matchesArchive = viewArchived ? c.isArchived === true : !c.isArchived;

      // 3. Search parameters
      const matchesSearch =
        c.centerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.district.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.village.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.medicalOfficerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.status.toLowerCase().includes(searchTerm.toLowerCase());

      // 4. Nested selectors
      const matchesType = typeFilter === 'all' ? true : c.centerType === typeFilter;
      const matchesStatus = statusFilter === 'all' ? true : c.status === statusFilter;
      const matchesTaluka = talukaFilter === 'all' ? true : c.taluka.toLowerCase() === talukaFilter.toLowerCase();

      return matchesArchive && matchesSearch && matchesType && matchesStatus && matchesTaluka;
    });
  }, [centers, user, viewArchived, searchTerm, typeFilter, statusFilter, talukaFilter]);

  // Aggregate calculations for Dashboard summary counters
  const summary = useMemo(() => {
    const total = processedCenters.length;
    const healthy = processedCenters.filter(c => c.status === 'Healthy').length;
    const critical = processedCenters.filter(c => c.status === 'Critical').length;
    const doctors = processedCenters.reduce((sum, c) => sum + c.totalDoctors, 0);
    const beds = processedCenters.reduce((sum, c) => sum + c.totalBeds, 0);
    const patients = processedCenters.reduce((sum, c) => sum + c.currentPatients, 0);

    return { total, healthy, critical, doctors, beds, patients };
  }, [processedCenters]);

  // Unique list of Talukas for filter select options
  const uniqueTalukas = useMemo(() => {
    const list = new Set<string>();
    centers.forEach(c => {
      if (c.taluka) list.add(c.taluka);
    });
    return Array.from(list);
  }, [centers]);

  // Paginated list output
  const paginatedCenters = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return processedCenters.slice(start, start + itemsPerPage);
  }, [processedCenters, currentPage]);

  const totalPages = Math.ceil(processedCenters.length / itemsPerPage) || 1;

  // Open Edit Dialog
  const openEditDialog = (c: PHC) => {
    setSelectedCenter(c);
    setEditName(c.centerName);
    setEditType(c.centerType);
    setEditTaluka(c.taluka || '');
    setEditVillage(c.village || '');
    setEditAddress(c.address || '');
    setEditLat(c.latitude || 25.45);
    setEditLng(c.longitude || 91.75);
    setEditPhone(c.phoneNumber || '');
    setEditEmail(c.email || '');
    setEditMoName(c.medicalOfficerName || '');
    setEditMoPhone(c.medicalOfficerPhone || '');
    setEditDocs(c.totalDoctors || 2);
    setEditNurses(c.totalNurses || 4);
    setEditBeds(c.totalBeds || 10);
    setEditStatus(c.status);
    setEditOpenTime(c.openingTime || '09:00 AM');
    setEditCloseTime(c.closingTime || '04:00 PM');
    setShowEditModal(true);
  };

  // Add submission handler
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const newPhcId = await createCenter({
        centerName: addName,
        centerType: addType,
        district: addDistrict,
        taluka: addTaluka,
        village: addVillage,
        address: addAddress,
        latitude: Number(addLat),
        longitude: Number(addLng),
        phoneNumber: addPhone,
        email: addEmail,
        medicalOfficerName: addMoName,
        medicalOfficerPhone: addMoPhone,
        totalDoctors: Number(addDocs),
        totalNurses: Number(addNurses),
        totalStaff: Number(addDocs) + Number(addNurses) + 4,
        totalBeds: Number(addBeds),
        icuBeds: Math.round(Number(addBeds) * 0.1),
        emergencyBeds: Math.round(Number(addBeds) * 0.2),
        currentPatients: 0,
        status: addStatus,
        openingTime: addOpenTime,
        closingTime: addCloseTime
      });

      // Create new user of role PHC Staff or CHC Staff using form input details
      const userStore = useUserStore.getState();
      await userStore.addUser({
        name: staffName,
        email: staffEmail,
        password: staffPassword,
        role: addType === 'PHC' ? 'PHC Staff' : 'CHC Staff',
        phcId: newPhcId,
        healthCenterId: newPhcId,
        districtId: addDistrict,
        phone: staffPhone || '+91-94361-00000',
        isActive: true,
        status: 'Active'
      } as any);

      // Show credentials dialog modal
      setCredentialsModal({
        name: addName,
        email: staffEmail,
        password: staffPassword
      });

      triggerToast("New Health Center node and staff login created successfully!");
      setShowAddModal(false);
      
      // Reset fields
      setAddName('');
      setAddTaluka('');
      setAddVillage('');
      setAddAddress('');
      setAddPhone('');
      setAddEmail('');
      setAddMoName('');
      setAddMoPhone('');
      setStaffName('');
      setStaffEmail('');
      setStaffPassword('');
      setStaffPhone('');
    } catch (err: any) {
      triggerToast(err.message || "Failed to create center.");
    }
  };

  // Edit submission handler
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCenter) return;

    try {
      await updateCenter(selectedCenter.centerId, {
        centerName: editName,
        centerType: editType,
        taluka: editTaluka,
        village: editVillage,
        address: editAddress,
        latitude: Number(editLat),
        longitude: Number(editLng),
        phoneNumber: editPhone,
        email: editEmail,
        medicalOfficerName: editMoName,
        medicalOfficerPhone: editMoPhone,
        totalDoctors: Number(editDocs),
        totalNurses: Number(editNurses),
        totalBeds: Number(editBeds),
        status: editStatus,
        openingTime: editOpenTime,
        closingTime: editCloseTime
      });

      triggerToast("Facility node configuration updated successfully!");
      setShowEditModal(false);
      setSelectedCenter(null);
    } catch (err: any) {
      triggerToast(err.message || "Failed to update center.");
    }
  };

  // CSV Export Trigger
  const handleCSVExport = () => {
    const headers = [
      'Center ID,Name,Type,District,Taluka,Village,Address,Medical Officer,Phone,Email,Doctors,Nurses,Beds,Patients,Status'
    ];
    const rows = processedCenters.map(c => [
      c.centerId,
      `"${c.centerName}"`,
      c.centerType,
      c.district,
      c.taluka,
      c.village,
      `"${c.address}"`,
      `"${c.medicalOfficerName}"`,
      c.phoneNumber,
      c.email,
      c.totalDoctors,
      c.totalNurses,
      c.totalBeds,
      c.currentPatients,
      c.status
    ].join(','));
    
    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `HealthCenters_Audit_List_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    triggerToast("CSV Sheet generated successfully!");
  };

  // print list
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 p-4 bg-slate-900 text-white text-xs font-bold rounded-xl shadow-lg flex items-center gap-2">
          <CheckCircle2 className="h-4.5 w-4.5 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 no-print">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 leading-none">
            District Medical Facilities Directory
          </h2>
          <p className="text-sm text-slate-500 mt-1.5">
            Administer primary and community health nodes, inspect beds capacities, and assign medical officers.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Print & CSV buttons */}
          <button
            onClick={handleCSVExport}
            className="flex items-center gap-1 px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold text-xs rounded-xl transition-all shadow-sm"
            title="Export CSV"
          >
            <Download className="h-4 w-4" />
            <span>CSV</span>
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1 px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold text-xs rounded-xl transition-all shadow-sm"
            title="Print List"
          >
            <Printer className="h-4 w-4" />
            <span>Print</span>
          </button>

          {/* Add Facility Button */}
          {user?.role === 'District Health Administrator' && (
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-brand-blue hover:bg-brand-darkBlue text-white font-bold text-xs rounded-xl transition-all-ease shadow"
            >
              <Plus className="h-4 w-4" />
              Add Facility
            </button>
          )}
        </div>
      </div>

      {/* Summary counters section */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { label: 'Total Centers', val: summary.total, color: 'text-brand-blue bg-blue-50' },
          { label: 'Healthy Nodes', val: summary.healthy, color: 'text-emerald-700 bg-emerald-50' },
          { label: 'Critical Alert', val: summary.critical, color: 'text-red-750 bg-red-105' },
          { label: 'Total Physicians', val: summary.doctors, color: 'text-pink-700 bg-pink-50' },
          { label: 'Total Bed Capacity', val: summary.beds, color: 'text-purple-700 bg-purple-50' },
          { label: 'OPD Patients Today', val: summary.patients, color: 'text-brand-orange bg-orange-50' }
        ].map((item, i) => (
          <div key={i} className="bg-white border rounded-apex p-4 flex flex-col justify-between shadow-apex-sm">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">{item.label}</span>
            <span className={`text-xl font-extrabold mt-2.5 px-3 py-0.5 rounded-xl self-start ${item.color}`}>
              {item.val}
            </span>
          </div>
        ))}
      </div>

      {/* Filter and Search controls */}
      <div className="flex flex-col lg:flex-row gap-4 bg-white p-4 border border-slate-200 rounded-apex shadow-apex-sm no-print">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by facility name, village, officer, or status..."
            className="w-full pl-9 pr-4 py-2.5 text-xs bg-slate-55 border border-slate-200 rounded-xl focus:bg-white focus:outline-none text-slate-800"
          />
        </div>

        {/* Filters */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {/* Facility Type */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-slate-55 border border-slate-200 text-xs font-semibold text-slate-700 rounded-xl px-3 py-2 cursor-pointer focus:outline-none"
          >
            <option value="all">All Facility Types</option>
            <option value="PHC">Primary Health Centre (PHC)</option>
            <option value="CHC">Community Health Centre (CHC)</option>
          </select>

          {/* Status */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-55 border border-slate-200 text-xs font-semibold text-slate-700 rounded-xl px-3 py-2 cursor-pointer focus:outline-none"
          >
            <option value="all">All Alert Statuses</option>
            <option value="Healthy">Healthy Nodes</option>
            <option value="Needs Attention">Needs Attention</option>
            <option value="Critical">Critical</option>
          </select>

          {/* Taluka */}
          <select
            value={talukaFilter}
            onChange={(e) => setTalukaFilter(e.target.value)}
            className="bg-slate-55 border border-slate-200 text-xs font-semibold text-slate-700 rounded-xl px-3 py-2 cursor-pointer focus:outline-none"
          >
            <option value="all">All Talukas</option>
            {uniqueTalukas.map((t, idx) => (
              <option key={idx} value={t}>{t}</option>
            ))}
          </select>

          {/* Archived Toggle */}
          {user?.role === 'District Health Administrator' && (
            <button
              onClick={() => setViewArchived(!viewArchived)}
              className={`flex items-center justify-center gap-1.5 text-xs font-bold border rounded-xl px-3 py-2 transition-all cursor-pointer ${
                viewArchived ? 'bg-brand-orange/10 border-brand-orange text-brand-orange' : 'bg-slate-55 border-slate-200 text-slate-650 hover:bg-slate-100'
              }`}
            >
              <Archive className="h-4 w-4" />
              <span>{viewArchived ? "View Active" : "View Archived"}</span>
            </button>
          )}
        </div>
      </div>

      {/* Facilities Grid list */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {paginatedCenters.map((c) => (
          <div
            key={c.centerId}
            className="bg-white border border-slate-200 rounded-apex shadow-apex-sm p-6 flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden group"
          >
            {/* Status colored side accent bar */}
            <div className={`absolute left-0 top-0 bottom-0 w-1 ${
              c.status === 'Critical'
                ? 'bg-status-critical'
                : c.status === 'Needs Attention'
                ? 'bg-status-warning'
                : 'bg-status-success'
            }`} />

            <div className="space-y-4 pl-1.5">
              {/* Card Header */}
              <div className="flex justify-between items-start gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] uppercase font-extrabold px-2 py-0.5 rounded bg-slate-100 text-slate-500">
                      {c.centerType}
                    </span>
                    <span
                      className={`text-[9px] uppercase font-extrabold px-2.5 py-0.5 rounded-full ${
                        c.status === 'Critical'
                          ? 'bg-status-critical/10 text-status-critical'
                          : c.status === 'Needs Attention'
                          ? 'bg-status-warning/10 text-status-warning'
                          : 'bg-status-success/10 text-status-success'
                      }`}
                    >
                      {c.status}
                    </span>
                  </div>
                  <h4 className="font-extrabold text-slate-800 text-sm mt-2 block">{c.centerName}</h4>
                </div>
              </div>

              {/* General details list */}
              <div className="space-y-2 text-xs text-slate-500 font-medium">
                <div className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 text-slate-400 shrink-0" />
                  <span className="truncate">{c.village}, {c.taluka}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <User className="h-4 w-4 text-slate-400 shrink-0" />
                  <span className="truncate">MO: {c.medicalOfficerName}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-slate-400 shrink-0" />
                  <span>Hrs: {c.openingTime} - {c.closingTime}</span>
                </div>
              </div>

              {/* Ratios row */}
              <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-100 text-center">
                <div className="space-y-0.5">
                  <span className="text-[10px] text-slate-450 uppercase block font-bold">Docs</span>
                  <span className="font-bold text-slate-800 text-xs">
                    {c.doctorsPresent || c.totalDoctors}/{c.totalDoctors}
                  </span>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[10px] text-slate-450 uppercase block font-bold">Beds</span>
                  <span className="font-bold text-slate-800 text-xs">
                    {c.bedsOccupied || 0}/{c.totalBeds}
                  </span>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[10px] text-slate-450 uppercase block font-bold">Patients</span>
                  <span className="font-bold text-brand-orange text-xs">
                    {c.currentPatients}
                  </span>
                </div>
              </div>
            </div>

            {/* Inspect / Action Buttons */}
            <div className="flex items-center gap-2 pt-4 border-t mt-4 pl-1.5">
              <button
                onClick={() => {
                  setSelectedPHCId(c.centerId);
                  navigate(`/phcs/${c.centerId}`);
                }}
                className="flex-1 flex items-center justify-center gap-1 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-650 hover:text-slate-850 font-bold text-xs rounded-xl transition-all"
              >
                Inspect Center
                <ArrowRight className="h-3.5 w-3.5" />
              </button>

              {/* Admin modifications buttons */}
              {user?.role === 'District Health Administrator' && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEditDialog(c)}
                    className="p-2 text-slate-400 hover:text-brand-blue hover:bg-slate-50 border rounded-xl"
                    title="Edit Node"
                  >
                    <Edit className="h-4 w-4" />
                  </button>

                  {c.isArchived ? (
                    <button
                      onClick={async () => {
                        await restoreCenter(c.centerId);
                        triggerToast("Center restored successfully.");
                      }}
                      className="p-2 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 border rounded-xl"
                      title="Restore Center"
                    >
                      <RotateCcw className="h-4 w-4" />
                    </button>
                  ) : (
                    <button
                      onClick={async () => {
                        await archiveCenter(c.centerId);
                        triggerToast("Center archived successfully.");
                      }}
                      className="p-2 text-slate-400 hover:text-brand-orange hover:bg-orange-50 border rounded-xl"
                      title="Archive Center"
                    >
                      <Archive className="h-4 w-4" />
                    </button>
                  )}

                  <button
                    onClick={async () => {
                      if (window.confirm(`Delete ${c.centerName} permanent?`)) {
                        await deleteCenter(c.centerId);
                        triggerToast("Center deleted permanent.");
                      }
                    }}
                    className="p-2 text-slate-400 hover:text-red-750 hover:bg-red-50 border rounded-xl"
                    title="Delete Facility"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}

        {processedCenters.length === 0 && (
          <div className="col-span-full py-16 text-center bg-white border rounded-apex flex flex-col items-center justify-center gap-4 shadow-apex-sm">
            <span className="text-slate-400 font-bold text-sm">No health facilities found matching search criteria.</span>
            {centers.length === 0 && (
              <button
                onClick={handleSeedDatabase}
                disabled={isSeeding}
                className="flex items-center gap-2 px-5 py-2.5 bg-brand-blue hover:bg-brand-darkBlue disabled:opacity-50 text-white font-extrabold text-xs rounded-xl shadow-apex transition-all"
              >
                {isSeeding ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin animate-duration-1000" />
                    Seeding Firestore Database...
                  </>
                ) : (
                  <>
                    <Database className="h-4 w-4" />
                    Seed Default Demo Data to Firestore
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Pagination footer */}
      {processedCenters.length > itemsPerPage && (
        <div className="flex justify-between items-center text-xs text-slate-500 font-medium py-4 no-print">
          <span>
            Showing {Math.min(processedCenters.length, (currentPage - 1) * itemsPerPage + 1)}-
            {Math.min(processedCenters.length, currentPage * itemsPerPage)} of{' '}
            {processedCenters.length} Facilities
          </span>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="p-1 border rounded-lg hover:bg-slate-100 disabled:opacity-50"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="font-bold text-slate-700">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="p-1 border rounded-lg hover:bg-slate-100 disabled:opacity-50"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* ADD MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="w-full max-w-2xl bg-white border border-slate-200 rounded-apex shadow-apex p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-base text-slate-800">Add New Medical Facility</h3>
              <button onClick={() => setShowAddModal(false)} className="p-1 hover:bg-slate-100 rounded-lg text-slate-400">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-bold text-slate-500">Center Name</label>
                  <input
                    type="text"
                    required
                    value={addName}
                    onChange={(e) => setAddName(e.target.value)}
                    placeholder="e.g. Sohryngkham PHC"
                    className="w-full px-3 py-2 border rounded-xl"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-500">Center Type</label>
                  <select
                    value={addType}
                    onChange={(e) => setAddType(e.target.value as 'PHC' | 'CHC')}
                    className="w-full border rounded-xl px-2.5 py-2 cursor-pointer"
                  >
                    <option value="PHC">Primary Health Centre (PHC)</option>
                    <option value="CHC">Community Health Centre (CHC)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-500">Taluka / Block</label>
                  <input
                    type="text"
                    required
                    value={addTaluka}
                    onChange={(e) => setAddTaluka(e.target.value)}
                    placeholder="e.g. Mawryngkneng"
                    className="w-full px-3 py-2 border rounded-xl"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-500">Village</label>
                  <input
                    type="text"
                    required
                    value={addVillage}
                    onChange={(e) => setAddVillage(e.target.value)}
                    placeholder="e.g. Sohryngkham"
                    className="w-full px-3 py-2 border rounded-xl"
                  />
                </div>

                <div className="space-y-1 md:col-span-2">
                  <label className="font-bold text-slate-500">Full Address</label>
                  <input
                    type="text"
                    required
                    value={addAddress}
                    onChange={(e) => setAddAddress(e.target.value)}
                    placeholder="Enter complete physical address details"
                    className="w-full px-3 py-2 border rounded-xl"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-500">Latitude Coordinate</label>
                  <input
                    type="number"
                    step="0.0001"
                    required
                    value={addLat}
                    onChange={(e) => setAddLat(Number(e.target.value))}
                    className="w-full px-3 py-2 border rounded-xl font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-500">Longitude Coordinate</label>
                  <input
                    type="number"
                    step="0.0001"
                    required
                    value={addLng}
                    onChange={(e) => setAddLng(Number(e.target.value))}
                    className="w-full px-3 py-2 border rounded-xl font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-500">Center Phone Number</label>
                  <input
                    type="text"
                    required
                    value={addPhone}
                    onChange={(e) => setAddPhone(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-500">Center Email Address</label>
                  <input
                    type="email"
                    required
                    value={addEmail}
                    onChange={(e) => setAddEmail(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-500">Medical Officer Name</label>
                  <input
                    type="text"
                    required
                    value={addMoName}
                    onChange={(e) => setAddMoName(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-500">Medical Officer Phone</label>
                  <input
                    type="text"
                    required
                    value={addMoPhone}
                    onChange={(e) => setAddMoPhone(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-500">Scheduled Doctors Count</label>
                  <input
                    type="number"
                    value={addDocs}
                    onChange={(e) => setAddDocs(Number(e.target.value))}
                    className="w-full px-3 py-2 border rounded-xl"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-500">Beds Capacity</label>
                  <input
                    type="number"
                    value={addBeds}
                    onChange={(e) => setAddBeds(Number(e.target.value))}
                    className="w-full px-3 py-2 border rounded-xl"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-500">Opening Time</label>
                  <input
                    type="text"
                    value={addOpenTime}
                    onChange={(e) => setAddOpenTime(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-500">Closing Time</label>
                  <input
                    type="text"
                    value={addCloseTime}
                    onChange={(e) => setAddCloseTime(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-500">Status Check</label>
                  <select
                    value={addStatus}
                    onChange={(e) => setAddStatus(e.target.value as any)}
                    className="w-full border rounded-xl px-2.5 py-2 cursor-pointer"
                  >
                    <option value="Healthy">Healthy</option>
                    <option value="Needs Attention">Needs Attention</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>

                {/* PHC Staff Account Section */}
                <div className="md:col-span-2 border-t pt-4 mt-2">
                  <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-widest flex items-center gap-1.5">
                    <User className="h-4 w-4 text-brand-blue" />
                    PHC Staff Account
                  </h4>
                  <p className="text-[10px] text-slate-400 font-medium mt-1">
                    Assign a staff operator profile and login credentials for this facility node.
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-500">Staff Name</label>
                  <input
                    type="text"
                    required
                    value={staffName}
                    onChange={(e) => setStaffName(e.target.value)}
                    placeholder="e.g. John Mawlong"
                    className="w-full px-3 py-2 border rounded-xl"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-500">Staff Email</label>
                  <input
                    type="email"
                    required
                    value={staffEmail}
                    onChange={(e) => setStaffEmail(e.target.value)}
                    placeholder="e.g. staff.mawphlang@healthflow.gov.in"
                    className="w-full px-3 py-2 border rounded-xl"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-500">Temporary Password</label>
                  <input
                    type="text"
                    required
                    value={staffPassword}
                    onChange={(e) => setStaffPassword(e.target.value)}
                    placeholder="Enter temporary password"
                    className="w-full px-3 py-2 border rounded-xl font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-500">Phone Number</label>
                  <input
                    type="text"
                    required
                    value={staffPhone}
                    onChange={(e) => setStaffPhone(e.target.value)}
                    placeholder="e.g. +91-98630-44567"
                    className="w-full px-3 py-2 border rounded-xl"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-500">Role</label>
                  <input
                    type="text"
                    disabled
                    value={addType === 'PHC' ? 'PHC Staff' : 'CHC Staff'}
                    className="w-full px-3 py-2 border rounded-xl bg-slate-50 font-bold text-slate-500 cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="pt-4 border-t flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border rounded-xl hover:bg-slate-50 text-slate-650 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-brand-blue hover:bg-brand-darkBlue text-white font-bold rounded-xl shadow"
                >
                  Save Facility Node
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {showEditModal && selectedCenter && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="w-full max-w-2xl bg-white border border-slate-200 rounded-apex shadow-apex p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-base text-slate-800">Edit Facility Configuration</h3>
              <button onClick={() => {
                setShowEditModal(false);
                setSelectedCenter(null);
              }} className="p-1 hover:bg-slate-100 rounded-lg text-slate-400">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-bold text-slate-500">Center Name</label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-500">Center Type</label>
                  <select
                    value={editType}
                    onChange={(e) => setEditType(e.target.value as 'PHC' | 'CHC')}
                    className="w-full border rounded-xl px-2.5 py-2 cursor-pointer"
                  >
                    <option value="PHC">Primary Health Centre (PHC)</option>
                    <option value="CHC">Community Health Centre (CHC)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-500">Taluka / Block</label>
                  <input
                    type="text"
                    required
                    value={editTaluka}
                    onChange={(e) => setEditTaluka(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-500">Village</label>
                  <input
                    type="text"
                    required
                    value={editVillage}
                    onChange={(e) => setEditVillage(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl"
                  />
                </div>

                <div className="space-y-1 md:col-span-2">
                  <label className="font-bold text-slate-500">Full Address</label>
                  <input
                    type="text"
                    required
                    value={editAddress}
                    onChange={(e) => setEditAddress(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-500">Latitude Coordinate</label>
                  <input
                    type="number"
                    step="0.0001"
                    required
                    value={editLat}
                    onChange={(e) => setEditLat(Number(e.target.value))}
                    className="w-full px-3 py-2 border rounded-xl font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-500">Longitude Coordinate</label>
                  <input
                    type="number"
                    step="0.0001"
                    required
                    value={editLng}
                    onChange={(e) => setEditLng(Number(e.target.value))}
                    className="w-full px-3 py-2 border rounded-xl font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-500">Center Phone Number</label>
                  <input
                    type="text"
                    required
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-500">Center Email Address</label>
                  <input
                    type="email"
                    required
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-500">Medical Officer Name</label>
                  <input
                    type="text"
                    required
                    value={editMoName}
                    onChange={(e) => setEditMoName(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-500">Medical Officer Phone</label>
                  <input
                    type="text"
                    required
                    value={editMoPhone}
                    onChange={(e) => setEditMoPhone(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-500">Scheduled Doctors Count</label>
                  <input
                    type="number"
                    value={editDocs}
                    onChange={(e) => setEditDocs(Number(e.target.value))}
                    className="w-full px-3 py-2 border rounded-xl"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-500">Beds Capacity</label>
                  <input
                    type="number"
                    value={editBeds}
                    onChange={(e) => setEditBeds(Number(e.target.value))}
                    className="w-full px-3 py-2 border rounded-xl"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-500">Opening Time</label>
                  <input
                    type="text"
                    value={editOpenTime}
                    onChange={(e) => setEditOpenTime(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-500">Closing Time</label>
                  <input
                    type="text"
                    value={editCloseTime}
                    onChange={(e) => setEditCloseTime(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-500">Status Check</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as any)}
                    className="w-full border rounded-xl px-2.5 py-2 cursor-pointer"
                  >
                    <option value="Healthy">Healthy</option>
                    <option value="Needs Attention">Needs Attention</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 border-t flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedCenter(null);
                  }}
                  className="px-4 py-2 border rounded-xl hover:bg-slate-50 text-slate-655 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-brand-blue hover:bg-brand-darkBlue text-white font-bold rounded-xl shadow"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* MODAL 5: Credentials Display Modal */}
      {credentialsModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border rounded-apex max-w-md w-full p-6 space-y-4 shadow-apex text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div className="space-y-2">
              <h3 className="font-extrabold text-base text-slate-800">Health Center Created Successfully</h3>
              <h4 className="font-bold text-xs text-slate-400 -mt-1">Staff Login Created Successfully</h4>
              <p className="text-xs text-slate-500 font-medium">
                A secure login account has been registered for the facility staff operator.
              </p>
            </div>
            
            <div className="bg-slate-50 p-4 border rounded-xl text-left text-xs space-y-2 font-mono">
              <div>
                <span className="text-[10px] text-slate-450 block font-sans font-bold uppercase">Staff Email Address</span>
                <span className="font-bold text-slate-700 select-all">{credentialsModal.email}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-450 block font-sans font-bold uppercase">Temporary Password</span>
                <span className="font-bold text-slate-700 select-all">{credentialsModal.password}</span>
              </div>
            </div>

            <p className="text-[10px] text-brand-orange font-bold font-sans">
              ⚠️ Share these credentials securely. The password is not stored in Firestore.
            </p>

            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(`Email: ${credentialsModal.email}\nPassword: ${credentialsModal.password}`);
                  alert("Credentials copied to clipboard!");
                }}
                className="py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 font-extrabold text-[10px] rounded-xl transition-all flex flex-col items-center justify-center gap-1.5 shadow-sm"
              >
                Copy Credentials
              </button>
              <button
                type="button"
                onClick={() => {
                  const printWindow = window.open('', '_blank');
                  if (printWindow) {
                    printWindow.document.write(`
                      <html>
                        <head>
                          <title>Credentials - ${credentialsModal.name}</title>
                          <style>
                            body { font-family: sans-serif; padding: 40px; color: #333; }
                            .card { border: 2px dashed #000; padding: 20px; max-width: 400px; margin: auto; }
                            h2 { margin-top: 0; color: #0f52ba; }
                            .field { margin: 15px 0; }
                            .label { font-size: 10px; text-transform: uppercase; color: #777; font-weight: bold; }
                            .value { font-size: 16px; font-weight: bold; font-family: monospace; }
                          </style>
                        </head>
                        <body>
                          <div class="card">
                            <h2>HealthFlow AI Credentials</h2>
                            <p>Facility: <strong>${credentialsModal.name}</strong></p>
                            <hr />
                            <div class="field">
                              <div class="label">Staff Login Email</div>
                              <div class="value">${credentialsModal.email}</div>
                            </div>
                            <div class="field">
                              <div class="label">Temporary Password</div>
                              <div class="value">${credentialsModal.password}</div>
                            </div>
                          </div>
                          <script>
                            window.onload = function() { window.print(); window.close(); }
                          </script>
                        </body>
                      </html>
                    `);
                    printWindow.document.close();
                  }
                }}
                className="py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 font-extrabold text-[10px] rounded-xl transition-all flex flex-col items-center justify-center gap-1.5 shadow-sm"
              >
                Print Credentials
              </button>
              <button
                type="button"
                onClick={async () => {
                  try {
                    const authStore = useAuthStore.getState();
                    await authStore.resetPasswordEmail(credentialsModal.email);
                    alert(`Password reset instructions sent to ${credentialsModal.email}!`);
                  } catch (err: any) {
                    alert("Failed to send reset email: " + err.message);
                  }
                }}
                className="py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 font-extrabold text-[10px] rounded-xl transition-all flex flex-col items-center justify-center gap-1.5 shadow-sm"
              >
                Send Reset Email
              </button>
            </div>

            <button
              onClick={() => setCredentialsModal(null)}
              className="w-full py-2.5 bg-brand-blue hover:bg-brand-darkBlue text-white font-bold text-xs rounded-xl shadow transition-colors mt-2"
            >
              Understand & Dismiss
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Simple inline Chevron icons to prevent missing imports
const ChevronLeft: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
  </svg>
);

const ChevronRight: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
  </svg>
);

export default PhcListPage;
