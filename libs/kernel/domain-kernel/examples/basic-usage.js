/**
 * @fileoverview Domain Kernel Core Module 基本使用示例
 * @description 展示如何使用领域核心模块的基本功能
 */

const {
  EntityId,
  ValueObject,
  Entity,
  AggregateRoot,
  DomainEvent,
  UuidGenerator,
  AuditInfo,
  BusinessException,
  SystemException,
  SeparationValidator,
  EntityLifecycle,
} = require("../dist/index.js");

console.log("=== Domain Kernel Core Module 基本使用示例 ===\n");

// 1. 创建值对象
class Email extends ValueObject {
  constructor(value) {
    super();
    if (!value || !value.includes("@")) {
      throw new Error("无效的邮箱地址");
    }
    this._value = value;
  }

  get value() {
    return this._value;
  }

  equals(other) {
    return other instanceof Email && this._value === other._value;
  }

  toString() {
    return this._value;
  }
}

// 2. 创建内部实体
class UserProfile extends Entity {
  constructor(email, name, id, auditInfo, lifecycleState, version) {
    super(id, auditInfo, lifecycleState, version);
    this._email = email;
    this._name = name;
  }

  get email() {
    return this._email;
  }

  get name() {
    return this._name;
  }

  updateEmail(newEmail) {
    this._email = newEmail;
    this.updateAuditInfo(this.auditInfo.updatedBy);
  }

  updateName(newName) {
    this._name = newName;
    this.updateAuditInfo(this.auditInfo.updatedBy);
  }

  clone() {
    return new UserProfile(
      this._email,
      this._name,
      this.id,
      this.auditInfo.clone(),
      this.lifecycleState,
      this.version,
    );
  }
}

// 3. 创建聚合根
class User extends AggregateRoot {
  constructor(email, name, id, auditInfo, lifecycleState, version) {
    super(id, auditInfo, lifecycleState, version);
    this._email = email;
    this._name = name;
    this._profile = new UserProfile(
      email,
      name,
      new EntityId(),
      auditInfo,
      EntityLifecycle.CREATED,
      1,
    );
    this.addInternalEntity(this._profile);
  }

  get email() {
    return this._email;
  }

  get name() {
    return this._name;
  }

  get profile() {
    return this._profile;
  }

  updateProfile(email, name) {
    this.coordinateBusinessOperation("updateProfile", { email, name });
  }

  performCoordination(operation, params) {
    switch (operation) {
      case "updateProfile":
        const { email, name } = params;
        this._email = email;
        this._name = name;
        this._profile.updateEmail(email);
        this._profile.updateName(name);
        return { success: true, message: "用户资料更新成功" };
      default:
        return { success: false, error: "未知操作" };
    }
  }

  performBusinessInvariantValidation() {
    return this._email && this._name && this._profile;
  }

  clone() {
    const cloned = new User(
      this._email,
      this._name,
      this.id,
      this.auditInfo.clone(),
      this.lifecycleState,
      this.version,
    );
    cloned._profile = this._profile.clone();
    return cloned;
  }
}

// 4. 使用示例
try {
  console.log("1. 创建用户聚合根...");
  const userId = new EntityId();
  const auditInfo = new AuditInfo(new Date(), new Date(), userId, userId, 1);
  const user = new User(
    new Email("user@example.com"),
    "张三",
    userId,
    auditInfo,
    EntityLifecycle.CREATED,
    1,
  );

  console.log("✅ 用户创建成功");
  console.log("   - ID:", user.id.value);
  console.log("   - 邮箱:", user.email.value);
  console.log("   - 姓名:", user.name);
  console.log("   - 状态:", user.lifecycleState);

  console.log("\n2. 激活用户...");
  user.activate();
  console.log("✅ 用户激活成功，状态:", user.lifecycleState);

  console.log("\n3. 更新用户资料...");
  const result = user.updateProfile(
    new Email("zhangsan@example.com"),
    "张三丰",
  );
  console.log("✅ 资料更新结果:", result.message);
  console.log("   - 新邮箱:", user.email.value);
  console.log("   - 新姓名:", user.name);

  console.log("\n4. 验证业务不变量...");
  const isValid = user.validateBusinessInvariants();
  console.log("✅ 业务不变量验证:", isValid ? "通过" : "失败");

  console.log("\n5. 检查领域事件...");
  const events = user.getDomainEvents();
  console.log("✅ 领域事件数量:", events.length);
  events.forEach((event, index) => {
    console.log(`   - 事件 ${index + 1}: ${event.type}`);
  });

  console.log("\n6. 验证分离原则...");
  const validationResult = SeparationValidator.validateAggregateRoot(user);
  console.log("✅ 分离原则验证:", validationResult.isValid ? "通过" : "失败");
  if (!validationResult.isValid) {
    console.log("   错误:", validationResult.errors);
  }

  console.log("\n7. 克隆用户...");
  const clonedUser = user.clone();
  console.log("✅ 用户克隆成功");
  console.log("   - 原用户ID:", user.id.value);
  console.log("   - 克隆用户ID:", clonedUser.id.value);
  console.log("   - 是否相等:", user.equals(clonedUser));

  console.log("\n8. 测试异常处理...");
  try {
    throw new BusinessException("业务规则违反", "INVALID_EMAIL");
  } catch (e) {
    console.log("✅ 业务异常捕获:", e.message);
  }

  try {
    throw new SystemException("系统错误", "DATABASE_ERROR");
  } catch (e) {
    console.log("✅ 系统异常捕获:", e.message);
  }

  console.log("\n🎉 所有功能测试完成！");
} catch (error) {
  console.error("❌ 测试失败:", error.message);
  console.error(error.stack);
}
