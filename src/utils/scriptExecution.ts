import { execFile } from 'child_process';
import { randomUUID } from 'crypto';
import { promisify } from 'util';
import { writeFileSync, unlinkSync, readFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { existsSync } from 'fs';
import { sanitizeForJson } from './sanitize.js';

const execFileAsync = promisify(execFile);

function createTempFileName(prefix: string, extension: string): string {
  return join(tmpdir(), `${prefix}_${randomUUID()}.${extension}`);
}

function removeTempFile(filePath: string): void {
  try {
    unlinkSync(filePath);
  } catch {
    // Ignore cleanup errors.
  }
}

/**
 * Safely execute AppleScript by writing to a temp file
 * This avoids shell escaping issues with quotes and special characters
 */
export async function executeAppleScript(script: string): Promise<string> {
  const tempFile = createTempFileName('applescript', 'scpt');

  try {
    // Write the script to a temporary file
    writeFileSync(tempFile, script);

    // Execute using osascript with the file path (no shell escaping needed)
    const { stdout, stderr } = await execFileAsync('osascript', [tempFile]);

    if (stderr) {
      console.error("AppleScript stderr:", stderr);
    }

    return stdout.trim();
  } finally {
    // Clean up the temporary file
    removeTempFile(tempFile);
  }
}

// Helper function to execute OmniFocus scripts
export async function executeJXA(script: string): Promise<any[]> {
  const tempFile = createTempFileName('jxa_script', 'js');

  try {
    // Write the script to the temporary file
    writeFileSync(tempFile, script);

    // Execute the script using osascript
    const { stdout, stderr } = await execFileAsync('osascript', ['-l', 'JavaScript', tempFile]);
    
    if (stderr) {
      console.error("Script stderr output:", stderr);
    }
    
    // Parse the output as JSON and sanitize isolated surrogates
    try {
      const result = JSON.parse(stdout);
      return sanitizeForJson(result) as any[];
    } catch (e) {
      console.error("Failed to parse script output as JSON:", e);

      // If this contains a "Found X tasks" message, treat it as a successful non-JSON response
      if (stdout.includes("Found") && stdout.includes("tasks")) {
        return [];
      }

      return [];
    }
  } catch (error) {
    console.error("Failed to execute JXA script:", error);
    throw error;
  } finally {
    removeTempFile(tempFile);
  }
}

// Function to execute scripts in OmniFocus using the URL scheme
// Update src/utils/scriptExecution.ts
export async function executeOmniFocusScript(scriptPath: string, args?: any): Promise<any> {
  const tempFile = createTempFileName('jxa_wrapper', 'js');

  try {
    if (!scriptPath.startsWith('@')) {
      throw new Error('OmniFocus scripts must use an @-prefixed built-in script name');
    }

    const scriptName = scriptPath.substring(1);
    if (!/^[A-Za-z0-9_-]+\.js$/.test(scriptName)) {
      throw new Error(`Invalid OmniFocus script name: ${scriptName}`);
    }

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const distPath = join(__dirname, '..', 'utils', 'omnifocusScripts', scriptName);
    const srcPath = join(__dirname, '..', '..', 'src', 'utils', 'omnifocusScripts', scriptName);
    const actualPath = existsSync(distPath) ? distPath : srcPath;

    if (!existsSync(actualPath)) {
      throw new Error(`OmniFocus script not found: ${scriptName}`);
    }
    
    // Read the script file
    let scriptContent = readFileSync(actualPath, 'utf8');
    
    // If arguments are provided, inject them into the script
    if (args && Object.keys(args).length > 0) {
      const argsJson = JSON.stringify(args);
      // Inject parameters at the beginning of the script
      const parameterInjection = `
    // Injected parameters
    const injectedArgs = ${argsJson};
    const perspectiveName = injectedArgs.perspectiveName || null;
    const perspectiveId = injectedArgs.perspectiveId || null;
    const hideCompleted = injectedArgs.hideCompleted !== undefined ? injectedArgs.hideCompleted : true;
    const limit = injectedArgs.limit || 100;
    const includeBuiltIn = injectedArgs.includeBuiltIn !== undefined ? injectedArgs.includeBuiltIn : false;
    const includeSidebar = injectedArgs.includeSidebar !== undefined ? injectedArgs.includeSidebar : true;
    const format = injectedArgs.format || "detailed";
    const tagName = injectedArgs.tagName || null;
    const exactMatch = injectedArgs.exactMatch !== undefined ? injectedArgs.exactMatch : false;
    const days = injectedArgs.days !== undefined ? injectedArgs.days : 7;
    const includeDeferredOnly = injectedArgs.includeDeferredOnly !== undefined ? injectedArgs.includeDeferredOnly : false;
    `;
      
      // Replace any hardcoded parameters in the script with injected ones
      scriptContent = scriptContent.replace(
        /let perspectiveName = "今日工作安排"; \/\/ Hardcode for testing/,
        'let perspectiveName = injectedArgs.perspectiveName || null;'
      );
      scriptContent = scriptContent.replace(
        /let perspectiveName = null;/,
        'let perspectiveName = injectedArgs.perspectiveName || null;'
      );
      scriptContent = scriptContent.replace(
        /let perspectiveId = null;/,
        'let perspectiveId = injectedArgs.perspectiveId || null;'
      );
      scriptContent = scriptContent.replace(
        /let hideCompleted = true;/,
        'let hideCompleted = injectedArgs.hideCompleted !== undefined ? injectedArgs.hideCompleted : true;'
      );
      scriptContent = scriptContent.replace(
        /let limit = 100;/,
        'let limit = injectedArgs.limit || 100;'
      );
      scriptContent = scriptContent.replace(
        /let includeBuiltIn = false;/,
        'let includeBuiltIn = injectedArgs.includeBuiltIn !== undefined ? injectedArgs.includeBuiltIn : false;'
      );
      scriptContent = scriptContent.replace(
        /let includeSidebar = true;/,
        'let includeSidebar = injectedArgs.includeSidebar !== undefined ? injectedArgs.includeSidebar : true;'
      );
      scriptContent = scriptContent.replace(
        /let format = "detailed";/,
        'let format = injectedArgs.format || "detailed";'
      );
      
      // Inject the parameters at the beginning of the function
      scriptContent = scriptContent.replace(
        '(() => {',
        `(() => {
    ${parameterInjection}`
      );
    }
    
    // Create a JXA script that will execute our OmniJS script in OmniFocus
    // Use JSON.stringify to safely embed the script content — avoids escaping issues
    // with template literals (backticks, ${...}) in OmniJS scripts like omnifocusDump.js
    const jxaScript = `
    function run() {
      try {
        const app = Application('OmniFocus');
        app.includeStandardAdditions = true;

        // Run the OmniJS script in OmniFocus and capture the output
        const result = app.evaluateJavascript(${JSON.stringify(scriptContent)});

        // Return the result
        return result;
      } catch (e) {
        return JSON.stringify({ error: e.message });
      }
    }
    `;
    
    // Write the JXA script to the temporary file
    writeFileSync(tempFile, jxaScript);
    
    // Execute the JXA script using osascript
    // Increase maxBuffer to support large OmniFocus databases (1000+ tasks)
    const { stdout, stderr } = await execFileAsync(
      'osascript',
      ['-l', 'JavaScript', tempFile],
      { maxBuffer: 10 * 1024 * 1024 }
    );
    
    if (stderr) {
      console.error("Script stderr output:", stderr);
    }
    
    // Parse the output as JSON and sanitize isolated surrogates
    try {
      return sanitizeForJson(JSON.parse(stdout));
    } catch (parseError) {
      console.error("Error parsing script output:", parseError);
      return stdout;
    }
  } catch (error) {
    console.error("Failed to execute OmniFocus script:", error);
    throw error;
  } finally {
    removeTempFile(tempFile);
  }
}
