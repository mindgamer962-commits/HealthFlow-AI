import React, { useState, useMemo, useEffect } from 'react';
import {
  Users,
  Search,
  Plus,
  Edit2,
  Trash2,
  Key,
  ArrowRightLeft,
  Filter,
  ChevronLeft,
  ChevronRight,
  UserX,
  UserCheck,
  UserPlus,
  Building2,
  ShieldCheck,
  X,
  Lock,
  AlertTriangle,
  Loader2,
  CheckCircle2
} from 'lucide-react';
import { useUserStore } from '../../store/userStore';
import { usePhcStore } from '../../store/phcStore';
import { User, UserRole } from '../../types';

export const UserManagementPage: React.FC = () => {
  const {
    users,
    loading: storeLoading,
    addUser,
    editUser,
    deleteUser,
    disableUser,
    enableUser,
    resetPassword,
    transferUser
  } = useUserStore();

  const { centers, subscribeToCenters } = usePhcStore();

  // Tab views: 'list' | 'add'
  const [activeTab, setActiveTab] = useState<'list' | 'add'>('list');

  // Load centers and subscribe to real-time users collection updates on mount
  useEffect(() => {
    const unsubCenters = subscribeToCenters();
    const unsubUsers = useUserStore.getState().subscribeToUsers();
    return () => {
      unsubCenters();
      unsubUsers();
    };
  }, []);

  // UI state for operations
  const [loading, setLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filters & Pagination State
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [centerFilter, setCenterFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  // Selected entities for modals
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [tempPassword, setTempPassword] = useState<string | null>(null);

  // Transfer State
  const [transferTargetId, setTransferTargetId] = useState('');

  // Add User Form State
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPhone, setNewUserPhone] = useState('');
  const [newUserRole, setNewUserRole] = useState<UserRole>('PHC Staff');
  const [newUserDistrict, setNewUserDistrict] = useState('East Khasi Hills');
  const [newUserCenterId, setNewUserCenterId] = useState('');
  const [newUserStatus, setNewUserStatus] = useState<boolean>(true);
  const [newUserPhoto, setNewUserPhoto] = useState('');

  // Auto assign first center as default on role switch
  useEffect(() => {
    if (centers.length > 0 && !newUserCenterId) {
      setNewUserCenterId(centers[0].centerId);
    }
  }, [centers, newUserCenterId]);

  // Edit User Form State
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('PHC Staff');
  const [editCenterId, setEditCenterId] = useState('');
  const [editStatus, setEditStatus] = useState<boolean>(true);

  // Filtered Users List
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesSearch =
        u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesRole = roleFilter === 'all' ? true : u.role === roleFilter;
      const matchesCenter = centerFilter === 'all' ? true : u.phcId === centerFilter;
      const matchesStatus =
        statusFilter === 'all'
          ? true
          : statusFilter === 'Active'
          ? u.isActive === true
          : u.isActive === false;

      return matchesSearch && matchesRole && matchesCenter && matchesStatus;
    });
  }, [users, searchTerm, roleFilter, centerFilter, statusFilter]);

  // Paginated list
  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredUsers.slice(start, start + itemsPerPage);
  }, [filteredUsers, currentPage]);

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage) || 1;

  // Handle pagination navigation
  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  // Helpers to display feedback
  const triggerSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  const triggerError = (msg: string) => {
    setActionError(msg);
    setTimeout(() => setActionError(null), 5000);
  };

  // Open Edit modal
  const openEditModal = (user: User) => {
    setSelectedUser(user);
    setEditName(user.name);
    setEditPhone(user.phone || '');
    setEditRole(user.role);
    setEditCenterId(user.phcId || (centers[0]?.centerId || ''));
    setEditStatus(user.isActive);
    setShowEditModal(true);
  };

  // Save Edit action
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    setLoading(true);
    setActionError(null);
    try {
      await editUser(selectedUser.uid || selectedUser.id, {
        name: editName,
        phone: editPhone,
        role: editRole,
        phcId: editRole === 'District Health Administrator' ? undefined : editCenterId,
        isActive: editStatus,
      });
      triggerSuccess("User profile settings updated successfully.");
      setShowEditModal(false);
      setSelectedUser(null);
    } catch (err: any) {
      triggerError(err.message || "Failed to update profile settings.");
    } finally {
      setLoading(false);
    }
  };

  // Open Transfer modal
  const openTransferModal = (user: User) => {
    setSelectedUser(user);
    setTransferTargetId(centers.find(c => c.centerId !== user.phcId)?.centerId || '');
    setShowTransferModal(true);
  };

  // Save Transfer action
  const handleSaveTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    setLoading(true);
    setActionError(null);
    try {
      const matchedCenter = centers.find((p) => p.centerId === transferTargetId);
      if (matchedCenter) {
        await transferUser(selectedUser.uid || selectedUser.id, matchedCenter.centerId, matchedCenter.centerName);
        triggerSuccess(`User successfully reassigned to ${matchedCenter.centerName}.`);
      }
      setShowTransferModal(false);
      setSelectedUser(null);
    } catch (err: any) {
      triggerError(err.message || "Failed to transfer user node.");
    } finally {
      setLoading(false);
    }
  };

  // Trigger Password Reset dialog
  const handleTriggerReset = async (user: User) => {
    setLoading(true);
    setActionError(null);
    try {
      setSelectedUser(user);
      const res = await resetPassword(user.uid || user.id);
      setTempPassword(res);
      setShowResetModal(true);
    } catch (err: any) {
      triggerError(err.message || "Failed to send reset instruction link.");
    } finally {
      setLoading(false);
    }
  };

  // Create User submit action
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName || !newUserEmail) return;

    setLoading(true);
    setActionError(null);
    try {
      const photoUrl = newUserPhoto || `https://images.unsplash.com/photo-${Math.random() > 0.5 ? '1535713875002-d1d0cf377fde' : '1494790108377-be9c29b29330'}?auto=format&fit=crop&q=80&w=150`;

      await addUser({
        name: newUserName,
        email: newUserEmail,
        phone: newUserPhone,
        role: newUserRole,
        districtId: 'dst-east-khasi',
        phcId: newUserRole === 'District Health Administrator' ? undefined : newUserCenterId,
        isActive: newUserStatus,
        profilePhoto: photoUrl,
      });

      triggerSuccess("New staff account registered and synchronized successfully!");
      
      // Reset Form
      setNewUserName('');
      setNewUserEmail('');
      setNewUserPhone('');
      setNewUserRole('PHC Staff');
      setNewUserCenterId(centers[0]?.centerId || '');
      setNewUserStatus(true);
      setNewUserPhoto('');
      
      // Direct back to list
      setActiveTab('list');
    } catch (err: any) {
      triggerError(err.message || "Failed to register account credentials.");
    } finally {
      setLoading(false);
    }
  };

  // Disable account
  const handleDisable = async (id: string) => {
    setLoading(true);
    try {
      await disableUser(id);
      triggerSuccess("User account access suspended.");
    } catch (err: any) {
      triggerError(err.message || "Failed to disable user account.");
    } finally {
      setLoading(false);
    }
  };

  // Enable account
  const handleEnable = async (id: string) => {
    setLoading(true);
    try {
      await enableUser(id);
      triggerSuccess("User account access restored.");
    } catch (err: any) {
      triggerError(err.message || "Failed to enable user account.");
    } finally {
      setLoading(false);
    }
  };

  // Delete account permanent
  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to permanently delete this user account? This cannot be undone.")) return;
    setLoading(true);
    try {
      await deleteUser(id);
      triggerSuccess("Account credentials deleted from registry.");
    } catch (err: any) {
      triggerError(err.message || "Failed to delete user account.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 relative">
      {/* Loading Overlay spinner */}
      {loading && (
        <div className="fixed inset-0 bg-slate-900/10 backdrop-blur-[1px] z-50 flex items-center justify-center">
          <div className="bg-white border rounded-xl p-4 flex items-center gap-3 shadow-lg">
            <Loader2 className="h-5 w-5 text-brand-blue animate-spin" />
            <span className="text-xs font-bold text-slate-700">Writing changes to database...</span>
          </div>
        </div>
      )}

      {/* Success notification banner */}
      {successMsg && (
        <div className="fixed bottom-6 right-6 z-50 p-4 bg-slate-905 bg-slate-900 text-white text-xs font-bold rounded-xl shadow-lg flex items-center gap-2">
          <CheckCircle2 className="h-4.5 w-4.5 text-emerald-400" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Action error banner */}
      {actionError && (
        <div className="p-4 bg-red-105 border border-red-200 rounded-xl text-xs text-red-750 font-bold flex items-start gap-2">
          <AlertTriangle className="h-4.5 w-4.5 text-red-500 shrink-0 mt-0.5" />
          <div>
            <span className="block font-extrabold uppercase text-[10px] tracking-wider text-red-600 mb-0.5">Database Sync Alert</span>
            <span>{actionError}</span>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 leading-none">
            User Operations & Access Controls
          </h2>
          <p className="text-sm text-slate-500 mt-1.5">
            Configure access credentials, assign health center nodes, and sync credentials with Firebase.
          </p>
        </div>

        {/* Tab switchers */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('list')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all-ease ${
              activeTab === 'list'
                ? 'bg-brand-blue text-white shadow-sm'
                : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
            }`}
          >
            User Directory
          </button>
          <button
            onClick={() => setActiveTab('add')}
            className={`flex items-center gap-1 px-4 py-2 text-xs font-bold rounded-xl transition-all-ease ${
              activeTab === 'add'
                ? 'bg-brand-blue text-white shadow-sm'
                : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
            }`}
          >
            <UserPlus className="h-4 w-4" />
            Add User Account
          </button>
        </div>
      </div>

      {activeTab === 'list' ? (
        <>
          {/* Filters & Search Row */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-white p-4 border border-slate-200 rounded-apex shadow-apex-sm">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search name, email..."
                className="w-full pl-9 pr-4 py-2.5 text-xs bg-slate-55 border border-slate-200 rounded-xl focus:bg-white focus:outline-none text-slate-800"
              />
            </div>

            {/* Filter by Role */}
            <div className="flex items-center gap-1.5">
              <Filter className="h-4.5 w-4.5 text-slate-400 shrink-0" />
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="w-full bg-slate-55 border border-slate-200 text-xs font-semibold text-slate-700 rounded-xl px-3 py-2 cursor-pointer focus:outline-none"
              >
                <option value="all">All Access Roles</option>
                <option value="District Health Administrator">District Health Administrator</option>
                <option value="PHC Staff">PHC Staff</option>
              </select>
            </div>

            {/* Filter by Center */}
            <div className="flex items-center gap-1.5">
              <Building2 className="h-4.5 w-4.5 text-slate-400 shrink-0" />
              <select
                value={centerFilter}
                onChange={(e) => setCenterFilter(e.target.value)}
                className="w-full bg-slate-55 border border-slate-200 text-xs font-semibold text-slate-700 rounded-xl px-3 py-2 cursor-pointer focus:outline-none"
              >
                <option value="all">All Health Centers</option>
                {centers.map((p) => (
                  <option key={p.centerId} value={p.centerId}>
                    {p.centerName}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter by Status */}
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="h-4.5 w-4.5 text-slate-400 shrink-0" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full bg-slate-55 border border-slate-200 text-xs font-semibold text-slate-700 rounded-xl px-3 py-2 cursor-pointer focus:outline-none"
              >
                <option value="all">All Statuses</option>
                <option value="Active">Active Accounts</option>
                <option value="Disabled">Disabled Accounts</option>
              </select>
            </div>
          </div>

          {/* User Directory Table */}
          <div className="bg-white border border-slate-200 rounded-apex shadow-apex-sm overflow-hidden">
            {storeLoading && (
              <div className="py-8 text-center text-xs text-slate-450 font-bold flex items-center justify-center gap-2 border-b">
                <Loader2 className="h-4.5 w-4.5 text-brand-blue animate-spin" />
                Synchronizing directory snapshots...
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50 text-slate-500 uppercase font-bold tracking-wider">
                    <th className="py-3.5 px-6">User Profile</th>
                    <th className="py-3.5 px-6">Role</th>
                    <th className="py-3.5 px-6">Health Center</th>
                    <th className="py-3.5 px-6 text-center">Status</th>
                    <th className="py-3.5 px-6">Last Login</th>
                    <th className="py-3.5 px-6 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedUsers.map((u) => (
                    <tr key={u.uid || u.id} className="hover:bg-slate-50/30">
                      {/* Photo + Name */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <img
                            src={u.profilePhoto}
                            alt={u.name}
                            className="h-9 w-9 rounded-full object-cover border border-slate-200"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150';
                            }}
                          />
                          <div>
                            <span className="font-bold text-slate-800 block">{u.name}</span>
                            <span className="text-[10px] text-slate-400 block">{u.email}</span>
                          </div>
                        </div>
                      </td>

                      {/* Role Badge */}
                      <td className="py-4 px-6">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full font-bold tracking-wider text-[9px] uppercase ${
                            u.role === 'District Health Administrator'
                              ? 'bg-blue-50 text-brand-blue'
                              : 'bg-orange-50 text-brand-orange'
                          }`}
                        >
                          {u.role}
                        </span>
                      </td>

                      {/* Health Center Assignment */}
                      <td className="py-4 px-6">
                        {u.phcId ? (
                          <div className="space-y-0.5">
                            <span className="font-semibold text-slate-700 block text-[11.5px]">
                              {centers.find(p => p.centerId === u.phcId)?.centerName || 'PHC Node'}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              District: {u.districtId === 'dst-east-khasi' ? 'East Khasi Hills' : u.districtId || ''}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">District Operations</span>
                        )}
                      </td>

                      {/* Status Check */}
                      <td className="py-4 px-6 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full font-bold tracking-wider text-[9px] uppercase ${
                            u.isActive
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                              : 'bg-red-50 text-red-700 border border-red-100'
                          }`}
                        >
                          {u.isActive ? 'Active' : 'Disabled'}
                        </span>
                      </td>

                      {/* Last Login */}
                      <td className="py-4 px-6 text-slate-500 font-medium">
                        {u.lastLogin || 'Never logged in'}
                      </td>

                      {/* Action buttons */}
                      <td className="py-4 px-6">
                        <div className="flex items-center justify-center gap-1">
                          {/* Edit */}
                          <button
                            onClick={() => openEditModal(u)}
                            className="p-1.5 text-slate-400 hover:text-brand-blue hover:bg-slate-100 rounded-lg transition-colors"
                            title="Edit User"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>

                          {/* Center Transfer */}
                          {u.role !== 'District Health Administrator' && (
                            <button
                              onClick={() => openTransferModal(u)}
                              className="p-1.5 text-slate-400 hover:text-brand-orange hover:bg-slate-100 rounded-lg transition-colors"
                              title="Transfer Center"
                            >
                              <ArrowRightLeft className="h-4 w-4" />
                            </button>
                          )}

                          {/* Reset Password */}
                          <button
                            onClick={() => handleTriggerReset(u)}
                            className="p-1.5 text-slate-400 hover:text-yellow-600 hover:bg-slate-100 rounded-lg transition-colors"
                            title="Reset Password"
                          >
                            <Key className="h-4 w-4" />
                          </button>

                          {/* Enable/Disable Toggle */}
                          {u.isActive ? (
                            <button
                              onClick={() => handleDisable(u.uid || u.id)}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-slate-100 rounded-lg transition-colors"
                              title="Disable Account"
                            >
                              <UserX className="h-4 w-4" />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleEnable(u.uid || u.id)}
                              className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-slate-100 rounded-lg transition-colors"
                              title="Enable Account"
                            >
                              <UserCheck className="h-4 w-4" />
                            </button>
                          )}

                          {/* Delete */}
                          <button
                            onClick={() => handleDelete(u.uid || u.id)}
                            className="p-1.5 text-slate-400 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete User"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {filteredUsers.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400 font-bold">
                        No user account profiles matching search filter criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination footer */}
            <div className="p-4 bg-slate-50/50 border-t flex justify-between items-center text-xs text-slate-500 font-medium">
              <span>
                Showing {Math.min(filteredUsers.length, (currentPage - 1) * itemsPerPage + 1)}-
                {Math.min(filteredUsers.length, currentPage * itemsPerPage)} of{' '}
                {filteredUsers.length} Users
              </span>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="p-1 border rounded-lg hover:bg-slate-150 disabled:opacity-50"
                >
                  <ChevronLeft className="h-4.5 w-4.5" />
                </button>
                <span className="font-bold text-slate-700">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="p-1 border rounded-lg hover:bg-slate-150 disabled:opacity-50"
                >
                  <ChevronRight className="h-4.5 w-4.5" />
                </button>
              </div>
            </div>
          </div>
        </>
      ) : (
        /* ADD USER PAGE VIEW */
        <div className="max-w-2xl bg-white border border-slate-200 rounded-apex shadow-apex-sm p-8 mx-auto">
          <div className="flex items-center gap-2 border-b pb-4 mb-6">
            <UserPlus className="h-5 w-5 text-brand-blue" />
            <div>
              <h3 className="font-bold text-sm text-slate-800">Register Staff Credentials</h3>
              <p className="text-xs text-slate-400 mt-0.5">Setup security scopes and center sync directives.</p>
            </div>
          </div>

          <form onSubmit={handleCreateUser} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Full Name */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500">Full Name</label>
                <input
                  type="text"
                  required
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  placeholder="e.g. Dr. Sarah Lyngdoh"
                  className="w-full px-3 py-2 text-xs bg-slate-55 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
                />
              </div>

              {/* Email Address */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500">Email Address</label>
                <input
                  type="email"
                  required
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  placeholder="e.g. user@healthflow.gov.in"
                  className="w-full px-3 py-2 text-xs bg-slate-55 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
                />
              </div>

              {/* Phone Number */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500">Phone Number</label>
                <input
                  type="text"
                  value={newUserPhone}
                  onChange={(e) => setNewUserPhone(e.target.value)}
                  placeholder="e.g. +91-94361-XXXXX"
                  className="w-full px-3 py-2 text-xs bg-slate-55 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
                />
              </div>

              {/* Assigned Role */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500">Access Role</label>
                <select
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value as UserRole)}
                  className="w-full bg-slate-55 border border-slate-200 text-xs font-medium text-slate-700 rounded-xl px-3 py-2 cursor-pointer focus:outline-none"
                >
                  <option value="District Health Administrator">District Health Administrator</option>
                  <option value="PHC Staff">PHC Staff</option>
                  <option value="CHC Staff">CHC Staff</option>
                </select>
              </div>

              {/* Health Center Target */}
              {newUserRole !== 'District Health Administrator' && (
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500">Assign Health Facility</label>
                  <select
                    value={newUserCenterId}
                    onChange={(e) => setNewUserCenterId(e.target.value)}
                    className="w-full bg-slate-55 border border-slate-200 text-xs font-medium text-slate-700 rounded-xl px-3 py-2 cursor-pointer focus:outline-none"
                  >
                    {centers.map((p) => (
                      <option key={p.centerId} value={p.centerId}>
                        {p.centerName} ({p.centerType})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* District */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500">Command District</label>
                <input
                  type="text"
                  disabled
                  value={newUserDistrict}
                  className="w-full px-3 py-2 text-xs bg-slate-100 border border-slate-200 rounded-xl cursor-not-allowed text-slate-500"
                />
              </div>

              {/* Initial Status */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500">Account status</label>
                <select
                  value={newUserStatus ? 'Active' : 'Disabled'}
                  onChange={(e) => setNewUserStatus(e.target.value === 'Active')}
                  className="w-full bg-slate-55 border border-slate-200 text-xs font-medium text-slate-700 rounded-xl px-3 py-2 cursor-pointer focus:outline-none"
                >
                  <option value="Active">Active</option>
                  <option value="Disabled">Disabled</option>
                </select>
              </div>

              {/* Profile Photo Url */}
              <div className="space-y-1 md:col-span-2">
                <label className="text-xs font-bold text-slate-500">Profile Photo URL (Optional)</label>
                <input
                  type="text"
                  value={newUserPhoto}
                  onChange={(e) => setNewUserPhoto(e.target.value)}
                  placeholder="https://images.unsplash.com/photo-..."
                  className="w-full px-3 py-2 text-xs bg-slate-55 border border-slate-200 rounded-xl focus:bg-white focus:outline-none font-mono"
                />
              </div>
            </div>

            <div className="pt-6 border-t flex justify-end gap-2 mt-6">
              <button
                type="button"
                onClick={() => setActiveTab('list')}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-660 text-slate-600 font-bold text-xs rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-brand-blue hover:bg-brand-darkBlue text-white font-bold text-xs rounded-xl transition-all-ease shadow"
              >
                Create Account
              </button>
            </div>
          </form>
        </div>
      )}

      {/* EDIT MODAL DIALOG */}
      {showEditModal && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white border border-slate-200 rounded-apex shadow-apex p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-base text-slate-800">Edit User Profile</h3>
              <button onClick={() => setShowEditModal(false)} className="p-1 hover:bg-slate-100 rounded-lg text-slate-400">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {/* Full Name */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-500">Full Name</label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl"
                  />
                </div>

                {/* Phone */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-500">Phone Number</label>
                  <input
                    type="text"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl"
                  />
                </div>

                {/* Access Role */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-500">Access Role</label>
                  <select
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value as UserRole)}
                    className="w-full border rounded-xl px-2.5 py-2 cursor-pointer"
                  >
                    <option value="District Health Administrator">District Health Administrator</option>
                    <option value="PHC Staff">PHC Staff</option>
                    <option value="CHC Staff">CHC Staff</option>
                  </select>
                </div>

                {/* Health Center */}
                {editRole !== 'District Health Administrator' && (
                  <div className="space-y-1">
                    <label className="font-bold text-slate-500">Assigned Facility</label>
                    <select
                      value={editCenterId}
                      onChange={(e) => setEditCenterId(e.target.value)}
                      className="w-full border rounded-xl px-2.5 py-2 cursor-pointer"
                    >
                      {centers.map((p) => (
                        <option key={p.centerId} value={p.centerId}>
                          {p.centerName}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Status */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-500">Account status</label>
                  <select
                    value={editStatus ? 'Active' : 'Disabled'}
                    onChange={(e) => setEditStatus(e.target.value === 'Active')}
                    className="w-full border rounded-xl px-2.5 py-2 cursor-pointer"
                  >
                    <option value="Active">Active</option>
                    <option value="Disabled">Disabled</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 border-t flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 border rounded-xl hover:bg-slate-50 text-slate-600 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-brand-blue hover:bg-brand-darkBlue text-white font-bold rounded-xl shadow"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* HEALTH CENTER TRANSFER MODAL */}
      {showTransferModal && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-apex shadow-apex p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-base text-slate-800">Transfer User Facility</h3>
              <button onClick={() => setShowTransferModal(false)} className="p-1 hover:bg-slate-100 rounded-lg text-slate-400">
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Transfer <strong className="text-slate-800">{selectedUser.name}</strong> ({selectedUser.role}) to another Primary Health Centre or Community Health Centre.
            </p>

            <form onSubmit={handleSaveTransfer} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 block">Select Target Health Center</label>
                <select
                  value={transferTargetId}
                  onChange={(e) => setTransferTargetId(e.target.value)}
                  className="w-full bg-slate-55 border text-xs rounded-xl px-3 py-2.5 cursor-pointer focus:outline-none"
                >
                  {centers.filter((p) => p.centerId !== selectedUser.phcId).map((p) => (
                    <option key={p.centerId} value={p.centerId}>
                      {p.centerName} ({p.centerType})
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-4 border-t flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowTransferModal(false)}
                  className="px-4 py-2 border rounded-xl hover:bg-slate-50 text-slate-600 font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-brand-orange hover:bg-brand-orange/90 text-white font-bold text-xs rounded-xl shadow"
                >
                  Transfer Facility
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PASSWORD RESET DIALOG MODAL */}
      {showResetModal && selectedUser && tempPassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-white border border-slate-200 rounded-apex shadow-apex p-6 space-y-4 text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100 text-yellow-600">
              <Lock className="h-6 w-6" />
            </div>

            <div className="space-y-1.5">
              <h3 className="font-bold text-base text-slate-800">Password Reset Requisition</h3>
              <p className="text-xs text-slate-500">
                Action confirmation: password update request dispatched.
              </p>
            </div>

            {/* Display Reset Message or Temp Password */}
            <div className="p-4 bg-slate-50 border border-dashed border-slate-300 rounded-xl font-mono text-xs font-bold text-slate-850 select-all">
              {tempPassword}
            </div>

            <p className="text-[10px] text-slate-400">
              If running in Firebase Mode, please advise the user to check their email inbox for verification guidelines.
            </p>

            <button
              onClick={() => {
                setShowResetModal(false);
                setSelectedUser(null);
                setTempPassword(null);
              }}
              className="w-full py-2 bg-brand-blue hover:bg-brand-darkBlue text-white font-bold text-xs rounded-xl shadow transition-colors"
            >
              Close and Confirm
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
export default UserManagementPage;
