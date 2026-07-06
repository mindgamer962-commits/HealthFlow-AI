import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  Pill,
  Users,
  Bed,
  UserCheck,
  FlaskConical,
  Sparkles,
  Map,
  FileText,
  Settings,
  Users2,
  LogOut,
  Building2,
  Activity,
  MessageSquare
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import { ApexLogo } from '../ui/ApexLogo';

interface SidebarItem {
  name: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: ('District Health Administrator' | 'PHC Staff' | 'CHC Staff')[];
}

const SIDEBAR_ITEMS: SidebarItem[] = [
  // District Administrator items
  { name: 'District Dashboard', path: '/dashboard', icon: LayoutDashboard, roles: ['District Health Administrator'] },
  { name: 'PHCs & CHCs', path: '/phcs', icon: Building2, roles: ['District Health Administrator'] },
  
  // PHC Staff specific dashboard
  { name: 'Facility Dashboard', path: '/phc-portal', icon: Activity, roles: ['PHC Staff', 'CHC Staff'] },

  // Shared operational views
  { name: 'Medicine Inventory', path: '/medicine', icon: Pill, roles: ['District Health Administrator', 'PHC Staff', 'CHC Staff'] },
  { name: 'Patient Footfall', path: '/footfall', icon: Users, roles: ['District Health Administrator', 'PHC Staff', 'CHC Staff'] },
  { name: 'Bed Management', path: '/beds', icon: Bed, roles: ['District Health Administrator', 'PHC Staff', 'CHC Staff'] },
  { name: 'Doctor Attendance', path: '/doctors', icon: UserCheck, roles: ['District Health Administrator', 'PHC Staff', 'CHC Staff'] },
  { name: 'Lab Tests', path: '/labs', icon: FlaskConical, roles: ['District Health Administrator', 'PHC Staff', 'CHC Staff'] },
  
  // User Management module (placed between Doctor/Lab updates and AI Insights)
  { name: 'Users', path: '/admin/users', icon: Users2, roles: ['District Health Administrator'] },
  
  // Shared insights
  { name: 'AI Insights', path: '/insights', icon: Sparkles, roles: ['District Health Administrator', 'PHC Staff', 'CHC Staff'] },
  { name: 'AI Operations Copilot', path: '/copilot', icon: MessageSquare, roles: ['District Health Administrator', 'PHC Staff', 'CHC Staff'] },

  // District Admin analytical/report tools
  { name: 'District Map', path: '/map', icon: Map, roles: ['District Health Administrator'] },
  { name: 'Reports & Actions', path: '/reports', icon: FileText, roles: ['District Health Administrator'] },

  // Settings
  { name: 'Settings', path: '/settings', icon: Settings, roles: ['District Health Administrator', 'PHC Staff', 'CHC Staff'] },
];

export const Sidebar: React.FC = () => {
  const { user, logout } = useAuthStore();
  const { sidebarOpen, setSidebarOpen } = useUIStore();
  const location = useLocation();
  const navigate = useNavigate();

  if (!user) return null;

  // Filter list items based on active role
  const filteredItems = SIDEBAR_ITEMS.filter((item) => item.roles.includes(user.role));

  const handleNavigate = (path: string) => {
    navigate(path);
    if (window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  };

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-30 flex flex-col w-64 bg-white border-r border-slate-200 transition-transform duration-300 lg:translate-x-0 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}
    >
      {/* Brand Header */}
      <div className="flex items-center gap-2.5 h-16 px-6 border-b border-slate-200">
        <ApexLogo variant="compact" />
        <div className="flex flex-col">
          <span className="font-bold text-sm text-slate-800 tracking-tight">
            HealthFlow <span className="text-brand-orange">AI</span>
          </span>
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest leading-none">
            Team APEX
          </span>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
        {filteredItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;

          return (
            <button
              key={item.name}
              onClick={() => handleNavigate(item.path)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-medium transition-all-ease relative overflow-hidden group ${
                isActive
                  ? 'text-brand-blue bg-brand-blue/5'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="active-indicator"
                  className="absolute left-0 top-2 bottom-2 w-1 bg-brand-blue rounded-r"
                />
              )}

              <Icon
                className={`h-4.5 w-4.5 shrink-0 transition-transform group-hover:scale-105 duration-200 ${
                  isActive ? 'text-brand-blue' : 'text-slate-400'
                }`}
              />
              <span className="truncate">{item.name}</span>
            </button>
          );
        })}
      </nav>

      {/* User Footer Profile Summary */}
      <div className="p-4 border-t border-slate-200 bg-slate-50/50">
        <div className="flex items-center gap-3 mb-3 cursor-pointer" onClick={() => navigate('/profile')}>
          <img
            src={user.profilePhoto || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150'}
            alt={user.name}
            className="h-9 w-9 rounded-full object-cover border"
          />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-slate-800 truncate leading-none">
              {user.name}
            </p>
            <p className="text-[9px] text-slate-500 truncate mt-1 font-semibold uppercase tracking-wider">
              {user.role === 'District Health Administrator' ? 'Admin' : user.role === 'CHC Staff' ? 'CHC Staff' : 'PHC Staff'}
            </p>
          </div>
        </div>
        <button
          onClick={async () => {
            await logout();
            navigate('/login');
          }}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-red-650 border border-slate-200 bg-white hover:bg-red-50 hover:border-red-200 transition-all-ease"
        >
          <LogOut className="h-3.5 w-3.5" />
          Log Out
        </button>
      </div>
    </aside>
  );
};
