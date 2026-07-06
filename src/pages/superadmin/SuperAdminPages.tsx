import React from 'react';
import { ShieldCheck, Network, Users2, Building2, Sliders, KeyRound, CheckCircle, Plus } from 'lucide-react';

// Manage Districts
export const ManageDistricts: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white leading-none">Manage Districts</h2>
          <p className="text-sm text-slate-500 mt-1.5">Define geographical districts and medical command nodes.</p>
        </div>
        <button className="flex items-center gap-1.5 px-4 py-2 bg-brand-blue text-white font-bold text-xs rounded-xl shadow">
          <Plus className="h-4 w-4" /> Add District
        </button>
      </div>
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-apex shadow-apex-sm p-6">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b text-slate-400 font-bold uppercase">
                <th className="pb-3">District ID</th>
                <th className="pb-3">District Name</th>
                <th className="pb-3">Registered PHCs</th>
                <th className="pb-3">Registered CHCs</th>
                <th className="pb-3">Lead Administrator</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              <tr className="hover:bg-slate-55/50">
                <td className="py-3 font-mono font-bold">dst-east-khasi</td>
                <td className="py-3 font-bold text-slate-900 dark:text-white">East Khasi Hills</td>
                <td className="py-3">18 Facilities</td>
                <td className="py-3">6 Facilities</td>
                <td className="py-3">Dr. Sarah Lyngdoh</td>
              </tr>
              <tr className="hover:bg-slate-55/50">
                <td className="py-3 font-mono font-bold">dst-west-khasi</td>
                <td className="py-3 font-bold text-slate-900 dark:text-white">West Khasi Hills</td>
                <td className="py-3">12 Facilities</td>
                <td className="py-3">4 Facilities</td>
                <td className="py-3">Dr. Wanbor Rymbai</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// Manage PHCs
export const ManagePhcs: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white leading-none">Manage Facility Metadata</h2>
          <p className="text-sm text-slate-500 mt-1.5">Add, register, and configure PHC/CHC capacity thresholds.</p>
        </div>
        <button className="flex items-center gap-1.5 px-4 py-2 bg-brand-blue text-white font-bold text-xs rounded-xl shadow">
          <Plus className="h-4 w-4" /> Add PHC/CHC
        </button>
      </div>
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-apex shadow-apex-sm p-6">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b text-slate-400 font-bold uppercase">
                <th className="pb-3">Facility Code</th>
                <th className="pb-3">Name</th>
                <th className="pb-3">Type</th>
                <th className="pb-3">Beds Limit</th>
                <th className="pb-3">Sync Secret Token</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              <tr>
                <td className="py-3 font-mono">phc-1</td>
                <td className="py-3 font-bold text-slate-900 dark:text-white">Mawphlang PHC</td>
                <td className="py-3">PHC</td>
                <td className="py-3">10 Beds</td>
                <td className="py-3 font-mono text-slate-400">************</td>
              </tr>
              <tr>
                <td className="py-3 font-mono">chc-1</td>
                <td className="py-3 font-bold text-slate-900 dark:text-white">Pynursla CHC</td>
                <td className="py-3">CHC</td>
                <td className="py-3">30 Beds</td>
                <td className="py-3 font-mono text-slate-400">************</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// Manage Users
export const ManageUsers: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white leading-none">Manage Access Accounts</h2>
          <p className="text-sm text-slate-500 mt-1.5">Register administrative and staff credentials.</p>
        </div>
        <button className="flex items-center gap-1.5 px-4 py-2 bg-brand-blue text-white font-bold text-xs rounded-xl shadow">
          <Plus className="h-4 w-4" /> Add User
        </button>
      </div>
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-apex shadow-apex-sm p-6">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b text-slate-400 font-bold uppercase">
                <th className="pb-3">User Name</th>
                <th className="pb-3">Email</th>
                <th className="pb-3">Assigned Role</th>
                <th className="pb-3">Access facility</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              <tr>
                <td className="py-3 font-bold text-slate-900 dark:text-white">Dr. Sarah Lyngdoh</td>
                <td className="py-3">sarah.lyngdoh@healthflow.gov.in</td>
                <td className="py-3"><span className="px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-brand-blue font-bold text-[10px]">District Admin</span></td>
                <td className="py-3 text-slate-400">All East Khasi Facilities</td>
              </tr>
              <tr>
                <td className="py-3 font-bold text-slate-900 dark:text-white">Bah John Mawlong</td>
                <td className="py-3">john.mawlong@healthflow.gov.in</td>
                <td className="py-3"><span className="px-2 py-0.5 rounded bg-orange-100 dark:bg-orange-950 text-brand-orange font-bold text-[10px]">PHC Staff</span></td>
                <td className="py-3">Mawphlang PHC</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// Assign Permissions
export const AssignPermissions: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white leading-none">Security Rules & Permission Matrix</h2>
        <p className="text-sm text-slate-500 mt-1.5">Define Firestore security policies and permission overrides.</p>
      </div>
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-apex p-6 space-y-4">
        <div className="flex items-center gap-2 border-b pb-3 text-slate-850 dark:text-white">
          <KeyRound className="h-5 w-5 text-brand-blue" />
          <h3 className="font-bold text-sm">Security Matrix Overview</h3>
        </div>
        <div className="space-y-3.5 text-xs">
          <div className="flex items-center justify-between p-3 bg-slate-55 border rounded-xl">
            <div>
              <span className="font-bold text-slate-800 dark:text-white block">Rule Set #1: PHC Restricted Write Access</span>
              <span className="text-[10px] text-slate-400">Verifies request.auth.token.phcId == resource.data.phcId</span>
            </div>
            <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 font-bold rounded-lg uppercase tracking-wider text-[9px]">Active</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-slate-55 border rounded-xl">
            <div>
              <span className="font-bold text-slate-800 dark:text-white block">Rule Set #2: Admin Transfer Signature Authorization</span>
              <span className="text-[10px] text-slate-400">Verifies request.auth.token.role == 'District Admin'</span>
            </div>
            <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 font-bold rounded-lg uppercase tracking-wider text-[9px]">Active</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// System Config
export const SystemConfig: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white leading-none">Core Cloud Infrastructure Config</h2>
        <p className="text-sm text-slate-500 mt-1.5">Configure cloud functions, databases, and global storage setups.</p>
      </div>
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-apex p-6 space-y-4">
        <div className="flex items-center gap-2 border-b pb-3 text-slate-850 dark:text-white">
          <Sliders className="h-5 w-5 text-brand-orange" />
          <h3 className="font-bold text-sm">Cloud Settings Status</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-4 border rounded-xl space-y-1">
            <span className="font-bold text-slate-400 block uppercase tracking-wider text-[10px]">Firestore Instance</span>
            <span className="font-bold text-slate-800 dark:text-white text-sm">healthflow-production-db</span>
            <span className="block text-[10px] text-emerald-600 font-semibold">Online & Synchronized</span>
          </div>
          <div className="p-4 border rounded-xl space-y-1">
            <span className="font-bold text-slate-400 block uppercase tracking-wider text-[10px]">Cloud Functions (3 Active)</span>
            <span className="font-bold text-slate-800 dark:text-white text-sm">optimizeRedistributionFlow</span>
            <span className="block text-[10px] text-emerald-600 font-semibold">Idle - Ready to execute</span>
          </div>
        </div>
      </div>
    </div>
  );
};
