import { ReadResourceResult } from "@modelcontextprotocol/sdk/types.js";
import { queryOmnifocus } from '../tools/primitives/queryOmnifocus.js';
import { Logger } from '../utils/logger.js';

export async function readStats(logger: Logger): Promise<ReadResourceResult> {
  logger.debug("resource:stats", "Reading database statistics");

  const [taskResult, projectResult, folderResult] = await Promise.all([
    queryOmnifocus({ entity: 'tasks', summary: true }),
    queryOmnifocus({ entity: 'projects', summary: true }),
    queryOmnifocus({ entity: 'folders', summary: true })
  ]);

  const stats = {
    activeTasks: taskResult.count ?? 0,
    activeProjects: projectResult.count ?? 0,
    folders: folderResult.count ?? 0,
    timestamp: new Date().toISOString()
  };

  return {
    contents: [{
      uri: "omnifocus://stats",
      mimeType: "application/json",
      text: JSON.stringify(stats, null, 2)
    }]
  };
}
