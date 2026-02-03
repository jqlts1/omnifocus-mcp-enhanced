// 通过自定义透视名称获取任务（支持层级关系）
// 基于用户提供的优秀代码改进

(() => {
  try {
    // 获取注入的参数
    const perspectiveName = injectedArgs && injectedArgs.perspectiveName ? injectedArgs.perspectiveName : null;

    if (!perspectiveName) {
      throw new Error("透视名称不能为空");
    }

    // 通过名称获取自定义透视
    let perspective = Perspective.Custom.byName(perspectiveName);
    if (!perspective) {
      throw new Error(`未找到名为 "${perspectiveName}" 的自定义透视`);
    }

    // 切换到指定透视
    document.windows[0].perspective = perspective;

    // 用于存储所有任务，key为任务ID（支持层级关系）
    let taskMap = {};

    // 遍历内容树，收集任务信息（含层级关系）
    let rootNode = document.windows[0].content.rootNode;

    function collectTasks(node, parentId) {
      if (node.object && node.object instanceof Task) {
        let t = node.object;
        let id = t.id.primaryKey;

        // 记录任务信息（包含层级关系）
        taskMap[id] = {
          id: id,
          name: t.name,
          note: t.note || "",
          project: t.containingProject ? t.containingProject.name : (t.project ? t.project.name : null),
          tags: t.tags ? t.tags.map(tag => tag.name) : [],
          dueDate: t.dueDate ? t.dueDate.toISOString() : null,
          deferDate: t.deferDate ? t.deferDate.toISOString() : null,
          completed: t.completed,
          flagged: t.flagged,
          estimatedMinutes: t.estimatedMinutes || null,
          repetitionRule: t.repetitionRule ? t.repetitionRule.toString() : null,
          creationDate: t.added ? t.added.toISOString() : null,
          completionDate: t.completedDate ? t.completedDate.toISOString() : null,
          parent: parentId,     // 父任务ID
          children: [],         // 子任务ID列表，后面补充
        };

        // 递归收集子任务
        node.children.forEach(childNode => {
          if (childNode.object && childNode.object instanceof Task) {
            let childId = childNode.object.id.primaryKey;
            taskMap[id].children.push(childId);
            collectTasks(childNode, id);
          } else {
            collectTasks(childNode, id);
          }
        });
      } else {
        // 不是任务节点，递归子节点
        node.children.forEach(childNode => collectTasks(childNode, parentId));
      }
    }

    // 开始收集任务（根任务的parent为null）
    if (rootNode && rootNode.children) {
      rootNode.children.forEach(node => collectTasks(node, null));
    }

    // 计算任务总数
    const taskCount = Object.keys(taskMap).length;

    // 返回结果（包含层级结构）
    const result = {
      success: true,
      perspectiveName: perspectiveName,
      perspectiveId: perspective.identifier,
      count: taskCount,
      taskMap: taskMap
    };

    return JSON.stringify(result);

  } catch (error) {
    // 错误处理
    const errorResult = {
      success: false,
      error: error.message || String(error),
      perspectiveName: perspectiveName || null,
      perspectiveId: null,
      count: 0,
      taskMap: {}
    };

    return JSON.stringify(errorResult);
  }
})();