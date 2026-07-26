import { executeOmniFocusScript } from "../../utils/scriptExecution.js";

export interface GetProjectsOptions {
  status?: string[];
  folderName?: string;
  includeReviewData?: boolean;
}

export async function getProjects(
  options: GetProjectsOptions = {},
): Promise<string> {
  const { status, folderName, includeReviewData = true } = options;

  try {
    const result = await executeOmniFocusScript("@getProjects.js", {
      statusFilter: status || null,
      folderFilter: folderName || null,
      includeReviewData: includeReviewData,
    });

    if (typeof result === "string") {
      return result;
    }

    if (result && typeof result === "object") {
      const data = result as any;

      if (data.error) {
        throw new Error(data.error);
      }

      let output = `## Projects`;

      // Add filter summary
      const filters: string[] = [];
      if (status && status.length > 0)
        filters.push(`status: ${status.join(", ")}`);
      if (folderName) filters.push(`folder: ${folderName}`);
      if (filters.length > 0) {
        output += ` (${filters.join("; ")})`;
      }
      output += `\n\n`;

      if (data.projects && Array.isArray(data.projects)) {
        if (data.projects.length === 0) {
          output += "No projects found matching filters.\n";
        } else {
          output += `Found ${data.projects.length} project${data.projects.length === 1 ? "" : "s"}:\n\n`;

          data.projects.forEach((proj: any) => {
            const statusBadge = proj.status === "OnHold" ? " [OnHold]" : "";
            const flagSymbol = proj.flagged ? " 🚩" : "";
            const folderStr = proj.folderName
              ? ` 📁 ${proj.folderName}`
              : "";
            const dueDateStr = proj.dueDate
              ? ` [due: ${new Date(proj.dueDate).toLocaleDateString()}]`
              : "";

            output += `P: ${proj.name}${statusBadge}${flagSymbol}${folderStr} (${proj.taskCount} tasks)${dueDateStr}\n`;
            output += `   ID: ${proj.id}\n`;

            if (includeReviewData && proj.nextReviewDate) {
              const nextReview = new Date(
                proj.nextReviewDate,
              ).toLocaleDateString();
              const lastReview = proj.lastReviewDate
                ? new Date(proj.lastReviewDate).toLocaleDateString()
                : "never";
              const interval = proj.reviewInterval
                ? `every ${proj.reviewInterval.steps} ${proj.reviewInterval.unit}`
                : "no interval set";
              output += `   Review: next ${nextReview}, last ${lastReview}, ${interval}\n`;
            }

            if (proj.note && proj.note.trim()) {
              const notePreview = proj.note.trim().substring(0, 100);
              output += `   Note: ${notePreview}${proj.note.trim().length > 100 ? "..." : ""}\n`;
            }

            output += "\n";
          });
        }
      }

      return output;
    }

    return "Unexpected result format from OmniFocus";
  } catch (error) {
    console.error("Error in getProjects:", error);
    throw new Error(
      `Failed to get projects: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}
