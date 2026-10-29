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
import { storage, DEFAULT_PC_AREAS, DEFAULT_REPAIR_MATERIALS, DEFAULT_PRESSURE_THRESHOLDS } from './storage.ts';
import { sanitizeAvatar } from '../constants/avatars.ts';

// Initial baseline template from Batas PC.shp for database provisioning
const INITIAL_PC_AREAS: PCArea[] = DEFAULT_PC_AREAS;

export const firebaseService = {
  // Explicitly sync or insert PC Areas from Shapefile (Batas PC.shp) into Firestore Master Data
  async syncPCAreasFromShapefile(): Promise<PCArea[]> {
    const list: PCArea[] = DEFAULT_PC_AREAS;
    for (const area of list) {
      const areaDocRef = doc(db, 'pc_areas', area.id);
      await setDoc(areaDocRef, area, { merge: true });
    }
    storage.savePCAreas(list);
    return list;
  },

  // Check and seed initial master PC Area categories into Firestore once if empty or migrate if outdated
  async seedInitialDatabaseIfEmpty() {
    try {
      // Explicitly delete PC 6 from Firestore if it exists
      try {
        await deleteDoc(doc(db, 'pc_areas', 'PC 6'));
      } catch (err) {
        // ignore if not found
      }

      // Check pc_areas collection; insert or migrate to 5 PC Areas
      const pcSnap = await getDocs(collection(db, 'pc_areas'));
      if (pcSnap.empty || pcSnap.size < 5) {
        for (const area of DEFAULT_PC_AREAS) {
          const areaDocRef = doc(db, 'pc_areas', area.id);
          await setDoc(areaDocRef, area, { merge: true });
        }
      } else {
        for (const area of DEFAULT_PC_AREAS) {
          const areaDocRef = doc(db, 'pc_areas', area.id);
          await setDoc(areaDocRef, area, { merge: true });
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

      // Mark database as initialized
      const sentinelRef = doc(db, 'system_settings', 'database_initialized');
      await setDoc(
        sentinelRef,
        {
          seeded: true,
          seededAt: new Date().toISOString(),
          pcSource: 'Batas PC.shp (Kabupaten Tangerang)',
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
          if (doc.id === 'PC 6') {
            // Delete lingering PC 6 if present
            deleteDoc(doc.ref).catch(() => {});
            return;
          }
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

  // Update Inspection Record in Firestore (Manager Privilege)
  async updateInspection(record: InspectionRecord): Promise<InspectionRecord> {
    const path = `inspections/${record.id}`;
    try {
      await setDoc(doc(db, 'inspections', record.id), record, { merge: true });
      return record;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
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

  // Update Network Leakage Record in Firestore (Manager Privilege)
  async updateLeakageRecord(record: NetworkLeakageRecord): Promise<NetworkLeakageRecord> {
    const path = `leakage_records/${record.id}`;
    try {
      await setDoc(doc(db, 'leakage_records', record.id), record, { merge: true });
      return record;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
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

