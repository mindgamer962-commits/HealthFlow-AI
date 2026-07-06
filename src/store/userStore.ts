import { create } from 'zustand';
import { User } from '../types';
import { db, auth, IS_MOCK_ENV, firebaseConfig } from '../config/firebase';
import { collection, doc, setDoc, updateDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut, sendPasswordResetEmail } from 'firebase/auth';

interface UserState {
  users: User[];
  loading: boolean;
  subscribeToUsers: () => () => void;
  addUser: (user: Omit<User, 'uid' | 'id' | 'lastLogin' | 'createdAt' | 'updatedAt'> & { password?: string }) => Promise<void>;
  editUser: (id: string, updatedFields: Partial<User>) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  disableUser: (id: string) => Promise<void>;
  enableUser: (id: string) => Promise<void>;
  resetPassword: (id: string) => Promise<string>;
  transferUser: (id: string, newPhcId: string, newPhcName: string) => Promise<void>;
}

const INITIAL_MOCK_USERS: User[] = [
  {
    uid: 'usr-admin-1',
    id: 'usr-admin-1',
    name: 'Dr. Sarah Lyngdoh',
    email: 'sarah.lyngdoh@healthflow.gov.in',
    role: 'District Health Administrator',
    districtId: 'dst-east-khasi',
    phone: '+91-94361-22456',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastLogin: 'Today, 09:15 AM',
    profilePhoto: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=150',
  },
  {
    uid: 'usr-staff-1',
    id: 'usr-staff-1',
    name: 'Bah John Mawlong',
    email: 'john.mawlong@healthflow.gov.in',
    role: 'PHC Staff',
    phcId: 'phc-1',
    districtId: 'dst-east-khasi',
    phone: '+91-98630-44567',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastLogin: 'Today, 08:30 AM',
    profilePhoto: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=150',
  },
  {
    uid: 'usr-staff-2',
    id: 'usr-staff-2',
    name: 'Kong Ribor Syiem',
    email: 'ribor.syiem@healthflow.gov.in',
    role: 'PHC Staff',
    phcId: 'phc-1',
    districtId: 'dst-east-khasi',
    phone: '+91-94021-99881',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastLogin: 'Yesterday, 04:15 PM',
    profilePhoto: 'https://images.unsplash.com/photo-1594824813573-246434de83fb?auto=format&fit=crop&q=80&w=150',
  },
  {
    uid: 'usr-staff-3',
    id: 'usr-staff-3',
    name: 'Kong Daphne Sohkhlet',
    email: 'daphne.soh@healthflow.gov.in',
    role: 'PHC Staff',
    phcId: 'chc-1',
    districtId: 'dst-east-khasi',
    phone: '+91-97743-88776',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastLogin: 'Today, 08:45 AM',
    profilePhoto: 'https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?auto=format&fit=crop&q=80&w=150',
  },
  {
    uid: 'usr-staff-4',
    id: 'usr-staff-4',
    name: 'Bah Badap Rani',
    email: 'badap.rani@healthflow.gov.in',
    role: 'PHC Staff',
    phcId: 'phc-2',
    districtId: 'dst-east-khasi',
    phone: '+91-98560-98765',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastLogin: '2 Days Ago, 10:20 AM',
    profilePhoto: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&q=80&w=150',
  }
];

const loadPersistedUsers = (): User[] => {
  const data = localStorage.getItem('healthflow_users');
  if (data) {
    try {
      return JSON.parse(data);
    } catch (e) {
      console.error(e);
    }
  }
  return INITIAL_MOCK_USERS;
};

const savePersistedUsers = (list: User[]) => {
  localStorage.setItem('healthflow_users', JSON.stringify(list));
};

