import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  limit,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase.ts';
import {
  UserProfile,
  PCArea,
  InspectionLocation,
  InspectionRecord,
  RepairMaterial,
  NetworkLeakageRecord,
  PressureThresholdConfig,
} from '../types/index.ts';
import { storage, DEFAULT_REPAIR_MATERIALS, DEFAULT_PRESSURE_THRESHOLDS } from './storage.ts';
import { sanitizeAvatar } from '../constants/avatars.ts';

// Initial baseline template for first-time database provisioning
const INITIAL_PC_AREAS: PCArea[] = [
  {
    id: 'PC 1',
    name: 'PC 1 - Sektor Utara (Transmisi Utama & Intake)',
    region: 'Jakarta Pusat & Utara',
    description: 'Jalur transmisi intake air baku dan pipa tekanan tinggi Pelabuhan Tanjung Priok',
    nominalPressureBar: 5.10,
    toleranceBar: 0.4,
    color: '#006591',
    activeNodesCount: 12,
  },
  {
    id: 'PC 2',
    name: 'PC 2 - Sektor Industri Barat (West Industrial Core)',
    region: 'Jakarta Selatan Core',
    description: 'Distribusi pipa koridor komersial Kuningan, Sudirman dan Rasuna Said',
    nominalPressureBar: 4.88,
    toleranceBar: 0.35,
    color: '#0284c7',
    activeNodesCount: 14,
  },
  {
    id: 'PC 3',
    name: 'PC 3 - Koridor Barat Ring-1 (Tomang & Slipi)',
    region: 'Koridor Barat Ring-1',
    description: 'Jalur pengatur tekanan PRV utama persimpangan Tomang ke Grogol',
    nominalPressureBar: 3.92,
    toleranceBar: 0.5,
    color: '#eab308',
    activeNodesCount: 8,
  },
  {
    id: 'PC 4',
    name: 'PC 4 - Koridor Timur Industri (Pulogadung & Cakung)',
    region: 'Koridor Timur Industri',
    description: 'Pipa transmisi baja 16-inch zona manufaktur dan logistik timur',
    nominalPressureBar: 4.65,
    toleranceBar: 0.3,
    color: '#10b981',
    activeNodesCount: 9,
  },
  {
    id: 'PC 5',
    name: 'PC 5 - Depo Pelabuhan & Terminal Marunda',
    region: 'Depo Pelabuhan & Terminal',
    description: 'Manifold penerimaan pesisir pantai utara & katup pelepas tekanan laut',
    nominalPressureBar: 4.72,
    toleranceBar: 0.25,
    color: '#6366f1',
    activeNodesCount: 5,
  },
];

