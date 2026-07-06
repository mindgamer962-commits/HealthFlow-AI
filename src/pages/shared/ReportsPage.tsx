import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowRightLeft, FileDown, Check, X, ShieldCheck, FileSpreadsheet, Sparkles, Printer, AlertTriangle } from 'lucide-react';
import { MOCK_TRANSFERS } from '../../config/demoData';
import { ResourceTransferRequest } from '../../types';
import { db, IS_MOCK_ENV } from '../../config/firebase';
import { collection, onSnapshot, doc, setDoc, updateDoc } from 'firebase/firestore';

export const ReportsPage: React.FC = () => {
  const [transfers, setTransfers] = useState<ResourceTransferRequest[]>([]);
  const [reportType, setReportType] = useState('medicine');
  const [loadingReport, setLoadingReport] = useState(false);
  const [reportSuccess, setReportSuccess] = useState<string | null>(null);

  // Sync to database or local storage
  useEffect(() => {
    if (IS_MOCK_ENV) {
      const stored = localStorage.getItem('hf_resource_transfers');
      if (stored) {
        try {
          setTransfers(JSON.parse(stored));
        } catch (e) {
          setTransfers(MOCK_TRANSFERS);
        }
      } else {
        setTransfers(MOCK_TRANSFERS);
        localStorage.setItem('hf_resource_transfers', JSON.stringify(MOCK_TRANSFERS));
      }
      return () => {};
    }

    const unsub = onSnapshot(collection(db, 'transfers'), (snapshot) => {
      const list: ResourceTransferRequest[] = [];
      snapshot.forEach(doc => {
        list.push({ id: doc.id, ...doc.data() } as ResourceTransferRequest);
      });
      
      // Auto seed in Firestore if empty
      if (list.length === 0) {
        MOCK_TRANSFERS.forEach(async (t) => {
          await setDoc(doc(db, 'transfers', t.id), t);
        });
      } else {
        setTransfers(list);
      }
    }, (error) => {
      console.error("Firestore transfers subscription error:", error);
    });

    return () => unsub();
  }, []);

  const handleAction = async (id: string, action: 'Approved' | 'Rejected') => {
    if (IS_MOCK_ENV) {
      const updated = transfers.map(tx => {
        if (tx.id === id) {
          return { ...tx, status: action };
        }
        return tx;
      });
      setTransfers(updated);
      localStorage.setItem('hf_resource_transfers', JSON.stringify(updated));
      return;
    }

    try {
      await updateDoc(doc(db, 'transfers', id), { status: action });
    } catch (e) {
      console.error("Failed to update status in Firestore:", e);
    }
  };

  const handleGenerateReport = (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingReport(true);
    setReportSuccess(null);

    setTimeout(() => {
      setLoadingReport(false);
      setReportSuccess(`Successfully generated and downloaded Report_${reportType.toUpperCase()}_2026-07-03.xlsx`);
      setTimeout(() => setReportSuccess(null), 5000);
    }, 1500);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white leading-none">
          Redistribution Orders & Audit Reports
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5">
          Approve active inter-facility resource transfer requests and pull operations reports.
        </p>
      </div>

      {/* Grid: Left - Transfer orders, Right - Export Report */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Resource transfer approvals */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-apex shadow-apex-sm p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-4 mb-4">
              <ArrowRightLeft className="h-5 w-5 text-brand-blue" />
              <div>
                <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100">
                  Inter-facility Redistribution Requisitions
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Approve/reject proposals to balance bed, medicine, or staff deficits.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {transfers.map((tx) => (
                <div
                  key={tx.id}
                  className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-150 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all hover:bg-slate-50 dark:hover:bg-slate-800/60"
                >
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] uppercase font-extrabold px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                        {tx.resourceType}
                      </span>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        {tx.fromPhcName}
                      </span>
                      <ArrowRightLeft className="h-3 w-3 text-slate-400" />
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        {tx.toPhcName}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                      Details: {tx.details}
                    </p>

                    <div className="flex items-center gap-2 text-[10px] text-slate-400">
                      <span>Quantity: {tx.quantity}</span>
                      <span>•</span>
                      <span>Requested on: {new Date(tx.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 self-end md:self-center shrink-0">
                    {tx.status === 'Pending' ? (
                      <>
                        <button
                          onClick={() => handleAction(tx.id, 'Rejected')}
                          className="p-2 border border-slate-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200 dark:border-slate-700 dark:hover:bg-red-950/20 dark:hover:text-red-400 rounded-xl transition-all-ease text-slate-400"
                        >
                          <X className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleAction(tx.id, 'Approved')}
                          className="flex items-center gap-1.5 px-3 py-2 bg-brand-blue hover:bg-brand-darkBlue text-white font-bold text-xs rounded-xl transition-all-ease shadow"
                        >
                          <Check className="h-4 w-4" />
                          Approve
                        </button>
                      </>
                    ) : (
                      <span
                        className={`text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-lg ${
                          tx.status === 'Approved'
                            ? 'bg-status-success/15 text-status-success'
                            : 'bg-status-critical/15 text-status-critical'
                        }`}
                      >
                        {tx.status}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Generate Report box */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-apex shadow-apex-sm p-6 flex flex-col justify-between">
          <div className="space-y-6">
            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-4">
              <FileSpreadsheet className="h-5 w-5 text-brand-orange" />
              <div>
                <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100">
                  Generate Operational Audit Reports
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Compile district metrics into Excel/PDF formats.
                </p>
              </div>
            </div>

            {reportSuccess && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/30 text-emerald-800 dark:text-emerald-300 rounded-xl text-xs font-bold flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0" />
                <span>{reportSuccess}</span>
              </div>
            )}

            <form onSubmit={handleGenerateReport} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block">
                  Select Data Set
                </label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2.5 p-3 border rounded-xl cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40 text-xs">
                    <input
                      type="radio"
                      name="report"
                      value="medicine"
                      checked={reportType === 'medicine'}
                      onChange={() => setReportType('medicine')}
                      className="accent-brand-blue"
                    />
                    <div>
                      <span className="font-bold text-slate-800 dark:text-slate-200 block">Medicine Out-of-Stock Audit</span>
                      <span className="text-[10px] text-slate-400">List items under minimum required counts</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-2.5 p-3 border rounded-xl cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40 text-xs">
                    <input
                      type="radio"
                      name="report"
                      value="attendance"
                      checked={reportType === 'attendance'}
                      onChange={() => setReportType('attendance')}
                      className="accent-brand-blue"
                    />
                    <div>
                      <span className="font-bold text-slate-800 dark:text-slate-200 block">Doctor Attendance Log</span>
                      <span className="text-[10px] text-slate-400">Audit logs of present vs register count</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-2.5 p-3 border rounded-xl cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40 text-xs">
                    <input
                      type="radio"
                      name="report"
                      value="beds"
                      checked={reportType === 'beds'}
                      onChange={() => setReportType('beds')}
                      className="accent-brand-blue"
                    />
                    <div>
                      <span className="font-bold text-slate-800 dark:text-slate-200 block">Overcapacity Stress Metrics</span>
                      <span className="text-[10px] text-slate-400">Track high occupancy bed limits and footfalls</span>
                    </div>
                  </label>
                </div>
              </div>

              <button
                type="submit"
                disabled={loadingReport}
                className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-brand-blue hover:bg-brand-darkBlue text-white font-bold text-xs rounded-xl transition-all-ease shadow disabled:bg-slate-200 dark:disabled:bg-slate-800"
              >
                {loadingReport ? (
                  <span>Generating...</span>
                ) : (
                  <>
                    <FileDown className="h-4 w-4" />
                    Download Excel Document
                  </>
                )}
              </button>
            </form>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 mt-6 flex justify-between items-center text-[10px] text-slate-400">
            <span className="font-medium">Data updated: 10 mins ago</span>
            <button className="flex items-center gap-1 hover:text-slate-600 transition-colors">
              <Printer className="h-3 w-3" /> Print Log
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
export default ReportsPage;
