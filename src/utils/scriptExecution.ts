import { execFile } from 'child_process';
import { promisify } from 'util';
import { writeFileSync, unlinkSync, readFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { existsSync } from 'fs';
import { randomUUID } from 'crypto';

const execFileAsync = promisify(execFile);

/**
 * Safely execute AppleScript by writing to a temp file.
 * Uses execFile (no shell) and randomUUID for temp file names.
 */
export async function executeAppleScript(script: string): Promise<string> {
  const tempFile = join(tmpdir(), `applescript_${randomUUID()}.scpt`);

  try {
    writeFileSync(tempFile, script);
    const { stdout, stderr } = await execFileAsync('osascript', [tempFile]);

    if (stderr) {
      console.error("AppleScript stderr:", stderr);
    }

    return stdout.trim();
  } finally {
    try {
      unlinkSync(tempFile);
    } catch (e) {
      // Ignore cleanup errors
    }
  }
}

/**
 * Execute a JXA (JavaScript for Automation) script via osascript.
 * Uses execFile (no shell), randomUUID temp names, and finally-based cleanup.
 */
export async function executeJXA(script: string): Promise<any[]> {
  const tempFile = join(tmpdir(), `jxa_script_${randomUUID()}.js`);

  try {
    writeFileSync(tempFile, script);
    const { stdout, stderr } = await execFileAsync('osascript', ['-l', 'JavaScript', tempFile]);

    if (stderr) {
      console.error("Script stderr output:", stderr);
    }

    try {
      const result = JSON.parse(stdout);
      return result;
    } catch (e) {
      console.error("Failed to parse script output as JSON:", e);

      if (stdout.includes("Found") && stdout.includes("tasks")) {
        return [];
      }

      return [];
    }
  } catch (error) {
    console.error("Failed to execute JXA script:", error);
    throw error;
  } finally {
    try {
      unlinkSync(tempFile);
    } catch (e) {
      // Ignore cleanup errors
    }
  }
}

/**
 * Execute an OmniJS script inside OmniFocus via the JXA bridge.
 *
 * Security hardening:
 *  - Path traversal prevention for @-prefixed script names
 *  - File-based script passing (OmniJS content written to a temp file,
 *    read by the JXA wrapper via ObjC Foundation) instead of fragile
 *    template-literal embedding
 *  - execFile (no shell) + randomUUID temp names + finally cleanup
 */
export async function executeOmniFocusScript(scriptPath: string, args?: any): Promise<any> {
  let tempJxaFile: string | undefined;
  let tempOmniFile: string | undefined;

  try {
    // Resolve the actual script path
    let actualPath;
    if (scriptPath.startsWith('@')) {
      const scriptName = scriptPath.substring(1);

      // Path traversal guard: reject names with .., /, or \
      if (/[/\\]|\.\./.test(scriptName)) {
        throw new Error(`Invalid script name: "${scriptName}" — must not contain path separators or ".."`);
      }

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

    // Read the OmniJS script file
    let scriptContent = readFileSync(actualPath, 'utf8');

    // If arguments are provided, inject them into the script
    if (args && Object.keys(args).length > 0) {
      const argsJson = JSON.stringify(args);
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

    // Write OmniJS script to a separate temp file (file-based passing)
    tempOmniFile = join(tmpdir(), `omnijs_${randomUUID()}.js`);
    writeFileSync(tempOmniFile, scriptContent);

    // JSON-encode the temp file path for safe embedding in JXA
    const safePathLiteral = JSON.stringify(tempOmniFile);

    // JXA wrapper reads OmniJS from the temp file via ObjC Foundation —
    // eliminates fragile template-literal string escaping.
    const jxaScript = `
    ObjC.import('Foundation');
    function run() {
      try {
        var path = ${safePathLiteral};
        var nsStr = $.NSString.stringWithContentsOfFileEncodingError(path, $.NSUTF8StringEncoding, null);
        if (nsStr == null) {
          return JSON.stringify({ error: "Failed to read OmniJS script file: " + path });
        }
        var scriptContent = ObjC.unwrap(nsStr);

        var app = Application('OmniFocus');
        app.includeStandardAdditions = true;

        var result = app.evaluateJavascript(scriptContent);
        return result;
      } catch (e) {
        return JSON.stringify({ error: e.message });
      }
    }
    `;

    tempJxaFile = join(tmpdir(), `jxa_wrapper_${randomUUID()}.js`);
    writeFileSync(tempJxaFile, jxaScript);

    const { stdout, stderr } = await execFileAsync('osascript', ['-l', 'JavaScript', tempJxaFile]);

    if (stderr) {
      console.error("Script stderr output:", stderr);
    }

    try {
      return JSON.parse(stdout);
    } catch (parseError) {
      console.error("Error parsing script output:", parseError);
      return stdout;
    }
  } catch (error) {
    console.error("Failed to execute OmniFocus script:", error);
    throw error;
  } finally {
    // Clean up both temp files
    for (const f of [tempJxaFile, tempOmniFile]) {
      if (f) {
        try { unlinkSync(f); } catch (e) { /* ignore */ }
      }
    }
  }
}