export const firebaseService = {
  // Check and seed initial master PC Area categories into Firestore once if empty without ever overwriting user data
  async seedInitialDatabaseIfEmpty() {
    try {
      // Sentinel check: if database has already been initialized, never overwrite user-entered data
      const sentinelRef = doc(db, 'system_settings', 'database_initialized');
      const sentinelSnap = await getDoc(sentinelRef);
      if (sentinelSnap.exists() && sentinelSnap.data()?.seeded) {
        return;
      }

      // Check pc_areas collection; only seed if completely empty and never overwrite existing docs
      const pcSnap = await getDocs(collection(db, 'pc_areas'));
      if (pcSnap.empty) {
        for (const area of INITIAL_PC_AREAS) {
          const areaDocRef = doc(db, 'pc_areas', area.id);
          const existing = await getDoc(areaDocRef);
          if (!existing.exists()) {
            await setDoc(areaDocRef, area);
          }
        }
      }

      // Seed default repair materials catalog if empty
      const matSnap = await getDocs(collection(db, 'materials'));
      if (matSnap.empty) {
        for (const mat of DEFAULT_REPAIR_MATERIALS) {
          const matDocRef = doc(db, 'materials', mat.id);
          const existing = await getDoc(matDocRef);
          if (!existing.exists()) {
            await setDoc(matDocRef, mat);
          }
        }
      }

      // Mark database as initialized so seeder never runs again
      await setDoc(
        sentinelRef,
        {
          seeded: true,
          seededAt: new Date().toISOString(),
        },
        { merge: true }
      );
    } catch (error) {
      console.warn('Initial seeding skipped:', error);
    }
  },

  // Real-time listener for PC Areas from Firestore with deterministic sorting and local backup
  subscribePCAreas(callback: (areas: PCArea[]) => void) {
    const path = 'pc_areas';
    return onSnapshot(
      collection(db, path),
      (snapshot) => {
        const list: PCArea[] = [];
        snapshot.forEach((doc) => {
          list.push(doc.data() as PCArea);
        });

        // Deterministic natural sort by ID (e.g. PC 1, PC 2, PC 3) so rows never scramble or jump
        list.sort((a, b) =>
          a.id.localeCompare(b.id, undefined, { numeric: true, sensitivity: 'base' })
        );

        if (list.length > 0) {
          storage.savePCAreas(list);
          callback(list);
        } else {
          // If Firestore is empty or syncing, fall back to local storage before defaulting
          const cached = storage.getPCAreas();
          callback(cached && cached.length > 0 ? cached : INITIAL_PC_AREAS);
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, path);
      }
    );
  },

  // Real-time listener for Master Locations from Firestore (no default hardcoded locations)
  subscribeLocations(callback: (locations: InspectionLocation[]) => void) {
    const path = 'locations';
    return onSnapshot(
      collection(db, path),
      (snapshot) => {
        const list: InspectionLocation[] = [];
        snapshot.forEach((doc) => {
          list.push(doc.data() as InspectionLocation);
        });
        callback(list);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, path);
      }
    );
  },

  // Real-time listener for Inspections from Firestore
  subscribeInspections(callback: (inspections: InspectionRecord[]) => void) {
    const path = 'inspections';
    const q = query(collection(db, path), orderBy('timestamp', 'desc'), limit(150));
    return onSnapshot(
      q,
      (snapshot) => {
        const list: InspectionRecord[] = [];
        snapshot.forEach((doc) => {
          list.push(doc.data() as InspectionRecord);
        });
        callback(list);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, path);
      }
    );
  },

  // Add PC Area to Firestore with local cache sync
  async addPCArea(area: PCArea): Promise<PCArea> {
    const path = 'pc_areas';
    try {
      await setDoc(doc(db, path, area.id), area);
      const current = storage.getPCAreas();
      const updated = [...current.filter((a) => a.id !== area.id), area].sort((a, b) =>
        a.id.localeCompare(b.id, undefined, { numeric: true, sensitivity: 'base' })
      );
      storage.savePCAreas(updated);
      return area;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  },

  // Update PC Area in Firestore with local cache sync
  async updatePCArea(area: PCArea): Promise<PCArea> {
    const path = `pc_areas/${area.id}`;
    try {
      await setDoc(doc(db, 'pc_areas', area.id), area, { merge: true });
      const current = storage.getPCAreas();
      const updated = current.map((a) => (a.id === area.id ? area : a));
      storage.savePCAreas(updated);
      return area;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  // Delete PC Area from Firestore with local cache sync
  async deletePCArea(id: string) {
    const path = `pc_areas/${id}`;
    try {
      await deleteDoc(doc(db, 'pc_areas', id));
      const current = storage.getPCAreas();
      const updated = current.filter((a) => a.id !== id);
      storage.savePCAreas(updated);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },

  // Add Location to Firestore
  async addLocation(loc: Omit<InspectionLocation, 'id' | 'createdAt'>): Promise<InspectionLocation> {
    const path = 'locations';
    try {
      const cleanPcId = loc.pcAreaId.replace(/\s+/g, '');
      const uniqueSuffix = Math.floor(10 + Math.random() * 90);
      const newId = `LOC-${cleanPcId}-${uniqueSuffix}`;
      const newLocation: InspectionLocation = {
        ...loc,
        id: newId,
        createdAt: new Date().toISOString().split('T')[0],
      };
      await setDoc(doc(db, path, newId), newLocation);
      return newLocation;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  },

  // Delete Location from Firestore
  async deleteLocation(id: string) {
    const path = `locations/${id}`;
    try {
      await deleteDoc(doc(db, 'locations', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },

  // Add Inspection Record to Firestore
  async addInspection(
    recordData: Omit<InspectionRecord, 'id' | 'date' | 'time' | 'timestamp'>
  ): Promise<InspectionRecord> {
    const path = 'inspections';
    try {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      const newId = `INSP-${year}-${randomSuffix}`;

      const newRecord: InspectionRecord = {
        ...recordData,
        id: newId,
        date: `${year}-${month}-${day}`,
        time: `${hours}:${minutes}`,
        timestamp: now.getTime(),
      };

      await setDoc(doc(db, path, newId), newRecord);
      return newRecord;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  },

  // Delete Inspection Record from Firestore
  async deleteInspection(id: string) {
    const path = `inspections/${id}`;
    try {
      await deleteDoc(doc(db, 'inspections', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },

  // User Profile CRUD in Firestore
  async getUserProfile(uid: string): Promise<UserProfile | null> {
    const path = `users/${uid}`;
    try {
      const userDoc = await getDoc(doc(db, 'users', uid));
      if (userDoc.exists()) {
        const u = userDoc.data() as UserProfile;
        u.avatar = sanitizeAvatar(u.avatar, u.role, u.name);
        return u;
      }
      return null;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
    }
  },

  async saveUserProfile(user: UserProfile) {
    const path = `users/${user.id}`;
    try {
      const sanitizedUser: UserProfile = {
        ...user,
        avatar: sanitizeAvatar(user.avatar, user.role, user.name),
      };
      await setDoc(doc(db, 'users', user.id), sanitizedUser, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  // ==========================================
  // REPAIR MATERIALS MASTER DATA CRUD
  // ==========================================
  subscribeMaterials(callback: (materials: RepairMaterial[]) => void) {
    const path = 'materials';
    return onSnapshot(
      collection(db, path),
      (snapshot) => {
        const list: RepairMaterial[] = [];
        snapshot.forEach((doc) => {
          list.push(doc.data() as RepairMaterial);
        });
        callback(list.length > 0 ? list : DEFAULT_REPAIR_MATERIALS);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, path);
      }
    );
  },

  async addMaterial(mat: Omit<RepairMaterial, 'id' | 'createdAt'>): Promise<RepairMaterial> {
    const path = 'materials';
    try {
      const uniqueSuffix = Math.floor(10 + Math.random() * 90);
      const newId = `MAT-${uniqueSuffix}`;
      const newMaterial: RepairMaterial = {
        ...mat,
        id: newId,
        createdAt: new Date().toISOString().split('T')[0],
      };
      await setDoc(doc(db, path, newId), newMaterial);
      return newMaterial;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  },

  async updateMaterial(mat: RepairMaterial): Promise<RepairMaterial> {
    const path = `materials/${mat.id}`;
    try {
      await setDoc(doc(db, 'materials', mat.id), mat, { merge: true });
      return mat;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  async deleteMaterial(id: string) {
    const path = `materials/${id}`;
    try {
      await deleteDoc(doc(db, 'materials', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },

  // ==========================================
  // NETWORK LEAKAGE RECORDS CRUD
  // ==========================================
  subscribeLeakageRecords(callback: (records: NetworkLeakageRecord[]) => void) {
    const path = 'leakage_records';
    const q = query(collection(db, path), orderBy('timestamp', 'desc'), limit(150));
    return onSnapshot(
      q,
      (snapshot) => {
        const list: NetworkLeakageRecord[] = [];
        snapshot.forEach((doc) => {
          list.push(doc.data() as NetworkLeakageRecord);
        });
        callback(list);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, path);
      }
    );
  },

  async addLeakageRecord(
    recordData: Omit<NetworkLeakageRecord, 'id' | 'timestamp' | 'createdAt'>
  ): Promise<NetworkLeakageRecord> {
    const path = 'leakage_records';
    try {
      const now = new Date();
      const year = now.getFullYear();
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      const newId = `LEAK-${year}-${randomSuffix}`;
      const newRecord: NetworkLeakageRecord = {
        ...recordData,
        id: newId,
        createdAt: now.toISOString().split('T')[0],
        timestamp: now.getTime(),
      };
      await setDoc(doc(db, path, newId), newRecord);
      return newRecord;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  },

  async deleteLeakageRecord(id: string) {
    const path = `leakage_records/${id}`;
    try {
      await deleteDoc(doc(db, 'leakage_records', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },

  // Pressure Thresholds (Master Data Global Settings)
  subscribePressureThresholds(callback: (config: PressureThresholdConfig) => void) {
    const path = 'system_settings/pressure_thresholds';
    return onSnapshot(
      doc(db, 'system_settings', 'pressure_thresholds'),
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data() as PressureThresholdConfig;
          callback({
            ...DEFAULT_PRESSURE_THRESHOLDS,
            ...data,
          });
        } else {
          callback(DEFAULT_PRESSURE_THRESHOLDS);
        }
      },
      (error) => {
        console.warn('Pressure thresholds subscription error, using default:', error);
        callback(DEFAULT_PRESSURE_THRESHOLDS);
      }
    );
  },

  async updatePressureThresholds(config: Partial<PressureThresholdConfig>): Promise<void> {
    const path = 'system_settings/pressure_thresholds';
    try {
      const docRef = doc(db, 'system_settings', 'pressure_thresholds');
      await setDoc(
        docRef,
        {
          ...config,
          id: 'pressure_thresholds',
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },
};

