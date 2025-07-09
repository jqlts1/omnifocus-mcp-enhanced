import { executeOmniFocusScript } from '../../utils/scriptExecution.js';

export interface ListCustomPerspectivesOptions {
  includeBuiltIn?: boolean;
  includeSidebar?: boolean;
  format?: "simple" | "detailed";
}

export async function listCustomPerspectives(options: ListCustomPerspectivesOptions = {}): Promise<string> {
  const { includeBuiltIn = false, includeSidebar = true, format = "detailed" } = options;
  
  try {
    // Execute the list perspectives script
    const result = await executeOmniFocusScript('@listPerspectives.js', {
      includeBuiltIn,
      includeSidebar,
      format
    });
    
    if (typeof result === 'string') {
      return result;
    }
    
    // If result is an object, format it
    if (result && typeof result === 'object') {
      const data = result as any;
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      // Format the perspectives list
      let output = `# 🔍 OMNIFOCUS PERSPECTIVES\n\n`;
      
      if (data.perspectives && Array.isArray(data.perspectives)) {
        if (data.perspectives.length === 0) {
          output += "📪 No custom perspectives found.\n";
          output += "\n**Tip**: Create custom perspectives in OmniFocus to organize your workflow!\n";
        } else {
          const perspectiveCount = data.perspectives.length;
          output += `Found ${perspectiveCount} perspective${perspectiveCount === 1 ? '' : 's'}:\n\n`;
          
          // Group perspectives by type
          const groupedPerspectives = groupPerspectivesByType(data.perspectives);
          
          Object.entries(groupedPerspectives).forEach(([type, perspectives]) => {
            if (perspectives.length > 0) {
              output += `## ${getTypeEmoji(type)} ${getTypeDisplayName(type)}\n`;
              
              perspectives.forEach((perspective: any) => {
                if (format === "simple") {
                  output += `• ${perspective.name}\n`;
                } else {
                  output += formatDetailedPerspective(perspective);
                }
              });
              
              output += '\n';
            }
          });
          
          // Add usage instructions
          output += `💡 **Usage**: Use \`get_custom_perspective({"name": "PerspectiveName"})\` to view tasks\n`;
        }
      } else {
        output += "No perspective data available\n";
      }
      
      return output;
    }
    
    return "Unexpected result format from OmniFocus";
    
  } catch (error) {
    console.error("Error in listCustomPerspectives:", error);
    throw new Error(`Failed to list custom perspectives: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Group perspectives by type for better organization
function groupPerspectivesByType(perspectives: any[]): { [key: string]: any[] } {
  const groups: { [key: string]: any[] } = {
    'custom': [],
    'builtin': [],
    'sidebar': []
  };
  
  perspectives.forEach(perspective => {
    const type = perspective.type || 'custom';
    if (groups[type]) {
      groups[type].push(perspective);
    } else {
      groups['custom'].push(perspective);
    }
  });
  
  return groups;
}

// Get emoji for perspective type
function getTypeEmoji(type: string): string {
  const emojiMap: { [key: string]: string } = {
    'custom': '🎯',
    'builtin': '🏠',
    'sidebar': '📂'
  };
  return emojiMap[type] || '🔍';
}

// Get display name for perspective type
function getTypeDisplayName(type: string): string {
  const nameMap: { [key: string]: string } = {
    'custom': 'Custom Perspectives',
    'builtin': 'Built-in Perspectives',
    'sidebar': 'Sidebar Items'
  };
  return nameMap[type] || 'Other Perspectives';
}

// Format a detailed perspective entry
function formatDetailedPerspective(perspective: any): string {
  let output = `• **${perspective.name}**`;
  
  // Add description if available
  if (perspective.description && perspective.description.trim()) {
    output += ` - ${perspective.description.trim()}`;
  }
  
  output += '\n';
  
  // Add metadata if available
  const metadata: string[] = [];
  
  if (perspective.taskCount !== undefined) {
    metadata.push(`${perspective.taskCount} task${perspective.taskCount === 1 ? '' : 's'}`);
  }
  
  if (perspective.lastUsed) {
    const lastUsedDate = new Date(perspective.lastUsed).toLocaleDateString();
    metadata.push(`Last used: ${lastUsedDate}`);
  }
  
  if (perspective.isDefault) {
    metadata.push('Default perspective');
  }
  
  if (metadata.length > 0) {
    output += `  📊 ${metadata.join(' • ')}\n`;
  }
  
  return output + '\n';
}