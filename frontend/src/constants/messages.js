/** 提示消息常量 */
export const MSG = {
  // 加载
  LOAD_FAIL: '加载数据失败',
  LOAD_DETAIL_FAIL: '加载失败',
  LOAD_STATS_FAIL: '加载统计失败',

  // 保存
  SAVE_SUCCESS: '保存成功',
  ADD_SUCCESS: '添加成功',
  UPDATE_SUCCESS: '更新成功',
  CREATE_SUCCESS: '创建成功',
  SAVE_FAIL: '保存失败',

  // 删除
  DELETE_SUCCESS: '删除成功',
  DELETE_FAIL: '删除失败',

  // 导入导出
  IMPORT_SUCCESS: '导入成功',
  IMPORT_FAIL: '导入失败',
  EXPORT_SUCCESS: '导出成功',
  EXPORT_FAIL: '导出失败',
  TEMPLATE_FAIL: '下载模板失败',

  // 备份
  BACKUP_SUCCESS: '备份成功',
  BACKUP_FAIL: '备份失败',
  RESTORE_SUCCESS: '恢复成功',
  RESTORE_FAIL: '恢复失败',
  CLOUD_BACKUP_SUCCESS: '云端备份成功',
  CLOUD_BACKUP_FAIL: '云端备份失败',
  CLOUD_RESTORE_SUCCESS: '云端恢复成功',
  CLOUD_RESTORE_FAIL: '云端恢复失败',
  WEBDAV_SAVE_SUCCESS: '保存成功',
  WEBDAV_SAVE_FAIL: '保存失败',
  WEBDAV_TEST_SUCCESS: '连接成功',
  WEBDAV_TEST_FAIL: '连接失败',
  WEBDAV_BACKUP_SUCCESS: 'WebDAV备份成功',
  WEBDAV_BACKUP_FAIL: 'WebDAV备份失败',
  WEBDAV_RESTORE_SUCCESS: 'WebDAV恢复成功',
  WEBDAV_RESTORE_FAIL: 'WebDAV恢复失败',

  // 登录
  LOGIN_SUCCESS: '登录成功',
  LOGIN_FAIL: '登录失败',
  REGISTER_SUCCESS: '注册成功',
  REGISTER_FAIL: '注册失败',

  // 确认
  CONFIRM_DELETE_GIFT_RECEIVED: '确定删除该收礼记录？',
  CONFIRM_DELETE_REASON: '确定删除该事由？',
  CONFIRM_DELETE_TYPE: '确定删除该类型？',
  CONFIRM_DELETE_USER: '确定删除该用户？',
  CONFIRM_LOGOUT: '确定退出登录？',
  CONFIRM_CLOUD_RESTORE: '确定从云端恢复？当前数据将被覆盖。',
  CONFIRM_WEBDAV_RESTORE: '确定从WebDAV恢复？当前数据将被覆盖。',

  // 校验
  VALID_NAME_REQUIRED: '请输入姓名',
  VALID_AMOUNT_POSITIVE: '金额必须大于0',
  VALID_DATE_REQUIRED: '请选择日期',
  VALID_GIFT_BOOK_REQUIRED: '请选择所属礼簿',
  VALID_BOOK_NAME_REQUIRED: '请输入礼簿名称',
  VALID_NAME_REQUIRED_SHORT: '请输入名称',
  VALID_FILE_REQUIRED: '请选择文件',
};

/** 颜色主题映射 */
export const THEME_COLORS = {
  GIVEN: 'purple',     // 随礼 = 紫色
  RECEIVED: 'blue',   // 收礼 = 蓝色
  POSITIVE: 'green',  // 正值/盈余 = 绿色
  NEGATIVE: 'red',    // 负值/欠礼 = 红色
  PRIMARY: 'primary', // 主色
};

/** 默认日期 */
export const DEFAULTS = {
  DATE_TODAY: () => new Date().toISOString().slice(0, 10),
  YEAR_UNKNOWN: '未知',
  TYPE_UNKNOWN: '其它',
};
