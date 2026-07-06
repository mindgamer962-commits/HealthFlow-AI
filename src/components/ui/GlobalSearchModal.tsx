import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Building2, Pill, UserCheck, FlaskConical, X } from 'lucide-react';
import { usePhcStore } from '../../store/phcStore';
import { useMedicineStore } from '../../store/medicineStore';
import { useDoctorStore } from '../../store/doctorStore';
import { useLabStore } from '../../store/labStore';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');

  const { centers } = usePhcStore();
  const { medicines } = useMedicineStore();
  const { doctors } = useDoctorStore();
  const { tests } = useLabStore();

  const results = useMemo(() => {
    if (!query.trim()) return { centers: [], medicines: [], doctors: [], tests: [] };
    const q = query.toLowerCase();

    return {
      centers: centers.filter(c => c.centerName.toLowerCase().includes(q) || c.district.toLowerCase().includes(q)).slice(0, 3),
      medicines: medicines.filter(m => m.medicineName.toLowerCase().includes(q) || m.category.toLowerCase().includes(q)).slice(0, 3),
      doctors: doctors.filter(d => d.doctorName.toLowerCase().includes(q) || d.specialization.toLowerCase().includes(q)).slice(0, 3),
      tests: tests.filter(t => t.testName.toLowerCase().includes(q) || t.category.toLowerCase().includes(q)).slice(0, 3)
    };
  }, [query, centers, medicines, doctors, tests]);

  if (!isOpen) return null;

  const handleSelect = (path: string) => {
    navigate(path);
    onClose();
    setQuery('');
  };

  const hasResults = Object.values(results).some(arr => arr.length > 0);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex justify-center pt-20 px-4">
      <div className="bg-white rounded-2xl w-full max-w-xl p-4 shadow-2xl flex flex-col max-h-[500px]">
        {/* Input Bar */}
        <div className="flex items-center gap-2 border-b pb-3">
          <Search className="h-5 w-5 text-slate-400" />
          <input
            type="text"
            autoFocus
            placeholder="Search clinics, medicines, clinicians, or diagnostic tests..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="flex-1 text-sm bg-transparent border-none focus:outline-none text-slate-800"
          />
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto mt-4 space-y-4 pr-1 text-xs">
          {query.trim() && !hasResults && (
            <div className="py-8 text-center text-slate-400 font-bold">
              No results found matching "{query}"
            </div>
          )}

          {/* Clinics */}
          {results.centers.length > 0 && (
            <div className="space-y-2">
              <span className="font-extrabold text-[9px] uppercase tracking-wider text-slate-400 block">Health Centers</span>
              <div className="space-y-1">
                {results.centers.map(c => (
                  <button
                    key={c.centerId}
                    onClick={() => handleSelect(`/phcs/${c.centerId}`)}
                    className="w-full p-2.5 rounded-xl border border-slate-100 hover:bg-slate-50 text-left font-semibold text-slate-700 flex items-center gap-2.5"
                  >
                    <Building2 className="h-4 w-4 text-brand-blue" />
                    <span>{c.centerName} ({c.centerType} • {c.district})</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Medicines */}
          {results.medicines.length > 0 && (
            <div className="space-y-2">
              <span className="font-extrabold text-[9px] uppercase tracking-wider text-slate-400 block">Medicine Stocks</span>
              <div className="space-y-1">
                {results.medicines.map(m => (
                  <button
                    key={m.medicineId}
                    onClick={() => handleSelect('/medicine')}
                    className="w-full p-2.5 rounded-xl border border-slate-100 hover:bg-slate-50 text-left font-semibold text-slate-700 flex items-center gap-2.5"
                  >
                    <Pill className="h-4 w-4 text-brand-orange" />
                    <span>{m.medicineName} ({m.category})</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Doctors */}
          {results.doctors.length > 0 && (
            <div className="space-y-2">
              <span className="font-extrabold text-[9px] uppercase tracking-wider text-slate-400 block">Clinicians Roster</span>
              <div className="space-y-1">
                {results.doctors.map(d => (
                  <button
                    key={d.doctorId}
                    onClick={() => handleSelect('/doctors')}
                    className="w-full p-2.5 rounded-xl border border-slate-100 hover:bg-slate-50 text-left font-semibold text-slate-700 flex items-center gap-2.5"
                  >
                    <UserCheck className="h-4 w-4 text-emerald-500" />
                    <span>{d.doctorName} ({d.specialization})</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Diagnostic Tests */}
          {results.tests.length > 0 && (
            <div className="space-y-2">
              <span className="font-extrabold text-[9px] uppercase tracking-wider text-slate-400 block">Diagnostic Labs</span>
              <div className="space-y-1">
                {results.tests.map(t => (
                  <button
                    key={t.testId}
                    onClick={() => handleSelect('/labs')}
                    className="w-full p-2.5 rounded-xl border border-slate-100 hover:bg-slate-50 text-left font-semibold text-slate-700 flex items-center gap-2.5"
                  >
                    <FlaskConical className="h-4 w-4 text-purple-500" />
                    <span>{t.testName} ({t.category})</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GlobalSearchModal;
