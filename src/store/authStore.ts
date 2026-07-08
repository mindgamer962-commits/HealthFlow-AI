import { create } from 'zustand';
import {
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  updatePassword
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db, IS_MOCK_ENV } from '../config/firebase';
import { User, UserRole } from '../types';
import { useUserStore } from './userStore';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  logout: () => Promise<void>;
  resetPasswordEmail: (email: string) => Promise<void>;
  updateUserFields: (fields: Partial<User>) => Promise<void>;
  updateUserPassword: (password: string) => Promise<void>;
}

// Sandbox accounts to allow testing the District Health Admin & PHC Staff portals
const SANDBOX_USERS: Record<string, User> = {
  'admin@healthflow.gov.in': {
    uid: 'sandbox-uid-admin',
    id: 'sandbox-uid-admin',
    name: 'Dr. Sarah Lyngdoh',
    email: 'admin@healthflow.gov.in',
    phone: '+91-94361-22456',
    role: 'District Health Administrator',
    districtId: 'dst-east-khasi',
    profilePhoto: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=150',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastLogin: 'Today, 09:15 AM'
  },
  'staff@healthflow.gov.in': {
    uid: 'sandbox-uid-staff',
    id: 'sandbox-uid-staff',
    name: 'Bah John Mawlong',
    email: 'staff@healthflow.gov.in',
    phone: '+91-98630-44567',
    role: 'PHC Staff',
    phcId: 'phc-1',
    districtId: 'dst-east-khasi',
    profilePhoto: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=150',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastLogin: 'Today, 08:30 AM'
  }
};

export const useAuthStore = create<AuthState>((set, get) => {
  // Sync state with Firebase auth changes on store creation
  if (!IS_MOCK_ENV) {
    onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          const userDocSnap = await getDoc(userDocRef);

          if (userDocSnap.exists()) {
            const userData = userDocSnap.data() as User;
            const isStaff = userData.role === 'PHC Staff' || userData.role === 'CHC Staff';
            if (isStaff && !userData.phcId) {
              userData.phcId = userData.email?.includes('staff2') ? 'phc-2' : 'phc-1';
              await updateDoc(userDocRef, { phcId: userData.phcId });
            }
            set({
              user: userData,
              isAuthenticated: true,
              loading: false
            });
          } else {
            // If user exists in Auth but not in Firestore, create default profile
            const isStaff = firebaseUser.email?.includes('staff');
            const defaultUser: User = {
              uid: firebaseUser.uid,
              id: firebaseUser.uid,
              name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
              email: firebaseUser.email || '',
              role: isStaff ? 'PHC Staff' : 'District Health Administrator',
              phcId: firebaseUser.email?.includes('staff2') ? 'phc-2' : isStaff ? 'phc-1' : undefined,
              isActive: true,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              lastLogin: new Date().toLocaleTimeString()
            };
            
            await setDoc(userDocRef, defaultUser);
            set({
              user: defaultUser,
              isAuthenticated: true,
              loading: false
            });
          }
        } catch (error) {
          console.error("Firestore user sync error:", error);
          set({ user: null, isAuthenticated: false, loading: false });
        }
      } else {
        set({ user: null, isAuthenticated: false, loading: false });
      }
    });
  } else {
    // If running in mockup sandbox (no API keys), clear loading state
    setTimeout(() => {
      set({ loading: false });
    }, 500);
  }

  return {
    user: IS_MOCK_ENV ? SANDBOX_USERS['admin@healthflow.gov.in'] : null, // Default logged-in state for mock
    isAuthenticated: IS_MOCK_ENV ? true : false,
    loading: true,

    login: async (email, password, rememberMe = true) => {
      set({ loading: true });

      if (IS_MOCK_ENV) {
        // Mock Sandbox Authentication
        console.log("Mock Login attempt:", email, password);
        const users = useUserStore.getState().users;
        console.log("Mock Users in store:", users);
        const sandboxUser = SANDBOX_USERS[email.toLowerCase()] || users.find(u => u.email.toLowerCase() === email.toLowerCase());
        console.log("Found sandbox user:", sandboxUser);
        const expectedPassword = (sandboxUser as any)?.password || 'healthflow123';
        console.log("Expected password:", expectedPassword);

        if (sandboxUser && password === expectedPassword) {
          set({
            user: sandboxUser,
            isAuthenticated: true,
            loading: false
          });
        } else {
          set({ loading: false });
          throw new Error("Invalid credentials. Please verify your email and password.");
        }
        return;
      }

      // Real Firebase Authentication
      try {
        const persistenceType = rememberMe ? browserLocalPersistence : browserSessionPersistence;
        await setPersistence(auth, persistenceType);
        
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const firebaseUser = userCredential.user;

        // Fetch Firestore profile
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          const userData = userDocSnap.data() as User;
          
          // Update lastLogin timestamp in Firestore
          await updateDoc(userDocRef, {
            lastLogin: new Date().toLocaleString(),
            updatedAt: new Date().toISOString()
          });

          set({
            user: {
              ...userData,
              lastLogin: new Date().toLocaleString()
            },
            isAuthenticated: true,
            loading: false
          });
        } else {
          throw new Error("User record not found in Firestore.");
        }
      } catch (error: any) {
        set({ loading: false });
        throw error;
      }
    },

    logout: async () => {
      set({ loading: true });
      if (IS_MOCK_ENV) {
        set({ user: null, isAuthenticated: false, loading: false });
        return;
      }

      try {
        await signOut(auth);
        set({ user: null, isAuthenticated: false, loading: false });
      } catch (error: any) {
        set({ loading: false });
        throw error;
      }
    },

    resetPasswordEmail: async (email) => {
      if (IS_MOCK_ENV) {
        const sandboxUser = SANDBOX_USERS[email.toLowerCase()];
        if (sandboxUser) {
          console.log(`Password reset link sent (Simulated) to ${email}`);
          return;
        } else {
          throw new Error("Email not found in Sandbox user base.");
        }
      }

      try {
        await sendPasswordResetEmail(auth, email);
      } catch (error: any) {
        throw error;
      }
    },

    updateUserFields: async (fields) => {
      const currentUser = get().user;
      if (!currentUser) throw new Error("No user is currently authenticated.");

      const updatedUser = {
        ...currentUser,
        ...fields,
        updatedAt: new Date().toISOString()
      };

      if (IS_MOCK_ENV) {
        set({ user: updatedUser });
        return;
      }

      try {
        const userDocRef = doc(db, 'users', currentUser.uid);
        await updateDoc(userDocRef, fields);
        set({ user: updatedUser });
      } catch (error: any) {
        throw error;
      }
    },

    updateUserPassword: async (password) => {
      if (IS_MOCK_ENV) {
        console.log("Simulating password change success.");
        return;
      }

      const firebaseUser = auth.currentUser;
      if (!firebaseUser) throw new Error("No user is currently authenticated in Firebase.");

      try {
        await updatePassword(firebaseUser, password);
      } catch (error: any) {
        throw error;
      }
    }
  };
});
