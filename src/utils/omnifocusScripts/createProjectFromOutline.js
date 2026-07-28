// Preflight, create, verify, and roll back one confirmed project outline.
(() => {
  const args = typeof injectedArgs !== "undefined" ? injectedArgs : {};
  const plan = args.plan || null;

  function result(value) {
    return JSON.stringify(value);
  }

  function fail(code, error, extra) {
    return result({ success: false, code, error, ...(extra || {}) });
  }

  function primaryKey(object) {
    return object && object.id ? String(object.id.primaryKey) : null;
  }

  function findById(collection, id) {
    return collection.find((object) => primaryKey(object) === id) || null;
  }

  function asArray(value) {
    try {
      return Array.from(value || []);
    } catch (_error) {
      return [];
    }
  }

  function objectTags(object) {
    return asArray(object.tags);
  }


  function dateValue(value, path, field) {
    if (value === undefined || value === null) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new Error(`${path}: ${field} must be a valid ISO date`);
    }
    return date;
  }

  function normalizeExpectedDate(value) {
    if (value === undefined || value === null) return null;
    return new Date(value).toISOString();
  }

  function normalizeActualDate(value) {
    if (value === undefined || value === null) return null;
    try {
      return new Date(value).toISOString();
    } catch (_error) {
      return null;
    }
  }

  function sameDate(actual, expected) {
    if (expected === undefined) return true;
    return normalizeActualDate(actual) === normalizeExpectedDate(expected);
  }

  function sameStrings(actual, expected) {
    return String(actual || "") === String(expected || "");
  }

  function expectedTagIds(tagIds, resolvedTags) {
    const selected = [];
    for (const tagId of tagIds || []) {
      const tag = resolvedTags[tagId];
      const exclusiveParent = tag && tag.parent && tag.parent.childrenAreMutuallyExclusive === true
        ? primaryKey(tag.parent)
        : null;
      if (exclusiveParent) {
        for (let index = selected.length - 1; index >= 0; index -= 1) {
          const selectedTag = resolvedTags[selected[index]];
          if (selectedTag.parent && primaryKey(selectedTag.parent) === exclusiveParent) {
            selected.splice(index, 1);
          }
        }
      }
      selected.push(tagId);
    }
    return selected;
  }

  function sameTags(object, expectedIds, resolvedTags, inheritedIds) {
    const actual = objectTags(object).map(primaryKey).filter(Boolean).sort();
    const expected = expectedTagIds([...(inheritedIds || []), ...expectedIds], resolvedTags).sort();
    return actual.length === expected.length && actual.every((id, index) => id === expected[index]);
  }

  function validatePlan() {
    if (!plan || !plan.project || !Array.isArray(plan.tasks) || !Array.isArray(plan.tagIds)) {
      throw new Error("project: invalid execution plan");
    }
    if (!String(plan.project.name || "").trim()) {
      throw new Error("project: name must not be empty");
    }
    if (plan.tasks.length > 200) throw new Error("project.tasks: exceeds 200 task nodes");

    for (let index = 0; index < plan.tasks.length; index += 1) {
      const node = plan.tasks[index];
      if (node.planIndex !== index || !String(node.name || "").trim()) {
        throw new Error(`${node.path || `task ${index}`}: invalid plan node`);
      }
      if (
        node.parentPlanIndex !== null &&
        (!Number.isInteger(node.parentPlanIndex) || node.parentPlanIndex < 0 || node.parentPlanIndex >= index)
      ) {
        throw new Error(`${node.path}: invalid parent plan index`);
      }
      for (const field of ["dueDate", "deferDate", "plannedDate"]) {
        dateValue(node[field], node.path, field);
      }
    }
    for (const field of ["dueDate", "deferDate", "plannedDate"]) {
      dateValue(plan.project[field], plan.projectPath, field);
    }
  }

  function resolveReferences() {
    const folder = plan.project.folderId
      ? findById(flattenedFolders, plan.project.folderId)
      : null;
    if (plan.project.folderId && (!folder || folder.active === false)) {
      return {
        error: `Folder not found or inactive: ${plan.project.folderId}`,
        paths: [plan.projectPath],
      };
    }

    const tags = {};
    for (const tagId of plan.tagIds) {
      const tag = findById(flattenedTags, tagId);
      if (!tag || tag.active === false) {
        const paths = [];
        if ((plan.project.tagIds || []).includes(tagId)) paths.push(plan.projectPath);
        for (const node of plan.tasks) {
          if ((node.tagIds || []).includes(tagId)) paths.push(node.path);
        }
        return { error: `Tag not found or inactive: ${tagId}`, paths };
      }
      tags[tagId] = tag;
    }
    return { folder, tags };
  }

  function assignTags(object, tagIds, resolvedTags) {
    for (const tagId of tagIds || []) object.addTag(resolvedTags[tagId]);
  }

  function applyFields(object, expected, resolvedTags, path) {
    if (expected.note !== undefined) object.note = expected.note;
    if (expected.dueDate !== undefined) object.dueDate = dateValue(expected.dueDate, path, "dueDate");
    if (expected.deferDate !== undefined) object.deferDate = dateValue(expected.deferDate, path, "deferDate");
    if (expected.plannedDate !== undefined) object.plannedDate = dateValue(expected.plannedDate, path, "plannedDate");
    if (expected.flagged !== undefined) object.flagged = expected.flagged;
    if (expected.estimatedMinutes !== undefined) object.estimatedMinutes = expected.estimatedMinutes;
    if (expected.sequential !== undefined) object.sequential = expected.sequential;
    assignTags(object, expected.tagIds || [], resolvedTags);
  }

  function projectStillExists(projectId) {
    return !!findById(flattenedProjects, projectId);
  }

  function rollback(projectId, failureCode, error) {
    if (!projectStillExists(projectId)) return fail(failureCode, error);
    if (document.canUndo) {
      try {
        document.undo();
      } catch (_undoError) {
        // Report the residual project below.
      }
    }
    if (!projectStillExists(projectId)) return fail(failureCode, error);
    return fail("ROLLBACK_UNCONFIRMED", error, {
      residualProjectId: projectId,
      recovery: `Delete project ${projectId} in OmniFocus before retrying.`,
    });
  }

  function verifyCore(object, expected, resolvedTags, inheritedTagIds, path, mismatches) {
    if (!object) {
      mismatches.push(`${path}: missing`);
      return;
    }
    if (!sameStrings(object.name, expected.name)) mismatches.push(`${path}: name`);
    if (expected.note !== undefined && !sameStrings(object.note, expected.note)) mismatches.push(`${path}: note`);
    if (!sameDate(object.dueDate, expected.dueDate)) mismatches.push(`${path}: dueDate`);
    if (!sameDate(object.deferDate, expected.deferDate)) mismatches.push(`${path}: deferDate`);
    if (!sameDate(object.plannedDate, expected.plannedDate)) mismatches.push(`${path}: plannedDate`);
    if (expected.flagged !== undefined && Boolean(object.flagged) !== expected.flagged) mismatches.push(`${path}: flagged`);
    if (
      expected.estimatedMinutes !== undefined &&
      Number(object.estimatedMinutes) !== expected.estimatedMinutes
    ) mismatches.push(`${path}: estimatedMinutes`);
    if (expected.sequential !== undefined && Boolean(object.sequential) !== expected.sequential) mismatches.push(`${path}: sequential`);
    if (!sameTags(object, expected.tagIds || [], resolvedTags, inheritedTagIds)) mismatches.push(`${path}: tagIds`);
  }

  try {
    validatePlan();
    const references = resolveReferences();
    if (references.error) {
      return fail("REFERENCE_NOT_FOUND", references.error, {
        affectedPaths: references.paths,
      });
    }

    let project = null;
    const createdTasks = [];
    try {
      project = new Project(
        plan.project.name,
        references.folder ? references.folder.ending : null,
      );
      applyFields(project, plan.project, references.tags, plan.projectPath);

      for (const node of plan.tasks) {
        const parent = node.parentPlanIndex === null
          ? project
          : createdTasks[node.parentPlanIndex];
        const task = new Task(node.name, parent);
        applyFields(task, node, references.tags, node.path);
        createdTasks.push(task);
      }
    } catch (error) {
      if (!project) {
        return fail("CREATE_FAILED_ROLLED_BACK", `Project creation failed: ${String(error)}`);
      }
      return rollback(primaryKey(project), "CREATE_FAILED_ROLLED_BACK", `Project creation failed: ${String(error)}`);
    }

    const projectId = primaryKey(project);
    const mismatches = [];
    const actualProject = findById(flattenedProjects, projectId);
    verifyCore(actualProject, plan.project, references.tags, [], plan.projectPath, mismatches);
    const actualFolderId = actualProject && actualProject.parentFolder
      ? primaryKey(actualProject.parentFolder)
      : null;
    if (actualFolderId !== (plan.project.folderId || null)) {
      mismatches.push(`${plan.projectPath}: folderId`);
    }

    if (createdTasks.length !== plan.tasks.length) mismatches.push(`${plan.projectPath}: task count`);
    for (let index = 0; index < plan.tasks.length; index += 1) {
      const node = plan.tasks[index];
      const taskId = primaryKey(createdTasks[index]);
      const actual = findById(flattenedTasks, taskId);
      const ancestorTagIds = [];
      let ancestorIndex = node.parentPlanIndex;
      while (ancestorIndex !== null) {
        ancestorTagIds.unshift(...(plan.tasks[ancestorIndex].tagIds || []));
        ancestorIndex = plan.tasks[ancestorIndex].parentPlanIndex;
      }
      const inheritedTagIds = [
        ...(plan.project.tagIds || []),
        ...ancestorTagIds,
      ];
      verifyCore(actual, node, references.tags, inheritedTagIds, node.path, mismatches);
      const expectedParentId = node.parentPlanIndex === null
        ? projectId
        : primaryKey(createdTasks[node.parentPlanIndex]);
      const actualParentId = actual && actual.parent
        ? primaryKey(actual.parent)
        : actual && actual.containingProject
          ? primaryKey(actual.containingProject)
          : null;
      if (actualParentId !== expectedParentId) mismatches.push(`${node.path}: parent`);
    }

    const projectTaskCount = actualProject ? asArray(actualProject.flattenedTasks).length : 0;
    if (projectTaskCount !== plan.tasks.length) mismatches.push(`${plan.projectPath}: project task count`);

    if (mismatches.length > 0) {
      return rollback(
        projectId,
        "VERIFICATION_FAILED_ROLLED_BACK",
        `Verification failed: ${mismatches.join("; ")}`,
      );
    }

    return result({
      success: true,
      projectId,
      taskCount: plan.tasks.length,
      items: [
        {
          id: projectId,
          type: "project",
          path: plan.projectPath,
          parentId: plan.project.folderId || null,
          verified: true,
        },
        ...plan.tasks.map((node, index) => ({
          id: primaryKey(createdTasks[index]),
          type: "task",
          path: node.path,
          parentId: node.parentPlanIndex === null
            ? projectId
            : primaryKey(createdTasks[node.parentPlanIndex]),
          verified: true,
        })),
      ],
    });
  } catch (error) {
    return fail("INVALID_OUTLINE", error && error.message ? error.message : String(error));
  }
})();
