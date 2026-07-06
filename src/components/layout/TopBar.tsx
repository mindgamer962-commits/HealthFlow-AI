import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, Search, Bell, Sparkles, ChevronDown, User, Settings, LogOut, ShieldCheck, X } from 'lucide-react';
import { useUIStore } from '../../store/uiStore';
import { useAuthStore } from '../../store/authStore';
import { useCopilotStore } from '../../store/copilotStore';
import { GlobalSearchModal } from '../ui/GlobalSearchModal';
import { UserRole } from '../../types';

interface TopBarProps {
  onCopilotToggle: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({ onCopilotToggle }) => {
  const navigate = useNavigate();
  const { sidebarOpen, toggleSidebar } = useUIStore();
  const { user, logout, login } = useAuthStore();
  const { notifications, dismissNotification } = useCopilotStore();
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const handleRoleChange = async (role: UserRole) => {
    setProfileDropdownOpen(false);
    if (role === 'District Health Administrator') {
      await login('admin@healthflow.gov.in', 'healthflow123');
      navigate('/dashboard');
    } else {
      await login('staff@healthflow.gov.in', 'healthflow123');
      navigate('/phc-portal');
    }
  };

  const handleLogout = async () => {
    setProfileDropdownOpen(false);
    await logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-20 flex items-center justify-between h-16 px-6 bg-white/80 backdrop-blur-md border-b border-slate-200 shadow-sm">
      {/* Left side: Hamburger Toggle & Search */}
      <div className="flex items-center flex-1 gap-4">
        <button
          onClick={toggleSidebar}
          className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-800 transition-colors"
          aria-label="Toggle Sidebar"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="relative w-full max-w-md hidden md:block">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            readOnly
            onClick={() => setIsSearchOpen(true)}
            placeholder="Search PHCs, medicines, inventory codes, or staff..."
            className="w-full pl-10 pr-4 py-2 text-xs bg-slate-100 border border-transparent rounded-xl cursor-pointer focus:bg-white focus:outline-none transition-all text-slate-800 placeholder:text-slate-400"
          />
        </div>
      </div>

      {/* Right side: Control tools */}
      <div className="flex items-center gap-2">
        {/* Gemini Copilot Toggle Button (Admins Only) */}
        {user?.role === 'District Health Administrator' && (
          <button
            onClick={() => navigate('/copilot')}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-brand-blue/10 text-brand-blue hover:bg-brand-blue hover:text-white font-bold text-xs rounded-xl transition-all shadow-sm"
          >
            <Sparkles className="h-3.5 w-3.5 animate-pulse" />
            <span>Ask Copilot</span>
          </button>
        )}

        {/* Notifications Dropdown */}
        <div className="relative">
          <button
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            className="p-2.5 hover:bg-slate-100 rounded-xl text-slate-500 relative transition-colors"
          >
            <Bell className="h-4 w-4" />
            {notifications.length > 0 && (
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-status-critical ring-2 ring-white" />
            )}
          </button>

          {notificationsOpen && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setNotificationsOpen(false)} />
              <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-xl shadow-apex-lg z-40 p-4">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
                  <span className="font-bold text-xs text-slate-900 uppercase tracking-wider">
                    Recent Alerts
                  </span>
                  <span className="text-[10px] bg-red-50 text-red-750 font-bold px-2 py-0.5 rounded-full">
                    {notifications.length} Active
                  </span>
                </div>
                <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                  {notifications.map((alert) => (
                    <div key={alert.notificationId} className="text-xs space-y-1 p-2 bg-slate-55 rounded-lg border flex justify-between items-start gap-2">
                      <div className="space-y-0.5">
                        <span className="font-semibold text-slate-800">
                          {alert.title}
                        </span>
                        <p className="text-slate-500 leading-tight text-[10px]">
                          {alert.message}
                        </p>
                      </div>
                      <button
                        onClick={() => dismissNotification(alert.notificationId)}
                        className="text-slate-400 hover:text-slate-655"
                      >
                        ✕
                      </button>
                    </div>
                  ))}

                  {notifications.length === 0 && (
                    <div className="py-6 text-center text-slate-400 font-bold">
                      No active operational alerts.
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        <GlobalSearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />

        {/* Profile Dropdown Menu */}
        <div className="relative">
          <button
            onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
            className="flex items-center gap-1.5 pl-2 pr-3 py-1.5 hover:bg-slate-100 rounded-xl transition-all-ease border border-transparent hover:border-slate-200"
          >
            <img
              src={user?.profilePhoto || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150'}
              alt={user?.name}
              className="h-7 w-7 rounded-full object-cover border border-slate-250 shadow-sm"
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150';
              }}
            />
            <div className="hidden lg:block text-left">
              <p className="text-xs font-bold text-slate-800 leading-none">
                {user?.name}
              </p>
            </div>
            <ChevronDown className="h-3 w-3 text-slate-455" />
          </button>

          {profileDropdownOpen && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setProfileDropdownOpen(false)} />
              <div className="absolute right-0 mt-2 w-64 bg-white border border-slate-200 rounded-xl shadow-apex-lg z-40 p-2 text-xs">
                {/* Profile Header */}
                <div className="px-3 py-2 border-b border-slate-100 mb-1.5">
                  <span className="font-bold text-slate-800 block truncate">{user?.name}</span>
                  <span className="text-[10px] text-slate-400 block truncate mt-0.5">{user?.role}</span>
                  <span className="text-[9px] text-brand-blue block truncate mt-0.5">
                    District: {user?.districtId === 'dst-east-khasi' ? 'East Khasi Hills' : 'HQ Command'}
                  </span>
                </div>

                {/* Profile Page Link */}
                <button
                  onClick={() => {
                    setProfileDropdownOpen(false);
                    navigate('/profile');
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors text-left"
                >
                  <User className="h-4 w-4 text-slate-400" />
                  My Account Profile
                </button>

                {/* Settings Page Link */}
                <button
                  onClick={() => {
                    setProfileDropdownOpen(false);
                    navigate('/settings');
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors text-left"
                >
                  <Settings className="h-4 w-4 text-slate-400" />
                  System Settings
                </button>

                {/* Simulator Switcher */}
                <div className="border-t border-slate-100 my-1.5 pt-1.5 px-3">
                  <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider block mb-1">
                    Simulation Switcher
                  </span>
                  <button
                    onClick={() => handleRoleChange('District Health Administrator')}
                    className={`w-full text-left py-1 text-[11px] font-medium transition-colors ${
                      user?.role === 'District Health Administrator' ? 'text-brand-blue font-bold' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Switch: District Admin
                  </button>
                  <button
                    onClick={() => handleRoleChange('PHC Staff')}
                    className={`w-full text-left py-1 text-[11px] font-medium transition-colors ${
                      user?.role === 'PHC Staff' ? 'text-brand-blue font-bold' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Switch: PHC Staff (Mawphlang)
                  </button>
                </div>

                {/* Logout Button */}
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-red-650 hover:bg-red-50 transition-colors text-left border-t border-slate-100 font-bold"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out Account
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
