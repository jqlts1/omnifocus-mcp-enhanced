import { executeJXA } from '../../utils/scriptExecution.js';

export async function synchronize(): Promise<{ success: boolean; error?: string }> {
  try {
    await executeJXA(`
      function run() {
        const app = Application('OmniFocus');
        app.synchronize();
        return JSON.stringify({ success: true });
      }
    `);
    return { success: true };
  } catch (err: unknown) {
    const error = err as Error;
    return { success: false, error: error.message };
  }
}
