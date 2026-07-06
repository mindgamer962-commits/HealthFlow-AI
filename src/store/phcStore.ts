import { create } from 'zustand';
import { HealthCenter, PHC, Doctor, LabTestItem } from '../types';
import { db, IS_MOCK_ENV } from '../config/firebase';
import { collection, onSnapshot, doc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';

interface PhcState {
  centers: PHC[];
  doctors: Doctor[];
  labs: LabTestItem[];
  loading: boolean;
  subscribeToCenters: () => () => void;
  createCenter: (center: Omit<HealthCenter, 'centerId' | 'createdAt' | 'updatedAt' | 'createdBy'>) => Promise<string>;
  updateCenter: (id: string, updatedFields: Partial<HealthCenter>) => Promise<void>;
  deleteCenter: (id: string) => Promise<void>;
  archiveCenter: (id: string) => Promise<void>;
  restoreCenter: (id: string) => Promise<void>;
  
  // Doctor operations
  subscribeToDoctors: () => () => void;
  addDoctor: (newDoc: Omit<Doctor, 'id'>) => Promise<void>;
  updateDoctor: (id: string, updatedFields: Partial<Doctor>) => Promise<void>;
  deleteDoctor: (id: string) => Promise<void>;

  // Lab operations
  subscribeToLabs: () => () => void;
  updateLabAvailability: (id: string, available: boolean) => Promise<void>;
}

// Convert core HealthCenter Firestore structure to the legacy PHC interface for dashboard chart compatibility
export const convertToLegacyPhc = (hc: HealthCenter): PHC => {
  let bedsOccupied = typeof hc.bedsOccupied === 'number'
    ? hc.bedsOccupied
    : (hc.currentPatients ? Math.min(hc.totalBeds, Math.round(hc.currentPatients * 0.3)) : Math.round(hc.totalBeds * 0.4));
  let doctorsPresent = typeof hc.doctorsPresent === 'number'
    ? hc.doctorsPresent
    : (Math.round(hc.totalDoctors * 0.7) || 1);
  let medicineHealthScore = 85;
  let labStatusScore = 80;

  if (hc.bedsOccupied === undefined && hc.doctorsPresent === undefined) {
    if (hc.centerId === 'phc-1') {
      bedsOccupied = 9;
      doctorsPresent = 1;
      medicineHealthScore = 42;
      labStatusScore = 90;
    } else if (hc.centerId === 'phc-2') {
      bedsOccupied = 3;
      doctorsPresent = 2;
      medicineHealthScore = 85;
      labStatusScore = 50;
    } else if (hc.centerId === 'phc-3') {
      bedsOccupied = 4;
      doctorsPresent = 2;
      medicineHealthScore = 92;
      labStatusScore = 95;
    } else if (hc.centerId === 'chc-1') {
      bedsOccupied = 28;
      doctorsPresent = 2;
      medicineHealthScore = 68;
      labStatusScore = 40;
    } else if (hc.centerId === 'phc-4') {
      bedsOccupied = 1;
      doctorsPresent = 1;
      medicineHealthScore = 88;
      labStatusScore = 70;
    }
  }

  return {
    ...hc,
    id: hc.centerId,
    name: hc.centerName,
    type: hc.centerType,
    bedsTotal: hc.totalBeds,
    bedsOccupied,
    doctorsPresent,
    doctorsTotal: hc.totalDoctors,
    patientFootfallToday: hc.currentPatients,
    medicineHealthScore,
    labStatusScore,
    lastUpdated: 'Just Now'
  };
};

const INITIAL_MOCK_CENTERS: HealthCenter[] = [
  {
    centerId: 'phc-1',
    centerName: 'Mawphlang PHC',
    centerType: 'PHC',
    district: 'East Khasi Hills',
    taluka: 'Mawphlang',
    village: 'Mawphlang',
    address: 'Near Sacred Grove, Mawphlang, Meghalaya 793121',
    latitude: 25.4542,
    longitude: 91.7562,
    phoneNumber: '+91-94361-22456',
    email: 'mawphlang.phc@healthflow.gov.in',
    medicalOfficerName: 'Dr. Sarah Lyngdoh',
    medicalOfficerPhone: '+91-94361-22456',
    totalDoctors: 2,
    totalNurses: 4,
    totalStaff: 8,
    totalBeds: 10,
    icuBeds: 1,
    emergencyBeds: 2,
    currentPatients: 84,
    status: 'Critical',
    openingTime: '09:00 AM',
    closingTime: '04:00 PM',
    createdBy: 'system-seed',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isArchived: false
  },
  {
    centerId: 'phc-2',
    centerName: 'Laitryngew PHC',
    centerType: 'PHC',
    district: 'East Khasi Hills',
    taluka: 'Sohra',
    village: 'Laitryngew',
    address: 'Sohra Road, Laitryngew, Meghalaya 793111',
    latitude: 25.3344,
    longitude: 91.7288,
    phoneNumber: '+91-98630-44567',
    email: 'laitryngew.phc@healthflow.gov.in',
    medicalOfficerName: 'Dr. John Mawlong',
    medicalOfficerPhone: '+91-98630-44567',
    totalDoctors: 2,
    totalNurses: 3,
    totalStaff: 6,
    totalBeds: 8,
    icuBeds: 0,
    emergencyBeds: 2,
    currentPatients: 35,
    status: 'Needs Attention',
    openingTime: '09:00 AM',
    closingTime: '04:00 PM',
    createdBy: 'system-seed',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isArchived: false
  },
  {
    centerId: 'phc-3',
    centerName: 'Sohryngkham PHC',
    centerType: 'PHC',
    district: 'East Khasi Hills',
    taluka: 'Mawryngkneng',
    village: 'Sohryngkham',
    address: 'Shillong-Jowai Road, Sohryngkham, Meghalaya 793021',
    latitude: 25.5788,
    longitude: 92.0012,
    phoneNumber: '+91-94021-99881',
    email: 'sohryngkham.phc@healthflow.gov.in',
    medicalOfficerName: 'Dr. Wanboklang Kurkalang',
    medicalOfficerPhone: '+91-94021-99881',
    totalDoctors: 3,
    totalNurses: 5,
    totalStaff: 10,
    totalBeds: 12,
    icuBeds: 1,
    emergencyBeds: 3,
    currentPatients: 110,
    status: 'Healthy',
    openingTime: '09:00 AM',
    closingTime: '05:00 PM',
    createdBy: 'system-seed',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isArchived: false
  },
  {
    centerId: 'chc-1',
    centerName: 'Pynursla CHC',
    centerType: 'CHC',
    district: 'East Khasi Hills',
    taluka: 'Pynursla',
    village: 'Pynursla',
    address: 'Dawki Road, Pynursla, Meghalaya 793110',
    latitude: 25.3122,
    longitude: 91.9022,
    phoneNumber: '+91-97743-88776',
    email: 'pynursla.chc@healthflow.gov.in',
    medicalOfficerName: 'Dr. Daphne Sohkhlet',
    medicalOfficerPhone: '+91-97743-88776',
    totalDoctors: 5,
    totalNurses: 8,
    totalStaff: 18,
    totalBeds: 30,
    icuBeds: 4,
    emergencyBeds: 6,
    currentPatients: 185,
    status: 'Critical',
    openingTime: '24 Hours',
    closingTime: '24 Hours',
    createdBy: 'system-seed',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isArchived: false
  },
  {
    centerId: 'phc-4',
    centerName: 'Mawsynram PHC',
    centerType: 'PHC',
    district: 'East Khasi Hills',
    taluka: 'Mawsynram',
    village: 'Mawsynram',
    address: 'Cherrapunji Road, Mawsynram, Meghalaya 793113',
    latitude: 25.3005,
    longitude: 91.5822,
    phoneNumber: '+91-97740-12345',
    email: 'mawsynram.phc@healthflow.gov.in',
    medicalOfficerName: 'Dr. Sildora Nongrum',
    medicalOfficerPhone: '+91-97740-12345',
    totalDoctors: 2,
    totalNurses: 3,
    totalStaff: 5,
    totalBeds: 8,
    icuBeds: 0,
    emergencyBeds: 2,
    currentPatients: 45,
    status: 'Healthy',
    openingTime: '09:00 AM',
    closingTime: '04:00 PM',
    createdBy: 'system-seed',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isArchived: false
  }
];

const INITIAL_MOCK_DOCTORS: Doctor[] = [
  { id: 'doc-1', name: 'Dr. Sarah Lyngdoh', specialization: 'General Medicine', phone: '+91-94361-22456', attendance: 'Present', phcId: 'phc-1' },
  { id: 'doc-2', name: 'Dr. John Wahlang', specialization: 'Pediatrics', phone: '+91-98630-44567', attendance: 'Present', phcId: 'phc-1' },
  { id: 'doc-3', name: 'Dr. Wanboklang Kurkalang', specialization: 'Gynecology', phone: '+91-94021-99881', attendance: 'Present', phcId: 'phc-3' },
  { id: 'doc-4', name: 'Dr. Sildora Nongrum', specialization: 'Pediatrics', phone: '+91-98630-66778', attendance: 'Absent', phcId: 'phc-4' }
];

const INITIAL_MOCK_LABS: LabTestItem[] = [
  { id: 'lab-1', name: 'Malaria Rapid Test Kit', available: true, dailyCapacity: 30, testsPending: 2, status: 'Good', phcId: 'phc-1' },
  { id: 'lab-2', name: 'Complete Blood Count (CBC)', available: true, dailyCapacity: 15, testsPending: 8, status: 'Good', phcId: 'phc-1' },
  { id: 'lab-3', name: 'Pregnancy Test Kit (hCG)', available: true, dailyCapacity: 50, testsPending: 1, status: 'Good', phcId: 'phc-1' },
  { id: 'lab-4', name: 'Widal (Typhoid Test)', available: true, dailyCapacity: 20, testsPending: 5, status: 'Good', phcId: 'phc-1' },
  { id: 'lab-5', name: 'Malaria Rapid Test Kit', available: true, dailyCapacity: 30, testsPending: 0, status: 'Good', phcId: 'phc-2' },
  { id: 'lab-6', name: 'Complete Blood Count (CBC)', available: false, dailyCapacity: 15, testsPending: 12, status: 'Critical', phcId: 'phc-2' }
];

const loadPersistedCenters = (): HealthCenter[] => {
  const data = localStorage.getItem('healthflow_centers');
  if (data) {
    try {
      return JSON.parse(data);
    } catch (e) {}
  }
  return INITIAL_MOCK_CENTERS;
};

const savePersistedCenters = (list: HealthCenter[]) => {
  localStorage.setItem('healthflow_centers', JSON.stringify(list));
};

const loadPersistedDoctors = (): Doctor[] => {
  const data = localStorage.getItem('healthflow_doctors');
  if (data) {
    try {
      return JSON.parse(data);
    } catch (e) {}
  }
  return INITIAL_MOCK_DOCTORS;
};

const savePersistedDoctors = (list: Doctor[]) => {
  localStorage.setItem('healthflow_doctors', JSON.stringify(list));
};

const loadPersistedLabs = (): LabTestItem[] => {
  const data = localStorage.getItem('healthflow_labs');
  if (data) {
    try {
      return JSON.parse(data);
    } catch (e) {}
  }
  return INITIAL_MOCK_LABS;
};

const savePersistedLabs = (list: LabTestItem[]) => {
  localStorage.setItem('healthflow_labs', JSON.stringify(list));
};

export const usePhcStore = create<PhcState>((set, get) => ({
  centers: IS_MOCK_ENV ? loadPersistedCenters().map(convertToLegacyPhc) : [],
  doctors: IS_MOCK_ENV ? loadPersistedDoctors() : [],
  labs: IS_MOCK_ENV ? loadPersistedLabs() : [],
  loading: false,

  subscribeToCenters: () => {
    if (IS_MOCK_ENV) {
      const list = loadPersistedCenters();
      set({ centers: list.map(convertToLegacyPhc), loading: false });
      return () => {};
    }

    set({ loading: true });
    const unsub = onSnapshot(collection(db, 'health_centers'), (snapshot) => {
      const list: HealthCenter[] = [];
      snapshot.forEach((doc) => {
        list.push(doc.data() as HealthCenter);
      });
      const legacyList = list.map(convertToLegacyPhc);

      set({ centers: legacyList, loading: false });
    }, (error) => {
      console.error("Firestore health_centers subscription error:", error);
      set({ loading: false });
    });
    return unsub;
  },

  createCenter: async (newCenter) => {
    set({ loading: true });
    const id = `phc-${Math.random().toString(36).substr(2, 9)}`;
    const hc: HealthCenter = {
      ...newCenter,
      centerId: id,
      createdBy: 'admin-console',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isArchived: false
    };

    if (IS_MOCK_ENV) {
      const currentList = loadPersistedCenters();
      const updatedList = [...currentList, hc];
      savePersistedCenters(updatedList);
      set({ centers: updatedList.map(convertToLegacyPhc), loading: false });
      return id;
    }

    try {
      await setDoc(doc(db, 'health_centers', id), hc);
      set({ loading: false });
      return id;
    } catch (error) {
      console.error("Firebase create center error:", error);
      set({ loading: false });
      throw error;
    }
  },

  updateCenter: async (id, updatedFields) => {
    set({ loading: true });
    if (IS_MOCK_ENV) {
      const currentList = loadPersistedCenters();
      const updatedList = currentList.map(c => 
        c.centerId === id ? { ...c, ...updatedFields, updatedAt: new Date().toISOString() } : c
      );
      savePersistedCenters(updatedList);
      set({ centers: updatedList.map(convertToLegacyPhc), loading: false });
      return;
    }

    try {
      const docRef = doc(db, 'health_centers', id);
      await updateDoc(docRef, {
        ...updatedFields,
        updatedAt: new Date().toISOString()
      });
      set({ loading: false });
    } catch (error) {
      console.error("Firebase update center error:", error);
      set({ loading: false });
      throw error;
    }
  },

  deleteCenter: async (id) => {
    set({ loading: true });
    if (IS_MOCK_ENV) {
      const currentList = loadPersistedCenters();
      const updatedList = currentList.filter(c => c.centerId !== id);
      savePersistedCenters(updatedList);
      set({ centers: updatedList.map(convertToLegacyPhc), loading: false });
      return;
    }

    try {
      await deleteDoc(doc(db, 'health_centers', id));
      set({ loading: false });
    } catch (error) {
      console.error("Firebase delete center error:", error);
      set({ loading: false });
      throw error;
    }
  },

  archiveCenter: async (id) => {
    await get().updateCenter(id, { isArchived: true });
  },

  restoreCenter: async (id) => {
    await get().updateCenter(id, { isArchived: false });
  },

  // Doctors management
  subscribeToDoctors: () => {
    if (IS_MOCK_ENV) {
      const list = loadPersistedDoctors();
      set({ doctors: list, loading: false });
      return () => {};
    }

    set({ loading: true });
    const unsub = onSnapshot(collection(db, 'doctors'), (snapshot) => {
      const list: Doctor[] = [];
      snapshot.forEach(doc => list.push(doc.data() as Doctor));
      set({ doctors: list, loading: false });
    }, (error) => {
      console.error("Firestore doctors subscription error:", error);
      set({ loading: false });
    });
    return unsub;
  },

  addDoctor: async (newDoc) => {
    set({ loading: true });
    const id = (newDoc as any).id || `doc-${Math.random().toString(36).substr(2, 9)}`;
    const docObj: Doctor = { ...newDoc, id };

    if (IS_MOCK_ENV) {
      const list = loadPersistedDoctors();
      const updated = [...list, docObj];
      savePersistedDoctors(updated);
      set({ doctors: updated, loading: false });
      return;
    }

    try {
      await setDoc(doc(db, 'doctors', id), docObj);
      set({ loading: false });
    } catch (error) {
      console.error(error);
      set({ loading: false });
      throw error;
    }
  },

  updateDoctor: async (id, updatedFields) => {
    set({ loading: true });
    if (IS_MOCK_ENV) {
      const list = loadPersistedDoctors();
      const updated = list.map(d => d.id === id ? { ...d, ...updatedFields } : d);
      savePersistedDoctors(updated);
      set({ doctors: updated, loading: false });
      return;
    }

    try {
      await updateDoc(doc(db, 'doctors', id), updatedFields);
      set({ loading: false });
    } catch (error) {
      console.error(error);
      set({ loading: false });
      throw error;
    }
  },

  deleteDoctor: async (id) => {
    set({ loading: true });
    if (IS_MOCK_ENV) {
      const list = loadPersistedDoctors();
      const updated = list.filter(d => d.id !== id);
      savePersistedDoctors(updated);
      set({ doctors: updated, loading: false });
      return;
    }

    try {
      await deleteDoc(doc(db, 'doctors', id));
      set({ loading: false });
    } catch (error) {
      console.error(error);
      set({ loading: false });
      throw error;
    }
  },

  // Labs management
  subscribeToLabs: () => {
    if (IS_MOCK_ENV) {
      const list = loadPersistedLabs();
      set({ labs: list, loading: false });
      return () => {};
    }

    set({ loading: true });
    const unsub = onSnapshot(collection(db, 'lab_tests'), (snapshot) => {
      const list: LabTestItem[] = [];
      snapshot.forEach(doc => list.push(doc.data() as LabTestItem));
      set({ labs: list, loading: false });
    }, (error) => {
      console.error("Firestore lab tests subscription error:", error);
      set({ loading: false });
    });
    return unsub;
  },

  updateLabAvailability: async (id, available) => {
    set({ loading: true });
    const status: 'Good' | 'Warning' | 'Critical' = available ? 'Good' : 'Critical';

    if (IS_MOCK_ENV) {
      const list = loadPersistedLabs();
      const updated = list.map(l => l.id === id ? { ...l, available, status } : l);
      savePersistedLabs(updated);
      set({ labs: updated, loading: false });
      return;
    }

    try {
      await updateDoc(doc(db, 'lab_tests', id), { available, status });
      set({ loading: false });
    } catch (error) {
      console.error(error);
      set({ loading: false });
      throw error;
    }
  }
}));
