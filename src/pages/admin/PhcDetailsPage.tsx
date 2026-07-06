import React, { useMemo, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRightLeft,
  Phone,
  Mail,
  User,
  Clock,
  MapPin,
  Pill,
  Bed,
  UserCheck,
  FlaskConical,
  Activity,
  Calendar,
  AlertTriangle,
  Users,
  ExternalLink,
  Plus,
  Trash,
  Check,
  FileText,
  Download,
  Send,
  Edit,
  UserPlus,
  Sparkles,
  Printer
} from 'lucide-react';
import { usePhcStore } from '../../store/phcStore';
import { useAuthStore } from '../../store/authStore';
import { useMedicineStore } from '../../store/medicineStore';
import { useUserStore } from '../../store/userStore';
import { StatChart } from '../../components/charts/StatChart';
import { db, IS_MOCK_ENV } from '../../config/firebase';
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  setDoc,
  updateDoc,
  addDoc,
  getDocs
} from 'firebase/firestore';
import { Doctor, LabTestItem, Medicine, MedicineStock, StockTransaction, DailyMetricRecord } from '../../types';

export const PhcDetailsPage: React.FC = () => {
  const { centerId } = useParams<{ centerId: string }>();
  const navigate = useNavigate();

  // Stores
  const { centers, subscribeToCenters, updateCenter } = usePhcStore();
  const { medicines: allMeds, stocks: allStocks, transfers, subscribeToMedicineData, createMedicine, addStockBatch, recordTransaction, requestTransfer } = useMedicineStore();
  const { user } = useAuthStore();
  const { users } = useUserStore();

  // Local state for live Firestore data
  const [centerDoctors, setCenterDoctors] = useState<Doctor[]>([]);
  const [centerLabs, setCenterLabs] = useState<LabTestItem[]>([]);
  const [dailyMetrics, setDailyMetrics] = useState<DailyMetricRecord[]>([]);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [reportStatus, setReportStatus] = useState<string | null>(null);

  // Quick Action Modal States
  const [showEditModal, setShowEditModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showAssignDocModal, setShowAssignDocModal] = useState(false);
  const [showUpdateBedsModal, setShowUpdateBedsModal] = useState(false);

  // Form States for Modals
  const [editPhcForm, setEditPhcForm] = useState({
    centerName: '',
    taluka: '',
    village: '',
    address: '',
    phoneNumber: '',
    medicalOfficerName: '',
    medicalOfficerPhone: '',
    totalBeds: 10,
    icuBeds: 1,
    emergencyBeds: 2,
    totalDoctors: 2,
    totalNurses: 4,
    totalStaff: 8,
    status: 'Healthy' as 'Healthy' | 'Needs Attention' | 'Critical'
  });

  const [transferForm, setTransferForm] = useState({
    medicineId: '',
    quantity: 10,
    destPhcId: '',
    reason: ''
  });

  const [doctorForm, setDoctorForm] = useState({
    name: '',
    specialization: 'General Medicine',
    phone: '',
    attendance: 'Present' as 'Present' | 'Absent' | 'On Leave' | 'On Duty'
  });

  const [bedsForm, setBedsForm] = useState({
    bedsOccupied: 0,
    totalBeds: 10,
    icuBeds: 1,
    emergencyBeds: 2
  });

  // 1. Subscribe to Core Stores
  useEffect(() => {
    const unsubCenters = subscribeToCenters();
    const unsubMeds = subscribeToMedicineData();
    const unsubUsers = useUserStore.getState().subscribeToUsers();
    return () => {
      unsubCenters();
      unsubMeds();
      unsubUsers();
    };
  }, []);

  const staffMember = useMemo(() => {
    return users.find(u => (u.role === 'PHC Staff' || u.role === 'CHC Staff') && (u.phcId === centerId || u.healthCenterId === centerId));
  }, [users, centerId]);

  // Find the selected center
  const center = useMemo(() => {
    return centers.find(c => c.centerId === centerId);
  }, [centers, centerId]);

  // Sync Edit form state when center is loaded
  useEffect(() => {
    if (center) {
      setEditPhcForm({
        centerName: center.centerName,
        taluka: center.taluka,
        village: center.village,
        address: center.address,
        phoneNumber: center.phoneNumber,
        medicalOfficerName: center.medicalOfficerName,
        medicalOfficerPhone: center.medicalOfficerPhone,
        totalBeds: center.totalBeds,
        icuBeds: center.icuBeds,
        emergencyBeds: center.emergencyBeds,
        totalDoctors: center.totalDoctors,
        totalNurses: center.totalNurses,
        totalStaff: center.totalStaff,
        status: center.status
      });

      setBedsForm({
        bedsOccupied: center.bedsOccupied || 0,
        totalBeds: center.totalBeds,
        icuBeds: center.icuBeds,
        emergencyBeds: center.emergencyBeds
      });
    }
  }, [center]);

  // 2. Fetch doctors, labs, and daily_metrics for this center with live snapshot updates
  useEffect(() => {
    if (!centerId) return;

    if (IS_MOCK_ENV) {
      // Mock environments fall back to state/persisted data
      const mockDocs: Doctor[] = [
        { id: 'doc-1', name: 'Dr. Sarah Lyngdoh', specialization: 'General Medicine', phone: '+91-94361-22456', attendance: 'Present', phcId: 'phc-1' },
        { id: 'doc-2', name: 'Dr. John Wahlang', specialization: 'Pediatrics', phone: '+91-98630-44567', attendance: 'Present', phcId: 'phc-1' }
      ];
      const mockLabs: LabTestItem[] = [
        { id: 'lab-1', name: 'Malaria Rapid Test Kit', available: true, dailyCapacity: 30, testsPending: 2, status: 'Good', phcId: 'phc-1' },
        { id: 'lab-2', name: 'Complete Blood Count (CBC)', available: true, dailyCapacity: 15, testsPending: 8, status: 'Good', phcId: 'phc-1' },
        { id: 'lab-3', name: 'Pregnancy Test Kit (hCG)', available: true, dailyCapacity: 50, testsPending: 1, status: 'Good', phcId: 'phc-1' },
        { id: 'lab-4', name: 'Widal (Typhoid Test)', available: true, dailyCapacity: 20, testsPending: 5, status: 'Good', phcId: 'phc-1' }
      ];
      const mockTrends: DailyMetricRecord[] = [
        { date: 'Jun 27', patientCount: 38, bedsOccupied: 4, doctorsPresent: 2, medicineShortagesCount: 0 },
        { date: 'Jun 28', patientCount: 42, bedsOccupied: 4, doctorsPresent: 2, medicineShortagesCount: 1 },
        { date: 'Jun 29', patientCount: 49, bedsOccupied: 5, doctorsPresent: 2, medicineShortagesCount: 0 },
        { date: 'Jun 30', patientCount: 41, bedsOccupied: 6, doctorsPresent: 1, medicineShortagesCount: 2 },
        { date: 'Jul 01', patientCount: 51, bedsOccupied: 7, doctorsPresent: 2, medicineShortagesCount: 0 },
        { date: 'Jul 02', patientCount: 58, bedsOccupied: 8, doctorsPresent: 2, medicineShortagesCount: 1 },
        { date: 'Jul 03', patientCount: 84, bedsOccupied: 9, doctorsPresent: 1, medicineShortagesCount: 3 }
      ];

      setCenterDoctors(mockDocs.filter(d => d.phcId === centerId));
      setCenterLabs(mockLabs.filter(l => l.phcId === centerId));
      setDailyMetrics(mockTrends);
      return;
    }

    // A. Sub to Doctors
    const qDocs = query(collection(db, 'doctors'), where('phcId', '==', centerId));
    const unsubDocs = onSnapshot(qDocs, (snap) => {
      const list: Doctor[] = [];
      snap.forEach(doc => {
        list.push({ id: doc.id, ...doc.data() } as Doctor);
      });
      setCenterDoctors(list);
    });

    // B. Sub to Labs
    const qLabs = query(collection(db, 'lab_tests'), where('phcId', '==', centerId));
    const unsubLabs = onSnapshot(qLabs, (snap) => {
      const list: LabTestItem[] = [];
      snap.forEach(doc => {
        list.push({ id: doc.id, ...doc.data() } as LabTestItem);
      });
      setCenterLabs(list);
    });

    // C. Sub to Daily Metrics
    const qMetrics = query(collection(db, 'daily_metrics'), where('phcId', '==', centerId));
    const unsubMetrics = onSnapshot(qMetrics, (snap) => {
      const list: DailyMetricRecord[] = [];
      snap.forEach(doc => {
        const d = doc.data();
        list.push({
          date: d.date,
          patientCount: d.totals?.patientCount || 0,
          bedsOccupied: d.totals?.bedsOccupied || 0,
          doctorsPresent: d.totals?.doctorsPresent || 0,
          medicineShortagesCount: d.totals?.medicineShortagesCount || 0
        });
      });
      // Sort chronologically
      list.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      setDailyMetrics(list);
    });

    return () => {
      unsubDocs();
      unsubLabs();
      unsubMetrics();
    };
  }, [centerId]);

  // 3. Auto-seed function if Firestore returns 0 items for this center in database mode
  useEffect(() => {
    if (IS_MOCK_ENV || !centerId || !center) return;

    const seedEmptyCollections = async () => {
      try {
        // Check doctors
        const docSnap = await getDocs(query(collection(db, 'doctors'), where('phcId', '==', centerId)));
        if (docSnap.empty) {
          const defaultDocs = [
            { name: `Dr. Sarah Lyngdoh`, specialization: 'General Medicine', phone: '+91-94361-22456', attendance: 'Present', phcId: centerId },
            { name: `Dr. John Wahlang`, specialization: 'Pediatrics', phone: '+91-98630-44567', attendance: 'Present', phcId: centerId },
            { name: `Dr. Rebecca Synrem`, specialization: 'General Surgery', phone: '+91-94021-99881', attendance: 'On Duty', phcId: centerId }
          ];
          for (const d of defaultDocs) {
            await addDoc(collection(db, 'doctors'), d);
          }
        }

        // Check labs
        const labSnap = await getDocs(query(collection(db, 'lab_tests'), where('phcId', '==', centerId)));
        if (labSnap.empty) {
          const defaultLabs = [
            { name: 'Malaria Rapid Test Kit', available: true, dailyCapacity: 30, testsPending: 2, status: 'Good', phcId: centerId },
            { name: 'Complete Blood Count (CBC)', available: true, dailyCapacity: 15, testsPending: 8, status: 'Good', phcId: centerId },
            { name: 'Pregnancy Test Kit (hCG)', available: true, dailyCapacity: 50, testsPending: 1, status: 'Good', phcId: centerId },
            { name: 'Widal (Typhoid Test)', available: true, dailyCapacity: 20, testsPending: 5, status: 'Good', phcId: centerId }
          ];
          for (const l of defaultLabs) {
            await addDoc(collection(db, 'lab_tests'), l);
          }
        }

        // Check medicines & stocks
        const medSnap = await getDocs(collection(db, 'medicines'));
        let medsList = medSnap.docs.map(d => d.data() as Medicine);
        if (medSnap.empty) {
          const defaultMeds: Medicine[] = [
            { medicineId: 'med-1', medicineName: 'Paracetamol 500mg', genericName: 'Acetaminophen', brandName: 'Crocin', category: 'Analgesics', form: 'Tablet', manufacturer: 'GSK', strength: '500mg', packSize: '10x15 Tablets', minStockLevel: 200, maxStockLevel: 2000, reorderLevel: 500, storageTemp: '20-25C', description: 'Pain and fever reliever.', barcode: '8901', qrCode: 'QR-P' },
            { medicineId: 'med-2', medicineName: 'Amoxicillin 250mg', genericName: 'Amoxicillin', brandName: 'Novamox', category: 'Antibiotics', form: 'Capsule', manufacturer: 'Alkem', strength: '250mg', packSize: '10x10 Capsules', minStockLevel: 100, maxStockLevel: 1000, reorderLevel: 250, storageTemp: '15-30C', description: 'Bacterial infections.', barcode: '8902', qrCode: 'QR-A' },
            { medicineId: 'med-3', medicineName: 'Oral Rehydration Salts', genericName: 'ORS WHO formula', brandName: 'Electral', category: 'Rehydration', form: 'Syrup', manufacturer: 'FDC', strength: '21.8g', packSize: '50 Sachets', minStockLevel: 50, maxStockLevel: 500, reorderLevel: 100, storageTemp: 'Below 30C', description: 'Rehydration.', barcode: '8903', qrCode: 'QR-O' }
          ];
          for (const m of defaultMeds) {
            await setDoc(doc(db, 'medicines', m.medicineId), m);
          }
          medsList = defaultMeds;
        }

        const stockSnap = await getDocs(query(collection(db, 'medicine_stock'), where('phcId', '==', centerId)));
        if (stockSnap.empty) {
          const defaultStocks = [
            { stockId: `stk-${centerId}-1`, medicineId: 'med-1', phcId: centerId, batchNumber: 'B-PARA-01', expiryDate: new Date(Date.now() + 30 * 24 * 3600000).toISOString().split('T')[0], currentQuantity: 120, receivedQuantity: 500, issuedQuantity: 380, reservedQuantity: 0, supplier: 'MSMS', purchaseDate: '2026-04-01', purchasePrice: 1.5, lastUpdated: 'Just Now' },
            { stockId: `stk-${centerId}-2`, medicineId: 'med-2', phcId: centerId, batchNumber: 'B-AMOX-01', expiryDate: new Date(Date.now() + 15 * 24 * 3600000).toISOString().split('T')[0], currentQuantity: 15, receivedQuantity: 200, issuedQuantity: 185, reservedQuantity: 0, supplier: 'Apex', purchaseDate: '2026-05-01', purchasePrice: 4.0, lastUpdated: 'Just Now' },
            { stockId: `stk-${centerId}-3`, medicineId: 'med-3', phcId: centerId, batchNumber: 'B-ORS-01', expiryDate: new Date(Date.now() + 120 * 24 * 3600000).toISOString().split('T')[0], currentQuantity: 8, receivedQuantity: 100, issuedQuantity: 92, reservedQuantity: 0, supplier: 'MSMS', purchaseDate: '2026-06-01', purchasePrice: 2.2, lastUpdated: 'Just Now' }
          ];
          for (const s of defaultStocks) {
            await setDoc(doc(db, 'medicine_stock', s.stockId), s);
          }
        }

        // Check daily metrics
        const metricSnap = await getDocs(query(collection(db, 'daily_metrics'), where('phcId', '==', centerId)));
        if (metricSnap.empty) {
          const days = ['Jun 27', 'Jun 28', 'Jun 29', 'Jun 30', 'Jul 01', 'Jul 02', 'Jul 03'];
          for (let i = 0; i < days.length; i++) {
            const mId = `${centerId}_2026-06-${27 + i}`;
            await setDoc(doc(db, 'daily_metrics', mId), {
              id: mId,
              phcId: centerId,
              phcName: center.centerName,
              date: days[i],
              totals: {
                patientCount: Math.round(30 + Math.random() * 50),
                bedsOccupied: Math.round(2 + Math.random() * 6),
                doctorsPresent: 1 + Math.round(Math.random()),
                medicineShortagesCount: Math.round(Math.random() * 3)
              },
              timestamp: new Date().toISOString()
            });
          }
        }
      } catch (err) {
        console.error("Auto seeding collections error:", err);
      }
    };

    seedEmptyCollections();
  }, [centerId, center]);

  // Validation & permissions check: PHC Staff can only view their assigned center
  const isAuthorized = useMemo(() => {
    if (!user) return false;
    if ((user.role === 'PHC Staff' || user.role === 'CHC Staff') && user.phcId !== centerId) {
      return false;
    }
    return true;
  }, [user, centerId]);

  // Load related inventories
  const phcStocks = useMemo(() => {
    return allStocks.filter(s => s.phcId === centerId);
  }, [allStocks, centerId]);

  const medicines = useMemo(() => {
    return phcStocks.map(s => {
      const med = allMeds.find(m => m.medicineId === s.medicineId);
      return {
        id: s.stockId,
        medicineId: s.medicineId,
        name: med ? med.medicineName : 'Unknown Medicine',
        stock: s.currentQuantity,
        minThreshold: med ? med.minStockLevel : 100,
        unit: med ? med.packSize.split(' ')[1] || 'Units' : 'Units',
        status: s.currentQuantity < (med ? med.minStockLevel : 100) ? (s.currentQuantity === 0 ? 'Critical' : 'Warning') : 'Good',
        category: med ? med.category : 'General',
        lastUpdated: s.lastUpdated,
        expiryDate: s.expiryDate
      };
    });
  }, [phcStocks, allMeds]);

  // Detailed Medicine Summary stats
  const totalMeds = medicines.length;
  const lowStockMeds = medicines.filter(m => m.stock < m.minThreshold && m.stock > 0).length;
  const outOfStockMeds = medicines.filter(m => m.stock === 0).length;
  const expiringMeds = useMemo(() => {
    return phcStocks.filter(s => {
      if (!s.expiryDate) return false;
      const diffTime = new Date(s.expiryDate).getTime() - Date.now();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays > 0 && diffDays <= 90;
    }).length;
  }, [phcStocks]);

  // Filter transactions for this center
  const recentTransactions = useMemo(() => {
    return useMedicineStore.getState().transactions
      .filter(tx => tx.phcId === centerId)
      .slice(0, 4);
  }, [allStocks, centerId]);

  // Bed stats
  const totalBedsCount = center?.totalBeds || 10;
  const occupiedBedsCount = center?.bedsOccupied || 0;
  const availableBedsCount = Math.max(0, totalBedsCount - occupiedBedsCount);
  const bedOccupancyRate = Math.round((occupiedBedsCount / totalBedsCount) * 100);

  // Doctors statistics
  const totalDoctorsRoster = centerDoctors.length;
  const presentDoctors = centerDoctors.filter(d => d.attendance === 'Present' || d.attendance === 'On Duty').length;
  const absentDoctors = centerDoctors.filter(d => d.attendance === 'Absent').length;
  const leaveDoctors = centerDoctors.filter(d => d.attendance === 'On Leave').length;
  const doctorAttendanceRate = totalDoctorsRoster > 0 ? Math.round((presentDoctors / totalDoctorsRoster) * 100) : 0;

  // Labs statistics
  const availableLabs = centerLabs.filter(l => l.available).length;
  const unavailableLabs = centerLabs.filter(l => !l.available).length;
  const pendingLabs = centerLabs.reduce((sum, l) => sum + (l.testsPending || 0), 0);
  const labEquipmentStatus = unavailableLabs === 0 ? 'All Systems Operational' : `${unavailableLabs} Kits Unavailable`;

  // AI Risk Score Calculation
  const riskScore = useMemo(() => {
    const medStockRatio = (lowStockMeds + outOfStockMeds * 2) / (totalMeds || 1);
    const bedRatio = occupiedBedsCount / (totalBedsCount || 1);
    const docAbsenceRatio = absentDoctors / (totalDoctorsRoster || 1);
    
    // Weighted risk score
    const score = Math.round((medStockRatio * 0.35 + bedRatio * 0.35 + docAbsenceRatio * 0.3) * 100);
    return Math.min(100, Math.max(5, score));
  }, [lowStockMeds, outOfStockMeds, totalMeds, occupiedBedsCount, totalBedsCount, absentDoctors, totalDoctorsRoster]);

  const medRisk = totalMeds > 0 && (lowStockMeds + outOfStockMeds) / totalMeds > 0.4 ? 'High' : 'Low';
  const patientLoad = (center?.currentPatients || 0) > 80 ? 'High' : ((center?.currentPatients || 0) > 40 ? 'Medium' : 'Low');
  const docRisk = presentDoctors === 0 ? 'Critical' : (presentDoctors < totalDoctorsRoster ? 'Warning' : 'Adequate');
  const bedStatus = bedOccupancyRate > 90 ? 'Full' : (bedOccupancyRate > 70 ? 'Warning' : 'Good');

  // Rule-based Smart Clinical Logistical Recommendation
  const aiRecommendation = useMemo(() => {
    if (outOfStockMeds > 0 || lowStockMeds > 0) {
      return `Critical stock alerts: ${outOfStockMeds} essential medicines are completely out of stock. Redirection of paracetamol or antibiotics from neighboring Laitryngew node is recommended immediately.`;
    }
    if (bedOccupancyRate > 85) {
      return `Bed occupancy has reached ${bedOccupancyRate}% (${occupiedBedsCount}/${totalBedsCount}). Transfer of emergency patients or reallocation of foldable cot beds is recommended to avoid triage backlog.`;
    }
    if (presentDoctors === 0 && totalDoctorsRoster > 0) {
      return `Staff deficit: 0 active doctors present today. Delegate general physician duty from Sohryngkham PHC on shift shift-sharing framework.`;
    }
    return 'All critical indicators reside in normal parameters. Monitor respiratory footfall indicators as monsoon clinical surge progresses.';
  }, [outOfStockMeds, lowStockMeds, bedOccupancyRate, presentDoctors, totalDoctorsRoster, occupiedBedsCount, totalBedsCount]);

  if (!center) {
    return (
      <div className="py-12 text-center text-slate-500 font-bold text-sm bg-white border rounded-apex p-8">
        Health facility node not found in registry database.
        <button onClick={() => navigate('/phcs')} className="block mx-auto mt-4 px-4 py-2 bg-brand-blue text-white rounded-xl text-xs font-bold shadow">
          Back to Directory
        </button>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="py-12 text-center text-slate-500 font-bold text-sm bg-white border rounded-apex p-8">
        <AlertTriangle className="h-10 w-10 text-brand-orange mx-auto mb-4" />
        Security Violation: You are not authorized to view this facility node.
        <button onClick={() => navigate('/')} className="block mx-auto mt-4 px-4 py-2 bg-brand-orange text-white rounded-xl text-xs font-bold shadow">
          Back to Operations
        </button>
      </div>
    );
  }

  // --- Handlers ---
  const handleEditPhc = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateCenter(centerId!, editPhcForm);
      setShowEditModal(false);
    } catch (err) {
      alert("Failed to update PHC");
    }
  };

  const handleUpdateBeds = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateCenter(centerId!, {
        bedsOccupied: bedsForm.bedsOccupied,
        totalBeds: bedsForm.totalBeds,
        icuBeds: bedsForm.icuBeds,
        emergencyBeds: bedsForm.emergencyBeds
      });
      setShowUpdateBedsModal(false);
    } catch (err) {
      alert("Failed to update beds");
    }
  };

  const handleAssignDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const docObj: Omit<Doctor, 'id'> = {
        name: doctorForm.name,
        specialization: doctorForm.specialization,
        phone: doctorForm.phone,
        attendance: doctorForm.attendance,
        phcId: centerId!
      };

      const mockStore = usePhcStore.getState();
      await mockStore.addDoctor(docObj);
      setDoctorForm({ name: '', specialization: 'General Medicine', phone: '', attendance: 'Present' });
      setShowAssignDocModal(false);
    } catch (err) {
      alert("Failed to assign doctor");
    }
  };

  const handleTransferRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const targetCenter = centers.find(c => c.centerId === transferForm.destPhcId);
      if (!targetCenter) return alert("Select target health facility");

      await requestTransfer(
        transferForm.medicineId,
        centerId!,
        center.centerName,
        transferForm.destPhcId,
        targetCenter.centerName,
        transferForm.quantity,
        15.4, // Mock distance
        transferForm.reason
      );
      setTransferForm({ medicineId: '', quantity: 10, destPhcId: '', reason: '' });
      setShowTransferModal(false);
      alert("Transfer request successfully submitted to logs.");
    } catch (err) {
      alert("Failed to create transfer request");
    }
  };

  // Generate PHC Report
  const generatePhcReport = () => {
    setIsGeneratingReport(true);
    setReportStatus("Compiling facility logs...");
    setTimeout(() => {
      setReportStatus("Analyzing historical daily_metrics trends...");
      setTimeout(() => {
        setReportStatus("Verifying pharmaceutical supply stocks...");
        setTimeout(() => {
          setIsGeneratingReport(false);
          setReportStatus("Report compiled successfully.");
          alert(`Report for ${center.centerName} compiled. Use download buttons below.`);
        }, 800);
      }, 800);
    }, 800);
  };

  // Download PDF representation (structured text file)
  const downloadPDFReport = () => {
    const reportText = `
=========================================
HEALTHFLOW AI - CLINICAL SYSTEM REPORT
=========================================
Facility Name: ${center.centerName}
Facility Code: ${center.centerId}
Facility Type: ${center.centerType}
District: ${center.district}
Taluka: ${center.taluka}
Village: ${center.village}
Address: ${center.address}
Medical Officer: ${center.medicalOfficerName} (${center.medicalOfficerPhone})
Contact Number: ${center.phoneNumber}
Facility Status: ${center.status}

BED CAPACITY & OCCUPANCY
------------------------
Total Beds: ${center.totalBeds}
ICU Beds: ${center.icuBeds}
Emergency Beds: ${center.emergencyBeds}
Occupied Beds: ${occupiedBedsCount}
Available Beds: ${availableBedsCount}
Bed Occupancy: ${bedOccupancyRate}%

HUMAN RESOURCES ROSTER
----------------------
Total Doctors: ${totalDoctorsRoster}
Doctors Present: ${presentDoctors}
Doctors Absent: ${absentDoctors}
Doctors On Leave: ${leaveDoctors}
Attendance Rate: ${doctorAttendanceRate}%

MEDICINE INVENTORY STATUS
-------------------------
Total Medicines Stocked: ${totalMeds}
Low Stock Medicines: ${lowStockMeds}
Out of Stock Medicines: ${outOfStockMeds}
Items Expiring Soon: ${expiringMeds}

DIAGNOSTIC LABORATORY OPERATIONS
--------------------------------
Total Diagnostic Tests: ${centerLabs.length}
Available Tests: ${availableLabs}
Unavailable Tests: ${unavailableLabs}
Pending Patient Tests: ${pendingLabs}

AI RISK ANALYSIS & RECOMMENDATION
---------------------------------
Health Center Risk Score: ${riskScore}/100
Medicine Stock Risk: ${medRisk}
Patient Traffic Load: ${patientLoad}
Bed Availability Status: ${bedStatus}
Doctor Coverage Status: ${docRisk}

Clinical Recommendation:
${aiRecommendation}

Report Generated On: ${new Date().toLocaleString()}
Generated By: District Health Administrator Console
=========================================
`;
    const blob = new Blob([reportText], { type: 'text/plain' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${center.centerName.replace(/\s+/g, '_')}_Report.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Download CSV Report
  const downloadCSVReport = () => {
    const rows = [
      ["Metric Name", "Value"],
      ["Facility Name", center.centerName],
      ["Facility ID", center.centerId],
      ["Facility Type", center.centerType],
      ["District", center.district],
      ["Taluka", center.taluka],
      ["Village", center.village],
      ["Address", center.address],
      ["Medical Officer Name", center.medicalOfficerName],
      ["Medical Officer Phone", center.medicalOfficerPhone],
      ["Status", center.status],
      ["Total Beds", totalBedsCount],
      ["Occupied Beds", occupiedBedsCount],
      ["Available Beds", availableBedsCount],
      ["ICU Beds", center.icuBeds],
      ["Emergency Beds", center.emergencyBeds],
      ["Total Doctors", totalDoctorsRoster],
      ["Present Doctors", presentDoctors],
      ["Absent Doctors", absentDoctors],
      ["On Leave Doctors", leaveDoctors],
      ["Medicine Count", totalMeds],
      ["Low Stock Medicines", lowStockMeds],
      ["Out of Stock Medicines", outOfStockMeds],
      ["Available Diagnostic Tests", availableLabs],
      ["Pending Lab Tests", pendingLabs],
      ["AI Health Center Risk Score", riskScore]
    ];
    const csvContent = "data:text/csv;charset=utf-8," + rows.map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${center.centerName.replace(/\s+/g, '_')}_Report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/phcs')}
            className="p-2 hover:bg-slate-100 rounded-xl text-slate-500 hover:text-slate-800 transition-colors border"
          >
            <ArrowLeft className="h-4.5 w-4.5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs bg-slate-100 text-slate-500 font-extrabold px-2 py-0.5 rounded uppercase">
                {center.centerType} Facility Node
              </span>
              <span
                className={`text-[9.5px] uppercase font-extrabold px-2.5 py-0.5 rounded-full ${
                  center.status === 'Critical'
                    ? 'bg-red-50 text-red-650 border border-red-200'
                    : center.status === 'Needs Attention'
                    ? 'bg-yellow-50 text-yellow-600 border border-yellow-250'
                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                }`}
              >
                {center.status}
              </span>
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900 mt-1">{center.centerName}</h2>
          </div>
        </div>

        {/* Global Action Shortcut */}
        <button
          onClick={() => setShowEditModal(true)}
          className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border transition-colors shadow-sm"
        >
          <Edit className="h-3.5 w-3.5" />
          Edit Registry Profile
        </button>
      </div>

      {/* Main Column Grid layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Columns (Col Span 2) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Card 1: General & Location Info */}
          <div className="bg-white border border-slate-200 rounded-apex shadow-apex-sm p-6 space-y-4">
            <h3 className="font-extrabold text-xs text-slate-400 uppercase tracking-widest border-b pb-2">
              General & Location Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="space-y-3">
                <div>
                  <span className="text-slate-400 font-bold block text-[10px] uppercase">Facility Physical Address</span>
                  <span className="text-slate-750 font-bold text-xs">{center.address}</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <span className="text-slate-400 font-bold block text-[10px] uppercase">Taluka</span>
                    <span className="text-slate-750 font-semibold">{center.taluka}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold block text-[10px] uppercase">Village</span>
                    <span className="text-slate-750 font-semibold">{center.village}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold block text-[10px] uppercase">District</span>
                    <span className="text-slate-750 font-semibold">{center.district}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3 border-t md:border-t-0 md:border-l pt-3 md:pt-0 md:pl-4">
                <div className="flex justify-between items-center bg-slate-50 border rounded-xl p-3">
                  <div>
                    <span className="text-slate-400 font-bold block text-[10px] uppercase">GPS Coordinate Markers</span>
                    <span className="text-slate-750 font-mono font-bold mt-0.5 block">{center.latitude}° N, {center.longitude}° E</span>
                  </div>
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${center.latitude},${center.longitude}`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 bg-white hover:bg-slate-100 rounded-lg border text-brand-blue"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs border-t pt-4">
              <div className="space-y-2">
                <h4 className="font-bold text-slate-800 text-[10px] uppercase tracking-wider">Medical Officer Details</h4>
                <div className="bg-slate-50 p-3 border rounded-xl space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5 text-slate-400" />
                    <span className="font-semibold text-slate-700">{center.medicalOfficerName || "None assigned"}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 text-slate-400" />
                    <span className="text-slate-600">{center.medicalOfficerPhone || "No contact phone"}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5 text-slate-400" />
                    <span className="text-slate-600">{center.email || "No facility email"}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2 md:border-l md:pl-4">
                <h4 className="font-bold text-slate-800 text-[10px] uppercase tracking-wider">Assigned Staff Operator</h4>
                {staffMember ? (
                  <div className="bg-emerald-50/40 p-3 border border-emerald-100 rounded-xl space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <UserCheck className="h-3.5 w-3.5 text-emerald-600" />
                      <span className="font-bold text-emerald-800">{staffMember.name}</span>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Mail className="h-3.5 w-3.5 text-emerald-600" />
                      <span className="text-emerald-700 font-medium select-all">{staffMember.email}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5 text-emerald-600" />
                      <span className="text-emerald-700">{staffMember.phone}</span>
                    </div>
                  </div>
                ) : (
                  <div className="bg-amber-50/50 p-3 border border-amber-100 rounded-xl flex items-center justify-center text-center text-amber-800 h-[88px] font-semibold">
                    No linked staff login found in roster database.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Card 2: Patient Footfall Summary */}
          <div className="bg-white border border-slate-200 rounded-apex shadow-apex-sm p-6 space-y-4">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="font-extrabold text-xs text-slate-400 uppercase tracking-widest">
                Patient Footfall Summary
              </h3>
              <div className="bg-brand-blue/10 text-brand-blue font-bold px-2 py-0.5 rounded text-[10px]">
                Today: {center.currentPatients} Patients
              </div>
            </div>

            {/* Weekly Trend and Peak Hours charts */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2 space-y-2">
                <span className="text-[10px] uppercase text-slate-400 font-bold tracking-wider block">Historical Footfall Trend</span>
                {dailyMetrics.length > 0 ? (
                  <StatChart
                    data={dailyMetrics}
                    xKey="date"
                    series={[{ key: 'patientCount', name: 'Patients Served', color: '#0F52BA', type: 'area' }]}
                    height={180}
                  />
                ) : (
                  <div className="h-40 flex items-center justify-center bg-slate-50 rounded-xl text-xs font-semibold text-slate-400">
                    No metric data loaded from Firestore.
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <span className="text-[10px] uppercase text-slate-400 font-bold tracking-wider block">OPD Hourly Capacity</span>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between items-center py-1 border-b">
                    <span className="text-slate-500 font-medium">09:00 - 11:00 AM</span>
                    <span className="font-bold text-slate-800">Peak Load (35)</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b">
                    <span className="text-slate-500 font-medium">11:00 - 01:00 PM</span>
                    <span className="font-bold text-slate-800">High Load (28)</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b">
                    <span className="text-slate-500 font-medium">01:00 - 03:00 PM</span>
                    <span className="font-bold text-slate-700">Moderate (15)</span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-slate-500 font-medium">03:00 - 04:00 PM</span>
                    <span className="font-bold text-slate-500">Low (6)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Card 3: Medicine Inventory Summary */}
          <div className="bg-white border border-slate-200 rounded-apex shadow-apex-sm p-6 space-y-4">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="font-extrabold text-xs text-slate-400 uppercase tracking-widest">
                Medicine Summary
              </h3>
              <button
                onClick={() => navigate('/medicine')}
                className="text-[10px] text-brand-blue font-extrabold uppercase hover:underline"
              >
                View Full Inventory
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div className="bg-slate-50 border rounded-xl p-3">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Medicines</span>
                <span className="text-lg font-extrabold text-slate-800 block mt-1">{totalMeds}</span>
              </div>
              <div className="bg-red-50 border border-red-100 rounded-xl p-3">
                <span className="text-[10px] uppercase font-bold text-red-500 block">Out of Stock</span>
                <span className="text-lg font-extrabold text-red-700 block mt-1">{outOfStockMeds}</span>
              </div>
              <div className="bg-amber-50 border border-amber-100 rounded-xl p-3">
                <span className="text-[10px] uppercase font-bold text-amber-600 block">Low Stock</span>
                <span className="text-lg font-extrabold text-amber-700 block mt-1">{lowStockMeds}</span>
              </div>
              <div className="bg-purple-50 border border-purple-100 rounded-xl p-3">
                <span className="text-[10px] uppercase font-bold text-purple-600 block">Expiring Soon</span>
                <span className="text-lg font-extrabold text-purple-700 block mt-1">{expiringMeds}</span>
              </div>
            </div>

            {/* Recent stock movements */}
            <div className="space-y-2">
              <span className="text-[10px] uppercase text-slate-400 font-bold tracking-wider block">Recent Stock Movement Logs</span>
              {recentTransactions.length > 0 ? (
                <div className="border rounded-xl overflow-hidden text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b font-bold text-slate-500 text-[10px] uppercase">
                      <tr>
                        <th className="p-2">Medicine ID</th>
                        <th className="p-2">Type</th>
                        <th className="p-2 text-right">Quantity</th>
                        <th className="p-2">Reason</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {recentTransactions.map((tx) => (
                        <tr key={tx.transactionId} className="hover:bg-slate-50">
                          <td className="p-2 font-mono text-slate-700">{tx.medicineId}</td>
                          <td className="p-2">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              tx.type === 'Stock In' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                            }`}>{tx.type}</span>
                          </td>
                          <td className="p-2 text-right font-bold text-slate-800">{tx.quantity}</td>
                          <td className="p-2 text-slate-500 font-medium truncate max-w-[150px]">{tx.reason}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-slate-400 font-semibold text-xs py-3 text-center bg-slate-50 rounded-xl">No recent stock movements.</div>
              )}
            </div>
          </div>

          {/* Card 4: Doctor Attendance Summary */}
          <div className="bg-white border border-slate-200 rounded-apex shadow-apex-sm p-6 space-y-4">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="font-extrabold text-xs text-slate-400 uppercase tracking-widest">
                Doctor Attendance Summary
              </h3>
              <button
                onClick={() => navigate('/doctors')}
                className="text-[10px] text-brand-blue font-extrabold uppercase hover:underline"
              >
                View Attendance Dashboard
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
              <div className="flex items-center gap-4 bg-slate-50 p-4 border rounded-xl">
                <div className="p-3 bg-brand-blue/10 text-brand-blue rounded-xl">
                  <Users className="h-6 w-6" />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Attendance today</span>
                  <span className="text-xl font-extrabold text-slate-800">{presentDoctors} / {totalDoctorsRoster}</span>
                  <span className="text-[10px] text-slate-500 block font-semibold">Rate: {doctorAttendanceRate}%</span>
                </div>
              </div>

              {/* Roster list */}
              <div className="md:col-span-2 space-y-2">
                <span className="text-[10px] uppercase text-slate-400 font-bold tracking-wider block">Assigned Doctors Attendance List</span>
                {centerDoctors.length > 0 ? (
                  <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                    {centerDoctors.map(doc => (
                      <div key={doc.id} className="flex justify-between items-center text-xs p-2 bg-white border rounded-xl hover:bg-slate-55 transition-colors">
                        <div>
                          <span className="font-bold text-slate-700 block">{doc.name}</span>
                          <span className="text-[10px] text-slate-400 font-semibold">{doc.specialization}</span>
                        </div>
                        <span className={`px-2 py-0.5 rounded font-extrabold text-[9px] uppercase ${
                          doc.attendance === 'Present' || doc.attendance === 'On Duty'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : doc.attendance === 'On Leave'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-red-50 text-red-700 border border-red-200'
                        }`}>{doc.attendance}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-slate-400 font-semibold text-xs py-4 text-center bg-slate-50 rounded-xl">
                    No doctors assigned to this node registry.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (Col Span 1) */}
        <div className="space-y-6">
          
          {/* Card 5: AI Summary Card */}
          <div className="bg-gradient-to-br from-brand-blue/[0.03] to-purple-500/[0.03] border border-slate-200 rounded-apex shadow-apex-sm p-6 space-y-4 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-3 text-brand-orange">
              <Sparkles className="h-5 w-5 animate-pulse" />
            </div>

            <h3 className="font-extrabold text-xs text-slate-400 uppercase tracking-widest border-b pb-2">
              Gemini AI Center Diagnostics
            </h3>

            <div className="flex items-center gap-4">
              <div className="relative flex items-center justify-center">
                <div className="h-16 w-16 rounded-full border-4 border-slate-100 flex flex-col items-center justify-center bg-white shadow-inner">
                  <span className="text-lg font-extrabold text-slate-800">{riskScore}</span>
                  <span className="text-[7.5px] uppercase font-bold text-slate-400 -mt-1">Risk</span>
                </div>
              </div>
              <div>
                <span className="text-xs font-bold text-slate-700 block">Overall Facility Risk Score</span>
                <p className="text-[10px] text-slate-450 leading-relaxed font-medium">Computed dynamically from medical staffing shifts, bed occupancy rates, and local pharmaceutical stock volumes.</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[10.5px]">
              <div className="bg-white border rounded-xl p-2.5">
                <span className="text-slate-400 font-bold block text-[8px] uppercase">Medicine Supply Risk</span>
                <span className={`font-bold mt-0.5 block ${medRisk === 'High' ? 'text-red-650' : 'text-slate-800'}`}>{medRisk} Risk</span>
              </div>
              <div className="bg-white border rounded-xl p-2.5">
                <span className="text-slate-400 font-bold block text-[8px] uppercase">Patient Traffic Load</span>
                <span className="font-bold mt-0.5 block text-slate-800">{patientLoad} traffic</span>
              </div>
              <div className="bg-white border rounded-xl p-2.5">
                <span className="text-slate-400 font-bold block text-[8px] uppercase">Doctor Staffing</span>
                <span className={`font-bold mt-0.5 block ${docRisk === 'Critical' ? 'text-red-650' : 'text-slate-800'}`}>{docRisk}</span>
              </div>
              <div className="bg-white border rounded-xl p-2.5">
                <span className="text-slate-400 font-bold block text-[8px] uppercase">Bed Availability</span>
                <span className="font-bold mt-0.5 block text-slate-800">{bedStatus}</span>
              </div>
            </div>

            <div className="p-3 bg-white/70 backdrop-blur border border-brand-blue/10 rounded-xl space-y-1.5">
              <span className="text-[9px] uppercase font-bold text-brand-blue block tracking-wider">Clinical Recommender Recommendation</span>
              <p className="text-[11px] text-slate-600 font-medium leading-relaxed">{aiRecommendation}</p>
            </div>
          </div>

          {/* Card 6: Bed Management Summary */}
          <div className="bg-white border border-slate-200 rounded-apex shadow-apex-sm p-6 space-y-4">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="font-extrabold text-xs text-slate-400 uppercase tracking-widest">
                Bed Capacity
              </h3>
              <button
                onClick={() => navigate('/beds')}
                className="text-[10px] text-brand-blue font-extrabold uppercase hover:underline"
              >
                View Beds
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs">
                <div>
                  <span className="text-slate-400 font-bold block text-[9px] uppercase">Bed Occupancy Rate</span>
                  <span className="font-bold text-slate-700 text-lg mt-0.5 block">{occupiedBedsCount} / {totalBedsCount} Beds ({bedOccupancyRate}%)</span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-500 ${
                  bedOccupancyRate > 85 ? 'bg-red-500' : 'bg-brand-blue'
                }`} style={{ width: `${bedOccupancyRate}%` }} />
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-slate-50 border rounded-xl p-2.5">
                  <span className="text-slate-400 font-bold block text-[8.5px] uppercase">ICU Capacity</span>
                  <span className="font-bold text-slate-700 mt-0.5 block">{center.icuBeds} Beds</span>
                </div>
                <div className="bg-slate-50 border rounded-xl p-2.5">
                  <span className="text-slate-400 font-bold block text-[8.5px] uppercase">Emergency Beds</span>
                  <span className="font-bold text-slate-700 mt-0.5 block">{center.emergencyBeds} Beds</span>
                </div>
              </div>
            </div>
          </div>

          {/* Card 7: Laboratory Summary */}
          <div className="bg-white border border-slate-200 rounded-apex shadow-apex-sm p-6 space-y-4">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="font-extrabold text-xs text-slate-400 uppercase tracking-widest">
                Laboratory Operations
              </h3>
              <button
                onClick={() => navigate('/labs')}
                className="text-[10px] text-brand-blue font-extrabold uppercase hover:underline"
              >
                View Diagnostic Lab
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-50 border rounded-xl p-2.5">
                <span className="text-slate-400 font-bold block text-[8px] uppercase">Available Test Kits</span>
                <span className="font-bold text-slate-700 text-base mt-0.5 block">{availableLabs} / {centerLabs.length}</span>
              </div>
              <div className="bg-slate-50 border rounded-xl p-2.5">
                <span className="text-slate-400 font-bold block text-[8px] uppercase">Pending Diagnostics</span>
                <span className="font-bold text-slate-700 text-base mt-0.5 block">{pendingLabs} Tests</span>
              </div>
            </div>

            <div className="bg-purple-50/50 border border-purple-100 rounded-xl p-3 flex justify-between items-center text-xs">
              <div>
                <span className="text-[8.5px] uppercase font-bold text-purple-600 block">Equipment Status</span>
                <span className="font-bold text-purple-900 mt-0.5 block">{labEquipmentStatus}</span>
              </div>
              <FlaskConical className="h-5 w-5 text-purple-400 shrink-0" />
            </div>
          </div>

          {/* Card 8: Reports Section */}
          <div className="bg-white border border-slate-200 rounded-apex shadow-apex-sm p-6 space-y-4">
            <h3 className="font-extrabold text-xs text-slate-400 uppercase tracking-widest border-b pb-2">
              Reports & Logs Exporter
            </h3>
            
            <div className="space-y-2">
              <button
                onClick={generatePhcReport}
                disabled={isGeneratingReport}
                className="w-full py-2 px-4 bg-brand-blue hover:bg-brand-darkBlue disabled:bg-slate-100 text-white disabled:text-slate-400 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-sm"
              >
                <Activity className="h-3.5 w-3.5 animate-pulse" />
                {isGeneratingReport ? reportStatus : "Compile Health Center Report"}
              </button>

              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={downloadPDFReport}
                  className="py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 font-extrabold text-[10px] rounded-xl transition-all flex flex-col items-center justify-center gap-1"
                >
                  <FileText className="h-4 w-4 text-red-500" />
                  PDF File
                </button>
                <button
                  onClick={downloadCSVReport}
                  className="py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 font-extrabold text-[10px] rounded-xl transition-all flex flex-col items-center justify-center gap-1"
                >
                  <Download className="h-4 w-4 text-emerald-500" />
                  CSV Data
                </button>
                <button
                  onClick={() => window.print()}
                  className="py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 font-extrabold text-[10px] rounded-xl transition-all flex flex-col items-center justify-center gap-1"
                >
                  <Printer className="h-4 w-4 text-slate-500" />
                  Print View
                </button>
              </div>
            </div>
          </div>

          {/* Card 9: Quick Actions Panel */}
          <div className="bg-white border border-slate-200 rounded-apex shadow-apex-sm p-6 space-y-4">
            <h3 className="font-extrabold text-xs text-slate-400 uppercase tracking-widest border-b pb-2">
              Quick Administrative Actions
            </h3>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                onClick={() => setShowEditModal(true)}
                className="p-3 border hover:bg-slate-50 text-left rounded-xl transition-colors font-bold text-slate-700 flex flex-col justify-between h-20 shadow-sm"
              >
                <Edit className="h-4 w-4 text-slate-400" />
                <span>Edit Center Settings</span>
              </button>
              <button
                onClick={() => setShowTransferModal(true)}
                className="p-3 border hover:bg-slate-50 text-left rounded-xl transition-colors font-bold text-slate-700 flex flex-col justify-between h-20 shadow-sm"
              >
                <ArrowRightLeft className="h-4 w-4 text-slate-400" />
                <span>Transfer Medicines</span>
              </button>
              <button
                onClick={() => setShowAssignDocModal(true)}
                className="p-3 border hover:bg-slate-50 text-left rounded-xl transition-colors font-bold text-slate-700 flex flex-col justify-between h-20 shadow-sm"
              >
                <UserPlus className="h-4 w-4 text-slate-400" />
                <span>Assign Staff Doctor</span>
              </button>
              <button
                onClick={() => setShowUpdateBedsModal(true)}
                className="p-3 border hover:bg-slate-50 text-left rounded-xl transition-colors font-bold text-slate-700 flex flex-col justify-between h-20 shadow-sm"
              >
                <Bed className="h-4 w-4 text-slate-400" />
                <span>Update Ward Beds</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* MODAL 1: Edit PHC Profile */}
      {showEditModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border rounded-apex max-w-xl w-full p-6 space-y-4 shadow-apex max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="font-extrabold text-sm text-slate-800">Edit Registry Facility Profile</h3>
              <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-slate-600 text-lg font-bold">×</button>
            </div>
            <form onSubmit={handleEditPhc} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="text-slate-400 font-bold block text-[10px] uppercase">Facility Name</label>
                <input
                  type="text"
                  required
                  value={editPhcForm.centerName}
                  onChange={(e) => setEditPhcForm({ ...editPhcForm, centerName: e.target.value })}
                  className="w-full p-2 border rounded-xl font-semibold text-slate-850"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-400 font-bold block text-[10px] uppercase">Taluka Block</label>
                  <input
                    type="text"
                    required
                    value={editPhcForm.taluka}
                    onChange={(e) => setEditPhcForm({ ...editPhcForm, taluka: e.target.value })}
                    className="w-full p-2 border rounded-xl font-semibold text-slate-855"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-400 font-bold block text-[10px] uppercase">Village</label>
                  <input
                    type="text"
                    required
                    value={editPhcForm.village}
                    onChange={(e) => setEditPhcForm({ ...editPhcForm, village: e.target.value })}
                    className="w-full p-2 border rounded-xl font-semibold text-slate-855"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 font-bold block text-[10px] uppercase">Physical Location Address</label>
                <input
                  type="text"
                  required
                  value={editPhcForm.address}
                  onChange={(e) => setEditPhcForm({ ...editPhcForm, address: e.target.value })}
                  className="w-full p-2 border rounded-xl font-semibold text-slate-855"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-400 font-bold block text-[10px] uppercase">Contact Phone Number</label>
                  <input
                    type="text"
                    required
                    value={editPhcForm.phoneNumber}
                    onChange={(e) => setEditPhcForm({ ...editPhcForm, phoneNumber: e.target.value })}
                    className="w-full p-2 border rounded-xl font-semibold text-slate-855"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-400 font-bold block text-[10px] uppercase">Medical Officer Name</label>
                  <input
                    type="text"
                    required
                    value={editPhcForm.medicalOfficerName}
                    onChange={(e) => setEditPhcForm({ ...editPhcForm, medicalOfficerName: e.target.value })}
                    className="w-full p-2 border rounded-xl font-semibold text-slate-855"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <label className="text-slate-400 font-bold block text-[10px] uppercase">Total Beds</label>
                  <input
                    type="number"
                    value={editPhcForm.totalBeds}
                    onChange={(e) => setEditPhcForm({ ...editPhcForm, totalBeds: Number(e.target.value) })}
                    className="w-full p-2 border rounded-xl font-semibold text-slate-855"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-400 font-bold block text-[10px] uppercase">ICU Beds</label>
                  <input
                    type="number"
                    value={editPhcForm.icuBeds}
                    onChange={(e) => setEditPhcForm({ ...editPhcForm, icuBeds: Number(e.target.value) })}
                    className="w-full p-2 border rounded-xl font-semibold text-slate-855"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-400 font-bold block text-[10px] uppercase">Emergency Beds</label>
                  <input
                    type="number"
                    value={editPhcForm.emergencyBeds}
                    onChange={(e) => setEditPhcForm({ ...editPhcForm, emergencyBeds: Number(e.target.value) })}
                    className="w-full p-2 border rounded-xl font-semibold text-slate-855"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-400 font-bold block text-[10px] uppercase">Facility Status</label>
                  <select
                    value={editPhcForm.status}
                    onChange={(e) => setEditPhcForm({ ...editPhcForm, status: e.target.value as any })}
                    className="w-full p-2.5 border rounded-xl font-semibold text-slate-850"
                  >
                    <option value="Healthy">Healthy</option>
                    <option value="Needs Attention">Needs Attention</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-slate-400 font-bold block text-[10px] uppercase">Medical Officer Phone</label>
                  <input
                    type="text"
                    required
                    value={editPhcForm.medicalOfficerPhone}
                    onChange={(e) => setEditPhcForm({ ...editPhcForm, medicalOfficerPhone: e.target.value })}
                    className="w-full p-2 border rounded-xl font-semibold text-slate-855"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-brand-blue text-white font-bold rounded-xl hover:bg-brand-darkBlue shadow"
                >
                  Save Profile Changes
                </button>
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="py-2.5 px-4 border text-slate-500 font-bold rounded-xl hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Transfer Medicines */}
      {showTransferModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border rounded-apex max-w-md w-full p-6 space-y-4 shadow-apex">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="font-extrabold text-sm text-slate-800 font-sans">Request Inter-Center Stock Transfer</h3>
              <button onClick={() => setShowTransferModal(false)} className="text-slate-400 hover:text-slate-600 text-lg font-bold">×</button>
            </div>
            <form onSubmit={handleTransferRequest} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="text-slate-400 font-bold block text-[10px] uppercase">Select Stock Medicine</label>
                <select
                  required
                  value={transferForm.medicineId}
                  onChange={(e) => setTransferForm({ ...transferForm, medicineId: e.target.value })}
                  className="w-full p-2.5 border rounded-xl font-semibold text-slate-800"
                >
                  <option value="">-- Choose Stock Item --</option>
                  {medicines.map(m => (
                    <option key={m.id} value={m.medicineId}>
                      {m.name} (Stock: {m.stock} {m.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-400 font-bold block text-[10px] uppercase">Quantity</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={transferForm.quantity}
                    onChange={(e) => setTransferForm({ ...transferForm, quantity: Number(e.target.value) })}
                    className="w-full p-2.5 border rounded-xl font-semibold text-slate-800"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-400 font-bold block text-[10px] uppercase">Target PHC / CHC</label>
                  <select
                    required
                    value={transferForm.destPhcId}
                    onChange={(e) => setTransferForm({ ...transferForm, destPhcId: e.target.value })}
                    className="w-full p-2.5 border rounded-xl font-semibold text-slate-800"
                  >
                    <option value="">-- Select Target --</option>
                    {centers.filter(c => c.centerId !== centerId).map(c => (
                      <option key={c.centerId} value={c.centerId}>{c.centerName}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 font-bold block text-[10px] uppercase">Reason for requisition</label>
                <textarea
                  required
                  rows={2}
                  value={transferForm.reason}
                  onChange={(e) => setTransferForm({ ...transferForm, reason: e.target.value })}
                  className="w-full p-2.5 border rounded-xl font-semibold text-slate-800"
                  placeholder="monsoon gastro surge coverage, ORS critical shortage backup, etc."
                />
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-brand-blue text-white font-bold rounded-xl hover:bg-brand-darkBlue shadow"
                >
                  Submit Requisition Transfer
                </button>
                <button
                  type="button"
                  onClick={() => setShowTransferModal(false)}
                  className="py-2.5 px-4 border text-slate-500 font-bold rounded-xl hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Assign Staff Doctor */}
      {showAssignDocModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border rounded-apex max-w-md w-full p-6 space-y-4 shadow-apex">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="font-extrabold text-sm text-slate-800">Assign Clinical Doctor to Roster</h3>
              <button onClick={() => setShowAssignDocModal(false)} className="text-slate-400 hover:text-slate-600 text-lg font-bold">×</button>
            </div>
            <form onSubmit={handleAssignDoctor} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="text-slate-400 font-bold block text-[10px] uppercase">Doctor Full Name</label>
                <input
                  type="text"
                  required
                  value={doctorForm.name}
                  onChange={(e) => setDoctorForm({ ...doctorForm, name: e.target.value })}
                  className="w-full p-2.5 border rounded-xl font-semibold text-slate-855"
                  placeholder="Dr. Wanbok Rymbai"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-400 font-bold block text-[10px] uppercase">Specialization</label>
                  <select
                    value={doctorForm.specialization}
                    onChange={(e) => setDoctorForm({ ...doctorForm, specialization: e.target.value })}
                    className="w-full p-2.5 border rounded-xl font-semibold text-slate-855"
                  >
                    <option value="General Medicine">General Medicine</option>
                    <option value="Pediatrics">Pediatrics</option>
                    <option value="Gynecology">Gynecology</option>
                    <option value="General Surgery">General Surgery</option>
                    <option value="Dentistry">Dentistry</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-slate-400 font-bold block text-[10px] uppercase">Attendance Shift</label>
                  <select
                    value={doctorForm.attendance}
                    onChange={(e) => setDoctorForm({ ...doctorForm, attendance: e.target.value as any })}
                    className="w-full p-2.5 border rounded-xl font-semibold text-slate-855"
                  >
                    <option value="Present">Present</option>
                    <option value="On Duty">On Duty</option>
                    <option value="On Leave">On Leave</option>
                    <option value="Absent">Absent</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 font-bold block text-[10px] uppercase">Phone Number</label>
                <input
                  type="text"
                  required
                  value={doctorForm.phone}
                  onChange={(e) => setDoctorForm({ ...doctorForm, phone: e.target.value })}
                  className="w-full p-2.5 border rounded-xl font-semibold text-slate-855"
                  placeholder="+91-94361-XXXXX"
                />
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-brand-blue text-white font-bold rounded-xl hover:bg-brand-darkBlue shadow"
                >
                  Assign Doctor Profile
                </button>
                <button
                  type="button"
                  onClick={() => setShowAssignDocModal(false)}
                  className="py-2.5 px-4 border text-slate-500 font-bold rounded-xl hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: Update Ward Beds */}
      {showUpdateBedsModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border rounded-apex max-w-sm w-full p-6 space-y-4 shadow-apex">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="font-extrabold text-sm text-slate-800">Update Facility Bed Allocations</h3>
              <button onClick={() => setShowUpdateBedsModal(false)} className="text-slate-400 hover:text-slate-600 text-lg font-bold">×</button>
            </div>
            <form onSubmit={handleUpdateBeds} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-400 font-bold block text-[10px] uppercase">Beds Occupied</label>
                  <input
                    type="number"
                    required
                    min={0}
                    max={bedsForm.totalBeds}
                    value={bedsForm.bedsOccupied}
                    onChange={(e) => setBedsForm({ ...bedsForm, bedsOccupied: Number(e.target.value) })}
                    className="w-full p-2.5 border rounded-xl font-semibold text-slate-855"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-400 font-bold block text-[10px] uppercase">Total Ward Beds</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={bedsForm.totalBeds}
                    onChange={(e) => setBedsForm({ ...bedsForm, totalBeds: Number(e.target.value) })}
                    className="w-full p-2.5 border rounded-xl font-semibold text-slate-855"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-400 font-bold block text-[10px] uppercase">ICU Emergency Beds</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={bedsForm.icuBeds}
                    onChange={(e) => setBedsForm({ ...bedsForm, icuBeds: Number(e.target.value) })}
                    className="w-full p-2.5 border rounded-xl font-semibold text-slate-855"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-400 font-bold block text-[10px] uppercase">Emergency COT Beds</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={bedsForm.emergencyBeds}
                    onChange={(e) => setBedsForm({ ...bedsForm, emergencyBeds: Number(e.target.value) })}
                    className="w-full p-2.5 border rounded-xl font-semibold text-slate-855"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-brand-blue text-white font-bold rounded-xl hover:bg-brand-darkBlue shadow"
                >
                  Update Bed Counts
                </button>
                <button
                  type="button"
                  onClick={() => setShowUpdateBedsModal(false)}
                  className="py-2.5 px-4 border text-slate-500 font-bold rounded-xl hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default PhcDetailsPage;
