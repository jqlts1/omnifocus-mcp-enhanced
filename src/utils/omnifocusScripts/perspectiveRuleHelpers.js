// Shared helpers for the custom-perspective rule scripts.
//
// Reading and writing rules must agree on how a perspective is located and how
// primary keys map to display names, so both live here rather than being
// duplicated per script.

// eslint-disable-next-line no-unused-vars
function findCustomPerspective(id, name) {
  if (id) {
    const byId = Perspective.Custom.byIdentifier(id);
    if (byId) return byId;
  }
  if (name) {
    const matches = Perspective.Custom.all.filter((p) => p.name === name);
    if (matches.length > 1) {
      throw new Error(
        'Multiple custom perspectives are named "' +
          name +
          '". Use perspectiveId instead; ids: ' +
          matches.map((p) => p.identifier).join(', '),
      );
    }
    if (matches.length === 1) return matches[0];
  }
  return null;
}

// Full path so a leaf tag such as "守一" under "团队" is unambiguous.
// eslint-disable-next-line no-unused-vars
function perspectiveTagPath(tag) {
  const parts = [tag.name];
  let parent = tag.parent;
  let guard = 0;
  while (parent && guard < 20) {
    parts.unshift(parent.name);
    parent = parent.parent;
    guard += 1;
  }
  return parts.join(' / ');
}

// Every primary key mentioned anywhere in a rule tree.
// eslint-disable-next-line no-unused-vars
function collectPerspectiveRefIds(rules, into) {
  if (!Array.isArray(rules)) return;
  rules.forEach((rule) => {
    if (!rule || typeof rule !== 'object') return;
    if (rule.disabledRule) {
      collectPerspectiveRefIds([rule.disabledRule], into);
      return;
    }
    if (Array.isArray(rule.aggregateRules)) {
      collectPerspectiveRefIds(rule.aggregateRules, into);
      return;
    }
    ['actionHasAnyOfTags', 'actionHasAllOfTags', 'actionWithinFocus'].forEach(
      (key) => {
        if (Array.isArray(rule[key])) {
          rule[key].forEach((id) => {
            if (typeof id === 'string') into[id] = true;
          });
        }
      },
    );
  });
}

// eslint-disable-next-line no-unused-vars
function buildPerspectiveRefNames(rules) {
  const wantedIds = {};
  collectPerspectiveRefIds(rules, wantedIds);

  const names = {};
  const remaining = {};
  let outstanding = 0;
  Object.keys(wantedIds).forEach((id) => {
    remaining[id] = true;
    outstanding += 1;
  });
  if (outstanding === 0) return names;

  const absorb = (collection, decorate) => {
    if (outstanding === 0) return;
    collection.forEach((item) => {
      if (outstanding === 0) return;
      let key;
      try {
        key = item.id.primaryKey;
      } catch (e) {
        return;
      }
      if (remaining[key]) {
        names[key] = decorate(item);
        delete remaining[key];
        outstanding -= 1;
      }
    });
  };

  absorb(flattenedTags, perspectiveTagPath);
  absorb(flattenedFolders, (folder) => folder.name);
  absorb(flattenedProjects, (project) => project.name);
  return names;
}

// Resolves a display name to a primary key, refusing ambiguous matches so a
// rule is never silently pointed at the wrong tag or project.
// eslint-disable-next-line no-unused-vars
function resolvePerspectiveRef(kind, name) {
  const candidates = [];
  if (kind === 'tag') {
    flattenedTags.forEach((tag) => {
      if (tag.name === name || perspectiveTagPath(tag) === name) {
        candidates.push({
          id: tag.id.primaryKey,
          label: 'tag ' + perspectiveTagPath(tag),
        });
      }
    });
  } else {
    flattenedFolders.forEach((folder) => {
      if (folder.name === name) {
        candidates.push({
          id: folder.id.primaryKey,
          label: 'folder ' + folder.name,
        });
      }
    });
    flattenedProjects.forEach((project) => {
      if (project.name === name) {
        candidates.push({
          id: project.id.primaryKey,
          label: 'project ' + project.name,
        });
      }
    });
  }

  if (candidates.length === 0) {
    throw new Error(
      'No ' +
        (kind === 'tag' ? 'tag' : 'folder or project') +
        ' named "' +
        name +
        '"',
    );
  }
  if (candidates.length > 1) {
    throw new Error(
      'The name "' +
        name +
        '" is ambiguous; it matches ' +
        candidates.map((c) => c.label).join(', ') +
        '. Reference it by id instead.',
    );
  }
  return candidates[0].id;
}
