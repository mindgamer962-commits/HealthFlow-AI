import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { autoSeedFirestore } from './utils/dbSeeder';

// Auth Pages
import { LoginPage } from './pages/auth/LoginPage';

// Admin / District Pages
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { PhcListPage } from './pages/admin/PhcListPage';
import { PhcDetailsPage } from './pages/admin/PhcDetailsPage';
import { UserManagementPage } from './pages/admin/UserManagementPage';

// PHC Staff Portal
import { PhcPortal } from './pages/phc/PhcPortal';

// Shared Pages
import { ReportsPage } from './pages/shared/ReportsPage';
import { SettingsPage } from './pages/shared/SettingsPage';
import { DistrictMapPage } from './pages/shared/DistrictMapPage';
import { ProfilePage } from './pages/shared/ProfilePage';

// Super Admin Pages
import {
  ManageDistricts,
  ManagePhcs,
  ManageUsers,
  AssignPermissions,
  SystemConfig
} from './pages/superadmin/SuperAdminPages';

import { DoctorWorkforcePage } from './pages/shared/DoctorWorkforcePage';
import { BedManagementPage } from './pages/shared/BedManagementPage';
import { LabManagementPage } from './pages/shared/LabManagementPage';
import { CopilotPage } from './pages/shared/CopilotPage';
import { NotFound } from './pages/error/NotFound';
import { AiInsightsPage } from './pages/admin/AiInsightsPage';
import { PatientFootfallPage } from './pages/admin/PatientFootfallPage';
import { MedicineInventoryPage } from './pages/shared/MedicineInventoryPage';
import { MedicineDetailsPage } from './pages/shared/MedicineDetailsPage';

// Protected Route Guard Component
const ProtectedRoute: React.FC<{
  children: React.ReactNode;
  allowedRoles: ('District Health Administrator' | 'PHC Staff' | 'CHC Staff')[];
}> = ({ children, allowedRoles }) => {
  const { isAuthenticated, user, loading } = useAuthStore();
  const location = useLocation();

  // Show loading screen while checking authentication status
  if (loading) {
    return (
      <div className="min-h-screen bg-bg-light flex flex-col justify-center items-center">
        <div className="h-10 w-10 border-4 border-brand-blue border-t-transparent rounded-full animate-spin mb-4" />
        <span className="text-xs text-slate-500 font-semibold tracking-wider uppercase animate-pulse">
          Validating Console Access Token...
        </span>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    // Redirect disallow roles to their respective dashboards
    if (user.role === 'PHC Staff' || user.role === 'CHC Staff') {
      return <Navigate to="/phc-portal" replace />;
    }
    if (user.role === 'District Health Administrator') {
      return <Navigate to="/dashboard" replace />;
    }
    return <Navigate to="/login" replace />;
  }

  return <DashboardLayout>{children}</DashboardLayout>;
};

export const App: React.FC = () => {
  React.useEffect(() => {
    // Strip stale dark class to maintain cream white light layout
    document.documentElement.classList.remove('dark');
    // Start background auto-seeding if Firestore database is empty
    autoSeedFirestore();
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        {/* Auth Route */}
        <Route path="/login" element={<LoginPage />} />

        {/* Redirect Root Route based on authentication */}
        <Route
          path="/"
          element={
            <AuthRedirector />
          }
        />

        {/* District Admin Routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute allowedRoles={['District Health Administrator']}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/phcs"
          element={
            <ProtectedRoute allowedRoles={['District Health Administrator', 'PHC Staff', 'CHC Staff']}>
              <PhcListPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/phcs/:centerId"
          element={
            <ProtectedRoute allowedRoles={['District Health Administrator', 'PHC Staff', 'CHC Staff']}>
              <PhcDetailsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/insights"
          element={
            <ProtectedRoute allowedRoles={['District Health Administrator', 'PHC Staff', 'CHC Staff']}>
              <AiInsightsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/map"
          element={
            <ProtectedRoute allowedRoles={['District Health Administrator']}>
              <DistrictMapPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reports"
          element={
            <ProtectedRoute allowedRoles={['District Health Administrator']}>
              <ReportsPage />
            </ProtectedRoute>
          }
        />

        {/* User Management Route */}
        <Route
          path="/admin/users"
          element={
            <ProtectedRoute allowedRoles={['District Health Administrator']}>
              <UserManagementPage />
            </ProtectedRoute>
          }
        />

        {/* Shared Resource Pages */}
        <Route
          path="/medicine"
          element={
            <ProtectedRoute allowedRoles={['District Health Administrator', 'PHC Staff', 'CHC Staff']}>
              <MedicineInventoryPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/medicine/:medicineId"
          element={
            <ProtectedRoute allowedRoles={['District Health Administrator', 'PHC Staff', 'CHC Staff']}>
              <MedicineDetailsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/footfall"
          element={
            <ProtectedRoute allowedRoles={['District Health Administrator', 'PHC Staff', 'CHC Staff']}>
              <PatientFootfallPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/beds"
          element={
            <ProtectedRoute allowedRoles={['District Health Administrator', 'PHC Staff', 'CHC Staff']}>
              <BedManagementPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/doctors"
          element={
            <ProtectedRoute allowedRoles={['District Health Administrator', 'PHC Staff', 'CHC Staff']}>
              <DoctorWorkforcePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/labs"
          element={
            <ProtectedRoute allowedRoles={['District Health Administrator', 'PHC Staff', 'CHC Staff']}>
              <LabManagementPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/copilot"
          element={
            <ProtectedRoute allowedRoles={['District Health Administrator', 'PHC Staff', 'CHC Staff']}>
              <CopilotPage />
            </ProtectedRoute>
          }
        />

        {/* PHC Staff Portal updates */}
        <Route
          path="/phc-portal"
          element={
            <ProtectedRoute allowedRoles={['PHC Staff', 'CHC Staff']}>
              <PhcPortal />
            </ProtectedRoute>
          }
        />

        {/* Super Admin System Configuration Routes (Redirects to Admin options) */}
        <Route
          path="/admin/districts"
          element={
            <ProtectedRoute allowedRoles={['District Health Administrator']}>
              <ManageDistricts />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/phcs"
          element={
            <ProtectedRoute allowedRoles={['District Health Administrator']}>
              <ManagePhcs />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/users"
          element={
            <ProtectedRoute allowedRoles={['District Health Administrator']}>
              <ManageUsers />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/permissions"
          element={
            <ProtectedRoute allowedRoles={['District Health Administrator']}>
              <AssignPermissions />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/config"
          element={
            <ProtectedRoute allowedRoles={['District Health Administrator']}>
              <SystemConfig />
            </ProtectedRoute>
          }
        />

        {/* Profile Settings (accessible by all) */}
        <Route
          path="/profile"
          element={
            <ProtectedRoute
              allowedRoles={['District Health Administrator', 'PHC Staff']}
            >
              <ProfilePage />
            </ProtectedRoute>
          }
        />

        {/* Global Settings (accessible by all) */}
        <Route
          path="/settings"
          element={
            <ProtectedRoute
              allowedRoles={['District Health Administrator', 'PHC Staff']}
            >
              <SettingsPage />
            </ProtectedRoute>
          }
        />

        {/* Catch-all Redirect */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
};

// Route Redirect Helper based on user role
const AuthRedirector: React.FC = () => {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  switch (user.role) {
    case 'District Health Administrator':
      return <Navigate to="/dashboard" replace />;
    case 'PHC Staff':
    case 'CHC Staff':
      return <Navigate to="/phc-portal" replace />;
    default:
      return <Navigate to="/login" replace />;
  }
};

export default App;
