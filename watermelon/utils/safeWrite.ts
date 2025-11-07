import { Database } from "@nozbe/watermelondb";


/**
 * Usage:
  import { safeWrite } from '@/watermelon/utils/safeWrite';
  import { database } from '@/watermelon/database';

  await safeWrite(
    database,
    async () => {
      // your operation
    },
    10000,
    'myOperation'
  );
 * @param database 
 * @param operation 
 * @param timeoutMs 
 * @param operationName 
 * @returns 
 */
export async function safeWrite<T>(
  database: Database,
  operation: () => Promise<T>,
  timeoutMs: number = 10000,
  operationName: string = "unamed"
): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(
        new Error(
          `DB operation "${operationName}" timed out after ${timeoutMs}ms`
        )
      );
    }, timeoutMs);
  });

  try {
    return await Promise.race([database.write(operation), timeoutPromise]);
  } catch (err) {
    console.error(`Failed: ${operationName}`, err);
    throw err;
  }
}


