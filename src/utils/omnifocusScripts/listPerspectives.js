// List Custom Perspectives from OmniFocus using OmniJS
(() => {
  try {
    // Use default values since parameters are not easily available in JXA mode
    let includeBuiltIn = false;
    let includeSidebar = true;
    let format = "detailed";
    
    console.log(`Listing perspectives with options: includeBuiltIn=${includeBuiltIn}, includeSidebar=${includeSidebar}, format=${format}`);
    
    // Use OmniJS document access
    const doc = Document.makeDefault();
    const perspectives = [];
    
    // Try to get custom perspectives from OmniFocus
    // Note: OmniFocus perspectives API may not be directly accessible via OmniJS
    // This is a limitation we need to work around
    
    try {
      // Attempt to access document perspectives
      if (doc.perspectives && typeof doc.perspectives === 'function') {
        const allPerspectives = doc.perspectives();
        console.log(`Found ${allPerspectives.length} total perspectives in OmniFocus`);
        
        allPerspectives.forEach(perspective => {
          try {
            const perspectiveData = {
              id: perspective.id || "unknown",
              name: perspective.name || "Unknown Perspective",
              type: "custom"
            };
            
            // Add detailed information if available
            if (format === "detailed") {
              perspectiveData.description = perspective.note || "";
              perspectiveData.taskCount = "N/A";
              
              // Check if it's a built-in perspective
              const isBuiltIn = checkIfBuiltInPerspective(perspectiveData.name);
              if (isBuiltIn) {
                perspectiveData.type = "builtin";
              }
            }
            
            // Filter based on options
            const shouldInclude = 
              (perspectiveData.type === "custom") ||
              (perspectiveData.type === "builtin" && includeBuiltIn);
              
            if (shouldInclude) {
              perspectives.push(perspectiveData);
            }
            
          } catch (perspectiveError) {
            console.log(`Error processing perspective: ${perspectiveError}`);
          }
        });
      } else {
        console.log("⚠️ Direct perspective access not available via OmniJS API");
        // Fallback: Create mock data for demonstration
        perspectives.push({
          name: "API Limitation",
          type: "note",
          description: "OmniFocus perspectives are not directly accessible via OmniJS. Use OmniFocus app directly to create and manage perspectives."
        });
      }
    } catch (perspectiveAPIError) {
      console.log(`⚠️ Perspective API access failed: ${perspectiveAPIError}`);
      // Add a helpful note about the limitation
      perspectives.push({
        name: "API Access Limited", 
        type: "note",
        description: "Custom perspectives require direct OmniFocus app access. Consider using the built-in perspective tools (get_inbox_tasks, get_flagged_tasks, etc.) or filter_tasks for advanced filtering."
      });
    }
    
    // Add sidebar items if requested
    if (includeSidebar) {
      try {
        // Add common sidebar perspectives
        const sidebarItems = [
          { name: "Inbox", type: "sidebar", description: "Tasks in your inbox" },
          { name: "Projects", type: "sidebar", description: "All projects" },
          { name: "Contexts", type: "sidebar", description: "All contexts/tags" },
          { name: "Forecast", type: "sidebar", description: "Upcoming tasks" },
          { name: "Flagged", type: "sidebar", description: "Flagged tasks" },
          { name: "Review", type: "sidebar", description: "Items due for review" },
          { name: "Completed", type: "sidebar", description: "Completed tasks" }
        ];
        
        sidebarItems.forEach(item => {
          if (format === "simple") {
            perspectives.push({ name: item.name, type: item.type });
          } else {
            perspectives.push({
              name: item.name,
              type: item.type,
              description: item.description,
              taskCount: "N/A",
              isBuiltIn: true
            });
          }
        });
      } catch (sidebarError) {
        console.log(`Error adding sidebar items: ${sidebarError}`);
      }
    }
    
    const result = {
      success: true,
      perspectives: perspectives,
      count: perspectives.length,
      options: {
        includeBuiltIn,
        includeSidebar,
        format
      }
    };
    
    console.log(`Successfully collected ${perspectives.length} perspectives`);
    
    return JSON.stringify(result);
    
  } catch (error) {
    console.error(`Error in listPerspectives script: ${error}`);
    return JSON.stringify({
      success: false,
      error: `Error listing perspectives: ${error}`,
      perspectives: []
    });
  }
})();

// Helper function to check if a perspective is built-in
function checkIfBuiltInPerspective(name) {
  const builtInNames = [
    "Inbox", "Projects", "Contexts", "Forecast", "Flagged", 
    "Review", "Completed", "Planning", "Nearby", "Search"
  ];
  return builtInNames.includes(name);
}