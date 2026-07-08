import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Pill,
  Search,
  Plus,
  Filter,
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  ArrowLeftRight,
  Sparkles,
  Download,
  Printer,
  Calendar,
  Building2,
  Trash2,
  CheckCircle2,
  Boxes,
  FileSpreadsheet,
  X,
  RefreshCw,
  PlusCircle,
  Truck
} from 'lucide-react';
import { useMedicineStore } from '../../store/medicineStore';
import { usePhcStore } from '../../store/phcStore';
import { useAuthStore } from '../../store/authStore';
import { StatChart } from '../../components/charts/StatChart';
import { Medicine, MedicineStock } from '../../types';
import { db, IS_MOCK_ENV } from '../../config/firebase';
import { doc, setDoc } from 'firebase/firestore';

export const MedicineInventoryPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { centers } = usePhcStore();
  const {
    medicines,
    stocks,
    transactions,
    transfers,
    loading,
    subscribeToMedicineData,
    createMedicine,
    addStockBatch,
    recordTransaction,
    requestTransfer,
    approveTransfer,
    rejectTransfer
  } = useMedicineStore();

  // Subscribe to live database updates on mount
  useEffect(() => {
    const unsubscribe = subscribeToMedicineData();
    return () => unsubscribe();
  }, []);



  // UI tabs: 'overview' | 'history' | 'reorder' | 'transfers' | 'master'
  const [activeTab, setActiveTab] = useState<'overview' | 'history' | 'reorder' | 'transfers' | 'master'>('overview');


  // Form states (Add Medicine)
  const [newMedName, setNewMedName] = useState('');
  const [newMedGenName, setNewMedGenName] = useState('');
  const [newMedBrandName, setNewMedBrandName] = useState('');
  const [newMedCategory, setNewMedCategory] = useState('Analgesics');
  const [newMedForm, setNewMedForm] = useState<'Tablet' | 'Capsule' | 'Injection' | 'Syrup' | 'Cream' | 'Drops'>('Tablet');
  const [newMedMfg, setNewMedMfg] = useState('');
  const [newMedStrength, setNewMedStrength] = useState('');
  const [newMedPackSize, setNewMedPackSize] = useState('');
  const [newMedMin, setNewMedMin] = useState(200);
  const [newMedMax, setNewMedMax] = useState(2000);
  const [newMedReorder, setNewMedReorder] = useState(500);
  const [newMedTemp, setNewMedTemp] = useState('20°C - 25°C');
  const [newMedDesc, setNewMedDesc] = useState('');
  const [newMedBarcode, setNewMedBarcode] = useState('');

  // Form states (Add Stock Batch)
  const [newBatchMedId, setNewBatchMedId] = useState('');
  const [newBatchPhcId, setNewBatchPhcId] = useState('');

  // Pre-fill default selects for new batch stock modal
  useEffect(() => {
    if (medicines.length > 0 && !newBatchMedId) {
      setNewBatchMedId(medicines[0].medicineId);
    }
  }, [medicines, newBatchMedId]);

  useEffect(() => {
    if (centers.length > 0 && !newBatchPhcId) {
      setNewBatchPhcId(user?.phcId || centers[0].centerId);
    }
  }, [centers, newBatchPhcId, user]);

  useEffect(() => {
    const userPhcId = user?.phcId;
    if (userPhcId && !loading) {
      const phcStocks = stocks.filter(s => s.phcId === userPhcId);
      if (phcStocks.length === 0) {
        const defaultStocks = [
          { stockId: `stk-${userPhcId}-1`, medicineId: 'med-1', phcId: userPhcId, batchNumber: 'B-PARA-01', expiryDate: new Date(Date.now() + 30 * 24 * 3600000).toISOString().split('T')[0], currentQuantity: 120, receivedQuantity: 500, issuedQuantity: 380, reservedQuantity: 0, supplier: 'MSMS', purchaseDate: '2026-04-01', purchasePrice: 1.5, lastUpdated: 'Just Now' },
          { stockId: `stk-${userPhcId}-2`, medicineId: 'med-2', phcId: userPhcId, batchNumber: 'B-AMOX-01', expiryDate: new Date(Date.now() + 15 * 24 * 3600000).toISOString().split('T')[0], currentQuantity: 15, receivedQuantity: 200, issuedQuantity: 185, reservedQuantity: 0, supplier: 'Apex', purchaseDate: '2026-05-01', purchasePrice: 4.0, lastUpdated: 'Just Now' },
          { stockId: `stk-${userPhcId}-3`, medicineId: 'med-3', phcId: userPhcId, batchNumber: 'B-ORS-01', expiryDate: new Date(Date.now() + 120 * 24 * 3600000).toISOString().split('T')[0], currentQuantity: 8, receivedQuantity: 100, issuedQuantity: 92, reservedQuantity: 0, supplier: 'MSMS', purchaseDate: '2026-06-01', purchasePrice: 2.2, lastUpdated: 'Just Now' }
        ];

        const initializeStocks = async () => {
          try {
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
            // Trigger refresh
            subscribeToMedicineData();
          } catch (err) {
            console.error("Auto-initialization of medicine stocks failed:", err);
          }
        };

        initializeStocks();
      }
    }
  }, [user?.phcId, loading, stocks.length]);
  const [newBatchNum, setNewBatchNum] = useState('');
  const [newBatchExpiry, setNewBatchExpiry] = useState('');
  const [newBatchQty, setNewBatchQty] = useState(100);
  const [newBatchSupplier, setNewBatchSupplier] = useState('');
  const [newBatchPrice, setNewBatchPrice] = useState(1.5);

  // Form states (Stock Adjustment)
  const [adjType, setAdjType] = useState<'Stock In' | 'Stock Out' | 'Adjustment' | 'Expired' | 'Damaged'>('Adjustment');
  const [adjQty, setAdjQty] = useState(10);
  const [adjReason, setAdjReason] = useState('');

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [phcFilter, setPhcFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [stockStatusFilter, setStockStatusFilter] = useState('all');
  const [historySearch, setHistorySearch] = useState('');

  // Toast notifications
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modals state
  const [showAddBatchModal, setShowAddBatchModal] = useState(false);
  const [showAddMedicineModal, setShowAddMedicineModal] = useState(false);
  const [showTxModal, setShowTxModal] = useState(false);
  const [selectedStockId, setSelectedStockId] = useState<string>('');

  // Full Transaction Dialog State
  const [txType, setTxType] = useState<'Stock In' | 'Dispense' | 'Transfer Out' | 'Transfer In' | 'Expired' | 'Damaged' | 'Adjustment'>('Stock In');
  const [txQty, setTxQty] = useState(1);
  const [txReason, setTxReason] = useState('');
  const [txRemarks, setTxRemarks] = useState('');
  const [txPerformedBy, setTxPerformedBy] = useState('');
  const [txDateTime, setTxDateTime] = useState('');
  const [txTargetPhcId, setTxTargetPhcId] = useState('');
  const [txAdjSign, setTxAdjSign] = useState<'+' | '-'>('+');

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Filter stocks depending on permissions, search constraints, and select toggles
  const filteredStocks = useMemo(() => {
    return stocks.filter(stk => {
      // 1. Role Restrictions: PHC/CHC Staff only sees their assigned facility inventory
      if ((user?.role === 'PHC Staff' || user?.role === 'CHC Staff') && stk.phcId !== user.phcId) {
        return false;
      }

      // 2. PHC Filter dropdown selection (Administrators only)
      if (phcFilter !== 'all' && stk.phcId !== phcFilter) {
        return false;
      }

      const med = medicines.find(m => m.medicineId === stk.medicineId);
      if (!med) return false;

      // 3. Search parameters: checks medicine name, batch number, category, or supplier
      const matchesSearch =
        med.medicineName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        med.genericName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        stk.batchNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        stk.supplier.toLowerCase().includes(searchTerm.toLowerCase());

      // 4. Category filter
      if (categoryFilter !== 'all' && med.category !== categoryFilter) {
        return false;
      }

      // 5. Stock Status alert filters
      const isExpired = new Date(stk.expiryDate) < new Date();
      const isExpiringSoon = !isExpired && new Date(stk.expiryDate) <= new Date(Date.now() + 30 * 24 * 3600000);
      const isLowStock = stk.currentQuantity < med.minStockLevel && stk.currentQuantity > 0;
      const isOutOfStock = stk.currentQuantity === 0;

      if (stockStatusFilter === 'Low' && !isLowStock) return false;
      if (stockStatusFilter === 'Out' && !isOutOfStock) return false;
      if (stockStatusFilter === 'Expiring' && !isExpiringSoon) return false;
      if (stockStatusFilter === 'Expired' && !isExpired) return false;

      return matchesSearch;
    });
  }, [stocks, medicines, user, phcFilter, categoryFilter, searchTerm, stockStatusFilter]);

  // Aggregate values for inventory dashboard cards
  const summary = useMemo(() => {
    const totalMeds = medicines.length;
    const totalStockQty = filteredStocks.reduce((sum, s) => sum + s.currentQuantity, 0);

    let lowStockCount = 0;
    let expiredCount = 0;
    let expiringSoonCount = 0;

    filteredStocks.forEach(s => {
      const med = medicines.find(m => m.medicineId === s.medicineId);
      if (med) {
        if (s.currentQuantity < med.minStockLevel && s.currentQuantity > 0) lowStockCount++;
      }
      const isExpired = new Date(s.expiryDate) < new Date();
      if (isExpired) expiredCount++;
      
      const isExpiringSoon = !isExpired && new Date(s.expiryDate) <= new Date(Date.now() + 30 * 24 * 3600000);
      if (isExpiringSoon) expiringSoonCount++;
    });

    // Today's transaction quantity sums
    const todayStr = new Date().toISOString().split('T')[0];
    const todayMovement = transactions
      .filter(t => t.timestamp.startsWith(todayStr))
      .reduce((sum, t) => sum + t.quantity, 0);

    return { totalMeds, totalStockQty, lowStockCount, expiredCount, expiringSoonCount, todayMovement };
  }, [filteredStocks, medicines, transactions]);

  // Reorder analysis list recommendation engine
  const reorderRecommendations = useMemo(() => {
    const list: any[] = [];
    filteredStocks.forEach(s => {
      const med = medicines.find(m => m.medicineId === s.medicineId);
      if (med && s.currentQuantity <= med.reorderLevel) {
        const recommendQty = med.maxStockLevel - s.currentQuantity;
        const priority = s.currentQuantity === 0 
          ? 'Critical' 
          : s.currentQuantity < med.minStockLevel 
          ? 'High' 
          : 'Medium';
        
        list.push({
          stock: s,
          medicine: med,
          recommendQty,
          priority,
          supplier: s.supplier,
          reorderDate: new Date(Date.now() + 1 * 24 * 3600000).toISOString().split('T')[0] // recommend order tomorrow
        });
      }
    });
    return list;
  }, [filteredStocks, medicines]);

  // Smart Stock Transfers logic
  const transferRecommendations = useMemo(() => {
    const list: any[] = [];
    // Identify deficit stock lines (below minStockLevel)
    const deficits = filteredStocks.filter(s => {
      const med = medicines.find(m => m.medicineId === s.medicineId);
      return med && s.currentQuantity < med.minStockLevel;
    });

    deficits.forEach(defStock => {
      const med = medicines.find(m => m.medicineId === defStock.medicineId);
      if (!med) return;

      // Find surplus stocks in OTHER PHCs for the same medicine
      const surpluses = stocks.filter(s => 
        s.medicineId === defStock.medicineId && 
        s.phcId !== defStock.phcId && 
        s.currentQuantity > med.minStockLevel * 2
      );

      surpluses.forEach(surpStock => {
        const sourceCenter = centers.find(c => c.centerId === surpStock.phcId);
        const targetCenter = centers.find(c => c.centerId === defStock.phcId);
        
        if (sourceCenter && targetCenter) {
          const qtyToTransfer = Math.min(
            Math.round((surpStock.currentQuantity - med.minStockLevel) * 0.5),
            med.minStockLevel - defStock.currentQuantity
          );

          if (qtyToTransfer > 20) {
            // Distance calculation mock placeholder
            const dist = 10 + Math.round(Math.random() * 25);
            list.push({
              medicine: med,
              sourcePhcId: surpStock.phcId,
              sourcePhcName: sourceCenter.centerName,
              targetPhcId: defStock.phcId,
              targetPhcName: targetCenter.centerName,
              surplusQty: surpStock.currentQuantity,
              deficitQty: defStock.currentQuantity,
              recommendQty: qtyToTransfer,
              distance: dist,
              reason: `Surplus Paracetamol detected at ${sourceCenter.centerName}. Transfer suggested to cover critical deficit at ${targetCenter.centerName}.`
            });
          }
        }
      });
    });
    return list;
  }, [filteredStocks, stocks, medicines, centers]);

  // Chart data calculations
  const chartData = useMemo(() => {
    return filteredStocks.map(s => {
      const med = medicines.find(m => m.medicineId === s.medicineId);
      return {
        name: med ? med.medicineName : 'Unknown',
        'Current Stock': s.currentQuantity,
        'Min Threshold': med ? med.minStockLevel : 100
      };
    });
  }, [filteredStocks, medicines]);

  // Submit master medicine registry addition
  const handleAddMedicineSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createMedicine({
        medicineName: newMedName,
        genericName: newMedGenName,
        brandName: newMedBrandName,
        category: newMedCategory,
        form: newMedForm,
        manufacturer: newMedMfg,
        strength: newMedStrength,
        packSize: newMedPackSize,
        minStockLevel: Number(newMedMin),
        maxStockLevel: Number(newMedMax),
        reorderLevel: Number(newMedReorder),
        storageTemp: newMedTemp,
        description: newMedDesc,
        barcode: newMedBarcode,
        qrCode: `QR-${newMedName.toUpperCase().substr(0, 4)}`
      });

      triggerToast("New Medicine registered in Master Index.");
      setShowAddMedicineModal(false);
      
      // Reset fields
      setNewMedName('');
      setNewMedGenName('');
      setNewMedBrandName('');
      setNewMedMfg('');
      setNewMedStrength('');
      setNewMedPackSize('');
      setNewMedDesc('');
      setNewMedBarcode('');
    } catch (err: any) {
      triggerToast(err.message || "Failed to create medicine.");
    }
  };

  // Submit batch creation to inventory
  const handleAddBatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addStockBatch({
        medicineId: newBatchMedId,
        phcId: ((user?.role === 'PHC Staff' || user?.role === 'CHC Staff') ? user.phcId : newBatchPhcId) || 'phc-1',
        batchNumber: newBatchNum,
        expiryDate: newBatchExpiry,
        currentQuantity: Number(newBatchQty),
        receivedQuantity: Number(newBatchQty),
        issuedQuantity: 0,
        reservedQuantity: 0,
        supplier: newBatchSupplier,
        purchaseDate: new Date().toISOString().split('T')[0],
        purchasePrice: Number(newBatchPrice)
      });

      // Also record transaction
      const selectedMed = medicines.find(m => m.medicineId === newBatchMedId);
      const targetPhcId = ((user?.role === 'PHC Staff' || user?.role === 'CHC Staff') ? user.phcId : newBatchPhcId) || 'phc-1';
      const targetPhcName = centers.find(c => c.centerId === targetPhcId)?.centerName || 'Unknown Facility';

      await recordTransaction({
        medicineId: newBatchMedId,
        medicineName: selectedMed?.medicineName || 'Unknown Medicine',
        batchNumber: newBatchNum,
        phcId: targetPhcId,
        phcName: targetPhcName,
        type: 'Stock In',
        quantity: Number(newBatchQty),
        userId: user?.uid || 'unknown',
        userName: user?.name || 'Staff User',
        performedBy: user?.name || 'Staff User',
        reason: `Initial batch load: ${newBatchNum} received from supplier.`
      });

      triggerToast("Stock batch loaded to facility inventory!");
      setShowAddBatchModal(false);
      setNewBatchNum('');
      setNewBatchExpiry('');
      setNewBatchSupplier('');
    } catch (err: any) {
      triggerToast(err.message || "Failed to add batch.");
    }
  };

  // Open the unified transaction dialog prefilled for a stock row
  const openTxModal = (stockId: string, defaultType: typeof txType = 'Dispense') => {
    setSelectedStockId(stockId);
    setTxType(defaultType);
    setTxQty(1);
    setTxReason('');
    setTxRemarks('');
    setTxPerformedBy(user?.name || '');
    setTxDateTime(new Date().toISOString().slice(0, 16));
    setTxAdjSign('+');
    if (centers.length > 0) setTxTargetPhcId(centers[0].centerId);
    setShowTxModal(true);
  };

  // Submit a full transaction from the unified dialog
  const handleTxSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStockId) return;

    const targetStock = stocks.find(s => s.stockId === selectedStockId);
    if (!targetStock) return;

    const med = medicines.find(m => m.medicineId === targetStock.medicineId);
    const phc = centers.find(c => c.centerId === targetStock.phcId);

    // For outbound types validate quantity
    const isOutbound = ['Dispense', 'Stock Out', 'Transfer Out', 'Expired', 'Damaged'].includes(txType);
    if (isOutbound && txQty > targetStock.currentQuantity) {
      triggerToast(`Cannot ${txType} more than current stock (${targetStock.currentQuantity} units).`);
      return;
    }

    // Adjustment uses signed qty
    const finalQty = txType === 'Adjustment' ? (txAdjSign === '+' ? Math.abs(txQty) : -Math.abs(txQty)) : txQty;

    try {
      await recordTransaction({
        medicineId: targetStock.medicineId,
        medicineName: med?.medicineName,
        phcId: targetStock.phcId,
        phcName: phc?.centerName,
        batchNumber: targetStock.batchNumber,
        stockId: targetStock.stockId,
        type: txType as any,
        quantity: finalQty,
        userId: user?.uid || 'unknown',
        userName: user?.name || 'Staff User',
        performedBy: txPerformedBy || user?.name || 'Staff User',
        reason: txReason,
        remarks: txRemarks,
        dateTime: txDateTime || new Date().toISOString()
      });

      // If Transfer Out, also record Transfer In at the target facility
      if (txType === 'Transfer Out' && txTargetPhcId) {
        const targetCenter = centers.find(c => c.centerId === txTargetPhcId);
        await recordTransaction({
          medicineId: targetStock.medicineId,
          medicineName: med?.medicineName,
          phcId: txTargetPhcId,
          phcName: targetCenter?.centerName,
          batchNumber: targetStock.batchNumber,
          stockId: undefined,
          type: 'Transfer In',
          quantity: txQty,
          userId: user?.uid || 'unknown',
          userName: user?.name || 'Staff User',
          performedBy: txPerformedBy || user?.name || 'Staff User',
          reason: `Transfer In from ${phc?.centerName || 'source facility'}. ${txReason}`,
          remarks: txRemarks,
          dateTime: txDateTime || new Date().toISOString()
        });
      }

      const typeLabel: Record<string, string> = {
        'Stock In': 'Stock received',
        'Dispense': 'Dispensed to patient',
        'Transfer Out': 'Transfer Out recorded',
        'Transfer In': 'Transfer In recorded',
        'Expired': 'Expired batch removed',
        'Damaged': 'Damaged stock removed',
        'Adjustment': 'Stock adjusted'
      };
      triggerToast(`✓ ${typeLabel[txType] || 'Transaction recorded'} — ${Math.abs(finalQty)} units of ${med?.medicineName || 'medicine'}.`);
      setShowTxModal(false);
    } catch (err: any) {
      triggerToast(err.message || 'Transaction failed.');
    }
  };


  // Approve a smart transfer request
  const handleApproveTransfer = async (requestId: string) => {
    try {
      await approveTransfer(requestId, user?.uid || 'admin', user?.name || 'District Admin');
      triggerToast("Redistribution transfer approved! Inventory quantities recalculated.");
    } catch (err: any) {
      triggerToast(err.message || "Failed to approve transfer.");
    }
  };

  // Reject/Archive transfer recommendation
  const handleRejectTransfer = async (requestId: string) => {
    try {
      await rejectTransfer(requestId);
      triggerToast("Transfer request archived.");
    } catch (err: any) {
      triggerToast("Archival failed.");
    }
  };

  // Export current list to CSV
  const handleCSVExport = () => {
    const headers = [
      'Medicine Name,Generic Name,Form,Category,PHC Name,Batch Number,Expiry Date,Current Stock,Supplier'
    ];
    const rows = filteredStocks.map(s => {
      const med = medicines.find(m => m.medicineId === s.medicineId);
      const phc = centers.find(c => c.centerId === s.phcId);
      return [
        `"${med?.medicineName || ''}"`,
        `"${med?.genericName || ''}"`,
        med?.form || '',
        med?.category || '',
        `"${phc?.centerName || 'District'}"`,
        s.batchNumber,
        s.expiryDate,
        s.currentQuantity,
        `"${s.supplier}"`
      ].join(',');
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Medicine_Inventory_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    triggerToast("CSV Download generated.");
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 leading-none flex items-center gap-2">
            <Boxes className="h-6.5 w-6.5 text-brand-blue" />
            AI Supply Chain & Medicine Inventory
          </h2>
          <p className="text-sm text-slate-500 mt-1.5">
            Monitor stocks across blocks, predict inventory depletions, and coordinate inter-facility redistribution.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCSVExport}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-55 text-slate-650 font-bold text-xs rounded-xl transition-all shadow-sm"
          >
            <Download className="h-4 w-4" />
            CSV Report
          </button>
          
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-55 text-slate-650 font-bold text-xs rounded-xl transition-all shadow-sm"
          >
            <Printer className="h-4 w-4" />
            Print
          </button>

          {/* Add Batch Button */}
          <button
            onClick={() => setShowAddBatchModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-brand-blue hover:bg-brand-darkBlue text-white font-bold text-xs rounded-xl transition-all shadow"
          >
            <Plus className="h-4 w-4" />
            Add Batch Stock
          </button>
        </div>
      </div>

      {/* Summary counters section */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { label: 'Total Medicines', val: summary.totalMeds, color: 'text-brand-blue bg-blue-50' },
          { label: 'Total Stock units', val: summary.totalStockQty, color: 'text-slate-700 bg-slate-50' },
          { label: 'Low Stock Alerts', val: summary.lowStockCount, color: 'text-brand-orange bg-orange-50' },
          { label: 'Expiring 30 Days', val: summary.expiringSoonCount, color: 'text-purple-700 bg-purple-55' },
          { label: 'Expired Batches', val: summary.expiredCount, color: 'text-red-750 bg-red-105' },
          { label: 'Today\'s Movements', val: summary.todayMovement, color: 'text-emerald-700 bg-emerald-50' }
        ].map((item, i) => (
          <div key={i} className="bg-white border rounded-apex p-4 flex flex-col justify-between shadow-apex-sm">
            <span className="text-[9.5px] uppercase font-bold text-slate-400 block">{item.label}</span>
            <span className={`text-xl font-extrabold mt-2.5 px-3 py-0.5 rounded-xl self-start ${item.color}`}>
              {item.val}
            </span>
          </div>
        ))}
      </div>

      {/* Core Tab Switch Panel */}
      <div className="flex border-b border-slate-200 no-print overflow-x-auto">
        {[
          { id: 'overview', label: 'Inventory Directory' },
          { id: 'history', label: 'Transaction History' },
          { id: 'reorder', label: 'Smart Reorder List' },
          { id: 'transfers', label: 'AI Redistribute Transfers' },
          { id: 'master', label: 'Master Medicine Index' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-5 py-3 text-xs font-bold transition-all border-b-2 -mb-[2px] whitespace-nowrap ${
              activeTab === tab.id
                ? 'border-brand-blue text-brand-blue font-extrabold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 1. OVERVIEW TABS */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Advanced Search & Filtering Controls */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-white p-4 border border-slate-200 rounded-apex shadow-apex-sm no-print">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search name, batch, supplier..."
                className="w-full pl-9 pr-4 py-2.5 text-xs bg-slate-55 border border-slate-200 rounded-xl focus:bg-white focus:outline-none text-slate-850"
              />
            </div>

            {/* PHC Filter (Admins only) */}
            <div className="flex items-center gap-1">
              <Building2 className="h-4.5 w-4.5 text-slate-400 shrink-0" />
              <select
                value={phcFilter}
                disabled={user?.role === 'PHC Staff' || user?.role === 'CHC Staff'}
                onChange={(e) => setPhcFilter(e.target.value)}
                className="w-full bg-slate-55 border border-slate-200 text-xs font-semibold text-slate-700 rounded-xl px-3 py-2 cursor-pointer focus:outline-none disabled:bg-slate-100 disabled:cursor-not-allowed"
              >
                <option value="all">All Facilities</option>
                {centers.map(c => (
                  <option key={c.centerId} value={c.centerId}>{c.centerName}</option>
                ))}
              </select>
            </div>

            {/* Category Filter */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-slate-55 border border-slate-200 text-xs font-semibold text-slate-700 rounded-xl px-3 py-2 cursor-pointer focus:outline-none"
            >
              <option value="all">All Categories</option>
              <option value="Analgesics">Analgesics</option>
              <option value="Antibiotics">Antibiotics</option>
              <option value="Rehydration">Rehydration</option>
              <option value="Antidiabetics">Antidiabetics</option>
              <option value="Antihypertensives">Antihypertensives</option>
            </select>

            {/* Stock Status Alert filter */}
            <select
              value={stockStatusFilter}
              onChange={(e) => setStockStatusFilter(e.target.value)}
              className="bg-slate-55 border border-slate-200 text-xs font-semibold text-slate-700 rounded-xl px-3 py-2 cursor-pointer focus:outline-none"
            >
              <option value="all">All Stock Statuses</option>
              <option value="Low">Low Stock Level</option>
              <option value="Out">Out Of Stock</option>
              <option value="Expiring">Expiring In 30 Days</option>
              <option value="Expired">Expired Batches</option>
            </select>
          </div>

          {/* Visual Analytics Block */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 no-print">
            <div className="lg:col-span-2 bg-white border border-slate-200 rounded-apex p-6 shadow-apex-sm">
              <h3 className="font-bold text-xs text-slate-400 uppercase tracking-wider mb-4">Stock Levels vs Threshold</h3>
              <StatChart
                data={chartData.slice(0, 10)}
                xKey="name"
                series={[
                  { key: 'Min Threshold', name: 'Min Threshold', color: '#F57C00', type: 'line' },
                  { key: 'Current Stock', name: 'Current Stock', color: '#1F5FBF', type: 'bar' }
                ]}
                chartType="bar"
                height={260}
              />
            </div>

            <div className="bg-white border border-slate-200 rounded-apex p-6 shadow-apex-sm flex flex-col justify-between">
              <div>
                <h3 className="font-bold text-xs text-slate-400 uppercase tracking-wider mb-4">Reorder Urgency Summary</h3>
                <div className="space-y-4 text-xs font-medium">
                  <div className="flex justify-between items-center pb-2 border-b">
                    <span className="text-slate-500">Critical (Out of Stock)</span>
                    <span className="font-bold text-red-750">{filteredStocks.filter(s => s.currentQuantity === 0).length} items</span>
                  </div>
                  <div className="flex justify-between items-center pb-2 border-b">
                    <span className="text-slate-500">Warning (Below Min Level)</span>
                    <span className="font-bold text-brand-orange">
                      {filteredStocks.filter(s => {
                        const med = medicines.find(m => m.medicineId === s.medicineId);
                        return med && s.currentQuantity < med.minStockLevel && s.currentQuantity > 0;
                      }).length} items
                    </span>
                  </div>
                  <div className="flex justify-between items-center pb-2 border-b">
                    <span className="text-slate-500">Expiring soon</span>
                    <span className="font-bold text-purple-700">{summary.expiringSoonCount} batches</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t text-center">
                <button
                  onClick={() => setActiveTab('reorder')}
                  className="w-full flex items-center justify-center gap-1.5 py-2 bg-slate-50 border hover:bg-slate-100 text-slate-700 font-bold rounded-xl text-xs"
                >
                  Configure AI Smart Reorder
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Master Stock Table */}
          <div className="bg-white border border-slate-200 rounded-apex shadow-apex-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50 text-slate-500 uppercase font-bold tracking-wider">
                    <th className="py-3.5 px-6">Medicine Description</th>
                    <th className="py-3.5 px-6">Generic Name</th>
                    <th className="py-3.5 px-6">Health Center</th>
                    <th className="py-3.5 px-6">Batch No</th>
                    <th className="py-3.5 px-6">Expiry Date</th>
                    <th className="py-3.5 px-6 text-center">Current Quantity</th>
                    <th className="py-3.5 px-6 text-center">Status</th>
                    <th className="py-3.5 px-6 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredStocks.map((s) => {
                    const med = medicines.find(m => m.medicineId === s.medicineId);
                    const phc = centers.find(c => c.centerId === s.phcId);
                    if (!med) return null;

                    const isExpired = new Date(s.expiryDate) < new Date();
                    const isExpiringSoon = !isExpired && new Date(s.expiryDate) <= new Date(Date.now() + 30 * 24 * 3600000);
                    const isLowStock = s.currentQuantity < med.minStockLevel && s.currentQuantity > 0;
                    const isOutOfStock = s.currentQuantity === 0;

                    return (
                      <tr key={s.stockId} className="hover:bg-slate-50/30">
                        {/* Name + Brand */}
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-2">
                            <div className="p-2 bg-brand-blue/10 text-brand-blue rounded-lg">
                              <Pill className="h-4.5 w-4.5" />
                            </div>
                            <div>
                              <span className="font-bold text-slate-800 block text-[12px]">{med.medicineName}</span>
                              <span className="text-[10px] text-slate-400 block">Brand: {med.brandName} • {med.strength}</span>
                            </div>
                          </div>
                        </td>

                        {/* Generic Name */}
                        <td className="py-4 px-6 text-slate-550 font-medium">
                          {med.genericName}
                        </td>

                        {/* PHC */}
                        <td className="py-4 px-6 font-semibold text-slate-700">
                          {phc?.centerName || 'District Inventory'}
                        </td>

                        {/* Batch */}
                        <td className="py-4 px-6 font-mono text-slate-650 font-bold">
                          {s.batchNumber}
                        </td>

                        {/* Expiry */}
                        <td className="py-4 px-6">
                          <span className={`font-semibold ${isExpired ? 'text-red-750 font-extrabold' : isExpiringSoon ? 'text-purple-700 font-extrabold' : 'text-slate-600'}`}>
                            {s.expiryDate}
                          </span>
                        </td>

                        {/* Qty */}
                        <td className="py-4 px-6 text-center font-bold text-slate-800 text-[12.5px]">
                          {s.currentQuantity} <span className="text-[9px] text-slate-400 block font-normal">{med.packSize.split(' ')[1] || 'Units'}</span>
                        </td>

                        {/* Status Badge */}
                        <td className="py-4 px-6 text-center">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full font-bold text-[9px] uppercase ${
                            isOutOfStock
                              ? 'bg-red-105 text-red-750 border border-red-200'
                              : isLowStock
                              ? 'bg-orange-50 text-brand-orange border border-orange-100'
                              : isExpired
                              ? 'bg-red-50 text-red-700'
                              : isExpiringSoon
                              ? 'bg-purple-50 text-purple-700'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                          }`}>
                            {isOutOfStock ? 'Out Of Stock' : isExpired ? 'Expired' : isExpiringSoon ? 'Expiring soon' : isLowStock ? 'Low Stock' : 'Good'}
                          </span>
                        </td>

                        {/* Action Buttons — all transaction types */}
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-center gap-1 flex-wrap">
                            <button
                              onClick={() => navigate(`/medicine/${med.medicineId}`)}
                              className="px-2 py-1 bg-slate-50 border hover:bg-slate-100 font-bold text-[9.5px] rounded-lg text-slate-650"
                            >
                              Inspect
                            </button>
                            <button
                              onClick={() => openTxModal(s.stockId, 'Stock In')}
                              className="px-2 py-1 bg-blue-50 border border-blue-200 hover:bg-blue-100 font-bold text-[9.5px] rounded-lg text-brand-blue"
                              title="Stock In"
                            >
                              + Stock In
                            </button>
                            <button
                              onClick={() => openTxModal(s.stockId, 'Dispense')}
                              disabled={s.currentQuantity === 0}
                              className="px-2 py-1 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 font-bold text-[9.5px] rounded-lg text-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed"
                              title="Dispense to patient"
                            >
                              Dispense
                            </button>
                            <button
                              onClick={() => openTxModal(s.stockId, 'Transfer Out')}
                              disabled={s.currentQuantity === 0}
                              className="px-2 py-1 bg-orange-50 border border-orange-200 hover:bg-orange-100 font-bold text-[9.5px] rounded-lg text-brand-orange disabled:opacity-40 disabled:cursor-not-allowed"
                              title="Transfer to another facility"
                            >
                              Transfer
                            </button>
                            <button
                              onClick={() => openTxModal(s.stockId, 'Expired')}
                              disabled={s.currentQuantity === 0}
                              className="px-2 py-1 bg-red-50 border border-red-200 hover:bg-red-100 font-bold text-[9.5px] rounded-lg text-red-700 disabled:opacity-40 disabled:cursor-not-allowed"
                              title="Mark as Expired"
                            >
                              Expired
                            </button>
                            <button
                              onClick={() => openTxModal(s.stockId, 'Damaged')}
                              disabled={s.currentQuantity === 0}
                              className="px-2 py-1 bg-red-50 border border-red-200 hover:bg-red-100 font-bold text-[9.5px] rounded-lg text-red-700 disabled:opacity-40 disabled:cursor-not-allowed"
                              title="Mark as Damaged"
                            >
                              Damaged
                            </button>
                            <button
                              onClick={() => openTxModal(s.stockId, 'Adjustment')}
                              className="px-2 py-1 bg-slate-100 border hover:bg-slate-200 font-bold text-[9.5px] rounded-lg text-slate-600"
                              title="Stock Adjustment"
                            >
                              Adjust
                            </button>
                          </div>
                        </td>

                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 2. TRANSACTION HISTORY TAB */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          {/* Info banner */}
          <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-xl flex gap-3 items-start">
            <FileSpreadsheet className="h-5 w-5 text-indigo-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-extrabold text-xs uppercase tracking-wider text-indigo-700 mb-0.5">
                Complete Transaction Audit Log
              </h4>
              <p className="text-xs text-indigo-700/80 leading-relaxed">
                Every stock movement is recorded here — Stock In, Dispense, Transfer, Expired, Damaged, and Adjustments. Stock is never directly overwritten; it is always calculated from this log.
              </p>
            </div>
          </div>

          {/* Search */}
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={historySearch}
              onChange={e => setHistorySearch(e.target.value)}
              placeholder="Search medicine, batch, user, PHC..."
              className="w-full pl-9 pr-4 py-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none"
            />
          </div>

          {/* Transaction Table */}
          <div className="bg-white border border-slate-200 rounded-apex shadow-apex-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/60 text-slate-500 uppercase font-bold tracking-wider">
                    <th className="py-3 px-4">Date & Time</th>
                    <th className="py-3 px-4">Medicine</th>
                    <th className="py-3 px-4">Batch No</th>
                    <th className="py-3 px-4 text-center">Transaction Type</th>
                    <th className="py-3 px-4 text-center">Qty</th>
                    <th className="py-3 px-4">PHC / Facility</th>
                    <th className="py-3 px-4">Performed By</th>
                    <th className="py-3 px-4">Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {[...transactions]
                    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
                    .filter(t => {
                      if (!historySearch) return true;
                      const q = historySearch.toLowerCase();
                      const med = medicines.find(m => m.medicineId === t.medicineId);
                      const phc = centers.find(c => c.centerId === t.phcId);
                      return (
                        (med?.medicineName || t.medicineName || '').toLowerCase().includes(q) ||
                        (t.batchNumber || '').toLowerCase().includes(q) ||
                        (t.userName || '').toLowerCase().includes(q) ||
                        (t.performedBy || '').toLowerCase().includes(q) ||
                        (phc?.centerName || t.phcName || '').toLowerCase().includes(q) ||
                        (t.reason || '').toLowerCase().includes(q) ||
                        t.type.toLowerCase().includes(q)
                      );
                    })
                    .slice(0, 100)
                    .map((t, idx) => {
                      const med = medicines.find(m => m.medicineId === t.medicineId);
                      const phc = centers.find(c => c.centerId === t.phcId);
                      const dtStr = t.dateTime || t.timestamp;
                      const dateObj = new Date(dtStr);
                      const datePart = dateObj.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
                      const timePart = dateObj.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

                      const typeColors: Record<string, string> = {
                        'Stock In':    'bg-blue-50 text-brand-blue border border-blue-200',
                        'Dispense':    'bg-emerald-50 text-emerald-700 border border-emerald-200',
                        'Transfer In': 'bg-cyan-50 text-cyan-700 border border-cyan-200',
                        'Transfer Out':'bg-orange-50 text-brand-orange border border-orange-200',
                        'Expired':     'bg-red-50 text-red-700 border border-red-200',
                        'Damaged':     'bg-rose-50 text-rose-700 border border-rose-200',
                        'Adjustment':  'bg-slate-100 text-slate-600 border border-slate-200',
                        'Stock Out':   'bg-amber-50 text-amber-700 border border-amber-200',
                        'Returned':    'bg-teal-50 text-teal-700 border border-teal-200',
                      };

                      const isAdditive = ['Stock In', 'Transfer In', 'Returned'].includes(t.type) ||
                        (t.type === 'Adjustment' && t.quantity > 0);

                      return (
                        <tr key={idx} className="hover:bg-slate-50/40">
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span className="font-semibold text-slate-700 block">{datePart}</span>
                            <span className="text-slate-400 text-[10px]">{timePart}</span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-bold text-slate-800">{med?.medicineName || t.medicineName || '—'}</span>
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-500 text-[10.5px]">
                            {t.batchNumber || '—'}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className={`inline-block px-2 py-0.5 rounded-full font-bold text-[9px] uppercase whitespace-nowrap ${typeColors[t.type] || 'bg-slate-100 text-slate-500'}`}>
                              {t.type}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className={`font-extrabold text-sm ${isAdditive ? 'text-emerald-700' : 'text-red-700'}`}>
                              {isAdditive ? '+' : '-'}{Math.abs(t.quantity)}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-semibold text-slate-700">
                            {phc?.centerName || t.phcName || '—'}
                          </td>
                          <td className="py-3 px-4 text-slate-600">
                            {t.performedBy || t.userName || '—'}
                          </td>
                          <td className="py-3 px-4 text-slate-500 max-w-[200px] truncate" title={t.reason}>
                            {t.reason || '—'}
                          </td>
                        </tr>
                      );
                    })}

                  {transactions.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-10 text-center text-slate-400 font-bold">
                        No transactions recorded yet. Use the action buttons on the Inventory Directory to record movements.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {transactions.length > 100 && (
              <div className="px-6 py-3 border-t text-xs text-slate-400 font-medium">
                Showing latest 100 of {transactions.length} transactions.
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. SMART REORDER LIST TABS */}
      {activeTab === 'reorder' && (
        <div className="space-y-6">
          <div className="p-4 bg-orange-50 border border-orange-200 rounded-xl flex gap-3">
            <Sparkles className="h-5 w-5 text-brand-orange shrink-0 mt-0.5" />
            <div>
              <h4 className="font-extrabold text-xs uppercase tracking-wider text-brand-orange mb-0.5">AI Reorder Forecasting</h4>
              <p className="text-xs text-orange-850 leading-relaxed">
                Smart recommendations evaluate active thresholds to calculate optimal order sizes. Distributing orders early prevents supply-chain depletion during monsoons.
              </p>
            </div>
          </div>

          <div className="bg-white border rounded-apex overflow-hidden shadow-apex-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50 text-slate-500 uppercase font-bold tracking-wider">
                    <th className="py-3.5 px-6">Medicine Description</th>
                    <th className="py-3.5 px-6">Health Center</th>
                    <th className="py-3.5 px-6 text-center">Current Quantity</th>
                    <th className="py-3.5 px-6 text-center">Min Threshold</th>
                    <th className="py-3.5 px-6 text-center">Recommended Purchase Qty</th>
                    <th className="py-3.5 px-6 text-center">AI Suggested Supplier</th>
                    <th className="py-3.5 px-6 text-center">Priority</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {reorderRecommendations.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/30">
                      <td className="py-4 px-6 font-bold text-slate-800">{item.medicine.medicineName}</td>
                      <td className="py-4 px-6 font-semibold text-slate-700">
                        {centers.find(c => c.centerId === item.stock.phcId)?.centerName || 'PHC Node'}
                      </td>
                      <td className="py-4 px-6 text-center font-bold text-slate-800">{item.stock.currentQuantity}</td>
                      <td className="py-4 px-6 text-center text-slate-500">{item.medicine.minStockLevel}</td>
                      <td className="py-4 px-6 text-center text-brand-blue font-extrabold text-[12px] bg-blue-50/20">
                        +{item.recommendQty} <span className="text-[10px] text-slate-400 block font-normal">Est. Order Tomorrow</span>
                      </td>
                      <td className="py-4 px-6 text-center font-medium text-slate-650">{item.supplier}</td>
                      <td className="py-4 px-6 text-center">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full font-bold text-[9px] uppercase ${
                          item.priority === 'Critical'
                            ? 'bg-red-105 text-red-750'
                            : item.priority === 'High'
                            ? 'bg-orange-50 text-brand-orange'
                            : 'bg-yellow-50 text-yellow-750'
                        }`}>
                          {item.priority}
                        </span>
                      </td>
                    </tr>
                  ))}

                  {reorderRecommendations.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400 font-bold">
                        All medicine items are currently above reorder levels. No orders required.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 3. SMART TRANSFERS TABS */}
      {activeTab === 'transfers' && (
        <div className="space-y-6">
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl flex gap-3">
            <Sparkles className="h-5 w-5 text-brand-blue shrink-0 mt-0.5 animate-pulse" />
            <div>
              <h4 className="font-extrabold text-xs uppercase tracking-wider text-brand-blue mb-0.5">AI Smart Redistribution Orders</h4>
              <p className="text-xs text-blue-850 leading-relaxed">
                Rather than executing expensive new orders, Gemini analyzes adjacent health center nodes to locate surplus stocks (stock above max capacity threshold) and suggests instant redistribution transfers.
              </p>
            </div>
          </div>

          {/* Pending Transfer Approvals Section */}
          <div className="bg-white border rounded-apex p-6 shadow-apex-sm space-y-4">
            <h3 className="font-extrabold text-sm text-slate-800 uppercase tracking-wider pb-2 border-b flex items-center gap-1.5">
              <Truck className="h-4.5 w-4.5 text-brand-blue" />
              Redistribution Orders Registry
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b text-slate-500 font-bold uppercase tracking-wider pb-2">
                    <th className="py-2.5">Medicine</th>
                    <th className="py-2.5">Source (Surplus Node)</th>
                    <th className="py-2.5">Target (Deficit Node)</th>
                    <th className="py-2.5 text-center">Transfer Qty</th>
                    <th className="py-2.5 text-center">Distance</th>
                    <th className="py-2.5 text-center">Status</th>
                    <th className="py-2.5 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {transfers.map((req, idx) => {
                    const med = medicines.find(m => m.medicineId === req.medicineId);
                    return (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="py-3 font-bold text-slate-800">{med?.medicineName || 'Unknown'}</td>
                        <td className="py-3 font-semibold text-emerald-700">{req.sourcePhcName}</td>
                        <td className="py-3 font-semibold text-red-750">{req.targetPhcName}</td>
                        <td className="py-3 text-center font-extrabold text-brand-blue">{req.quantity} units</td>
                        <td className="py-3 text-center font-mono text-slate-450">{req.distance} km</td>
                        <td className="py-3 text-center">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full font-bold text-[9px] uppercase ${
                            req.status === 'Completed'
                              ? 'bg-emerald-50 text-emerald-700'
                              : req.status === 'Pending'
                              ? 'bg-yellow-50 text-yellow-750'
                              : 'bg-red-50 text-red-700'
                          }`}>
                            {req.status}
                          </span>
                        </td>
                        <td className="py-3 text-center">
                          {req.status === 'Pending' && user?.role === 'District Health Administrator' ? (
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => handleApproveTransfer(req.requestId)}
                                className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-[10px] rounded-lg shadow-sm"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleRejectTransfer(req.requestId)}
                                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-650 font-bold text-[10px] rounded-lg"
                              >
                                Reject
                              </button>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}

                  {transfers.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-6 text-center text-slate-400 font-bold">
                        No active redistribution request logs.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* AI Redistribution Transfer Recommendations Grid */}
          <div className="bg-white border rounded-apex p-6 shadow-apex-sm space-y-4">
            <h3 className="font-extrabold text-sm text-slate-800 uppercase tracking-wider pb-2 border-b flex items-center gap-1.5">
              <Sparkles className="h-4.5 w-4.5 text-brand-orange animate-pulse" />
              AI Recommendations (Propose Transfers)
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {transferRecommendations.map((rec, idx) => (
                <div key={idx} className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between items-start">
                      <span className="font-bold text-slate-800 block text-sm">{rec.medicine.medicineName}</span>
                      <span className="text-[9.5px] uppercase font-bold px-2 py-0.5 rounded bg-brand-orange/10 text-brand-orange">
                        {rec.distance} km away
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-xs font-semibold text-slate-600">
                      <div>
                        <span className="text-[10px] text-slate-400 block">SOURCE (SURPLUS)</span>
                        <span className="text-emerald-700">{rec.sourcePhcName}</span>
                        <span className="text-slate-450 block font-normal">Stock: {rec.surplusQty}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">TARGET (DEFICIT)</span>
                        <span className="text-red-750">{rec.targetPhcName}</span>
                        <span className="text-slate-450 block font-normal">Stock: {rec.deficitQty}</span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-500 leading-relaxed bg-white border border-slate-100 p-2.5 rounded-xl">
                      {rec.reason}
                    </p>
                  </div>

                  <div className="flex items-center justify-between border-t pt-3 mt-2">
                    <span className="text-xs font-extrabold text-brand-blue">
                      Suggested: {rec.recommendQty} units
                    </span>
                    
                    {user?.role === 'District Health Administrator' ? (
                      <button
                        onClick={async () => {
                          await requestTransfer(
                            rec.medicine.medicineId,
                            rec.sourcePhcId,
                            rec.sourcePhcName,
                            rec.targetPhcId,
                            rec.targetPhcName,
                            rec.recommendQty,
                            rec.distance,
                            rec.reason
                          );
                          triggerToast("Redistribution request proposed successfully!");
                        }}
                        className="flex items-center gap-1 px-3 py-1.5 bg-brand-blue hover:bg-brand-darkBlue text-white font-bold text-[10px] rounded-lg shadow-sm"
                      >
                        Propose Transfer
                      </button>
                    ) : (
                      <span className="text-[10px] text-slate-400 italic">Read-only view</span>
                    )}
                  </div>
                </div>
              ))}

              {transferRecommendations.length === 0 && (
                <div className="col-span-full py-8 text-center text-slate-400 font-bold border-2 border-dashed border-slate-200 rounded-xl">
                  AI logistics finds no matching surplus/deficit reallocations.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 4. MASTER CATALOGUE TABS */}
      {activeTab === 'master' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center border-b pb-3.5">
            <h3 className="font-extrabold text-sm text-slate-800 uppercase tracking-wider">Master Medicine Registry Index</h3>
            {user?.role === 'District Health Administrator' && (
              <button
                onClick={() => setShowAddMedicineModal(true)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-brand-blue hover:bg-brand-darkBlue text-white font-bold text-xs rounded-xl shadow"
              >
                <Plus className="h-4 w-4" />
                Register New Medicine
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {medicines.map(med => (
              <div key={med.medicineId} className="bg-white border rounded-apex p-5 shadow-apex-sm space-y-3 relative overflow-hidden group">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-500">
                    {med.category}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">{med.strength}</span>
                </div>

                <div>
                  <h4 className="font-extrabold text-slate-850 text-sm block">{med.medicineName}</h4>
                  <span className="text-[10.5px] font-medium text-slate-400 block italic">Generic: {med.genericName}</span>
                </div>

                <div className="pt-2.5 border-t text-xs text-slate-500 space-y-1.5 font-medium">
                  <div className="flex justify-between">
                    <span>Manufacturer</span>
                    <span className="text-slate-700 font-bold">{med.manufacturer}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Min/Max stock range</span>
                    <span className="text-slate-750 font-bold">{med.minStockLevel} - {med.maxStockLevel} units</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Form / Pack Size</span>
                    <span className="text-slate-700 font-bold">{med.form} / {med.packSize}</span>
                  </div>
                </div>

                <button
                  onClick={() => navigate(`/medicine/${med.medicineId}`)}
                  className="w-full mt-3 flex items-center justify-center gap-1 py-2 bg-slate-50 border hover:bg-slate-100 text-slate-750 font-bold text-[10.5px] rounded-xl transition-all"
                >
                  Inspect Stock Analytics
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL: ADD BATCH STOCK */}
      {showAddBatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white border rounded-apex shadow-apex p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-base text-slate-800">Add Stock Batch</h3>
              <button onClick={() => setShowAddBatchModal(false)} className="p-1 hover:bg-slate-100 rounded-lg text-slate-400">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddBatchSubmit} className="space-y-4 text-xs font-semibold">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-slate-500 block">Select Medicine</label>
                  <select
                    value={newBatchMedId}
                    onChange={(e) => setNewBatchMedId(e.target.value)}
                    className="w-full border rounded-xl px-2.5 py-2 cursor-pointer focus:outline-none"
                  >
                    {medicines.map(m => (
                      <option key={m.medicineId} value={m.medicineId}>{m.medicineName}</option>
                    ))}
                  </select>
                </div>

                {user?.role === 'District Health Administrator' ? (
                  <div className="space-y-1">
                    <label className="text-slate-500 block">Select Facility Target</label>
                    <select
                      value={newBatchPhcId}
                      onChange={(e) => setNewBatchPhcId(e.target.value)}
                      className="w-full border rounded-xl px-2.5 py-2 cursor-pointer focus:outline-none"
                    >
                      {centers.map(c => (
                        <option key={c.centerId} value={c.centerId}>{c.centerName}</option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <label className="text-slate-500 block">Assigned PHC Target</label>
                    <input
                      type="text"
                      disabled
                      value={centers.find(c => c.centerId === user?.phcId)?.centerName || 'Assigned Center'}
                      className="w-full px-3 py-2 border rounded-xl bg-slate-100 cursor-not-allowed text-slate-500"
                    />
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-slate-500 block">Batch Number</label>
                  <input
                    type="text"
                    required
                    value={newBatchNum}
                    onChange={(e) => setNewBatchNum(e.target.value)}
                    placeholder="e.g. B-PARA-24"
                    className="w-full px-3 py-2 border rounded-xl focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-500 block">Expiry Date</label>
                  <input
                    type="date"
                    required
                    value={newBatchExpiry}
                    onChange={(e) => setNewBatchExpiry(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-500 block">Batch Stock Quantity</label>
                  <input
                    type="number"
                    required
                    value={newBatchQty}
                    onChange={(e) => setNewBatchQty(Number(e.target.value))}
                    className="w-full px-3 py-2 border rounded-xl focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-500 block">Supplier Name</label>
                  <input
                    type="text"
                    required
                    value={newBatchSupplier}
                    onChange={(e) => setNewBatchSupplier(e.target.value)}
                    placeholder="Meghalaya Medical Supplies Co."
                    className="w-full px-3 py-2 border rounded-xl focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-500 block">Purchase Price per unit (INR)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={newBatchPrice}
                    onChange={(e) => setNewBatchPrice(Number(e.target.value))}
                    className="w-full px-3 py-2 border rounded-xl focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-4 border-t flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddBatchModal(false)}
                  className="px-4 py-2 border rounded-xl hover:bg-slate-50 text-slate-650 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-brand-blue hover:bg-brand-darkBlue text-white font-bold rounded-xl shadow"
                >
                  Load Batch to Inventory
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD MASTER MEDICINE */}
      {showAddMedicineModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="w-full max-w-2xl bg-white border rounded-apex shadow-apex p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-base text-slate-800">Register Master Medicine</h3>
              <button onClick={() => setShowAddMedicineModal(false)} className="p-1 hover:bg-slate-100 rounded-lg text-slate-400">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddMedicineSubmit} className="space-y-4 text-xs font-semibold">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-slate-500 block">Medicine Name</label>
                  <input
                    type="text"
                    required
                    value={newMedName}
                    onChange={(e) => setNewMedName(e.target.value)}
                    placeholder="e.g. Cetirizine 10mg"
                    className="w-full px-3 py-2 border rounded-xl focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-500 block">Generic Chemical Name</label>
                  <input
                    type="text"
                    required
                    value={newMedGenName}
                    onChange={(e) => setNewMedGenName(e.target.value)}
                    placeholder="e.g. Cetirizine Dihydrochloride"
                    className="w-full px-3 py-2 border rounded-xl focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-500 block">Brand Name</label>
                  <input
                    type="text"
                    required
                    value={newMedBrandName}
                    onChange={(e) => setNewMedBrandName(e.target.value)}
                    placeholder="e.g. Zyrtec"
                    className="w-full px-3 py-2 border rounded-xl focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-500 block">Category</label>
                  <select
                    value={newMedCategory}
                    onChange={(e) => setNewMedCategory(e.target.value)}
                    className="w-full border rounded-xl px-2.5 py-2 cursor-pointer focus:outline-none"
                  >
                    <option value="Analgesics">Analgesics</option>
                    <option value="Antibiotics">Antibiotics</option>
                    <option value="Rehydration">Rehydration</option>
                    <option value="Antidiabetics">Antidiabetics</option>
                    <option value="Antihypertensives">Antihypertensives</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-500 block">Form Type</label>
                  <select
                    value={newMedForm}
                    onChange={(e) => setNewMedForm(e.target.value as any)}
                    className="w-full border rounded-xl px-2.5 py-2 cursor-pointer focus:outline-none"
                  >
                    <option value="Tablet">Tablet</option>
                    <option value="Capsule">Capsule</option>
                    <option value="Injection">Injection</option>
                    <option value="Syrup">Syrup</option>
                    <option value="Cream">Cream</option>
                    <option value="Drops">Drops</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-500 block">Manufacturer</label>
                  <input
                    type="text"
                    required
                    value={newMedMfg}
                    onChange={(e) => setNewMedMfg(e.target.value)}
                    placeholder="e.g. Cipla Ltd."
                    className="w-full px-3 py-2 border rounded-xl focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-500 block">Strength</label>
                  <input
                    type="text"
                    required
                    value={newMedStrength}
                    onChange={(e) => setNewMedStrength(e.target.value)}
                    placeholder="e.g. 10mg"
                    className="w-full px-3 py-2 border rounded-xl focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-500 block">Pack Size</label>
                  <input
                    type="text"
                    required
                    value={newMedPackSize}
                    onChange={(e) => setNewMedPackSize(e.target.value)}
                    placeholder="e.g. 10x10 Tablets"
                    className="w-full px-3 py-2 border rounded-xl focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-500 block">Min Stock level</label>
                  <input
                    type="number"
                    value={newMedMin}
                    onChange={(e) => setNewMedMin(Number(e.target.value))}
                    className="w-full px-3 py-2 border rounded-xl focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-500 block">Max Stock level</label>
                  <input
                    type="number"
                    value={newMedMax}
                    onChange={(e) => setNewMedMax(Number(e.target.value))}
                    className="w-full px-3 py-2 border rounded-xl focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-500 block">Reorder stock level</label>
                  <input
                    type="number"
                    value={newMedReorder}
                    onChange={(e) => setNewMedReorder(Number(e.target.value))}
                    className="w-full px-3 py-2 border rounded-xl focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-500 block">Storage Temperature requirement</label>
                  <input
                    type="text"
                    value={newMedTemp}
                    onChange={(e) => setNewMedTemp(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-500 block">Barcode EAN</label>
                  <input
                    type="text"
                    required
                    value={newMedBarcode}
                    onChange={(e) => setNewMedBarcode(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-500 block">Description</label>
                <textarea
                  value={newMedDesc}
                  onChange={(e) => setNewMedDesc(e.target.value)}
                  className="w-full border rounded-xl px-3 py-2 focus:outline-none h-20"
                />
              </div>

              <div className="pt-4 border-t flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddMedicineModal(false)}
                  className="px-4 py-2 border rounded-xl hover:bg-slate-55 text-slate-650 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-brand-blue hover:bg-brand-darkBlue text-white font-bold rounded-xl shadow"
                >
                  Register Master Medicine
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: RECORD TRANSACTION (Unified 7-Type Dialog) */}
      {showTxModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white border rounded-apex shadow-apex p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-base text-slate-800">
                {txType === 'Stock In' ? 'Record Stock In' : 
                 txType === 'Dispense' ? 'Dispense Medicine' : 
                 txType === 'Transfer Out' ? 'Transfer to Facility' : 
                 txType === 'Expired' ? 'Mark Expired' : 
                 txType === 'Damaged' ? 'Mark Damaged' : 
                 'Stock Adjustment'}
              </h3>
              <button onClick={() => setShowTxModal(false)} className="p-1 hover:bg-slate-100 rounded-lg text-slate-400">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleTxSubmit} className="space-y-4 text-xs font-semibold">
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3 rounded-xl border border-slate-100">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase block">Medicine</span>
                  <span className="font-bold text-slate-800">
                    {medicines.find(m => m.medicineId === stocks.find(s => s.stockId === selectedStockId)?.medicineId)?.medicineName}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase block">Batch Number</span>
                  <span className="font-mono text-slate-700">
                    {stocks.find(s => s.stockId === selectedStockId)?.batchNumber}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-slate-500 block">Transaction Type</label>
                  <select
                    value={txType}
                    onChange={(e) => setTxType(e.target.value as any)}
                    className="w-full border rounded-xl px-2.5 py-2 cursor-pointer focus:outline-none"
                  >
                    <option value="Stock In">Stock In (Add)</option>
                    <option value="Dispense">Dispense (Issue to Patient)</option>
                    <option value="Transfer Out">Transfer Out (To another PHC)</option>
                    <option value="Expired">Expired Stock</option>
                    <option value="Damaged">Damaged / Wasted</option>
                    <option value="Adjustment">Audit Adjustment</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-500 block">Quantity</label>
                  {txType === 'Adjustment' ? (
                    <div className="flex gap-2">
                      <select
                        value={txAdjSign}
                        onChange={(e) => setTxAdjSign(e.target.value as any)}
                        className="border rounded-xl px-2.5 py-2 cursor-pointer focus:outline-none w-1/3"
                      >
                        <option value="+">+</option>
                        <option value="-">-</option>
                      </select>
                      <input
                        type="number"
                        min="1"
                        required
                        value={txQty}
                        onChange={(e) => setTxQty(Number(e.target.value))}
                        className="w-2/3 px-3 py-2 border rounded-xl focus:outline-none"
                      />
                    </div>
                  ) : (
                    <input
                      type="number"
                      min="1"
                      required
                      value={txQty}
                      onChange={(e) => setTxQty(Number(e.target.value))}
                      className="w-full px-3 py-2 border rounded-xl focus:outline-none"
                    />
                  )}
                </div>

                {txType === 'Transfer Out' && (
                  <div className="space-y-1 md:col-span-2">
                    <label className="text-slate-500 block">Destination Facility</label>
                    <select
                      value={txTargetPhcId}
                      onChange={(e) => setTxTargetPhcId(e.target.value)}
                      className="w-full border rounded-xl px-2.5 py-2 cursor-pointer focus:outline-none"
                    >
                      {centers.map(c => (
                        <option key={c.centerId} value={c.centerId}>{c.centerName}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="space-y-1 md:col-span-2">
                  <label className="text-slate-500 block">Primary Reason / Note</label>
                  <input
                    type="text"
                    required
                    value={txReason}
                    onChange={(e) => setTxReason(e.target.value)}
                    placeholder="Enter reason for transaction"
                    className="w-full px-3 py-2 border rounded-xl focus:outline-none"
                  />
                </div>

                <div className="space-y-1 md:col-span-2">
                  <label className="text-slate-500 block">Additional Remarks (Optional)</label>
                  <input
                    type="text"
                    value={txRemarks}
                    onChange={(e) => setTxRemarks(e.target.value)}
                    placeholder="Any extra context or reference IDs"
                    className="w-full px-3 py-2 border rounded-xl focus:outline-none bg-slate-50"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-500 block">Performed By</label>
                  <input
                    type="text"
                    required
                    value={txPerformedBy}
                    onChange={(e) => setTxPerformedBy(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl focus:outline-none bg-slate-50"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-500 block">Date & Time</label>
                  <input
                    type="datetime-local"
                    required
                    value={txDateTime}
                    onChange={(e) => setTxDateTime(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl focus:outline-none bg-slate-50"
                  />
                </div>
              </div>

              <div className="pt-4 border-t flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowTxModal(false)}
                  className="px-4 py-2 border rounded-xl hover:bg-slate-50 text-slate-655 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-brand-blue hover:bg-brand-darkBlue text-white font-bold rounded-xl shadow"
                >
                  Confirm Transaction
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MedicineInventoryPage;
