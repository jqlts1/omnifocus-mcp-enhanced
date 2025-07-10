// 通过自定义透视名称获取任务
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
    
    // 用于存储所有任务
    let tasks = [];
    
    // 遍历内容树，收集任务信息
    let rootNode = document.windows[0].content.rootNode;
    
    function collectTasks(node) {
      if (node.object && node.object instanceof Task) {
        let t = node.object;
        
        // 收集任务详细信息
        let taskInfo = {
          id: t.id.primaryKey,
          name: t.name,
          note: t.note || "",
          project: t.project ? t.project.name : null,
          tags: t.tags ? t.tags.map(tag => tag.name) : [],
          dueDate: t.dueDate ? t.dueDate.toISOString() : null,
          deferDate: t.deferDate ? t.deferDate.toISOString() : null,
          completed: t.completed,
          flagged: t.flagged,
          estimatedMinutes: t.estimatedMinutes || null,
          repetitionRule: t.repetitionRule ? t.repetitionRule.toString() : null,
          creationDate: t.added ? t.added.toISOString() : null,
          completionDate: t.completedDate ? t.completedDate.toISOString() : null
        };
        
        tasks.push(taskInfo);
      }
      
      // 递归处理子节点
      if (node.children && node.children.length > 0) {
        node.children.forEach(childNode => collectTasks(childNode));
      }
    }
    
    // 开始收集任务
    if (rootNode && rootNode.children) {
      rootNode.children.forEach(node => collectTasks(node));
    }
    
    // 返回结果
    const result = {
      success: true,
      perspectiveName: perspectiveName,
      perspectiveId: perspective.identifier,
      count: tasks.length,
      tasks: tasks
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
      tasks: []
    };
    
    return JSON.stringify(errorResult);
  }
})();