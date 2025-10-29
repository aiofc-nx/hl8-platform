/**
 * @fileoverview Query Operator Enum - 查询操作符枚举
 * @description 定义所有支持的查询操作符
 */

/**
 * 查询操作符枚举
 * @description 定义查询条件中支持的所有操作符
 */
export enum QueryOperator {
  /**
   * 相等
   * @description 字段值等于指定值
   */
  EQUALS = "EQUALS",

  /**
   * 不相等
   * @description 字段值不等于指定值
   */
  NOT_EQUALS = "NOT_EQUALS",

  /**
   * 大于
   * @description 字段值大于指定值
   */
  GREATER_THAN = "GREATER_THAN",

  /**
   * 大于等于
   * @description 字段值大于等于指定值
   */
  GREATER_THAN_OR_EQUAL = "GREATER_THAN_OR_EQUAL",

  /**
   * 小于
   * @description 字段值小于指定值
   */
  LESS_THAN = "LESS_THAN",

  /**
   * 小于等于
   * @description 字段值小于等于指定值
   */
  LESS_THAN_OR_EQUAL = "LESS_THAN_OR_EQUAL",

  /**
   * 包含
   * @description 字段值包含指定字符串
   */
  CONTAINS = "CONTAINS",

  /**
   * 不包含
   * @description 字段值不包含指定字符串
   */
  NOT_CONTAINS = "NOT_CONTAINS",

  /**
   * 开始于
   * @description 字段值以指定字符串开始
   */
  STARTS_WITH = "STARTS_WITH",

  /**
   * 结束于
   * @description 字段值以指定字符串结束
   */
  ENDS_WITH = "ENDS_WITH",

  /**
   * 在列表中
   * @description 字段值在指定列表中
   */
  IN = "IN",

  /**
   * 不在列表中
   * @description 字段值不在指定列表中
   */
  NOT_IN = "NOT_IN",

  /**
   * 为空
   * @description 字段值为空（null或undefined）
   */
  IS_NULL = "IS_NULL",

  /**
   * 不为空
   * @description 字段值不为空
   */
  IS_NOT_NULL = "IS_NOT_NULL",

  /**
   * 为空字符串
   * @description 字段值为空字符串
   */
  IS_EMPTY = "IS_EMPTY",

  /**
   * 不为空字符串
   * @description 字段值不为空字符串
   */
  IS_NOT_EMPTY = "IS_NOT_EMPTY",

  /**
   * 匹配正则表达式
   * @description 字段值匹配指定的正则表达式
   */
  REGEX = "REGEX",

  /**
   * 不匹配正则表达式
   * @description 字段值不匹配指定的正则表达式
   */
  NOT_REGEX = "NOT_REGEX",

  /**
   * 在范围内
   * @description 字段值在指定范围内
   */
  BETWEEN = "BETWEEN",

  /**
   * 不在范围内
   * @description 字段值不在指定范围内
   */
  NOT_BETWEEN = "NOT_BETWEEN",

  /**
   * 模糊匹配
   * @description 字段值模糊匹配指定模式
   */
  LIKE = "LIKE",

  /**
   * 不模糊匹配
   * @description 字段值不模糊匹配指定模式
   */
  NOT_LIKE = "NOT_LIKE",

  /**
   * 存在
   * @description 字段存在且不为空
   */
  EXISTS = "EXISTS",

  /**
   * 不存在
   * @description 字段不存在或为空
   */
  NOT_EXISTS = "NOT_EXISTS",

  /**
   * 数组包含
   * @description 数组字段包含指定值
   */
  ARRAY_CONTAINS = "ARRAY_CONTAINS",

  /**
   * 数组不包含
   * @description 数组字段不包含指定值
   */
  ARRAY_NOT_CONTAINS = "ARRAY_NOT_CONTAINS",

  /**
   * 数组长度
   * @description 数组字段的长度等于指定值
   */
  ARRAY_LENGTH = "ARRAY_LENGTH",

  /**
   * 数组长度大于
   * @description 数组字段的长度大于指定值
   */
  ARRAY_LENGTH_GREATER_THAN = "ARRAY_LENGTH_GREATER_THAN",

  /**
   * 数组长度小于
   * @description 数组字段的长度小于指定值
   */
  ARRAY_LENGTH_LESS_THAN = "ARRAY_LENGTH_LESS_THAN",

  /**
   * 日期等于
   * @description 日期字段等于指定日期
   */
  DATE_EQUALS = "DATE_EQUALS",

