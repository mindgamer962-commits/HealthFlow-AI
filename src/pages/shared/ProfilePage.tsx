import React, { useEffect } from 'react';
import { Mail, Phone, Building2, UserCheck, ShieldAlert, Award, Calendar } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { usePhcStore } from '../../store/phcStore';

export const ProfilePage: React.FC = () => {
  const { user } = useAuthStore();
  const { centers, subscribeToCenters } = usePhcStore();

  useEffect(() => {
    const unsubscribe = subscribeToCenters();
    return () => unsubscribe();
  }, []);

  if (!user) return null;

  const matchedPHC = centers.find(p => p.centerId === user.phcId);

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 leading-none">
          My Account Profile
        </h2>
        <p className="text-sm text-slate-500 mt-1.5">
          View details and authorization scopes for your user credentials.
        </p>
      </div>

      {/* Profile Card */}
      <div className="bg-white border border-slate-200 rounded-apex shadow-apex-sm overflow-hidden">
        {/* Banner strip */}
        <div className="h-32 bg-gradient-to-r from-brand-blue/20 via-brand-orange/10 to-transparent" />
        
        {/* Profile Content */}
        <div className="px-8 pb-8 relative">
          {/* Avatar positioning */}
          <div className="absolute -top-16 left-8">
            <img
              src={user.profilePhoto || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150'}
              alt={user.name}
              className="h-28 w-28 rounded-full object-cover border-4 border-white shadow-md bg-white"
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150';
              }}
            />
          </div>

          {/* Details header */}
          <div className="pt-16 flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-xl font-bold text-slate-900">{user.name}</h3>
                <span
                  className={`px-2.5 py-0.5 rounded-full font-bold tracking-wider text-[9px] uppercase ${
                    user.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                  }`}
                >
                  {user.isActive ? 'Active' : 'Disabled'}
                </span>
              </div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                {user.role}
              </p>
            </div>
            
            <div className="flex items-center gap-1.5 text-xs text-slate-400 bg-slate-50 border rounded-xl px-3 py-1.5 self-start md:self-center">
              <Calendar className="h-4 w-4" />
              <span>Last login: {user.lastLogin || 'Today'}</span>
            </div>
          </div>

          {/* Information Fields grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8 pt-8 border-t border-slate-100">
            {/* Health Center */}
            <div className="flex items-start gap-3 text-xs">
              <Building2 className="h-5 w-5 text-brand-blue shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-bold text-slate-400 uppercase tracking-wider block text-[10px]">
                  Assigned Center Node
                </span>
                <span className="font-bold text-slate-700 block">
                  {matchedPHC?.name || 'District Health Headquarters'}
                </span>
                <span className="text-slate-400 font-medium">
                  {user.districtId === 'dst-east-khasi' ? 'East Khasi Hills District' : 'District Command'}
                </span>
              </div>
            </div>

            {/* Registry UID */}
            <div className="flex items-start gap-3 text-xs">
              <Award className="h-5 w-5 text-brand-orange shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-bold text-slate-400 uppercase tracking-wider block text-[10px]">
                  User Registry UID
                </span>
                <span className="font-bold text-slate-700 block font-mono">
                  {user.uid}
                </span>
                <span className="text-slate-400 font-medium">
                  Firebase Synchronization ID
                </span>
              </div>
            </div>

            {/* Email Address */}
            <div className="flex items-start gap-3 text-xs">
              <Mail className="h-5 w-5 text-slate-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-bold text-slate-400 uppercase tracking-wider block text-[10px]">
                  Email Address
                </span>
                <span className="font-bold text-slate-700 block">
                  {user.email}
                </span>
              </div>
            </div>

            {/* Phone Number */}
            <div className="flex items-start gap-3 text-xs">
              <Phone className="h-5 w-5 text-slate-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-bold text-slate-400 uppercase tracking-wider block text-[10px]">
                  Phone Number
                </span>
                <span className="font-bold text-slate-700 block">
                  {user.phone || '+91-94361-XXXXX'}
                </span>
              </div>
            </div>
          </div>

          {/* Authorization Scopes */}
          <div className="bg-slate-50 border rounded-xl p-5 mt-8 space-y-3">
            <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <ShieldAlert className="h-4 w-4 text-brand-orange" />
              System Authorization Level
            </h4>
            <div className="text-xs text-slate-500 space-y-1.5 pl-5 list-disc leading-relaxed">
              {user.role === 'District Health Administrator' && (
                <>
                  <p>✓ Authorized to read metrics across all PHC & CHC nodes.</p>
                  <p>✓ Authorized to draft, verify, and execute redistribution directives.</p>
                  <p>✓ Authorized to configure user logs and run District Map triages.</p>
                </>
              )}
              {user.role === 'PHC Staff' && (
                <>
                  <p>✓ Authorized to submit daily patient count logs, shift registers, and kit statuses.</p>
                  <p>✓ RESTRICTED: Access limited to {matchedPHC?.name || 'assigned facility'} dashboard update forms.</p>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default ProfilePage;
