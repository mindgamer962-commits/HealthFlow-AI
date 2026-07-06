import React, { useMemo, useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Pill,
  MapPin,
  Calendar,
  AlertTriangle,
  Activity,
  TrendingUp,
  Sparkles,
  ShieldCheck,
  User,
  Clock,
  ExternalLink,
  PlusCircle,
  Truck,
  Loader2,
  Boxes,
  RefreshCw,
  ArrowLeftRight
} from 'lucide-react';
import { useMedicineStore } from '../../store/medicineStore';
import { usePhcStore } from '../../store/phcStore';
import { useAuthStore } from '../../store/authStore';
import { StatChart } from '../../components/charts/StatChart';

export const MedicineDetailsPage: React.FC = () => {
  const { medicineId } = useParams<{ medicineId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { centers } = usePhcStore();
  const {
    medicines,
    stocks,
    transactions,
    transfers,
    predictions,
    loading,
    runAiStockPrediction,
    requestTransfer
  } = useMedicineStore();

  const [aiLoading, setAiLoading] = useState(false);

  // Load the current master medicine details
  const medicine = useMemo(() => {
    return medicines.find(m => m.medicineId === medicineId);
  }, [medicines, medicineId]);

  // Determine active facility filter depending on user role
  const activePhcId = useMemo(() => {
    if (user?.role === 'PHC Staff' || user?.role === 'CHC Staff') return user.phcId;
    return 'all'; // Admin inspects district-wide stocks
  }, [user]);

  // Filter stocks matching this medicine and user scope
  const medStocks = useMemo(() => {
    return stocks.filter(s => 
      s.medicineId === medicineId && 
      (activePhcId === 'all' ? true : s.phcId === activePhcId)
    );
  }, [stocks, medicineId, activePhcId]);

  // Aggregate quantity units
  const totalStock = useMemo(() => {
    return medStocks.reduce((sum, s) => sum + s.currentQuantity, 0);
  }, [medStocks]);

  // Nearest expiration date check
  const nearestExpiry = useMemo(() => {
    if (medStocks.length === 0) return 'N/A';
    const sorted = [...medStocks].sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());
    return sorted[0].expiryDate;
  }, [medStocks]);

  // Filter transactions matching this medicine and user scope
  const medTransactions = useMemo(() => {
    return transactions
      .filter(t => 
        t.medicineId === medicineId && 
        (activePhcId === 'all' ? true : t.phcId === activePhcId)
      )
      .slice(0, 10); // show top 10 logs
  }, [transactions, medicineId, activePhcId]);

  // Load prediction info from store
  const prediction = useMemo(() => {
    // If Admin, show prediction for first clinic with stock, or defaults
    const phcTargetId = (user?.role === 'PHC Staff' || user?.role === 'CHC Staff') ? user.phcId : (medStocks[0]?.phcId || 'phc-1');
    return predictions.find(p => p.medicineId === medicineId && p.phcId === phcTargetId);
  }, [predictions, medicineId, user, medStocks]);

  // Visual trend charts calculations
  const historyData = useMemo(() => {
    const list = [
      { month: 'Jan', Outflow: 350, Inflow: 400 },
      { month: 'Feb', Outflow: 290, Inflow: 300 },
      { month: 'Mar', Outflow: 410, Inflow: 500 },
      { month: 'Apr', Outflow: 520, Inflow: 200 },
      { month: 'May', Outflow: 480, Inflow: 600 },
      { month: 'Jun', Outflow: 640, Inflow: 450 }
    ];
    return list;
  }, []);

  // Form states for manually proposing transfers (Admin only)
  const [sourcePhcId, setSourcePhcId] = useState('');
  const [targetPhcId, setTargetPhcId] = useState('');
  const [transferQty, setTransferQty] = useState(100);
  const [transferReason, setTransferReason] = useState('');

  // Auto assign defaults on load
  useEffect(() => {
    if (centers.length > 0) {
      setSourcePhcId(centers[0].centerId);
      setTargetPhcId(centers[1]?.centerId || centers[0].centerId);
    }
  }, [centers]);

  const handleRunPrediction = async () => {
    if (!medicine) return;
    setAiLoading(true);
    const targetPhc = (user?.role === 'PHC Staff' ? user.phcId : (medStocks[0]?.phcId || 'phc-1')) || 'phc-1';
    try {
      await runAiStockPrediction(medicine.medicineId, targetPhc);
    } catch (e) {
      console.error(e);
    } finally {
      setAiLoading(false);
    }
  };

  const handleCreateTransferRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!medicine || !sourcePhcId || !targetPhcId) return;

    try {
      const srcName = centers.find(c => c.centerId === sourcePhcId)?.centerName || '';
      const destName = centers.find(c => c.centerId === targetPhcId)?.centerName || '';
      const dist = 12.5; // dummy distance

      await requestTransfer(
        medicine.medicineId,
        sourcePhcId,
        srcName,
        targetPhcId,
        destName,
        Number(transferQty),
        dist,
        transferReason || `Emergency transfer request for ${medicine.medicineName}`
      );

      setTransferReason('');
      alert("Transfer request Proposed successfully!");
    } catch (err: any) {
      alert(err.message || "Failed to create transfer request.");
    }
  };

  if (!medicine) {
    return (
      <div className="py-12 text-center text-slate-500 font-bold text-sm bg-white border rounded-apex p-8">
        Medicine Master details not found in catalog.
        <button onClick={() => navigate('/medicine')} className="block mx-auto mt-4 px-4 py-2 bg-brand-blue text-white rounded-xl text-xs font-bold shadow">
          Back to Inventory
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/medicine')}
            className="p-2 hover:bg-slate-100 rounded-xl text-slate-500 hover:text-slate-800 transition-colors border"
          >
            <ArrowLeft className="h-4.5 w-4.5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs bg-slate-100 text-slate-500 font-extrabold px-2.5 py-0.5 rounded uppercase">
                {medicine.category}
              </span>
              <span className="text-[10px] bg-blue-50 text-brand-blue font-extrabold px-2 py-0.5 rounded-full uppercase">
                {medicine.strength}
              </span>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mt-1">{medicine.medicineName}</h2>
          </div>
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Stats & Batches */}
        <div className="space-y-6 lg:col-span-2">
          
          {/* Summary stats row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white border rounded-apex p-5 shadow-apex-sm flex items-center gap-3">
              <div className="p-3 bg-brand-blue/10 text-brand-blue rounded-xl">
                <Boxes className="h-6 w-6" />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold block uppercase">TOTAL AVAILABLE</span>
                <span className="text-xl font-extrabold text-slate-850">{totalStock} units</span>
              </div>
            </div>

            <div className="bg-white border rounded-apex p-5 shadow-apex-sm flex items-center gap-3">
              <div className="p-3 bg-purple-55 text-purple-700 rounded-xl">
                <Calendar className="h-6 w-6" />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold block uppercase">NEAREST EXPIRY</span>
                <span className="text-sm font-extrabold text-slate-800">{nearestExpiry}</span>
              </div>
            </div>

            <div className="bg-white border rounded-apex p-5 shadow-apex-sm flex items-center gap-3">
              <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold block uppercase">SAFETY SCAN</span>
                <span className="text-sm font-extrabold text-slate-800">
                  {totalStock > medicine.minStockLevel ? 'Adequate' : 'Deficit Alert'}
                </span>
              </div>
            </div>
          </div>

          {/* Master Details Block */}
          <div className="bg-white border border-slate-200 rounded-apex shadow-apex-sm p-6 space-y-4">
            <h3 className="font-extrabold text-sm text-slate-800 uppercase tracking-wider pb-2 border-b">
              Medicine Technical Specifications
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
              <div className="space-y-3 font-semibold text-slate-650">
                <div className="flex justify-between">
                  <span className="text-slate-400">Chemical Formula / Generic</span>
                  <span className="text-slate-800">{medicine.genericName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Brand Designation</span>
                  <span className="text-slate-800">{medicine.brandName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Manufacturer</span>
                  <span className="text-slate-800">{medicine.manufacturer}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Pack Presentation</span>
                  <span className="text-slate-800">{medicine.packSize}</span>
                </div>
              </div>

              <div className="space-y-3 font-semibold text-slate-650">
                <div className="flex justify-between">
                  <span className="text-slate-400">Barcode EAN</span>
                  <span className="text-slate-800 font-mono select-all">{medicine.barcode}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Storage temperature</span>
                  <span className="text-slate-800">{medicine.storageTemp}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Target Min stock level</span>
                  <span className="text-slate-800">{medicine.minStockLevel} units</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Target Max stock level</span>
                  <span className="text-slate-800">{medicine.maxStockLevel} units</span>
                </div>
              </div>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed pt-2 border-t font-medium">
              {medicine.description}
            </p>
          </div>

          {/* Usage History chart */}
          <div className="bg-white border border-slate-200 rounded-apex shadow-apex-sm p-6 space-y-4">
            <h3 className="font-extrabold text-sm text-slate-800 uppercase tracking-wider pb-2 border-b">
              Bi-Monthly Consumption & Shipment trends
            </h3>
            <StatChart
              data={historyData}
              xKey="month"
              series={[
                { key: 'Inflow', name: 'Inward Shipments', color: '#1F5FBF', type: 'bar' },
                { key: 'Outflow', name: 'Dispensed Outflows', color: '#F57C00', type: 'line' }
              ]}
              chartType="line"
              height={220}
            />
          </div>

          {/* Batches Expiries List */}
          <div className="bg-white border border-slate-200 rounded-apex shadow-apex-sm p-6 space-y-4">
            <h3 className="font-extrabold text-sm text-slate-800 uppercase tracking-wider pb-2 border-b">
              Active Inventory Batches
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b text-slate-400 font-bold uppercase tracking-wider pb-2">
                    <th className="py-2.5">Batch Code</th>
                    <th className="py-2.5">Health Center</th>
                    <th className="py-2.5">Expiry Date</th>
                    <th className="py-2.5">Supplier</th>
                    <th className="py-2.5 text-center">Batch Quantity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {medStocks.map((s, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="py-3 font-mono font-bold text-slate-800">{s.batchNumber}</td>
                      <td className="py-3 font-semibold text-slate-700">
                        {centers.find(c => c.centerId === s.phcId)?.centerName || 'PHC Node'}
                      </td>
                      <td className="py-3 font-semibold text-slate-650">{s.expiryDate}</td>
                      <td className="py-3 text-slate-500 font-medium">{s.supplier}</td>
                      <td className="py-3 text-center font-extrabold text-slate-800">{s.currentQuantity} units</td>
                    </tr>
                  ))}

                  {medStocks.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-4 text-center text-slate-400 font-bold">
                        No batch inventories loaded.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column: AI predictions & Manual Transfers */}
        <div className="space-y-6">
          
          {/* AI Stock Prediction Panel */}
          <div className="bg-white border border-slate-200 rounded-apex shadow-apex-sm p-6 space-y-4 relative overflow-hidden">
            {/* AI Accents bar */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-brand-blue to-brand-orange" />
            
            <h3 className="font-extrabold text-sm text-slate-800 uppercase tracking-wider pb-2 border-b flex items-center justify-between">
              <span className="flex items-center gap-1">
                <Sparkles className="h-4.5 w-4.5 text-brand-orange animate-pulse" />
                Gemini Supply Chain AI
              </span>
              <span className="text-[9px] font-bold text-slate-400">Forecast engine</span>
            </h3>

            {aiLoading ? (
              <div className="py-12 text-center text-xs text-slate-400 font-bold space-y-3">
                <Loader2 className="h-6 w-6 text-brand-orange animate-spin mx-auto" />
                <span className="block animate-pulse">Running Gemini content analysis models...</span>
              </div>
            ) : prediction ? (
              <div className="space-y-4 text-xs font-semibold">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-slate-50 border rounded-xl">
                    <span className="text-[10px] text-slate-400 block uppercase">Days Remaining</span>
                    <span className="text-base font-extrabold text-brand-orange mt-1.5 block">
                      {prediction.daysRemaining} Days
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 border rounded-xl">
                    <span className="text-[10px] text-slate-400 block uppercase">Confidence Index</span>
                    <span className="text-base font-extrabold text-brand-blue mt-1.5 block">
                      {prediction.confidenceScore}%
                    </span>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 border rounded-xl space-y-1">
                  <span className="text-[10px] text-slate-400 block uppercase">EST. DEPLETION DATE</span>
                  <span className="font-bold text-slate-750 block">{prediction.estimatedStockOutDate}</span>
                </div>

                <p className="text-xs text-slate-500 leading-relaxed font-medium bg-orange-50/20 border border-orange-100 p-3 rounded-xl">
                  {prediction.reasoning}
                </p>

                <button
                  onClick={handleRunPrediction}
                  className="w-full py-2 bg-brand-orange hover:bg-brand-orange/90 text-white font-bold text-xs rounded-xl shadow transition-colors flex items-center justify-center gap-1.5"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Recalculate AI Forecast
                </button>
              </div>
            ) : (
              <div className="py-8 text-center space-y-4">
                <AlertTriangle className="h-8 w-8 text-slate-350 mx-auto" />
                <p className="text-xs text-slate-450 font-bold leading-relaxed px-4">
                  No prediction forecasts computed for this medicine batch. Run logistics audit model now.
                </p>
                <button
                  onClick={handleRunPrediction}
                  className="mx-auto px-4 py-2 bg-brand-blue hover:bg-brand-darkBlue text-white font-bold text-xs rounded-xl shadow flex items-center gap-1.5"
                >
                  <Sparkles className="h-4 w-4" />
                  Run AI Prediction
                </button>
              </div>
            )}
          </div>

          {/* Smart Stock Transfer proposal card (Admin only) */}
          {user?.role === 'District Health Administrator' && (
            <div className="bg-white border border-slate-200 rounded-apex shadow-apex-sm p-6 space-y-4">
              <h3 className="font-extrabold text-sm text-slate-800 uppercase tracking-wider pb-2 border-b flex items-center gap-1">
                <Truck className="h-4.5 w-4.5 text-brand-blue" />
                Smart Redistribution Form
              </h3>

              <form onSubmit={handleCreateTransferRequest} className="space-y-3.5 text-xs font-bold">
                <div className="space-y-1">
                  <label className="text-slate-400 block">SOURCE PHC (SURPLUS)</label>
                  <select
                    value={sourcePhcId}
                    onChange={(e) => setSourcePhcId(e.target.value)}
                    className="w-full border rounded-xl px-2.5 py-2 cursor-pointer focus:outline-none"
                  >
                    {centers.map(c => (
                      <option key={c.centerId} value={c.centerId}>{c.centerName}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-400 block">TARGET PHC (DEFICIT)</label>
                  <select
                    value={targetPhcId}
                    onChange={(e) => setTargetPhcId(e.target.value)}
                    className="w-full border rounded-xl px-2.5 py-2 cursor-pointer focus:outline-none"
                  >
                    {centers.map(c => (
                      <option key={c.centerId} value={c.centerId}>{c.centerName}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-400 block">TRANSFER QUANTITY</label>
                  <input
                    type="number"
                    required
                    value={transferQty}
                    onChange={(e) => setTransferQty(Number(e.target.value))}
                    className="w-full px-3 py-2 border rounded-xl focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-400 block">REALLOCATION REASON</label>
                  <input
                    type="text"
                    required
                    value={transferReason}
                    onChange={(e) => setTransferReason(e.target.value)}
                    placeholder="e.g. Critical Paracetamol shortage in Mawphlang"
                    className="w-full px-3 py-2 border rounded-xl focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2 bg-brand-blue hover:bg-brand-darkBlue text-white font-bold rounded-xl shadow transition-colors flex items-center justify-center gap-1.5"
                >
                  <ArrowLeftRight className="h-3.5 w-3.5" />
                  Request Stock Transfer
                </button>
              </form>
            </div>
          )}

          {/* Recent transactions log specific to this medicine */}
          <div className="bg-white border border-slate-200 rounded-apex shadow-apex-sm p-6 space-y-4">
            <h3 className="font-extrabold text-sm text-slate-800 uppercase tracking-wider pb-2 border-b">
              Transaction History
            </h3>

            <div className="space-y-3.5 text-xs">
              {medTransactions.map((tx, idx) => (
                <div key={idx} className="flex items-start gap-2.5 pb-3 border-b last:border-b-0">
                  <div className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${
                    tx.type === 'Stock In' || tx.type === 'Returned' || tx.type === 'Transfer In' || (tx.type === 'Adjustment' && tx.quantity > 0)
                      ? 'bg-emerald-50 text-emerald-700' 
                      : tx.type === 'Transfer Out' 
                      ? 'bg-blue-50 text-brand-blue' 
                      : 'bg-red-50 text-red-750'
                  }`}>
                    <Activity className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="flex justify-between items-start gap-1">
                      <span className="font-extrabold text-slate-800">
                        {tx.type} • {tx.quantity} units
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono font-medium">
                        {tx.timestamp.split('T')[0]}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-450 block font-semibold">User: {tx.userName}</span>
                    <p className="text-slate-500 font-medium mt-0.5 text-[11px] leading-relaxed">
                      {tx.reason}
                    </p>
                  </div>
                </div>
              ))}

              {medTransactions.length === 0 && (
                <div className="py-4 text-center text-slate-400 font-bold">
                  No stock transaction records captured.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MedicineDetailsPage;
