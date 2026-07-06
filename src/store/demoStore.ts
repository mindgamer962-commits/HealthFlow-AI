import { create } from 'zustand';
import { usePhcStore } from './phcStore';
import { useMedicineStore } from './medicineStore';
import { useFootfallStore } from './footfallStore';
import { useBedStore } from './bedStore';
import { useDoctorStore } from './doctorStore';
import { useLabStore } from './labStore';
import { useCommandStore } from './commandStore';
import { useCopilotStore } from './copilotStore';

interface DemoState {
  isSimulating: boolean;
  tourStep: number;
  tourVisible: boolean;
  simulationIntervalId: any | null;

  startSimulation: () => void;
  stopSimulation: () => void;
  setTourStep: (step: number) => void;
  toggleTourVisible: () => void;
  seedHackathonData: () => void;
}

export const useDemoStore = create<DemoState>((set, get) => ({
  isSimulating: false,
  tourStep: 1,
  tourVisible: true,
  simulationIntervalId: null,

  startSimulation: () => {
    if (get().isSimulating) return;

    // Seed data first to ensure premium density
    get().seedHackathonData();

    const interval = setInterval(() => {
      // 1. Update patient footfalls randomly
      const phcState = usePhcStore.getState();
      const updatedCenters = phcState.centers.map(c => {
        const delta = Math.round(Math.random() * 4) - 2; // -2 to +2
        const current = c.patientFootfallToday || 12;
        const newCount = Math.max(5, current + delta);
        return {
          ...c,
          patientFootfallToday: newCount,
          currentPatients: newCount
        };
      });
      usePhcStore.setState({ centers: updatedCenters });
      localStorage.setItem('hf_phc_centers', JSON.stringify(updatedCenters));

      // 2. Update bed occupancies
      const bedState = useBedStore.getState();
      const updatedBeds = bedState.beds.map(b => {
        const delta = Math.round(Math.random() * 2) - 1; // -1 to +1
        const occ = b.OccupiedBeds || 0;
        const newOcc = Math.max(0, Math.min(b.TotalBeds, occ + delta));
        return {
          ...b,
          OccupiedBeds: newOcc
        };
      });
      localStorage.setItem('hf_beds', JSON.stringify(updatedBeds));
      bedState.subscribeToBeds(); // trigger refresh

      // 3. Deplete medicine stocks
      const medState = useMedicineStore.getState();
      const updatedStocks = medState.stocks.map(s => {
        const usage = Math.round(Math.random() * 5); // 0 to 5 tablets used
        const newQty = Math.max(5, s.currentQuantity - usage);
        return {
          ...s,
          currentQuantity: newQty
        };
      });
      localStorage.setItem('hf_medicine_stocks', JSON.stringify(updatedStocks));
      medState.subscribeToMedicineData(); // trigger refresh

      // 4. Update lab completions
      const labState = useLabStore.getState();
      const updatedInvs = labState.inventories.map(inv => {
        const delta = Math.round(Math.random() * 2);
        return {
          ...inv,
          todayCompleted: inv.todayCompleted + delta,
          todayPending: Math.max(0, inv.todayPending - delta + (Math.random() > 0.7 ? 1 : 0))
        };
      });
      localStorage.setItem('hf_lab_inventories', JSON.stringify(updatedInvs));
      labState.subscribeToLabs();

      // Trigger a random high occupancy notification if bed occupancy > 90%
      const triggerCritical = updatedBeds.find(b => (b.OccupiedBeds / b.TotalBeds) > 0.9);
      if (triggerCritical) {
        const copilotState = useCopilotStore.getState();
        const centerName = updatedCenters.find(c => c.centerId === triggerCritical.healthCenterId)?.centerName || 'PHC';
        copilotState.dismissNotification('not-bed-surge');
        const list = [
          {
            notificationId: 'not-bed-surge',
            type: 'Bed Critical' as const,
            title: 'Critical Overcrowding Alert',
            message: `${centerName} bed occupancy has exceeded 90% threshold. AI re-routing recommendations are active.`,
            timestamp: new Date().toISOString(),
            isRead: false
          },
          ...copilotState.notifications
        ];
        localStorage.setItem('hf_copilot_notifications', JSON.stringify(list));
        copilotState.selectSession(copilotState.activeSessionId || 'sess-1'); // trigger refresh
      }
    }, 5000);

    set({ isSimulating: true, simulationIntervalId: interval });
  },

  stopSimulation: () => {
    const interval = get().simulationIntervalId;
    if (interval) {
      clearInterval(interval);
    }
    set({ isSimulating: false, simulationIntervalId: null });
  },

  setTourStep: (step) => {
    set({ tourStep: step });
  },

  toggleTourVisible: () => {
    set({ tourVisible: !get().tourVisible });
  },

  seedHackathonData: () => {
    // Generates 13 clinic nodes: 10 PHCs and 3 CHCs
    const centersList = [
      { centerId: 'phc-1', centerName: 'Mawphlang PHC', centerType: 'PHC', district: 'East Khasi Hills', taluka: 'Mawphlang', village: 'Mawphlang', address: 'Near Sacred Grove, Mawphlang', latitude: 25.45, longitude: 91.75, phoneNumber: '+91-364-28502', email: 'mawphlang.phc@gov.in', medicalOfficerName: 'Dr. L. Khongwir', medicalOfficerPhone: '+91-94361-02845', totalDoctors: 2, totalNurses: 4, totalStaff: 8, totalBeds: 10, icuBeds: 0, emergencyBeds: 2, currentPatients: 24, status: 'Critical', openingTime: '09:00', closingTime: '17:00', createdBy: 'admin', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), medicineHealthScore: 35, labStatusScore: 40, bedsTotal: 10, bedsOccupied: 9, doctorsPresent: 1, doctorsTotal: 2 },
      { centerId: 'phc-2', centerName: 'Laitryngew PHC', centerType: 'PHC', district: 'East Khasi Hills', taluka: 'Sohra', village: 'Laitryngew', address: 'Sohra Road, Laitryngew', latitude: 25.32, longitude: 91.72, phoneNumber: '+91-364-28503', email: 'laitryngew.phc@gov.in', medicalOfficerName: 'Dr. A. Lyngdoh', medicalOfficerPhone: '+91-94361-02846', totalDoctors: 2, totalNurses: 3, totalStaff: 7, totalBeds: 8, icuBeds: 0, emergencyBeds: 1, currentPatients: 8, status: 'Healthy', openingTime: '09:00', closingTime: '17:00', createdBy: 'admin', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), medicineHealthScore: 85, labStatusScore: 90, bedsTotal: 8, bedsOccupied: 2, doctorsPresent: 2, doctorsTotal: 2 },
      { centerId: 'phc-3', centerName: 'Sohryngkham PHC', centerType: 'PHC', district: 'East Khasi Hills', taluka: 'Mawryngkneng', village: 'Sohryngkham', address: 'Jowai Road, Sohryngkham', latitude: 25.56, longitude: 91.98, phoneNumber: '+91-364-28504', email: 'sohryngkham.phc@gov.in', medicalOfficerName: 'Dr. M. War', medicalOfficerPhone: '+91-94361-02847', totalDoctors: 3, totalNurses: 5, totalStaff: 10, totalBeds: 12, icuBeds: 0, emergencyBeds: 2, currentPatients: 18, status: 'Needs Attention', openingTime: '09:00', closingTime: '17:00', createdBy: 'admin', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), medicineHealthScore: 65, labStatusScore: 70, bedsTotal: 12, bedsOccupied: 7, doctorsPresent: 2, doctorsTotal: 3 },
      { centerId: 'phc-4', centerName: 'Nongspung PHC', centerType: 'PHC', district: 'East Khasi Hills', taluka: 'Mawphlang', village: 'Nongspung', address: 'Nongspung Main Road', latitude: 25.48, longitude: 91.64, phoneNumber: '+91-364-28505', email: 'nongspung.phc@gov.in', medicalOfficerName: 'Dr. S. Sangma', medicalOfficerPhone: '+91-94361-02848', totalDoctors: 2, totalNurses: 3, totalStaff: 6, totalBeds: 6, icuBeds: 0, emergencyBeds: 1, currentPatients: 5, status: 'Healthy', openingTime: '09:00', closingTime: '17:00', createdBy: 'admin', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), medicineHealthScore: 80, labStatusScore: 85, bedsTotal: 6, bedsOccupied: 1, doctorsPresent: 2, doctorsTotal: 2 },
      { centerId: 'phc-5', centerName: 'Mylliem PHC', centerType: 'PHC', district: 'East Khasi Hills', taluka: 'Mylliem', village: 'Mylliem', address: 'Cherrapunjee Road, Mylliem', latitude: 25.49, longitude: 91.82, phoneNumber: '+91-364-28506', email: 'mylliem.phc@gov.in', medicalOfficerName: 'Dr. T. Rani', medicalOfficerPhone: '+91-94361-02849', totalDoctors: 2, totalNurses: 4, totalStaff: 8, totalBeds: 8, icuBeds: 0, emergencyBeds: 2, currentPatients: 10, status: 'Healthy', openingTime: '09:00', closingTime: '17:00', createdBy: 'admin', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), medicineHealthScore: 78, labStatusScore: 80, bedsTotal: 8, bedsOccupied: 3, doctorsPresent: 2, doctorsTotal: 2 },
      { centerId: 'phc-6', centerName: 'Nongkrem PHC', centerType: 'PHC', district: 'East Khasi Hills', taluka: 'Mylliem', village: 'Nongkrem', address: 'Nongkrem Center', latitude: 25.51, longitude: 91.92, phoneNumber: '+91-364-28507', email: 'nongkrem.phc@gov.in', medicalOfficerName: 'Dr. J. Shylla', medicalOfficerPhone: '+91-94361-02850', totalDoctors: 2, totalNurses: 3, totalStaff: 7, totalBeds: 8, icuBeds: 0, emergencyBeds: 1, currentPatients: 6, status: 'Healthy', openingTime: '09:00', closingTime: '17:00', createdBy: 'admin', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), medicineHealthScore: 82, labStatusScore: 88, bedsTotal: 8, bedsOccupied: 2, doctorsPresent: 2, doctorsTotal: 2 },
      { centerId: 'phc-7', centerName: 'Laitlyngkot PHC', centerType: 'PHC', district: 'East Khasi Hills', taluka: 'Mylliem', village: 'Laitlyngkot', address: 'Jowai bypass Laitlyngkot', latitude: 25.41, longitude: 91.89, phoneNumber: '+91-364-28508', email: 'laitlyngkot.phc@gov.in', medicalOfficerName: 'Dr. R. Marbaniang', medicalOfficerPhone: '+91-94361-02851', totalDoctors: 2, totalNurses: 4, totalStaff: 8, totalBeds: 10, icuBeds: 0, emergencyBeds: 2, currentPatients: 14, status: 'Needs Attention', openingTime: '09:00', closingTime: '17:00', createdBy: 'admin', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), medicineHealthScore: 55, labStatusScore: 68, bedsTotal: 10, bedsOccupied: 5, doctorsPresent: 1, doctorsTotal: 2 },
      { centerId: 'phc-8', centerName: 'Pynthorumkhrah PHC', centerType: 'PHC', district: 'East Khasi Hills', taluka: 'Mylliem', village: 'Pynthorumkhrah', address: 'Golf Links Road, Shillong', latitude: 25.59, longitude: 91.90, phoneNumber: '+91-364-28509', email: 'pynthor.phc@gov.in', medicalOfficerName: 'Dr. K. Dkhar', medicalOfficerPhone: '+91-94361-02852', totalDoctors: 4, totalNurses: 6, totalStaff: 12, totalBeds: 15, icuBeds: 0, emergencyBeds: 3, currentPatients: 28, status: 'Healthy', openingTime: '09:00', closingTime: '17:00', createdBy: 'admin', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), medicineHealthScore: 90, labStatusScore: 92, bedsTotal: 15, bedsOccupied: 6, doctorsPresent: 4, doctorsTotal: 4 },
      { centerId: 'phc-9', centerName: 'Pomlakrai PHC', centerType: 'PHC', district: 'East Khasi Hills', taluka: 'Mylliem', village: 'Pomlakrai', address: 'Mawphlang Road Pomlakrai', latitude: 25.49, longitude: 91.95, phoneNumber: '+91-364-28510', email: 'pomlakrai.phc@gov.in', medicalOfficerName: 'Dr. P. Roy', medicalOfficerPhone: '+91-94361-02853', totalDoctors: 2, totalNurses: 3, totalStaff: 6, totalBeds: 6, icuBeds: 0, emergencyBeds: 1, currentPatients: 4, status: 'Healthy', openingTime: '09:00', closingTime: '17:00', createdBy: 'admin', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), medicineHealthScore: 84, labStatusScore: 85, bedsTotal: 6, bedsOccupied: 1, doctorsPresent: 2, doctorsTotal: 2 },
      { centerId: 'phc-10', centerName: 'Nongkynrih PHC', centerType: 'PHC', district: 'East Khasi Hills', taluka: 'Laitkroh', village: 'Nongkynrih', address: 'Laitkroh Center Nongkynrih', latitude: 25.37, longitude: 91.80, phoneNumber: '+91-364-28511', email: 'nongkynrih.phc@gov.in', medicalOfficerName: 'Dr. V. Basaiawmoit', medicalOfficerPhone: '+91-94361-02854', totalDoctors: 2, totalNurses: 4, totalStaff: 8, totalBeds: 8, icuBeds: 0, emergencyBeds: 2, currentPatients: 9, status: 'Healthy', openingTime: '09:00', closingTime: '17:00', createdBy: 'admin', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), medicineHealthScore: 80, labStatusScore: 82, bedsTotal: 8, bedsOccupied: 2, doctorsPresent: 2, doctorsTotal: 2 },
      { centerId: 'chc-1', centerName: 'Pynursla CHC', centerType: 'CHC', district: 'East Khasi Hills', taluka: 'Pynursla', village: 'Pynursla', address: 'Dawki Road, Pynursla', latitude: 25.30, longitude: 91.90, phoneNumber: '+91-364-28601', email: 'pynursla.chc@gov.in', medicalOfficerName: 'Dr. R. Synmon', medicalOfficerPhone: '+91-94361-02860', totalDoctors: 5, totalNurses: 10, totalStaff: 25, totalBeds: 30, icuBeds: 2, emergencyBeds: 5, currentPatients: 45, status: 'Healthy', openingTime: '00:00', closingTime: '23:59', createdBy: 'admin', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), medicineHealthScore: 88, labStatusScore: 89, bedsTotal: 30, bedsOccupied: 12, doctorsPresent: 5, doctorsTotal: 5 },
      { centerId: 'chc-2', centerName: 'Cherrapunjee CHC', centerType: 'CHC', district: 'East Khasi Hills', taluka: 'Sohra', village: 'Cherrapunjee', address: 'Sohra Market Road', latitude: 25.28, longitude: 91.70, phoneNumber: '+91-364-28602', email: 'sohra.chc@gov.in', medicalOfficerName: 'Dr. E. Laloo', medicalOfficerPhone: '+91-94361-02861', totalDoctors: 4, totalNurses: 8, totalStaff: 20, totalBeds: 25, icuBeds: 1, emergencyBeds: 4, currentPatients: 20, status: 'Healthy', openingTime: '00:00', closingTime: '23:59', createdBy: 'admin', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), medicineHealthScore: 85, labStatusScore: 87, bedsTotal: 25, bedsOccupied: 8, doctorsPresent: 4, doctorsTotal: 4 },
      { centerId: 'chc-3', centerName: 'Central CHC Shillong', centerType: 'CHC', district: 'East Khasi Hills', taluka: 'Mylliem', village: 'Shillong', address: 'Laitumkhrah Main Road', latitude: 25.57, longitude: 91.91, phoneNumber: '+91-364-28603', email: 'central.chc@gov.in', medicalOfficerName: 'Dr. H. Rymbai', medicalOfficerPhone: '+91-94361-02862', totalDoctors: 8, totalNurses: 15, totalStaff: 40, totalBeds: 50, icuBeds: 4, emergencyBeds: 8, currentPatients: 65, status: 'Healthy', openingTime: '00:00', closingTime: '23:59', createdBy: 'admin', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), medicineHealthScore: 92, labStatusScore: 94, bedsTotal: 50, bedsOccupied: 15, doctorsPresent: 8, doctorsTotal: 8 }
    ];

    const formatted = centersList.map(c => ({
      ...c,
      id: c.centerId,
      name: c.centerName,
      type: c.centerType as 'PHC' | 'CHC',
      centerType: c.centerType as 'PHC' | 'CHC',
      status: c.status as 'Critical' | 'Healthy' | 'Needs Attention',
      patientFootfallToday: c.currentPatients,
      lastUpdated: c.updatedAt
    }));

    usePhcStore.setState({ centers: formatted });
    localStorage.setItem('hf_phc_centers', JSON.stringify(formatted));
  }
}));
