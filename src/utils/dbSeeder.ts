import { db, IS_MOCK_ENV } from '../config/firebase';
import { doc, setDoc, collection, getDocs, limit, query } from 'firebase/firestore';

export const autoSeedFirestore = async () => {
  if (IS_MOCK_ENV) return;

  try {
    // Check if database is already seeded
    const q = query(collection(db, 'health_centers'), limit(1));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      console.log('Firestore is already seeded.');
      return;
    }

    console.log('Firestore is empty. Starting background auto-seeding...');

    const centersList = [
      { centerId: 'phc-1', centerName: 'Mawphlang PHC', centerType: 'PHC', district: 'East Khasi Hills', taluka: 'Mawphlang', village: 'Mawphlang', address: 'Near Sacred Grove, Mawphlang', latitude: 25.45, longitude: 91.75, phoneNumber: '+91-364-28502', email: 'mawphlang.phc@gov.in', medicalOfficerName: 'Dr. L. Khongwir', medicalOfficerPhone: '+91-94361-02845', totalDoctors: 2, totalNurses: 4, totalStaff: 8, totalBeds: 10, icuBeds: 0, emergencyBeds: 2, currentPatients: 24, status: 'Critical', openingTime: '09:00', closingTime: '17:00', createdBy: 'system-auto-seed', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), medicineHealthScore: 35, labStatusScore: 40, bedsTotal: 10, bedsOccupied: 9, doctorsPresent: 1, doctorsTotal: 2 },
      { centerId: 'phc-2', centerName: 'Laitryngew PHC', centerType: 'PHC', district: 'East Khasi Hills', taluka: 'Sohra', village: 'Laitryngew', address: 'Sohra Road, Laitryngew', latitude: 25.32, longitude: 91.72, phoneNumber: '+91-364-28503', email: 'laitryngew.phc@gov.in', medicalOfficerName: 'Dr. A. Lyngdoh', medicalOfficerPhone: '+91-94361-02846', totalDoctors: 2, totalNurses: 3, totalStaff: 7, totalBeds: 8, icuBeds: 0, emergencyBeds: 1, currentPatients: 8, status: 'Healthy', openingTime: '09:00', closingTime: '17:00', createdBy: 'system-auto-seed', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), medicineHealthScore: 85, labStatusScore: 90, bedsTotal: 8, bedsOccupied: 2, doctorsPresent: 2, doctorsTotal: 2 },
      { centerId: 'phc-3', centerName: 'Sohryngkham PHC', centerType: 'PHC', district: 'East Khasi Hills', taluka: 'Mawryngkneng', village: 'Sohryngkham', address: 'Jowai Road, Sohryngkham', latitude: 25.56, longitude: 91.98, phoneNumber: '+91-364-28504', email: 'sohryngkham.phc@gov.in', medicalOfficerName: 'Dr. M. War', medicalOfficerPhone: '+91-94361-02847', totalDoctors: 3, totalNurses: 5, totalStaff: 10, totalBeds: 12, icuBeds: 0, emergencyBeds: 2, currentPatients: 18, status: 'Needs Attention', openingTime: '09:00', closingTime: '17:00', createdBy: 'system-auto-seed', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), medicineHealthScore: 65, labStatusScore: 70, bedsTotal: 12, bedsOccupied: 7, doctorsPresent: 2, doctorsTotal: 3 },
      { centerId: 'phc-4', centerName: 'Nongspung PHC', centerType: 'PHC', district: 'East Khasi Hills', taluka: 'Mawphlang', village: 'Nongspung', address: 'Nongspung Main Road', latitude: 25.48, longitude: 91.64, phoneNumber: '+91-364-28505', email: 'nongspung.phc@gov.in', medicalOfficerName: 'Dr. S. Sangma', medicalOfficerPhone: '+91-94361-02848', totalDoctors: 2, totalNurses: 3, totalStaff: 6, totalBeds: 6, icuBeds: 0, emergencyBeds: 1, currentPatients: 5, status: 'Healthy', openingTime: '09:00', closingTime: '17:00', createdBy: 'system-auto-seed', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), medicineHealthScore: 80, labStatusScore: 85, bedsTotal: 6, bedsOccupied: 1, doctorsPresent: 2, doctorsTotal: 2 },
      { centerId: 'phc-5', centerName: 'Mylliem PHC', centerType: 'PHC', district: 'East Khasi Hills', taluka: 'Mylliem', village: 'Mylliem', address: 'Cherrapunjee Road, Mylliem', latitude: 25.49, longitude: 91.82, phoneNumber: '+91-364-28506', email: 'mylliem.phc@gov.in', medicalOfficerName: 'Dr. T. Rani', medicalOfficerPhone: '+91-94361-02849', totalDoctors: 2, totalNurses: 4, totalStaff: 8, totalBeds: 8, icuBeds: 0, emergencyBeds: 2, currentPatients: 10, status: 'Healthy', openingTime: '09:00', closingTime: '17:00', createdBy: 'system-auto-seed', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), medicineHealthScore: 78, labStatusScore: 80, bedsTotal: 8, bedsOccupied: 3, doctorsPresent: 2, doctorsTotal: 2 },
      { centerId: 'phc-6', centerName: 'Nongkrem PHC', centerType: 'PHC', district: 'East Khasi Hills', taluka: 'Mylliem', village: 'Nongkrem', address: 'Nongkrem Center', latitude: 25.51, longitude: 91.92, phoneNumber: '+91-364-28507', email: 'nongkrem.phc@gov.in', medicalOfficerName: 'Dr. J. Shylla', medicalOfficerPhone: '+91-94361-02850', totalDoctors: 2, totalNurses: 3, totalStaff: 7, totalBeds: 8, icuBeds: 0, emergencyBeds: 1, currentPatients: 6, status: 'Healthy', openingTime: '09:00', closingTime: '17:00', createdBy: 'system-auto-seed', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), medicineHealthScore: 82, labStatusScore: 88, bedsTotal: 8, bedsOccupied: 2, doctorsPresent: 2, doctorsTotal: 2 },
      { centerId: 'phc-7', centerName: 'Laitlyngkot PHC', centerType: 'PHC', district: 'East Khasi Hills', taluka: 'Mylliem', village: 'Laitlyngkot', address: 'Jowai bypass Laitlyngkot', latitude: 25.41, longitude: 91.89, phoneNumber: '+91-364-28508', email: 'laitlyngkot.phc@gov.in', medicalOfficerName: 'Dr. R. Marbaniang', medicalOfficerPhone: '+91-94361-02851', totalDoctors: 2, totalNurses: 4, totalStaff: 8, totalBeds: 10, icuBeds: 0, emergencyBeds: 2, currentPatients: 14, status: 'Needs Attention', openingTime: '09:00', closingTime: '17:00', createdBy: 'system-auto-seed', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), medicineHealthScore: 55, labStatusScore: 68, bedsTotal: 10, bedsOccupied: 5, doctorsPresent: 1, doctorsTotal: 2 },
      { centerId: 'phc-8', centerName: 'Pynthorumkhrah PHC', centerType: 'PHC', district: 'East Khasi Hills', taluka: 'Mylliem', village: 'Pynthorumkhrah', address: 'Golf Links Road, Shillong', latitude: 25.59, longitude: 91.90, phoneNumber: '+91-364-28509', email: 'pynthor.phc@gov.in', medicalOfficerName: 'Dr. K. Dkhar', medicalOfficerPhone: '+91-94361-02852', totalDoctors: 4, totalNurses: 6, totalStaff: 12, totalBeds: 15, icuBeds: 0, emergencyBeds: 3, currentPatients: 28, status: 'Healthy', openingTime: '09:00', closingTime: '17:00', createdBy: 'system-auto-seed', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), medicineHealthScore: 90, labStatusScore: 92, bedsTotal: 15, bedsOccupied: 6, doctorsPresent: 4, doctorsTotal: 4 },
      { centerId: 'phc-9', centerName: 'Pomlakrai PHC', centerType: 'PHC', district: 'East Khasi Hills', taluka: 'Mylliem', village: 'Pomlakrai', address: 'Mawphlang Road Pomlakrai', latitude: 25.49, longitude: 91.95, phoneNumber: '+91-364-28510', email: 'pomlakrai.phc@gov.in', medicalOfficerName: 'Dr. P. Roy', medicalOfficerPhone: '+91-94361-02853', totalDoctors: 2, totalNurses: 3, totalStaff: 6, totalBeds: 6, icuBeds: 0, emergencyBeds: 1, currentPatients: 4, status: 'Healthy', openingTime: '09:00', closingTime: '17:00', createdBy: 'system-auto-seed', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), medicineHealthScore: 84, labStatusScore: 85, bedsTotal: 6, bedsOccupied: 1, doctorsPresent: 2, doctorsTotal: 2 },
      { centerId: 'phc-10', centerName: 'Nongkynrih PHC', centerType: 'PHC', district: 'East Khasi Hills', taluka: 'Laitkroh', village: 'Nongkynrih', address: 'Laitkroh Center Nongkynrih', latitude: 25.37, longitude: 91.80, phoneNumber: '+91-364-28511', email: 'nongkynrih.phc@gov.in', medicalOfficerName: 'Dr. V. Basaiawmoit', medicalOfficerPhone: '+91-94361-02854', totalDoctors: 2, totalNurses: 4, totalStaff: 8, totalBeds: 8, icuBeds: 0, emergencyBeds: 2, currentPatients: 9, status: 'Healthy', openingTime: '09:00', closingTime: '17:00', createdBy: 'system-auto-seed', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), medicineHealthScore: 80, labStatusScore: 82, bedsTotal: 8, bedsOccupied: 2, doctorsPresent: 2, doctorsTotal: 2 },
      { centerId: 'chc-1', centerName: 'Pynursla CHC', centerType: 'CHC', district: 'East Khasi Hills', taluka: 'Pynursla', village: 'Pynursla', address: 'Dawki Road, Pynursla', latitude: 25.30, longitude: 91.90, phoneNumber: '+91-364-28601', email: 'pynursla.chc@gov.in', medicalOfficerName: 'Dr. R. Synmon', medicalOfficerPhone: '+91-94361-02860', totalDoctors: 5, totalNurses: 10, totalStaff: 25, totalBeds: 30, icuBeds: 2, emergencyBeds: 5, currentPatients: 45, status: 'Healthy', openingTime: '00:00', closingTime: '23:59', createdBy: 'system-auto-seed', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), medicineHealthScore: 88, labStatusScore: 89, bedsTotal: 30, bedsOccupied: 12, doctorsPresent: 5, doctorsTotal: 5 },
      { centerId: 'chc-2', centerName: 'Cherrapunjee CHC', centerType: 'CHC', district: 'East Khasi Hills', taluka: 'Sohra', village: 'Cherrapunjee', address: 'Sohra Market Road', latitude: 25.28, longitude: 91.70, phoneNumber: '+91-364-28602', email: 'sohra.chc@gov.in', medicalOfficerName: 'Dr. E. Laloo', medicalOfficerPhone: '+91-94361-02861', totalDoctors: 4, totalNurses: 8, totalStaff: 20, totalBeds: 25, icuBeds: 1, emergencyBeds: 4, currentPatients: 20, status: 'Healthy', openingTime: '00:00', closingTime: '23:59', createdBy: 'system-auto-seed', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), medicineHealthScore: 85, labStatusScore: 87, bedsTotal: 25, bedsOccupied: 8, doctorsPresent: 4, doctorsTotal: 4 },
      { centerId: 'chc-3', centerName: 'Central CHC Shillong', centerType: 'CHC', district: 'East Khasi Hills', taluka: 'Mylliem', village: 'Shillong', address: 'Laitumkhrah Main Road', latitude: 25.57, longitude: 91.91, phoneNumber: '+91-364-28603', email: 'central.chc@gov.in', medicalOfficerName: 'Dr. H. Rymbai', medicalOfficerPhone: '+91-94361-02862', totalDoctors: 8, totalNurses: 15, totalStaff: 40, totalBeds: 50, icuBeds: 4, emergencyBeds: 8, currentPatients: 65, status: 'Healthy', openingTime: '00:00', closingTime: '23:59', createdBy: 'system-auto-seed', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), medicineHealthScore: 92, labStatusScore: 94, bedsTotal: 50, bedsOccupied: 15, doctorsPresent: 8, doctorsTotal: 8 }
    ];

    // 1. Seed Centers
    for (const hc of centersList) {
      await setDoc(doc(db, 'health_centers', hc.centerId), hc);

      // 2. Initialize default bed pools
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
          UpdatedBy: 'system-auto-seed',
          UpdatedAt: new Date().toISOString()
        };
      });

      for (const bed of defaultBeds) {
        await setDoc(doc(db, 'bed_management', bed.bedId), bed);
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
        todayCompleted: Math.floor(Math.random() * 10) + 5,
        todayPending: Math.floor(Math.random() * 5),
        reagentStockLevel: 70 + Math.floor(Math.random() * 25),
        updatedAt: new Date().toISOString()
      }));

      for (const inv of defaultInventories) {
        await setDoc(doc(db, 'test_inventory', inv.inventoryId), inv);
      }

      // 4. Initialize default equipment
      const defaultEquipment = [
        { equipmentId: `eq-${hc.centerId}-cbc`, healthCenterId: hc.centerId, equipmentName: 'Hematology Analyzer', status: 'Working' as const, installationDate: '2023-01-10', lastServiceDate: '2026-03-01', nextServiceDate: '2026-09-01', manufacturer: 'Sysmex' },
        { equipmentId: `eq-${hc.centerId}-xray`, healthCenterId: hc.centerId, equipmentName: 'X-Ray Machine', status: hc.centerId === 'phc-1' ? ('Offline' as const) : ('Working' as const), installationDate: '2021-06-15', lastServiceDate: '2025-11-20', nextServiceDate: '2026-05-20', manufacturer: 'Siemens' }
      ];

      for (const eq of defaultEquipment) {
        await setDoc(doc(db, 'laboratory_equipment', eq.equipmentId), eq);
      }
    }

    // 5. Seed default medicines index
    const defaultMeds = [
      { medicineId: 'med-1', medicineName: 'Paracetamol 500mg', genericName: 'Acetaminophen', brandName: 'Crocin', category: 'Analgesics', form: 'Tablet', manufacturer: 'GSK', strength: '500mg', packSize: '10x15 Tablets', minStockLevel: 200, maxStockLevel: 2000, reorderLevel: 500, storageTemp: '20-25C', description: 'Pain and fever reliever.', barcode: '8901', qrCode: 'QR-P' },
      { medicineId: 'med-2', medicineName: 'Amoxicillin 250mg', genericName: 'Amoxicillin', brandName: 'Novamox', category: 'Antibiotics', form: 'Capsule', manufacturer: 'Alkem', strength: '250mg', packSize: '10x10 Capsules', minStockLevel: 100, maxStockLevel: 1000, reorderLevel: 250, storageTemp: '15-30C', description: 'Bacterial infections.', barcode: '8902', qrCode: 'QR-A' },
      { medicineId: 'med-3', medicineName: 'Oral Rehydration Salts', genericName: 'ORS WHO formula', brandName: 'Electral', category: 'Rehydration', form: 'Syrup', manufacturer: 'FDC', strength: '21.8g', packSize: '50 Sachets', minStockLevel: 50, maxStockLevel: 500, reorderLevel: 100, storageTemp: 'Below 30C', description: 'Rehydration.', barcode: '8903', qrCode: 'QR-O' }
    ];

    for (const m of defaultMeds) {
      await setDoc(doc(db, 'medicines', m.medicineId), m);
    }

    // 6. Seed medicine stocks for each center
    for (const hc of centersList) {
      const defaultStocks = [
        { stockId: `stk-${hc.centerId}-1`, medicineId: 'med-1', phcId: hc.centerId, batchNumber: 'B-PARA-01', expiryDate: new Date(Date.now() + 30 * 24 * 3600000).toISOString().split('T')[0], currentQuantity: 120, receivedQuantity: 500, issuedQuantity: 380, reservedQuantity: 0, supplier: 'MSMS', purchaseDate: '2026-04-01', purchasePrice: 1.5, lastUpdated: 'Just Now' },
        { stockId: `stk-${hc.centerId}-2`, medicineId: 'med-2', phcId: hc.centerId, batchNumber: 'B-AMOX-01', expiryDate: new Date(Date.now() + 15 * 24 * 3600000).toISOString().split('T')[0], currentQuantity: 15, receivedQuantity: 200, issuedQuantity: 185, reservedQuantity: 0, supplier: 'Apex', purchaseDate: '2026-05-01', purchasePrice: 4.0, lastUpdated: 'Just Now' },
        { stockId: `stk-${hc.centerId}-3`, medicineId: 'med-3', phcId: hc.centerId, batchNumber: 'B-ORS-01', expiryDate: new Date(Date.now() + 120 * 24 * 3600000).toISOString().split('T')[0], currentQuantity: 8, receivedQuantity: 100, issuedQuantity: 92, reservedQuantity: 0, supplier: 'MSMS', purchaseDate: '2026-06-01', purchasePrice: 2.2, lastUpdated: 'Just Now' }
      ];

      for (const s of defaultStocks) {
        await setDoc(doc(db, 'medicine_stock', s.stockId), s);
      }
    }

    // 7. Seed Doctors
    const defaultDocs = [
      { doctorId: 'doc-1', doctorName: 'Dr. Sarah Lyngdoh', photo: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=150', specialization: 'General Medicine', qualification: 'MBBS, MD', registrationNumber: 'MCI-12345', phone: '+91-94361-22456', email: 'sarah.lyngdoh@healthflow.gov.in', assignedHealthCenter: 'phc-1', joiningDate: '2023-05-10', employmentType: 'Full-time' as const, status: 'Active' as const },
      { doctorId: 'doc-2', doctorName: 'Dr. John Mawlong', photo: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=150', specialization: 'Pediatrics', qualification: 'MBBS, DCH', registrationNumber: 'MCI-88776', phone: '+91-98630-44567', email: 'john.mawlong@healthflow.gov.in', assignedHealthCenter: 'phc-2', joiningDate: '2024-02-15', employmentType: 'Full-time' as const, status: 'Active' as const },
      { doctorId: 'doc-3', doctorName: 'Dr. Wanboklang Kurkalang', photo: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&q=80&w=150', specialization: 'Gynecology', qualification: 'MBBS, MD (OBG)', registrationNumber: 'MCI-99001', phone: '+91-94021-99881', email: 'wanbok.kur@healthflow.gov.in', assignedHealthCenter: 'phc-3', joiningDate: '2022-09-01', employmentType: 'Full-time' as const, status: 'Active' as const }
    ];

    for (const d of defaultDocs) {
      await setDoc(doc(db, 'doctors', d.doctorId), d);
    }

    console.log('Background auto-seeding completed successfully!');
  } catch (error) {
    console.error('Background auto-seeding failed:', error);
  }
};