  /**
   * 日期大于
   * @description 日期字段大于指定日期
   */
  DATE_GREATER_THAN = "DATE_GREATER_THAN",

  /**
   * 日期小于
   * @description 日期字段小于指定日期
   */
  DATE_LESS_THAN = "DATE_LESS_THAN",

  /**
   * 日期在范围内
   * @description 日期字段在指定日期范围内
   */
  DATE_BETWEEN = "DATE_BETWEEN",

  /**
   * 数值等于
   * @description 数值字段等于指定值
   */
  NUMBER_EQUALS = "NUMBER_EQUALS",

  /**
   * 数值大于
   * @description 数值字段大于指定值
   */
  NUMBER_GREATER_THAN = "NUMBER_GREATER_THAN",

  /**
   * 数值小于
   * @description 数值字段小于指定值
   */
  NUMBER_LESS_THAN = "NUMBER_LESS_THAN",

  /**
   * 数值在范围内
   * @description 数值字段在指定数值范围内
   */
  NUMBER_BETWEEN = "NUMBER_BETWEEN",

  /**
   * 布尔等于
   * @description 布尔字段等于指定值
   */
  BOOLEAN_EQUALS = "BOOLEAN_EQUALS",

  /**
   * 自定义操作符
   * @description 自定义的操作符，需要特殊处理
   */
  CUSTOM = "CUSTOM",
}

/**
 * 操作符分类
 * @description 将操作符按类型进行分类
 */
export const QueryOperatorCategories = {
  /**
   * 比较操作符
   * @description 用于比较值的操作符
   */
  COMPARISON: [
    QueryOperator.EQUALS,
    QueryOperator.NOT_EQUALS,
    QueryOperator.GREATER_THAN,
    QueryOperator.GREATER_THAN_OR_EQUAL,
    QueryOperator.LESS_THAN,
    QueryOperator.LESS_THAN_OR_EQUAL,
  ],

  /**
   * 字符串操作符
   * @description 用于字符串操作的操作符
   */
  STRING: [
    QueryOperator.CONTAINS,
    QueryOperator.NOT_CONTAINS,
    QueryOperator.STARTS_WITH,
    QueryOperator.ENDS_WITH,
    QueryOperator.LIKE,
    QueryOperator.NOT_LIKE,
    QueryOperator.REGEX,
    QueryOperator.NOT_REGEX,
  ],

  /**
   * 列表操作符
   * @description 用于列表操作的操作符
   */
  LIST: [
    QueryOperator.IN,
    QueryOperator.NOT_IN,
    QueryOperator.ARRAY_CONTAINS,
    QueryOperator.ARRAY_NOT_CONTAINS,
    QueryOperator.ARRAY_LENGTH,
    QueryOperator.ARRAY_LENGTH_GREATER_THAN,
    QueryOperator.ARRAY_LENGTH_LESS_THAN,
  ],

  /**
   * 空值操作符
   * @description 用于检查空值的操作符
   */
  NULL_CHECK: [
    QueryOperator.IS_NULL,
    QueryOperator.IS_NOT_NULL,
    QueryOperator.IS_EMPTY,
    QueryOperator.IS_NOT_EMPTY,
    QueryOperator.EXISTS,
    QueryOperator.NOT_EXISTS,
  ],

  /**
   * 范围操作符
   * @description 用于范围查询的操作符
   */
  RANGE: [
    QueryOperator.BETWEEN,
    QueryOperator.NOT_BETWEEN,
    QueryOperator.DATE_BETWEEN,
    QueryOperator.NUMBER_BETWEEN,
  ],

  /**
   * 类型特定操作符
   * @description 特定类型的操作符
   */
  TYPE_SPECIFIC: [
    QueryOperator.DATE_EQUALS,
    QueryOperator.DATE_GREATER_THAN,
    QueryOperator.DATE_LESS_THAN,
    QueryOperator.NUMBER_EQUALS,
    QueryOperator.NUMBER_GREATER_THAN,
    QueryOperator.NUMBER_LESS_THAN,
    QueryOperator.BOOLEAN_EQUALS,
  ],
} as const;

/**
 * 操作符信息接口
 * @description 操作符的详细信息
 */
export interface QueryOperatorInfo {
  /**
   * 操作符名称
   */
  readonly name: string;

  /**
   * 操作符描述
   */
  readonly description: string;

  /**
   * 操作符分类
   */
  readonly category: keyof typeof QueryOperatorCategories;

  /**
   * 是否需要值
   * @description 操作符是否需要提供值
   */
  readonly requiresValue: boolean;

