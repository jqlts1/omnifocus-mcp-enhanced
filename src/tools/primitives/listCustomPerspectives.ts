import { executeOmniFocusScript } from '../../utils/scriptExecution.js';

export interface ListCustomPerspectivesOptions {
  format?: 'simple' | 'detailed';
}

export async function listCustomPerspectives(options: ListCustomPerspectivesOptions = {}): Promise<string> {
  const { format = 'simple' } = options;

  try {
    console.log('Starting listCustomPerspectives script...');

    // Execute the list custom perspectives script
    const result = await executeOmniFocusScript('@listCustomPerspectives.js', {});

    console.log('Script execution complete, result type:', typeof result);
    console.log('Script execution result:', result);

    // Handle various possible return types
    let data: any;

    if (typeof result === 'string') {
      console.log('Result is a string, attempting JSON parse...');
      try {
        data = JSON.parse(result);
        console.log('JSON parse succeeded:', data);
      } catch (parseError) {
        console.error('JSON parse failed:', parseError);
        throw new Error(`Failed to parse string result: ${result}`);
      }
    } else if (typeof result === 'object' && result !== null) {
      console.log('Result is an object, using directly...');
      data = result;
    } else {
      console.error('Invalid result type:', typeof result, result);
      throw new Error(`Script returned an invalid result type: ${typeof result}, value: ${result}`);
    }

    // Check for errors
    if (!data.success) {
      throw new Error(data.error || 'Unknown error occurred');
    }

    // Format output
    if (data.count === 0) {
      return "**Custom Perspectives**\n\nNo custom perspectives found.";
    }

    if (format === 'simple') {
      // Simple format: names only
      const perspectiveNames = data.perspectives.map((p: any) => p.name);
      return `**Custom Perspectives** (${data.count})\n\n${perspectiveNames.map((name: string, index: number) => `${index + 1}. ${name}`).join('\n')}`;
    } else {
      // Detailed format: name and identifier
      const perspectiveDetails = data.perspectives.map((p: any, index: number) =>
        `${index + 1}. **${p.name}**\n   ID: ${p.identifier}`
      );
      return `**Custom Perspectives** (${data.count})\n\n${perspectiveDetails.join('\n\n')}`;
    }

  } catch (error) {
    console.error('Error in listCustomPerspectives:', error);
    return `Error: ${error instanceof Error ? error.message : String(error)}`;
  }
}
