/**
 * Unit tests for Upload helper.
 */

import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"
import { createUpload, Upload } from "../src/helpers/upload"

const TEST_STORAGE = ".test_uploads"

// ─── Helpers ────────────────────────────────────────────────

/** Create a mock File-like object (Elysia/Bun multipart). */
function mockFile(overrides: Partial<any> = {}): any {
	return {
		name: overrides.name ?? "photo.jpg",
		size: overrides.size ?? 1024,
		type: overrides.type ?? "image/jpeg",
		arrayBuffer: async () => new ArrayBuffer(10),
		...overrides,
	}
}

/** Create a mock request body with file fields. */
function mockBody(files: Record<string, any | any[]>): any {
	return files
}

/** Create an Upload instance with test config. */
function createTestUpload(opts: any = {}): Upload {
	return new Upload({
		storageDir: TEST_STORAGE,
		...opts,
	})
}

describe("Upload", () => {
	beforeAll(() => {
		if (!existsSync(TEST_STORAGE)) {
			mkdirSync(TEST_STORAGE, { recursive: true })
		}
	})

	afterAll(() => {
		if (existsSync(TEST_STORAGE)) {
			rmSync(TEST_STORAGE, { recursive: true, force: true })
		}
	})

	// Clean up storage before each store/delete/validate test
	beforeEach(() => {
		if (existsSync(TEST_STORAGE)) {
			rmSync(TEST_STORAGE, { recursive: true, force: true })
		}
		mkdirSync(TEST_STORAGE, { recursive: true })
		console.log("[beforeEach] cleaned", TEST_STORAGE)
	})

	// ─── hasFile ────────────────────────────────────────────

	describe("hasFile()", () => {
		it("returns true when file exists in body", () => {
			const upload = createTestUpload()
			upload.body = mockBody({ avatar: mockFile() })
			expect(upload.hasFile("avatar")).toBe(true)
		})

		it("returns true with explicit body", () => {
			const upload = createTestUpload()
			expect(upload.hasFile(mockBody({ avatar: mockFile() }), "avatar")).toBe(true)
		})

		it("returns false when field is missing", () => {
			const upload = createTestUpload()
			upload.body = mockBody({})
			expect(upload.hasFile("missing")).toBe(false)
		})

		it("returns true for array of files", () => {
			const upload = createTestUpload()
			upload.body = mockBody({ gallery: [mockFile(), mockFile()] })
			expect(upload.hasFile("gallery")).toBe(true)
		})

		it("returns false for non-file values", () => {
			const upload = createTestUpload()
			upload.body = mockBody({ name: "Alice" })
			expect(upload.hasFile("name")).toBe(false)
		})
	})

	// ─── file ───────────────────────────────────────────────

	describe("file()", () => {
		it("returns UploadedFile from body (auto-detect)", async () => {
			const upload = createTestUpload()
			upload.body = mockBody({
				avatar: mockFile({ name: "pic.jpg", size: 2000 }),
			})
			const file = await upload.file("avatar")
			expect(file).not.toBeNull()
			expect(file!.name).toBe("pic.jpg")
			expect(file!.size).toBe(2000)
			expect(file!.field).toBe("avatar")
		})

		it("returns UploadedFile with explicit body", async () => {
			const upload = createTestUpload()
			const file = await upload.file(mockBody({ doc: mockFile() }), "doc")
			expect(file).not.toBeNull()
			expect(file!.field).toBe("doc")
		})

		it("returns null when field is missing", async () => {
			const upload = createTestUpload()
			upload.body = mockBody({})
			const file = await upload.file("missing")
			expect(file).toBeNull()
		})

		it("returns null when body is null", async () => {
			const upload = createTestUpload()
			const file = await upload.file("anything")
			expect(file).toBeNull()
		})

		it("warns when multiple files and returns first", async () => {
			const upload = createTestUpload()
			upload.body = mockBody({
				photos: [mockFile({ name: "a.jpg" }), mockFile({ name: "b.jpg" })],
			})
			const file = await upload.file("photos")
			expect(file).not.toBeNull()
			expect(file!.name).toBe("a.jpg")
		})

		it("detects File instanceof from Bun", async () => {
			const upload = createTestUpload()
			const bunFile = new File(["test"], "bun-file.txt", {
				type: "text/plain",
			})
			upload.body = mockBody({ doc: bunFile })
			const file = await upload.file("doc")
			expect(file).not.toBeNull()
			expect(file!.name).toBe("bun-file.txt")
			expect(file!.type).toBe("text/plain")
		})
	})

	// ─── files ─────────────────────────────────────────────

	describe("files()", () => {
		it("returns multiple uploaded files", async () => {
			const upload = createTestUpload()
			upload.body = mockBody({
				gallery: [mockFile({ name: "img1.jpg", size: 100 }), mockFile({ name: "img2.jpg", size: 200 })],
			})
			const files = await upload.files("gallery")
			expect(files).toHaveLength(2)
			expect(files[0].name).toBe("img1.jpg")
			expect(files[1].name).toBe("img2.jpg")
		})

		it("wraps single file in array", async () => {
			const upload = createTestUpload()
			upload.body = mockBody({ avatar: mockFile() })
			const files = await upload.files("avatar")
			expect(files).toHaveLength(1)
		})

		it("returns empty array when field is missing", async () => {
			const upload = createTestUpload()
			upload.body = mockBody({})
			const files = await upload.files("missing")
			expect(files).toHaveLength(0)
		})
	})

	// ─── Validation ─────────────────────────────────────────

	describe("validate()", () => {
		it("validates file size", () => {
			const upload = createTestUpload({ maxSize: 500 })
			const file = {
				field: "doc",
				name: "big.pdf",
				size: 1000,
				type: "application/pdf",
			}
			const errors = upload.validate(file)
			expect(errors).toHaveLength(1)
			expect(errors[0]).toContain("size")
		})

		it("validates MIME type", () => {
			const upload = createTestUpload({ allowedMimes: ["image/jpeg"] })
			const file = {
				field: "doc",
				name: "doc.pdf",
				size: 100,
				type: "application/pdf",
			}
			const errors = upload.validate(file)
			expect(errors).toHaveLength(1)
			expect(errors[0]).toContain("not allowed")
		})

		it("validates file extension", () => {
			const upload = createTestUpload({ allowedExts: [".jpg", ".png"] })
			const file = {
				field: "doc",
				name: "doc.pdf",
				size: 100,
				type: "application/pdf",
			}
			const errors = upload.validate(file)
			expect(errors).toHaveLength(1)
			expect(errors[0]).toContain("extension")
		})

		it("passes valid file", () => {
			const upload = createTestUpload({
				maxSize: 5000,
				allowedMimes: ["image/jpeg"],
				allowedExts: [".jpg"],
			})
			const file = {
				field: "photo",
				name: "pic.jpg",
				size: 1000,
				type: "image/jpeg",
			}
			const errors = upload.validate(file)
			expect(errors).toHaveLength(0)
		})

		it("sets _errors on parsed file when invalid", async () => {
			const upload = createTestUpload({ maxSize: 100 })
			upload.body = mockBody({ doc: mockFile({ size: 9999 }) })
			const file = await upload.file("doc")
			expect(file!._errors).toBeDefined()
			expect(file!._errors).toHaveLength(1)
		})
	})

	// ─── extension ─────────────────────────────────────────

	describe("extension()", () => {
		it("returns lowercased extension", () => {
			const upload = createTestUpload()
			expect(upload.extension({ field: "", name: "Photo.JPG", size: 0, type: "" })).toBe(".jpg")
		})

		it("handles files without extension", () => {
			const upload = createTestUpload()
			expect(upload.extension({ field: "", name: "README", size: 0, type: "" })).toBe("")
		})
	})

	// ─── store ─────────────────────────────────────────────

	describe("store()", () => {
		it("stores file to disk and returns relative path", async () => {
			const upload = createTestUpload()
			const body = mockBody({ file: mockFile() })
			upload.body = body

			const file = await upload.file("file")
			const path = await upload.store(file!, "photos")

			expect(path).toMatch(/^photos\/\d+_[a-z0-9]+\.jpg$/)
			expect(file!.storedPath).toBe(path)
			expect(file!.absolutePath).toBeDefined()
			expect(existsSync(file!.absolutePath!)).toBe(true)
		})

		it("stores with custom filename", async () => {
			const upload = createTestUpload()
			const body = mockBody({ file: mockFile() })
			upload.body = body

			const file = await upload.file("file")
			const subdir = `avatars_${Date.now()}`
			const path = await upload.store(file!, subdir, "profile")

			expect(path).toBe(`${subdir}/profile.jpg`)
			expect(existsSync(join(process.cwd(), TEST_STORAGE, subdir, "profile.jpg"))).toBe(true)
		})

		it("throws on duplicate file without overwrite", async () => {
			const upload = createTestUpload()
			const subdir = "dup"
			const dir = join(process.cwd(), TEST_STORAGE, subdir)
			if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
			writeFileSync(join(dir, "existing.txt"), "content")

			const body = mockBody({ file: mockFile({ name: "existing.txt" }) })
			upload.body = body
			const file = await upload.file("file")

			await expect(upload.store(file!, subdir, "existing")).rejects.toThrow("already exists")
		})
	})

	// ─── delete ────────────────────────────────────────────

	describe("delete()", () => {
		it("deletes file by subpath", async () => {
			const upload = createTestUpload()
			const body = mockBody({ file: mockFile() })
			upload.body = body

			const file = await upload.file("file")
			const subdir = `delete_${Date.now()}`
			const path = await upload.store(file!, subdir)

			expect(existsSync(join(process.cwd(), TEST_STORAGE, path))).toBe(true)
			const result = upload.delete(path)
			expect(result).toBe(true)
			expect(existsSync(join(process.cwd(), TEST_STORAGE, path))).toBe(false)
		})

		it("returns false for non-existent file", () => {
			const upload = createTestUpload()
			expect(upload.delete("nonexistent/file.txt")).toBe(false)
		})
	})

	describe("deleteFile()", () => {
		it("deletes file from UploadedFile metadata", async () => {
			const upload = createTestUpload()
			const body = mockBody({ file: mockFile() })
			upload.body = body

			const file = await upload.file("file")
			await upload.store(file!, "delete_file")

			expect(existsSync(file!.absolutePath!)).toBe(true)
			const result = upload.deleteFile(file!)
			expect(result).toBe(true)
			expect(existsSync(file!.absolutePath!)).toBe(false)
		})

		it("returns false if file has no absolutePath", () => {
			const upload = createTestUpload()
			const file = { field: "", name: "x", size: 0, type: "" }
			expect(upload.deleteFile(file)).toBe(false)
		})
	})

	// ─── createUpload singleton ─────────────────────────────

	describe("createUpload()", () => {
		it("returns singleton instance", () => {
			const a = createUpload({ storageDir: TEST_STORAGE })
			const b = createUpload()
			expect(a).toBe(b)
		})
	})

	// ─── maxSize / storageDir getters ───────────────────────

	describe("getters", () => {
		it("returns configured maxSize", () => {
			const upload = createTestUpload({ maxSize: 5 * 1024 * 1024 })
			expect(upload.maxSize).toBe(5 * 1024 * 1024)
		})

		it("returns configured storageDir", () => {
			const upload = createTestUpload({ storageDir: "/tmp/test" })
			expect(upload.storageDir).toBe("/tmp/test")
		})
	})
})
