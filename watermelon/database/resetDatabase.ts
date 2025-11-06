/**
 * EMERGENCY DATABASE RESET
 * 
 * This function deletes the corrupted WatermelonDB database file
 * so it can be recreated with proper migration tracking.
 * 
 * ONLY use this when the database schema is corrupted
 * (missing columns that should have been added by migrations).
 */

import { File, Paths } from 'expo-file-system';

function getDbFiles() {
  const dbFile = new File(Paths.document, 'SQLite', 'RANCAppDB.db');
  const dbWalFile = new File(Paths.document, 'SQLite', 'RANCAppDB.db-wal');
  const dbShmFile = new File(Paths.document, 'SQLite', 'RANCAppDB.db-shm');
  return { dbFile, dbWalFile, dbShmFile };
}

export async function doesDbExist(): Promise<boolean> {
  try {
    const { dbFile } = getDbFiles();
    // New FS API exposes a live `exists` boolean on File
    // @ts-ignore - runtime has this even if types lag behind
    if (typeof dbFile.exists === 'boolean') {
      // @ts-ignore
      return !!dbFile.exists;
    }
  } catch {}
  return false;
}

export async function resetCorruptedDatabase(): Promise<boolean> {
  try {
    console.log('🗑️ [WMDB RESET] Starting database reset...');
    
    // Database files in the document directory
    const { dbFile, dbWalFile, dbShmFile } = getDbFiles();
    
    console.log(`🗑️ [WMDB RESET] Database path: ${dbFile.uri}`);
    
    // Delete main database file
    if (dbFile.exists) {
      console.log(`🗑️ [WMDB RESET] Deleting: ${dbFile.name}`);
      await dbFile.delete();
    } else {
      console.log(`🗑️ [WMDB RESET] Main DB file does not exist`);
    }
    
    // Delete WAL file (Write-Ahead Log)
    if (dbWalFile.exists) {
      console.log(`🗑️ [WMDB RESET] Deleting: ${dbWalFile.name}`);
      await dbWalFile.delete();
    }
    
    // Delete SHM file (Shared Memory)
    if (dbShmFile.exists) {
      console.log(`🗑️ [WMDB RESET] Deleting: ${dbShmFile.name}`);
      await dbShmFile.delete();
    }
    
    console.log('✅ [WMDB RESET] Database files deleted successfully!');
    console.log('✅ [WMDB RESET] Database will be recreated with proper schema on next app restart');
    
    return true;
  } catch (error: any) {
    console.error(`❌ [WMDB RESET] Failed to delete database: ${error.message}`);
    console.error(`❌ [WMDB RESET] Error details:`, error);
    return false;
  }
}
