/**
 * Unit tests for Schedule.
 */
import { describe, it, expect, afterEach } from "vitest";
import { schedule } from "../src/helpers/schedule";

describe("schedule", () => {
	afterEach(() => {
		// Stop all tasks
		schedule.stopAll();
	});

	it("schedules a repeating task", async () => {
		let count = 0;
		const task = schedule.every(50).do(async () => {
			count++;
		});
		expect(task.name).toBeTruthy();
		expect(task.running).toBe(true);
		await new Promise((r) => setTimeout(r, 120));
		expect(count).toBeGreaterThanOrEqual(1);
		task.running = false;
	});

	it("stops all tasks", () => {
		schedule.every(1000).do(async () => {});
		schedule.every(2000).do(async () => {});
		schedule.stopAll();
		expect(schedule.list().length).toBe(0);
	});

	it("lists registered tasks", () => {
		const t1 = schedule.every(1000).do(async () => {});
		const t2 = schedule.every(2000).do(async () => {});
		const list = schedule.list();
		expect(list.length).toBeGreaterThanOrEqual(2);
	});

	it("stops a specific task", () => {
		const task = schedule.every(500).do(async () => {});
		expect(task.running).toBe(true);
		schedule.stop(task.name);
		expect(task.running).toBe(false);
	});
});
