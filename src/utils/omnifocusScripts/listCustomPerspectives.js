// 获取所有自定义透视列表
// 基于 OmniJS API: Perspective.Custom.all

(() => {
  try {
    // 获取所有自定义透视
    const customPerspectives = Perspective.Custom.all;
    
    // 格式化结果
    const perspectives = customPerspectives.map(p => ({
      name: p.name,
      identifier: p.identifier
    }));
    
    // 返回结果
    const result = {
      success: true,
      count: perspectives.length,
      perspectives: perspectives
    };
    
    return JSON.stringify(result);
    
  } catch (error) {
    // 错误处理
    const errorResult = {
      success: false,
      error: error.message || String(error),
      count: 0,
      perspectives: []
    };
    
    return JSON.stringify(errorResult);
  }
})();