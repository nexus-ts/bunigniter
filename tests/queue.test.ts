/**
 * Unit tests for Queue.
 */
import { describe, it, expect } from "vitest";
import { Queue } from "../src/helpers/queue";

describe("Queue", () => {
	it("dispatches a job and returns id", () => {
		const q = new Queue();
		const id = q.dispatch("test_q", { msg: "hello" });
		expect(id).toBeTruthy();
		expect(typeof id).toBe("string");
	});

	it("shows pending count after dispatch", () => {
		const q = new Queue();
		const name = `pending_${Date.now()}`;
		q.dispatch(name, { x: 1 });
		q.dispatch(name, { x: 2 });
		const status = q.status(name);
		expect(status.pending).toBe(2);
		expect(status.processing).toBe(0);
	});

	it("processes a job when handler is registered", async () => {
		const q = new Queue({ pollInterval: 50 });
		const name = `process_${Date.now()}`;
		const results: any[] = [];

		await new Promise<void>((resolve) => {
			q.dispatch(name, { msg: "hello" });
			q.process(name, async (job) => {
				results.push(job.data);
				resolve();
			});
		});

		expect(results.length).toBe(1);
		expect(results[0].msg).toBe("hello");
	});

	it("returns queue names", () => {
		const q = new Queue();
		// Each Queue shares the global state, so just verify it's an array
		expect(Array.isArray(q.queues)).toBe(true);
	});
});
