import React, { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { Settings, ShieldAlert, Sparkles, Save, CheckCircle, Database, Lock, Eye, EyeOff, User, Globe, Paintbrush } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { user, updateUserFields, updateUserPassword, loading } = useAuthStore();

  // Profile fields state
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [photoUrl, setPhotoUrl] = useState(user?.profilePhoto || '');
  
  // Password change state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [passError, setPassError] = useState<string | null>(null);

  // Preference state
  const [language, setLanguage] = useState('English');
  const [themeMode, setThemeMode] = useState('Cream White');

  // Status notifications
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);

    try {
      await updateUserFields({
        name,
        phone,
        profilePhoto: photoUrl
      });
      setStatusMessage({ text: "Profile details updated successfully!", type: 'success' });
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err: any) {
      setStatusMessage({ text: err.message || "Failed to update profile.", type: 'error' });
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);
    setPassError(null);

    if (!newPassword || newPassword.length < 6) {
      setPassError("Password must be at least 6 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPassError("Passwords do not match.");
      return;
    }

    try {
      await updateUserPassword(newPassword);
      setStatusMessage({ text: "Password changed successfully!", type: 'success' });
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err: any) {
      setStatusMessage({ text: err.message || "Failed to update password. Re-authentication may be required.", type: 'error' });
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 leading-none">
          Settings & Account Configurations
        </h2>
        <p className="text-sm text-slate-500 mt-1.5">
          Manage your personal profile, update security keys, and configure portal preferences.
        </p>
      </div>

      {statusMessage && (
        <div
          className={`p-3.5 border rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-250 text-emerald-800'
              : 'bg-red-50 border-red-200 text-status-critical'
          }`}
        >
          <CheckCircle className={`h-4.5 w-4.5 ${statusMessage.type === 'success' ? 'text-emerald-500' : 'text-status-critical'} shrink-0`} />
          <span>{statusMessage.text}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Profile settings form & Preferences */}
        <div className="lg:col-span-2 space-y-6">
          {/* 1. Edit Profile */}
          <div className="bg-white border border-slate-200 rounded-apex shadow-apex-sm p-6">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-4 mb-4">
              <User className="h-5 w-5 text-brand-blue" />
              <div>
                <h3 className="font-bold text-sm text-slate-800">Personal Profile Details</h3>
                <p className="text-xs text-slate-400 mt-0.5">Edit your name, phone number, and avatar links.</p>
              </div>
            </div>

            <form onSubmit={handleProfileSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-bold text-slate-500">Full Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl focus:outline-none focus:ring-1 focus:ring-brand-blue/30 focus:border-brand-blue/30"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-500">Phone Number</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl focus:outline-none focus:ring-1 focus:ring-brand-blue/30 focus:border-brand-blue/30"
                  />
                </div>

                <div className="space-y-1 md:col-span-2">
                  <label className="font-bold text-slate-500">Profile Photo URL</label>
                  <input
                    type="text"
                    value={photoUrl}
                    onChange={(e) => setPhotoUrl(e.target.value)}
                    placeholder="https://images.unsplash.com/photo-..."
                    className="w-full px-3 py-2 border rounded-xl focus:outline-none focus:ring-1 focus:ring-brand-blue/30 focus:border-brand-blue/30 font-mono"
                  />
                </div>
              </div>

              <div className="pt-4 border-t flex justify-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center gap-1.5 px-4 py-2 bg-brand-blue hover:bg-brand-darkBlue text-white font-bold rounded-xl transition-all-ease shadow"
                >
                  <Save className="h-4 w-4" />
                  Save Profile
                </button>
              </div>
            </form>
          </div>

          {/* 2. Preferences */}
          <div className="bg-white border border-slate-200 rounded-apex shadow-apex-sm p-6">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-4 mb-4">
              <Globe className="h-5 w-5 text-brand-orange" />
              <div>
                <h3 className="font-bold text-sm text-slate-800">Preferences</h3>
                <p className="text-xs text-slate-400 mt-0.5">Customize portal languages and layout themes.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-500 flex items-center gap-1">
                  <Globe className="h-3.5 w-3.5" /> Language Preset
                </label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full bg-slate-50 border rounded-xl px-3 py-2.5 cursor-pointer focus:outline-none"
                >
                  <option value="English">English (IN)</option>
                  <option value="Khasi">Khasi</option>
                  <option value="Hindi">Hindi</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-500 flex items-center gap-1">
                  <Paintbrush className="h-3.5 w-3.5" /> Color Palette Theme
                </label>
                <select
                  value={themeMode}
                  onChange={(e) => setThemeMode(e.target.value)}
                  className="w-full bg-slate-50 border rounded-xl px-3 py-2.5 cursor-pointer focus:outline-none"
                >
                  <option value="Cream White">Cream White (Team APEX Default)</option>
                  <option value="Material 3 Blue">Material 3 Ocean Blue</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Password security form & Privileges */}
        <div className="space-y-6">
          {/* Security / Password Revision */}
          <div className="bg-white border border-slate-200 rounded-apex shadow-apex-sm p-6">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-4 mb-4">
              <Lock className="h-5 w-5 text-yellow-600" />
              <div>
                <h3 className="font-bold text-sm text-slate-800">Security Credentials</h3>
                <p className="text-xs text-slate-400 mt-0.5">Revise your account password key.</p>
              </div>
            </div>

            {passError && (
              <div className="mb-3.5 p-2.5 bg-red-50 text-status-critical rounded-xl text-[11px] font-bold">
                {passError}
              </div>
            )}

            <form onSubmit={handlePasswordSubmit} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-500 block">New Password</label>
                <div className="relative">
                  <input
                    type={showPass ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min 6 characters"
                    className="w-full px-3 py-2 border rounded-xl pr-8 focus:outline-none focus:ring-1 focus:ring-brand-blue/30 focus:border-brand-blue/30"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400"
                  >
                    {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-500 block">Confirm New Password</label>
                <input
                  type={showPass ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-type new password"
                  className="w-full px-3 py-2 border rounded-xl focus:outline-none focus:ring-1 focus:ring-brand-blue/30 focus:border-brand-blue/30"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-brand-orange hover:bg-brand-orange/90 text-white font-bold rounded-xl transition-all-ease shadow"
              >
                Change Password
              </button>
            </form>
          </div>

          {/* Account privileges status */}
          <div className="bg-white border border-slate-200 rounded-apex shadow-apex-sm p-6 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-4">
              <ShieldAlert className="h-5 w-5 text-slate-400" />
              <h3 className="font-bold text-sm text-slate-800">Permissions Level</h3>
            </div>

            <div className="space-y-3 text-xs text-slate-500 leading-relaxed">
              <p>
                Logged in as <strong className="text-slate-800">{user?.name}</strong>.
              </p>
              <div className="p-3 bg-slate-50 border rounded-xl">
                <span className="font-bold text-slate-700 block uppercase tracking-wider text-[9px] mb-1">
                  Access Level Scope
                </span>
                <span className="font-bold text-brand-blue text-[11px]">
                  {user?.role}
                </span>
                <p className="text-[10px] text-slate-400 mt-1.5 leading-normal">
                  {user?.role === 'District Health Administrator'
                    ? "Full read-write capabilities to monitor PHCs, verify alerts, redirect cots/medicines/staff, and modify user credentials."
                    : "Read-write capabilities restricted to updating patient counts, beds occupied, doctor logs, and lab tests for your assigned clinic."}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default SettingsPage;
