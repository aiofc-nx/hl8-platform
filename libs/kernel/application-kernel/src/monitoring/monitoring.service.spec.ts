import {
  MonitoringService,
  type MonitoringConfig,
  type AlertRule,
} from "./monitoring.service.js";
import { PerformanceMetricType } from "./performance-metrics.js";
import type { Logger } from "@hl8/logger";

describe("MonitoringService", () => {
  let logger: Logger;
  let config: MonitoringConfig;
  let svc: MonitoringService;

  beforeEach(() => {
    logger = {
      debug: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    } as unknown as Logger;

    config = {
      enabled: true,
      collectionInterval: 20,
      alertCheckInterval: 20,
      dataRetentionTime: 60_000,
      maxMetrics: 100,
      enableAutoCleanup: true,
      cleanupInterval: 20,
    };

    svc = new MonitoringService(config, logger);
  });

  afterEach(() => {
    svc.destroy();
  });

  it("should create metric and export data", () => {
    const m = svc.createMetric({
      name: "qps",
      type: PerformanceMetricType.COUNTER,
    });
    m.increment();
    const json = svc.exportMetrics("json");
    expect(json).toContain("qps");
  });

  it("should trigger and recover alert", async () => {
    const m = svc.createMetric({
      name: "usage",
      type: PerformanceMetricType.GAUGE,
    });
    const rule: AlertRule = {
      id: "a1",
      metricName: "usage",
      condition: "average",
      threshold: 50,
      operator: "gt",
      duration: 0,
      severity: "high",
      enabled: true,
    };

    svc.addAlertRule(rule);

    m.set(60);
    await svc.checkAlerts();
    expect(svc.getActiveAlerts().length).toBe(1);

    m.set(10);
    await svc.checkAlerts();
    expect(svc.getActiveAlerts().length).toBe(1); // status becomes recovered
  });
});