export const useUserStore = create<UserState>((set, get) => ({
  users: IS_MOCK_ENV ? loadPersistedUsers() : [],
  loading: false,

  subscribeToUsers: () => {
    if (IS_MOCK_ENV) {
      const list = loadPersistedUsers();
      set({ users: list, loading: false });
      return () => {};
    }

    set({ loading: true });
    const unsubscribe = onSnapshot(collection(db, 'users'), (snapshot) => {
      const usersList: User[] = [];
      snapshot.forEach((doc) => {
        usersList.push(doc.data() as User);
      });
      set({ 
        users: usersList, 
        loading: false 
      });
    }, (error) => {
      console.error("Firestore users subscription error:", error);
      set({ loading: false });
    });

    return unsubscribe;
  },
  
  addUser: async (newUser) => {
    const tempId = `usr-${Math.random().toString(36).substr(2, 9)}`;
    const timestamp = new Date().toISOString();
    const password = newUser.password || 'healthflow123';

    if (IS_MOCK_ENV) {
      const userObj: User & { password?: string } = {
        ...newUser,
        uid: tempId,
        id: tempId,
        isActive: newUser.isActive,
        createdAt: timestamp,
        updatedAt: timestamp,
        lastLogin: 'Never logged in',
        password: password
      };
      const currentList = loadPersistedUsers();
      const updatedList = [...currentList, userObj];
      savePersistedUsers(updatedList);
      set({ users: updatedList });
      return;
    }

    const secondaryAppName = `SecApp_${Date.now()}`;
    const secondaryApp = initializeApp(firebaseConfig, secondaryAppName);
    const secondaryAuth = getAuth(secondaryApp);

    try {
      const credential = await createUserWithEmailAndPassword(secondaryAuth, newUser.email, password);
      const firebaseUid = credential.user.uid;

      const userObj: User = {
        ...newUser,
        uid: firebaseUid,
        id: firebaseUid,
        isActive: newUser.isActive,
        createdAt: timestamp,
        updatedAt: timestamp,
        lastLogin: 'Never logged in'
      };
      delete (userObj as any).password;

      await setDoc(doc(db, 'users', firebaseUid), userObj);
      await signOut(secondaryAuth);
      await deleteApp(secondaryApp);
    } catch (error: any) {
      try {
        await deleteApp(secondaryApp);
      } catch (e) {}
      console.error("Firebase auth account creation failed:", error);
      throw new Error(error.message || "Failed to register user in Firebase Auth.");
    }
  },

  editUser: async (id, updatedFields) => {
    if (IS_MOCK_ENV) {
      const currentList = loadPersistedUsers();
      const updatedList = currentList.map((user) =>
        user.id === id ? { ...user, ...updatedFields, updatedAt: new Date().toISOString() } : user
      );
      savePersistedUsers(updatedList);
      set({ users: updatedList });
      return;
    }

    try {
      const userDocRef = doc(db, 'users', id);
      await updateDoc(userDocRef, {
        ...updatedFields,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error("Firebase update user document failed:", error);
      throw error;
    }
  },

  deleteUser: async (id) => {
    if (IS_MOCK_ENV) {
      const currentList = loadPersistedUsers();
      const updatedList = currentList.filter((user) => user.id !== id);
      savePersistedUsers(updatedList);
      set({ users: updatedList });
      return;
    }

    try {
      await deleteDoc(doc(db, 'users', id));
    } catch (error) {
      console.error("Firebase delete user document failed:", error);
      throw error;
    }
  },

  disableUser: async (id) => {
    await get().editUser(id, { isActive: false });
  },

  enableUser: async (id) => {
    await get().editUser(id, { isActive: true });
  },

  resetPassword: async (id) => {
    const targetUser = get().users.find((u) => u.id === id);
    if (!targetUser) throw new Error("Target user node not found.");

    if (IS_MOCK_ENV) {
      const tempPassword = Math.random().toString(36).substring(2, 10).toUpperCase();
      console.log(`Password reset for ${id}. Temporary password: ${tempPassword}`);
      return tempPassword;
    }

    try {
      await sendPasswordResetEmail(auth, targetUser.email);
      return `Instructions sent to ${targetUser.email}.`;
    } catch (error: any) {
      console.error("Firebase reset email failure:", error);
      throw error;
    }
  },

  transferUser: async (id, newPhcId, newPhcName) => {
    await get().editUser(id, { phcId: newPhcId });
  },
}));
