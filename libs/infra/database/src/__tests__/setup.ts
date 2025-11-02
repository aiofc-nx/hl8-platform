/**
 * Jest 测试设置文件
 *
 * @description 为测试环境提供必要的设置和导入
 */

// 导入 reflect-metadata 以支持装饰器
import "reflect-metadata";

// 设置测试环境变量
process.env.NODE_ENV = "test";

// 确保 Jest 全局变量可用
import { jest } from "@jest/globals";

// 将 Jest 全局变量添加到全局作用域
(global as any).jest = jest;