  /**
   * 支持的数据类型
   * @description 操作符支持的数据类型
   */
  readonly supportedTypes: readonly string[];

  /**
   * 是否支持数组值
   * @description 操作符是否支持数组类型的值
   */
  readonly supportsArrayValue: boolean;

  /**
   * 是否支持正则表达式
   * @description 操作符是否支持正则表达式
   */
  readonly supportsRegex: boolean;

  /**
   * 是否支持大小写敏感
   * @description 操作符是否支持大小写敏感设置
   */
  readonly supportsCaseSensitive: boolean;
}

/**
 * 操作符信息映射
 * @description 所有操作符的详细信息映射
 */
export const QueryOperatorInfoMap: Record<QueryOperator, QueryOperatorInfo> = {
  [QueryOperator.EQUALS]: {
    name: "等于",
    description: "字段值等于指定值",
    category: "COMPARISON",
    requiresValue: true,
    supportedTypes: ["string", "number", "boolean", "date"],
    supportsArrayValue: false,
    supportsRegex: false,
    supportsCaseSensitive: true,
  },
  [QueryOperator.NOT_EQUALS]: {
    name: "不等于",
    description: "字段值不等于指定值",
    category: "COMPARISON",
    requiresValue: true,
    supportedTypes: ["string", "number", "boolean", "date"],
    supportsArrayValue: false,
    supportsRegex: false,
    supportsCaseSensitive: true,
  },
  [QueryOperator.GREATER_THAN]: {
    name: "大于",
    description: "字段值大于指定值",
    category: "COMPARISON",
    requiresValue: true,
    supportedTypes: ["number", "date"],
    supportsArrayValue: false,
    supportsRegex: false,
    supportsCaseSensitive: false,
  },
  [QueryOperator.GREATER_THAN_OR_EQUAL]: {
    name: "大于等于",
    description: "字段值大于等于指定值",
    category: "COMPARISON",
    requiresValue: true,
    supportedTypes: ["number", "date"],
    supportsArrayValue: false,
    supportsRegex: false,
    supportsCaseSensitive: false,
  },
  [QueryOperator.LESS_THAN]: {
    name: "小于",
    description: "字段值小于指定值",
    category: "COMPARISON",
    requiresValue: true,
    supportedTypes: ["number", "date"],
    supportsArrayValue: false,
    supportsRegex: false,
    supportsCaseSensitive: false,
  },
  [QueryOperator.LESS_THAN_OR_EQUAL]: {
    name: "小于等于",
    description: "字段值小于等于指定值",
    category: "COMPARISON",
    requiresValue: true,
    supportedTypes: ["number", "date"],
    supportsArrayValue: false,
    supportsRegex: false,
    supportsCaseSensitive: false,
  },
  [QueryOperator.CONTAINS]: {
    name: "包含",
    description: "字段值包含指定字符串",
    category: "STRING",
    requiresValue: true,
    supportedTypes: ["string"],
    supportsArrayValue: false,
    supportsRegex: false,
    supportsCaseSensitive: true,
  },
  [QueryOperator.NOT_CONTAINS]: {
    name: "不包含",
    description: "字段值不包含指定字符串",
    category: "STRING",
    requiresValue: true,
    supportedTypes: ["string"],
    supportsArrayValue: false,
    supportsRegex: false,
    supportsCaseSensitive: true,
  },
  [QueryOperator.STARTS_WITH]: {
    name: "开始于",
    description: "字段值以指定字符串开始",
    category: "STRING",
    requiresValue: true,
    supportedTypes: ["string"],
    supportsArrayValue: false,
    supportsRegex: false,
    supportsCaseSensitive: true,
  },
  [QueryOperator.ENDS_WITH]: {
    name: "结束于",
    description: "字段值以指定字符串结束",
    category: "STRING",
    requiresValue: true,
    supportedTypes: ["string"],
    supportsArrayValue: false,
    supportsRegex: false,
    supportsCaseSensitive: true,
  },
  [QueryOperator.IN]: {
    name: "在列表中",
    description: "字段值在指定列表中",
    category: "LIST",
    requiresValue: true,
    supportedTypes: ["string", "number", "boolean", "date"],
    supportsArrayValue: true,
    supportsRegex: false,
    supportsCaseSensitive: true,
  },
  [QueryOperator.NOT_IN]: {
    name: "不在列表中",
    description: "字段值不在指定列表中",
    category: "LIST",
    requiresValue: true,
    supportedTypes: ["string", "number", "boolean", "date"],
    supportsArrayValue: true,
    supportsRegex: false,
    supportsCaseSensitive: true,
  },
  [QueryOperator.IS_NULL]: {
    name: "为空",
    description: "字段值为空（null或undefined）",
    category: "NULL_CHECK",
    requiresValue: false,
    supportedTypes: ["any"],
    supportsArrayValue: false,
    supportsRegex: false,
    supportsCaseSensitive: false,
  },
  [QueryOperator.IS_NOT_NULL]: {
    name: "不为空",
    description: "字段值不为空",
    category: "NULL_CHECK",
    requiresValue: false,
    supportedTypes: ["any"],
    supportsArrayValue: false,
    supportsRegex: false,
    supportsCaseSensitive: false,
  },
  [QueryOperator.IS_EMPTY]: {
    name: "为空字符串",
    description: "字段值为空字符串",
    category: "NULL_CHECK",
    requiresValue: false,
    supportedTypes: ["string"],
    supportsArrayValue: false,
    supportsRegex: false,
    supportsCaseSensitive: false,
  },
  [QueryOperator.IS_NOT_EMPTY]: {
    name: "不为空字符串",
    description: "字段值不为空字符串",
    category: "NULL_CHECK",
    requiresValue: false,
    supportedTypes: ["string"],
    supportsArrayValue: false,
    supportsRegex: false,
    supportsCaseSensitive: false,
  },
  [QueryOperator.REGEX]: {
    name: "匹配正则表达式",
    description: "字段值匹配指定的正则表达式",
    category: "STRING",
    requiresValue: true,
    supportedTypes: ["string"],
    supportsArrayValue: false,
    supportsRegex: true,
    supportsCaseSensitive: true,
  },
  [QueryOperator.NOT_REGEX]: {
    name: "不匹配正则表达式",
    description: "字段值不匹配指定的正则表达式",
    category: "STRING",
    requiresValue: true,
    supportedTypes: ["string"],
    supportsArrayValue: false,
    supportsRegex: true,
    supportsCaseSensitive: true,
  },
  [QueryOperator.BETWEEN]: {
    name: "在范围内",
    description: "字段值在指定范围内",
    category: "RANGE",
    requiresValue: true,
    supportedTypes: ["number", "date"],
    supportsArrayValue: true,
    supportsRegex: false,
    supportsCaseSensitive: false,
  },
  [QueryOperator.NOT_BETWEEN]: {
    name: "不在范围内",
    description: "字段值不在指定范围内",
    category: "RANGE",
    requiresValue: true,
    supportedTypes: ["number", "date"],
    supportsArrayValue: true,
    supportsRegex: false,
    supportsCaseSensitive: false,
  },
  [QueryOperator.LIKE]: {
    name: "模糊匹配",
    description: "字段值模糊匹配指定模式",
    category: "STRING",
    requiresValue: true,
    supportedTypes: ["string"],
    supportsArrayValue: false,
    supportsRegex: false,
    supportsCaseSensitive: true,
  },
  [QueryOperator.NOT_LIKE]: {
    name: "不模糊匹配",
    description: "字段值不模糊匹配指定模式",
    category: "STRING",
    requiresValue: true,
    supportedTypes: ["string"],
    supportsArrayValue: false,
    supportsRegex: false,
    supportsCaseSensitive: true,
  },
  [QueryOperator.EXISTS]: {
    name: "存在",
    description: "字段存在且不为空",
    category: "NULL_CHECK",
    requiresValue: false,
    supportedTypes: ["any"],
    supportsArrayValue: false,
    supportsRegex: false,
    supportsCaseSensitive: false,
  },
  [QueryOperator.NOT_EXISTS]: {
    name: "不存在",
    description: "字段不存在或为空",
    category: "NULL_CHECK",
    requiresValue: false,
    supportedTypes: ["any"],
    supportsArrayValue: false,
    supportsRegex: false,
    supportsCaseSensitive: false,
  },
  [QueryOperator.ARRAY_CONTAINS]: {
    name: "数组包含",
    description: "数组字段包含指定值",
    category: "LIST",
    requiresValue: true,
    supportedTypes: ["array"],
    supportsArrayValue: false,
    supportsRegex: false,
    supportsCaseSensitive: true,
  },
  [QueryOperator.ARRAY_NOT_CONTAINS]: {
    name: "数组不包含",
    description: "数组字段不包含指定值",
    category: "LIST",
    requiresValue: true,
    supportedTypes: ["array"],
    supportsArrayValue: false,
    supportsRegex: false,
    supportsCaseSensitive: true,
  },
  [QueryOperator.ARRAY_LENGTH]: {
    name: "数组长度",
    description: "数组字段的长度等于指定值",
    category: "LIST",
    requiresValue: true,
    supportedTypes: ["array"],
    supportsArrayValue: false,
    supportsRegex: false,
    supportsCaseSensitive: false,
  },
  [QueryOperator.ARRAY_LENGTH_GREATER_THAN]: {
    name: "数组长度大于",
    description: "数组字段的长度大于指定值",
    category: "LIST",
    requiresValue: true,
    supportedTypes: ["array"],
    supportsArrayValue: false,
    supportsRegex: false,
    supportsCaseSensitive: false,
  },
  [QueryOperator.ARRAY_LENGTH_LESS_THAN]: {
    name: "数组长度小于",
    description: "数组字段的长度小于指定值",
    category: "LIST",
    requiresValue: true,
    supportedTypes: ["array"],
    supportsArrayValue: false,
    supportsRegex: false,
    supportsCaseSensitive: false,
  },
  [QueryOperator.DATE_EQUALS]: {
    name: "日期等于",
    description: "日期字段等于指定日期",
    category: "TYPE_SPECIFIC",
    requiresValue: true,
    supportedTypes: ["date"],
    supportsArrayValue: false,
    supportsRegex: false,
    supportsCaseSensitive: false,
  },
  [QueryOperator.DATE_GREATER_THAN]: {
    name: "日期大于",
    description: "日期字段大于指定日期",
    category: "TYPE_SPECIFIC",
    requiresValue: true,
    supportedTypes: ["date"],
    supportsArrayValue: false,
    supportsRegex: false,
    supportsCaseSensitive: false,
  },
  [QueryOperator.DATE_LESS_THAN]: {
    name: "日期小于",
    description: "日期字段小于指定日期",
    category: "TYPE_SPECIFIC",
    requiresValue: true,
    supportedTypes: ["date"],
    supportsArrayValue: false,
    supportsRegex: false,
    supportsCaseSensitive: false,
  },
  [QueryOperator.DATE_BETWEEN]: {
    name: "日期在范围内",
    description: "日期字段在指定日期范围内",
    category: "RANGE",
    requiresValue: true,
    supportedTypes: ["date"],
    supportsArrayValue: true,
    supportsRegex: false,
    supportsCaseSensitive: false,
  },
  [QueryOperator.NUMBER_EQUALS]: {
    name: "数值等于",
    description: "数值字段等于指定值",
    category: "TYPE_SPECIFIC",
    requiresValue: true,
    supportedTypes: ["number"],
    supportsArrayValue: false,
    supportsRegex: false,
    supportsCaseSensitive: false,
  },
  [QueryOperator.NUMBER_GREATER_THAN]: {
    name: "数值大于",
    description: "数值字段大于指定值",
    category: "TYPE_SPECIFIC",
    requiresValue: true,
    supportedTypes: ["number"],
    supportsArrayValue: false,
    supportsRegex: false,
    supportsCaseSensitive: false,
  },
  [QueryOperator.NUMBER_LESS_THAN]: {
    name: "数值小于",
    description: "数值字段小于指定值",
    category: "TYPE_SPECIFIC",
    requiresValue: true,
    supportedTypes: ["number"],
    supportsArrayValue: false,
    supportsRegex: false,
    supportsCaseSensitive: false,
  },
  [QueryOperator.NUMBER_BETWEEN]: {
    name: "数值在范围内",
    description: "数值字段在指定数值范围内",
    category: "RANGE",
    requiresValue: true,
    supportedTypes: ["number"],
    supportsArrayValue: true,
    supportsRegex: false,
    supportsCaseSensitive: false,
  },
  [QueryOperator.BOOLEAN_EQUALS]: {
    name: "布尔等于",
    description: "布尔字段等于指定值",
    category: "TYPE_SPECIFIC",
    requiresValue: true,
    supportedTypes: ["boolean"],
    supportsArrayValue: false,
    supportsRegex: false,
    supportsCaseSensitive: false,
  },
  [QueryOperator.CUSTOM]: {
    name: "自定义操作符",
    description: "自定义的操作符，需要特殊处理",
    category: "COMPARISON",
    requiresValue: true,
    supportedTypes: ["any"],
    supportsArrayValue: true,
    supportsRegex: true,
    supportsCaseSensitive: true,
  },
} as const;
