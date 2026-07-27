// Atomically preflight and mark OmniFocus projects reviewed by stable ID.
(() => {
  const args = typeof injectedArgs !== "undefined" ? injectedArgs : {};
  const projectIds = Array.isArray(args.projectIds) ? args.projectIds : [];

  function fail(error) {
    return JSON.stringify({ success: false, error });
  }

  function projectById(id) {
    return flattenedProjects.find((project) => {
      if (project.id.primaryKey === id) return true;
      try {
        return project.task && project.task.id.primaryKey === id;
      } catch (error) {
        return false;
      }
    }) || null;
  }

  function statusName(project) {
    if (project.status === Project.Status.Active) return "Active";
    if (project.status === Project.Status.OnHold) return "OnHold";
    if (project.status === Project.Status.Done) return "Done";
    if (project.status === Project.Status.Dropped) return "Dropped";
    return "Unknown";
  }

  function intervalSnapshot(interval) {
    if (!interval) return null;
    return {
      steps: interval.steps,
      unit: String(interval.unit),
      fixed: !!interval.fixed,
    };
  }

  function sameInterval(actual, expected) {
    const snapshot = intervalSnapshot(actual);
    return !!snapshot &&
      snapshot.steps === expected.steps &&
      snapshot.unit === expected.unit &&
      snapshot.fixed === expected.fixed;
  }

  try {
    if (projectIds.length === 0) return fail("At least one project ID is required");

    const seen = new Set();
    const plans = [];
    for (let index = 0; index < projectIds.length; index += 1) {
      const requestedId = String(projectIds[index] || "").trim();
      if (!requestedId) return fail(`Project ID ${index + 1} is empty`);
      if (seen.has(requestedId)) return fail(`Duplicate project ID: ${requestedId}`);
      seen.add(requestedId);

      const project = projectById(requestedId);
      if (!project) return fail(`Project not found: ${requestedId}`);

      const status = statusName(project);
      if (status !== "Active" && status !== "OnHold") {
        return fail(`Project is not eligible for review: ${project.name} (${status})`);
      }

      const interval = intervalSnapshot(project.reviewInterval);
      if (!interval || !Number.isFinite(interval.steps) || interval.steps <= 0) {
        return fail(`Project has no usable review interval: ${project.name}`);
      }

      if (!project.nextReviewDate) {
        return fail(`Project has no next review date: ${project.name}`);
      }

      plans.push({
        requestedId,
        project,
        interval,
        previousLastReviewDate: project.lastReviewDate || null,
      });
    }

    const reviewTimestamp = new Date();
    try {
      for (const plan of plans) {
        plan.project.lastReviewDate = reviewTimestamp;
      }
    } catch (error) {
      for (const plan of plans) {
        try { plan.project.lastReviewDate = plan.previousLastReviewDate; } catch (rollbackError) {}
      }
      return fail(`Failed to mark projects reviewed: ${String(error)}. Previous review dates were restored.`);
    }

    const mismatches = plans.filter((plan) => {
      const lastReviewMatches =
        plan.project.lastReviewDate &&
        plan.project.lastReviewDate.getTime() === reviewTimestamp.getTime();
      const nextReviewValid =
        plan.project.nextReviewDate &&
        plan.project.nextReviewDate.getTime() > reviewTimestamp.getTime();
      return !lastReviewMatches || !nextReviewValid || !sameInterval(plan.project.reviewInterval, plan.interval);
    });

    if (mismatches.length > 0) {
      const rollbackFailures = [];
      for (const plan of plans) {
        try {
          plan.project.lastReviewDate = plan.previousLastReviewDate;
        } catch (error) {
          rollbackFailures.push(plan.project.name);
        }
      }
      const names = mismatches.map((plan) => plan.project.name).join(", ");
      const rollbackText = rollbackFailures.length > 0
        ? ` Rollback failed for: ${rollbackFailures.join(", ")}.`
        : " Previous review dates were restored.";
      return fail(`Review verification failed for: ${names}.${rollbackText}`);
    }

    return JSON.stringify({
      success: true,
      reviewedAt: reviewTimestamp.toISOString(),
      count: plans.length,
      projects: plans.map((plan) => ({
        id: plan.requestedId,
        name: plan.project.name,
        status: statusName(plan.project),
        lastReviewDate: plan.project.lastReviewDate.toISOString(),
        nextReviewDate: plan.project.nextReviewDate.toISOString(),
        reviewInterval: intervalSnapshot(plan.project.reviewInterval),
        verified: true,
      })),
    });
  } catch (error) {
    return fail(`Failed to mark projects reviewed: ${error && error.message ? error.message : String(error)}`);
  }
})();
