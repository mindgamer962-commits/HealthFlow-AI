import React from 'react';
import { Pill, Users, Bed, UserCheck, FlaskConical, Sparkles, AlertTriangle, ArrowRightLeft, FileCheck, CheckCircle } from 'lucide-react';
import { MOCK_ALERTS, MOCK_TRANSFERS } from '../../config/demoData';
import { StatChart } from '../../components/charts/StatChart';
import { usePhcStore } from '../../store/phcStore';

// 1. Medicine Inventory Page
export const MedicineInventoryPage: React.FC = () => {
  const stockoutAlerts = MOCK_ALERTS.filter(a => a.type === 'Medicine Stock-out');
  const { centers } = usePhcStore();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 leading-none">Medicine Inventory Health</h2>
        <p className="text-sm text-slate-500 mt-1.5">District stock levels, supply shortages, and replenishment requisitions.</p>
      </div>

      {stockoutAlerts.length > 0 && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-status-critical">
            <AlertTriangle className="h-4 w-4" />
            <span>CRITICAL STOCK ALERT</span>
          </div>
          <p className="text-xs text-red-800">
            Mawphlang PHC reports ORS and Amoxicillin levels below 10%. Action required.
          </p>
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-apex shadow-apex-sm p-6">
        <h3 className="font-bold text-sm text-slate-800 mb-4">Stock Health Index by Facility</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {centers.map(phc => (
            <div key={phc.centerId} className="p-4 border rounded-xl space-y-3">
              <div className="flex justify-between items-center">
                <span className="font-bold text-xs text-slate-800">{phc.centerName}</span>
                <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                  phc.medicineHealthScore < 50 ? 'bg-status-critical/10 text-status-critical' : 'bg-status-success/10 text-status-success'
                }`}>{phc.medicineHealthScore}%</span>
              </div>
              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${phc.medicineHealthScore < 50 ? 'bg-status-critical' : 'bg-status-success'}`} style={{ width: `${phc.medicineHealthScore}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// 2. Patient Footfall Page
export const PatientFootfallPage: React.FC = () => {
  const { centers } = usePhcStore();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 leading-none">Patient Footfall Analytics</h2>
        <p className="text-sm text-slate-500 mt-1.5">OPD traffic levels, peak hours analysis, and triage status.</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-apex shadow-apex-sm p-6">
        <h3 className="font-bold text-sm text-slate-800 mb-4 font-sans">Active Patient Flow Today</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {centers.map(p => (
            <div key={p.centerId} className="p-4 border rounded-xl flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">{p.centerType}</span>
                <span className="font-bold text-xs text-slate-800 block">{p.centerName}</span>
              </div>
              <div className="text-right">
                <span className="text-xl font-bold text-brand-blue block">{p.currentPatients}</span>
                <span className="text-[10px] text-slate-400 font-medium">OPD Registrations</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// 3. Bed Management Page
export const BedManagementPage: React.FC = () => {
  const { centers } = usePhcStore();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 leading-none">Bed Capacity Management</h2>
        <p className="text-sm text-slate-500 mt-1.5">Track bed occupancy rates, triage overcapacity, and approve cot requests.</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-apex shadow-apex-sm p-6">
        <h3 className="font-bold text-sm text-slate-800 mb-4">Bed Occupancy Rates</h3>
        <div className="space-y-4">
          {centers.map(phc => {
            const ratio = (phc.bedsOccupied || 0) / (phc.totalBeds || 1);
            return (
              <div key={phc.centerId} className="space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-700">{phc.centerName}</span>
                  <span className="text-slate-500">{phc.bedsOccupied} / {phc.totalBeds} Beds occupied ({Math.round(ratio * 100)}%)</span>
                </div>
                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${ratio > 0.85 ? 'bg-status-critical' : 'bg-brand-blue'}`} style={{ width: `${ratio * 100}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// 4. Doctor Attendance Page
export const DoctorAttendancePage: React.FC = () => {
  const doctorAlerts = MOCK_ALERTS.filter(a => a.type === 'Doctor Absence');
  const { centers } = usePhcStore();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 leading-none">Doctor Attendance Tracker</h2>
        <p className="text-sm text-slate-500 mt-1.5">Audit clinical staffing shifts and delegate on-call physician duties.</p>
      </div>

      {doctorAlerts.length > 0 && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl space-y-1">
          <div className="flex items-center gap-2 text-xs font-bold text-status-critical">
            <AlertTriangle className="h-4 w-4" />
            <span>CRITICAL STAFFING DEFICIT</span>
          </div>
          <p className="text-xs text-red-800">
            Mawsynram PHC reports 0 out of 2 scheduled doctors present today. OPD running via nurse practitioners.
          </p>
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-apex shadow-apex-sm p-6">
        <h3 className="font-bold text-sm text-slate-800 mb-4">Doctor Attendance by Node</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {centers.map(phc => (
            <div key={phc.centerId} className="p-4 border rounded-xl flex items-center justify-between">
              <div>
                <span className="font-bold text-xs text-slate-800 block">{phc.centerName}</span>
                <span className="text-[10px] text-slate-400 font-semibold">{phc.centerType} Staffing</span>
              </div>
              <span className={`px-2.5 py-1 rounded-lg font-bold text-xs ${
                phc.doctorsPresent === 0 ? 'bg-status-critical/15 text-status-critical' : 'bg-emerald-100 text-emerald-800'
              }`}>{phc.doctorsPresent} / {phc.totalDoctors} Present</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// 5. Lab Tests Page
export const LabTestsPage: React.FC = () => {
  const { centers } = usePhcStore();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 leading-none">Diagnostic Lab Operations</h2>
        <p className="text-sm text-slate-500 mt-1.5">Track laboratory reagent inventories, test capacities, and pending counts.</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-apex shadow-apex-sm p-6">
        <h3 className="font-bold text-sm text-slate-800 mb-4">Laboratory Reagent Status Score</h3>
        <div className="space-y-4">
          {centers.map(p => (
            <div key={p.centerId} className="space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-slate-700">{p.centerName}</span>
                <span className="font-semibold text-slate-600">{p.labStatusScore}% Available</span>
              </div>
              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${p.labStatusScore < 50 ? 'bg-status-critical' : 'bg-purple-500'}`} style={{ width: `${p.labStatusScore}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// 6. AI Insights Page
export const AiInsightsPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 leading-none">Gemini AI Operational Insights</h2>
          <p className="text-sm text-slate-500 mt-1.5">AI-generated recommendations and predictive resource transfers.</p>
        </div>
        <span className="flex items-center gap-1 text-xs font-bold text-brand-orange bg-brand-orange/15 px-3 py-1 rounded-xl">
          <Sparkles className="h-3.5 w-3.5" />
          <span>Gemini Copilot active</span>
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-apex shadow-apex-sm p-6 space-y-4">
          <h3 className="font-bold text-sm text-slate-800 flex items-center gap-1.5">
            <Sparkles className="h-4.5 w-4.5 text-brand-orange" />
            <span>Active Resource Redirection Recommendations</span>
          </h3>
          
          <div className="space-y-3 text-xs">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-150 space-y-2">
              <span className="font-bold text-slate-800">Redistribute Cot Beds</span>
              <p className="text-slate-500">
                Pynursla CHC bed occupancy stands at 93%. Transfer 5 cot beds from Cherrapunjee CHC which currently reports 12 occupied out of 25.
              </p>
              <div className="pt-2 flex justify-between items-center text-[10px] text-slate-400 font-semibold uppercase">
                <span>Critical Priority</span>
                <span className="text-brand-blue">View requisition #TR-2</span>
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-150 space-y-2">
              <span className="font-bold text-slate-800">Reassign On-duty General Physician</span>
              <p className="text-slate-500">
                Mawsynram PHC reports 0 scheduled doctors present. Reassign 1 physician from Sohryngkham PHC which has surplus doctors present on shift.
              </p>
              <div className="pt-2 flex justify-between items-center text-[10px] text-slate-400 font-semibold uppercase">
                <span>Warning Priority</span>
                <span className="text-brand-blue">View requisition #TR-5</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-apex shadow-apex-sm p-6 space-y-4">
          <h3 className="font-bold text-sm text-slate-800 flex items-center gap-1.5">
            <Sparkles className="h-4.5 w-4.5 text-brand-orange" />
            <span>Predictive Supply Shortage Alerts</span>
          </h3>

          <div className="space-y-3 text-xs">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-150 space-y-2">
              <span className="font-bold text-slate-800">Mawphlang PHC</span>
              <p className="text-slate-500">
                Due to seasonal monsoon trends in Mawphlang block, gastrointestinal outpatient visits are predicted to double by next week.
              </p>
              <p className="text-xs font-semibold text-brand-orange">
                Recommendation: Dispatch ORS packets and IV saline fluids to double standard inventory storage counts today.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
