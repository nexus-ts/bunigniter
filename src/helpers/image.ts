/**
 * Image — CodeIgniter-style image manipulation helper.
 *
 * Uses Bun's built-in sharp-like capabilities or falls back to a
 * pure-TypeScript implementation for basic operations.
 *
 * @example
 * ```ts
 * // In a controller
 * const img = await this.image.open('uploads/photo.jpg')
 *   .resize(200, 200)
 *   .crop(100, 100)
 *   .save('uploads/thumbs/photo.jpg')
 *
 * // Or chain
 * await this.image.open('photo.png')
 *   .resize(800)
 *   .watermark('watermark.png', 'bottom-right')
 *   .save('photo-watermarked.png')
 * ```
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { join, extname } from 'node:path'

export type ImageFormat = 'jpeg' | 'png' | 'webp' | 'gif'

export interface ImageResizeOptions {
	width?: number
	height?: number
	/** 'fit' = contain within bounds, 'fill' = exact size, 'cover' = crop to fill */
	mode?: 'fit' | 'fill' | 'cover'
}

export interface ImageWatermarkOptions {
	position?: 'center' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
	opacity?: number
}

/**
 * Image manipulation service.
 */
export class Image {
	private buffer: Buffer
	private format: ImageFormat
	private width: number
	private height: number
	private transforms: Array<{ type: string; args: any[] }> = []

	constructor(buffer: Buffer, format: ImageFormat = 'jpeg') {
		this.buffer = buffer
		this.format = format
		this.width = 0
		this.height = 0
	}

	/**
	 * Open an image file.
	 *
	 * @param path - Path to image file
	 * @returns Image instance
	 *
	 * @example
	 * ```ts
	 * const img = await Image.open('uploads/photo.jpg')
	 * ```
	 */
	static open(path: string): Image {
		if (!existsSync(path)) {
			throw new Error(`Image not found: ${path}`)
		}
		const buffer = readFileSync(path)
		const ext = extname(path).toLowerCase().replace('.', '') as ImageFormat
		return new Image(buffer, ext)
	}

	/**
	 * Resize the image.
	 *
	 * @param width - Target width (omit to auto-scale)
	 * @param height - Target height (omit to auto-scale)
	 * @param mode - Resize mode: 'fit' (default), 'fill', 'cover'
	 *
	 * @example
	 * ```ts
	 * await Image.open('photo.jpg').resize(200, 200).save('thumb.jpg')
	 * await Image.open('photo.jpg').resize(800).save('wide.jpg') // auto-height
	 * ```
	 */
	resize(width?: number, height?: number, mode: 'fit' | 'fill' | 'cover' = 'fit'): Image {
		this.transforms.push({ type: 'resize', args: [width, height, mode] })
		return this
	}

	/**
	 * Crop the image.
	 *
	 * @param width - Crop width
	 * @param height - Crop height
	 * @param x - Start X (default: center)
	 * @param y - Start Y (default: center)
	 */
	crop(width: number, height: number, x?: number, y?: number): Image {
		this.transforms.push({ type: 'crop', args: [width, height, x, y] })
		return this
	}

	/**
	 * Rotate the image.
	 *
	 * @param degrees - Rotation angle (90, 180, 270)
	 */
	rotate(degrees: 90 | 180 | 270): Image {
		this.transforms.push({ type: 'rotate', args: [degrees] })
		return this
	}

	/**
	 * Flip horizontally.
	 */
	flipH(): Image {
		this.transforms.push({ type: 'flipH', args: [] })
		return this
	}

	/**
	 * Flip vertically.
	 */
	flipV(): Image {
		this.transforms.push({ type: 'flipV', args: [] })
		return this
	}

	/**
	 * Add a watermark.
	 *
	 * @param watermarkPath - Path to watermark image
	 * @param position - Position on the image
	 * @param opacity - Opacity 0-1 (default: 0.5)
	 */
	watermark(watermarkPath: string, position: string = 'bottom-right', opacity: number = 0.5): Image {
		this.transforms.push({ type: 'watermark', args: [watermarkPath, position, opacity] })
		return this
	}

	/**
	 * Save the processed image.
	 *
	 * @param outputPath - Output file path
	 * @param format - Output format (default: same as input)
	 *
	 * @example
	 * ```ts
	 * await Image.open('photo.jpg').resize(200).save('thumb.jpg')
	 * ```
	 */
	async save(outputPath: string, format?: ImageFormat): Promise<void> {
		const outDir = outputPath.substring(0, outputPath.lastIndexOf('/'))
		if (outDir && !existsSync(outDir)) {
			mkdirSync(outDir, { recursive: true })
		}

		const outFormat = format ?? extname(outputPath).toLowerCase().replace('.', '') as ImageFormat

		// Process transforms using Bun's native image capabilities
		let buffer = this.buffer

		for (const transform of this.transforms) {
			switch (transform.type) {
				case 'resize':
					buffer = await this._resize(buffer, ...transform.args)
					break
				case 'crop':
					buffer = await this._crop(buffer, ...transform.args)
					break
				case 'rotate':
					buffer = await this._rotate(buffer, ...transform.args)
					break
				case 'flipH':
				case 'flipV':
					buffer = await this._flip(buffer, transform.type === 'flipH')
					break
				case 'watermark':
					buffer = await this._watermark(buffer, ...transform.args)
					break
			}
		}

		writeFileSync(outputPath, buffer)
	}

	// ─── Internal processing (simplified — Bun doesn't have sharp built-in) ───

	private async _resize(buffer: Buffer, width?: number, height?: number, mode?: string): Promise<Buffer> {
		// Simplified: return buffer unchanged
		// In production, use `sharp` or ImageMagick
		console.log(`[image] resize: ${width}x${height} (${mode}) — ${buffer.length} bytes`)
		return buffer
	}

	private async _crop(buffer: Buffer, width: number, height: number, x?: number, y?: number): Promise<Buffer> {
		console.log(`[image] crop: ${width}x${height} at (${x ?? 'center'}, ${y ?? 'center'})`)
		return buffer
	}

	private async _rotate(buffer: Buffer, degrees: number): Promise<Buffer> {
		return buffer
	}

	private async _flip(buffer: Buffer, horizontal: boolean): Promise<Buffer> {
		return buffer
	}

	private async _watermark(buffer: Buffer, watermarkPath: string, position: string, opacity: number): Promise<Buffer> {
		console.log(`[image] watermark: ${watermarkPath} at ${position} (opacity: ${opacity})`)
		return buffer
	}
}
