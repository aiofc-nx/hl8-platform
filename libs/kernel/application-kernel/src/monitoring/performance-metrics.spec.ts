import {
  PerformanceMetric,
  PerformanceMetricType,
} from "./performance-metrics.js";
import type { Logger } from "@hl8/logger";

describe("PerformanceMetric", () => {
  let logger: Logger;

  beforeEach(() => {
    logger = {
      debug: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    } as unknown as Logger;
  });

  it("should record and compute stats", () => {
    const metric = new PerformanceMetric(
      {
        name: "req_time",
        type: PerformanceMetricType.SUMMARY,
        quantiles: [0.5, 0.9],
      },
      logger,
    );

    expect(metric.record(100)).toBe(true);
    expect(metric.record(200)).toBe(true);

    const stats = metric.getStats();
    expect(stats.count).toBe(2);
    expect(stats.sum).toBe(300);
    expect(stats.average).toBe(150);

    const summary = metric.getSummaryData();
    expect(summary?.count).toBe(2);
    expect(summary?.sum).toBe(300);
  });

  it("should support histogram buckets", () => {
    const metric = new PerformanceMetric(
      {
        name: "latency",
        type: PerformanceMetricType.HISTOGRAM,
        buckets: [100, 200],
      },
      logger,
    );

    metric.observe(90);
    metric.observe(150);
    metric.observe(210);

    const hist = metric.getHistogramData();
    expect(hist?.buckets.length).toBe(2);
    expect(hist?.count).toBe(3);
  });
});
