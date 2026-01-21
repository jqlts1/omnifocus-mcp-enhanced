import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFileSync, unlinkSync, readFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { existsSync } from 'fs';

const execAsync = promisify(exec);

// Helper function to execute OmniFocus scripts
export async function executeJXA(script: string): Promise<any[]> {
  try {
    // Write the script to a temporary file in the system temp directory
    const tempFile = join(tmpdir(), `jxa_script_${Date.now()}.js`);
    
    // Write the script to the temporary file
    writeFileSync(tempFile, script);
    
    // Execute the script using osascript
    const { stdout, stderr } = await execAsync(`osascript -l JavaScript ${tempFile}`);
    
    if (stderr) {
      console.error("Script stderr output:", stderr);
    }
    
    // Clean up the temporary file
    unlinkSync(tempFile);
    
    // Parse the output as JSON
    try {
      const result = JSON.parse(stdout);
      return result;
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
  }
}

// Function to execute scripts in OmniFocus using the URL scheme
// Update src/utils/scriptExecution.ts
export async function executeOmniFocusScript(scriptPath: string, args?: any): Promise<any> {
  try {
    // Get the actual script path (existing code remains the same)
    let actualPath;
    if (scriptPath.startsWith('@')) {
      const scriptName = scriptPath.substring(1);
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = dirname(__filename);
      
      const distPath = join(__dirname, '..', 'utils', 'omnifocusScripts', scriptName);
      const srcPath = join(__dirname, '..', '..', 'src', 'utils', 'omnifocusScripts', scriptName);
      
      if (existsSync(distPath)) {
        actualPath = distPath;
      } else if (existsSync(srcPath)) {
        actualPath = srcPath;
      } else {
        actualPath = join(__dirname, '..', 'omnifocusScripts', scriptName);
      }
    } else {
      actualPath = scriptPath;
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
    
    // Create a temporary file for our JXA wrapper script
    const tempFile = join(tmpdir(), `jxa_wrapper_${Date.now()}.js`);
    
    // Escape the script content properly for use in JXA
    const escapedScript = scriptContent.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$/g, '\\$');
    
    // Create a JXA script that will execute our OmniJS script in OmniFocus
    const jxaScript = `
    function run() {
      try {
        const app = Application('OmniFocus');
        app.includeStandardAdditions = true;
        
        // Run the OmniJS script in OmniFocus and capture the output
        const result = app.evaluateJavascript(\`${escapedScript}\`);
        
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
    const { stdout, stderr } = await execAsync(`osascript -l JavaScript ${tempFile}`);
    
    // Clean up the temporary file
    unlinkSync(tempFile);
    
    if (stderr) {
      console.error("Script stderr output:", stderr);
    }
    
    // Parse the output as JSON
    try {
      return JSON.parse(stdout);
    } catch (parseError) {
      console.error("Error parsing script output:", parseError);
      return stdout;
    }
  } catch (error) {
    console.error("Failed to execute OmniFocus script:", error);
    throw error;
  }
}
    