/**
 * Unit tests for Image helper.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Image } from "../src/helpers/image";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const TEST_DIR = join(import.meta.dirname, "..", ".test_images");
const TEST_INPUT = join(TEST_DIR, "input.png");
const TEST_OUTPUT = join(TEST_DIR, "output");

// Use sharp to create valid test images
async function createTestPng(): Promise<Buffer> {
	const { default: sharp } = await import("sharp");
	return sharp({
		create: {
			width: 100,
			height: 100,
			channels: 3,
			background: { r: 255, g: 0, b: 0 },
		},
	})
		.png()
		.toBuffer();
}

async function createWatermarkPng(): Promise<Buffer> {
	const { default: sharp } = await import("sharp");
	return sharp({
		create: {
			width: 10,
			height: 10,
			channels: 4,
			background: { r: 255, g: 255, b: 255, alpha: 0.5 },
		},
	})
		.png()
		.toBuffer();
}

describe("Image", () => {
	beforeAll(async () => {
		if (!existsSync(TEST_DIR)) {
			mkdirSync(TEST_DIR, { recursive: true });
		}
		const png = await createTestPng();
		writeFileSync(TEST_INPUT, png);
	});

	afterAll(() => {
		if (existsSync(TEST_DIR)) {
			rmSync(TEST_DIR, { recursive: true, force: true });
		}
	});

	// ─── Factory Methods ───────────────────────────────────

	describe("open()", () => {
		it("opens an existing image file", () => {
			const img = Image.open(TEST_INPUT);
			expect(img).toBeInstanceOf(Image);
		});

		it("throws on missing file", () => {
			expect(() => Image.open("nonexistent.png")).toThrow("not found");
		});
	});

	describe("fromBuffer()", () => {
		it("creates Image from buffer", async () => {
			const img = Image.fromBuffer(await createTestPng());
			expect(img).toBeInstanceOf(Image);
		});
	});

	// ─── Metadata ──────────────────────────────────────────

	describe("metadata()", () => {
		it("returns image dimensions", async () => {
			const meta = await Image.open(TEST_INPUT).metadata();
			expect(meta.width).toBeGreaterThan(0);
			expect(meta.height).toBeGreaterThan(0);
			expect(meta.format).toBeTruthy();
		});
	});

	// ─── Resize ────────────────────────────────────────────

	describe("resize()", () => {
		it("resizes to exact dimensions", async () => {
			const out = `${TEST_OUTPUT}_resize_exact.jpg`;
			await Image.open(TEST_INPUT).resize(50, 50).save(out);
			expect(existsSync(out)).toBe(true);
		});

		it("resizes width-only (auto height)", async () => {
			const out = `${TEST_OUTPUT}_resize_width.jpg`;
			await Image.open(TEST_INPUT).resize(50).save(out);
			expect(existsSync(out)).toBe(true);
		});

		it("resizes with cover mode", async () => {
			const out = `${TEST_OUTPUT}_resize_cover.jpg`;
			await Image.open(TEST_INPUT).resize(50, 50, { mode: "cover" }).save(out);
			expect(existsSync(out)).toBe(true);
		});
	});

	// ─── Fit ───────────────────────────────────────────────

	describe("fit()", () => {
		it("fits within dimensions", async () => {
			const out = `${TEST_OUTPUT}_fit.jpg`;
			await Image.open(TEST_INPUT).fit(50, 50, "#ffffff").save(out);
			expect(existsSync(out)).toBe(true);
		});
	});

	// ─── Crop ──────────────────────────────────────────────

	describe("crop()", () => {
		it("crops to exact size with gravity", async () => {
			const out = `${TEST_OUTPUT}_crop.jpg`;
			await Image.open(TEST_INPUT).crop(30, 30).save(out);
			expect(existsSync(out)).toBe(true);
		});

		it("crops with offset", async () => {
			const out = `${TEST_OUTPUT}_crop_offset.jpg`;
			await Image.open(TEST_INPUT).crop(20, 20, 10, 10).save(out);
			expect(existsSync(out)).toBe(true);
		});
	});

	// ─── Rotate & Flip ─────────────────────────────────────

	describe("rotate()", () => {
		it("rotates 90 degrees", async () => {
			const out = `${TEST_OUTPUT}_rotate90.jpg`;
			await Image.open(TEST_INPUT).rotate(90).save(out);
			expect(existsSync(out)).toBe(true);
		});

		it("rotates 180 degrees", async () => {
			const out = `${TEST_OUTPUT}_rotate180.jpg`;
			await Image.open(TEST_INPUT).rotate(180).save(out);
			expect(existsSync(out)).toBe(true);
		});
	});

	describe("flipH()", () => {
		it("flips horizontally", async () => {
			const out = `${TEST_OUTPUT}_fliph.jpg`;
			await Image.open(TEST_INPUT).flipH().save(out);
			expect(existsSync(out)).toBe(true);
		});
	});

	describe("flipV()", () => {
		it("flips vertically", async () => {
			const out = `${TEST_OUTPUT}_flipv.jpg`;
			await Image.open(TEST_INPUT).flipV().save(out);
			expect(existsSync(out)).toBe(true);
		});
	});

	// ─── Filters ───────────────────────────────────────────

	describe("greyscale()", () => {
		it("converts to grayscale", async () => {
			const out = `${TEST_OUTPUT}_grey.jpg`;
			await Image.open(TEST_INPUT).greyscale().save(out);
			expect(existsSync(out)).toBe(true);
		});
	});

	describe("blur()", () => {
		it("applies gaussian blur", async () => {
			const out = `${TEST_OUTPUT}_blur.jpg`;
			await Image.open(TEST_INPUT).blur(5).save(out);
			expect(existsSync(out)).toBe(true);
		});
	});

	describe("sharpen()", () => {
		it("sharpens the image", async () => {
			const out = `${TEST_OUTPUT}_sharpen.jpg`;
			await Image.open(TEST_INPUT).sharpen(2).save(out);
			expect(existsSync(out)).toBe(true);
		});
	});

	describe("negate()", () => {
		it("inverts colors", async () => {
			const out = `${TEST_OUTPUT}_negate.jpg`;
			await Image.open(TEST_INPUT).negate().save(out);
			expect(existsSync(out)).toBe(true);
		});
	});

	describe("modulate()", () => {
		it("adjusts brightness", async () => {
			const out = `${TEST_OUTPUT}_modulate.jpg`;
			await Image.open(TEST_INPUT)
				.modulate({ brightness: 20, saturation: -10 })
				.save(out);
			expect(existsSync(out)).toBe(true);
		});
	});

	describe("tint()", () => {
		it("tints with color", async () => {
			const out = `${TEST_OUTPUT}_tint.jpg`;
			await Image.open(TEST_INPUT).tint("#ff0000").save(out);
			expect(existsSync(out)).toBe(true);
		});
	});

	// ─── Watermark ─────────────────────────────────────────

	describe("watermark()", () => {
		it("adds image watermark", async () => {
			const wmPath = join(TEST_DIR, "watermark.png");
			writeFileSync(wmPath, await createWatermarkPng());

			const out = `${TEST_OUTPUT}_watermarked.jpg`;
			await Image.open(TEST_INPUT)
				.watermark(wmPath, "bottom-right", 0.5)
				.save(out);
			expect(existsSync(out)).toBe(true);
		});

		it("throws on missing watermark file", () => {
			expect(() => Image.open(TEST_INPUT).watermark("missing.png")).toThrow(
				"not found",
			);
		});
	});

	// ─── Text Watermark ────────────────────────────────────

	describe("text()", () => {
		it("adds text overlay", async () => {
			const out = `${TEST_OUTPUT}_text.jpg`;
			await Image.open(TEST_INPUT)
				.text("© 2026", {
					fontSize: 20,
					color: "#ffffff",
					position: "bottom-right",
				})
				.save(out);
			expect(existsSync(out)).toBe(true);
		});
	});

	// ─── Save & Format ─────────────────────────────────────

	describe("save()", () => {
		it("saves as JPEG", async () => {
			const out = `${TEST_OUTPUT}_format.jpg`;
			await Image.open(TEST_INPUT).save(out, "jpeg");
			expect(existsSync(out)).toBe(true);
		});

		it("saves as PNG", async () => {
			const out = `${TEST_OUTPUT}_format.png`;
			await Image.open(TEST_INPUT).save(out, "png");
			expect(existsSync(out)).toBe(true);
		});

		it("saves as WebP", async () => {
			const out = `${TEST_OUTPUT}_format.webp`;
			await Image.open(TEST_INPUT).save(out, "webp");
			expect(existsSync(out)).toBe(true);
		});

		it("creates output directory if missing", async () => {
			const out = `${TEST_OUTPUT}/nested/dir/format_test.jpg`;
			await Image.open(TEST_INPUT).save(out);
			expect(existsSync(out)).toBe(true);
		});
	});

	describe("toBuffer()", () => {
		it("returns buffer of processed image", async () => {
			const buf = await Image.open(TEST_INPUT).resize(50).toBuffer("jpeg");
			expect(buf).toBeInstanceOf(Buffer);
			expect(buf.length).toBeGreaterThan(0);
		});
	});

	// ─── Chained Operations ────────────────────────────────

	describe("chained operations", () => {
		it("chains resize + greyscale + save", async () => {
			const out = `${TEST_OUTPUT}_chain.jpg`;
			await Image.open(TEST_INPUT)
				.resize(80, 80)
				.greyscale()
				.sharpen(1)
				.save(out);
			expect(existsSync(out)).toBe(true);
		});

		it("chains resize + watermark + save", async () => {
			const wmPath = join(TEST_DIR, "wm.png");
			writeFileSync(wmPath, await createWatermarkPng());

			const out = `${TEST_OUTPUT}_chain_wm.jpg`;
			await Image.open(TEST_INPUT)
				.resize(80)
				.watermark(wmPath, "bottom-right", 0.5)
				.save(out);
			expect(existsSync(out)).toBe(true);
		});
	});

	// ─── Controller Integration ────────────────────────────

	describe("controller integration", () => {
		it("can be used via this.imageOpen", async () => {
			// Simulates controller usage: this.imageOpen(path).resize().save()
			const img = Image.open(TEST_INPUT).resize(50, 50);
			const buf = await img.toBuffer("png");
			expect(buf.length).toBeGreaterThan(0);
		});
	});
});
