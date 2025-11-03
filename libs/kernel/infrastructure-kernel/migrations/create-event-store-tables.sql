-- 事件存储表迁移
-- 用于存储领域事件，支持事件溯源

-- 事件存储表
CREATE TABLE IF NOT EXISTS event_store (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "aggregateId" UUID NOT NULL,
    event_version INTEGER NOT NULL,
    "eventType" VARCHAR(255) NOT NULL,
    data JSONB NOT NULL,
    metadata JSONB,
    "eventId" UUID NOT NULL UNIQUE,
    timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "aggregateType" VARCHAR(255),
    "transactionId" UUID,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version INTEGER NOT NULL DEFAULT 1,
    "deletedAt" TIMESTAMP,
    CONSTRAINT event_store_version_check CHECK (event_version > 0)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_event_store_aggregate_id ON event_store("aggregateId");
CREATE INDEX IF NOT EXISTS idx_event_store_aggregate_version ON event_store("aggregateId", event_version);
CREATE INDEX IF NOT EXISTS idx_event_store_event_type ON event_store("eventType");
CREATE INDEX IF NOT EXISTS idx_event_store_timestamp ON event_store(timestamp);
CREATE INDEX IF NOT EXISTS idx_event_store_deleted_at ON event_store("deletedAt") WHERE "deletedAt" IS NULL;

-- 事件快照表
CREATE TABLE IF NOT EXISTS event_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "aggregateId" UUID NOT NULL,
    snapshot_version INTEGER NOT NULL,
    data JSONB NOT NULL,
    "snapshotType" VARCHAR(255) NOT NULL,
    metadata JSONB,
    timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version INTEGER NOT NULL DEFAULT 1,
    "deletedAt" TIMESTAMP,
    UNIQUE("aggregateId", snapshot_version)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_event_snapshots_aggregate_id ON event_snapshots("aggregateId");
CREATE INDEX IF NOT EXISTS idx_event_snapshots_aggregate_version ON event_snapshots("aggregateId", snapshot_version);
CREATE INDEX IF NOT EXISTS idx_event_snapshots_deleted_at ON event_snapshots("deletedAt") WHERE "deletedAt" IS NULL;
