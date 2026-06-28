/**
 * Image — CodeIgniter/Laravel-style image manipulation.
 *
 * Uses `sharp` for high-performance image processing.
 *
 * @example
 * ```ts
 * // Resize & save
 * await Image.open('photo.jpg').resize(200, 200).save('thumb.jpg')
 *
 * // Chain operations
 * await Image.open('photo.png')
 *   .resize(800)
 *   .greyscale()
 *   .save('photo-bw.jpg')
 *
 * // Watermark
 * await Image.open('photo.jpg')
 *   .watermark('logo.png', 'bottom-right')
 *   .save('photo-marked.jpg')
 * ```
 */
import { existsSync, mkdirSync } from "node:fs";
import { extname } from "node:path";
import sharp, { type Sharp, type FitEnum, type Gravity } from "sharp";

export type ImageFormat = "jpeg" | "png" | "webp" | "gif" | "avif" | "tiff";

export interface ImageSize {
	width: number;
	height: number;
}

export interface ImageMetadata extends ImageSize {
	format: ImageFormat;
	space?: string;
	channels?: number;
	density?: number;
	hasAlpha?: boolean;
	hasProfile?: boolean;
	exif?: Record<string, any>;
}

export type WatermarkPosition =
	| "center"
	| "top-left"
	| "top"
	| "top-right"
	| "left"
	| "right"
	| "bottom-left"
	| "bottom"
	| "bottom-right";

export interface WatermarkOptions {
	position?: WatermarkPosition;
	opacity?: number;
	margin?: number;
}

export interface TextOptions {
	font?: string;
	fontSize?: number;
	color?: string;
	position?: WatermarkPosition;
	margin?: number;
	opacity?: number;
}

export interface ResizeOptions {
	width?: number;
	height?: number;
	/** 'fit' = contain within bounds, 'fill' = exact size, 'cover' = crop to fill, 'inside' = shrink to fit, 'outside' = stretch to cover */
	mode?: "fit" | "fill" | "cover" | "inside" | "outside";
	/** Do not enlarge if already smaller */
	withoutEnlargement?: boolean;
	/** Background color for 'fit' mode (e.g. '#ffffff', 'transparent') */
	background?: string;
}

/**
 * Image manipulation service.
 *
 * All operations are queued and executed when `save()` or `toBuffer()` is called.
 */
export class Image {
	private _sharp: Sharp;
	private _format: ImageFormat;

	constructor(input: Buffer | string, format?: ImageFormat) {
		this._sharp = sharp(input);
		this._format = format ?? "jpeg";
	}

	// ─── Factory Methods ─────────────────────────────────────

	/**
	 * Open an image file from disk.
	 *
	 * @param path - Path to image file
	 *
	 * @example
	 * ```ts
	 * const img = Image.open('uploads/photo.jpg')
	 * ```
	 */
	static open(path: string): Image {
		if (!existsSync(path)) {
			throw new Error(`Image not found: ${path}`);
		}
		const ext = extname(path).toLowerCase().replace(".", "") as ImageFormat;
		return new Image(path, ext);
	}

	/**
	 * Create Image from a Buffer.
	 *
	 * @param buffer - Image data buffer
	 * @param format - Image format (default: 'jpeg')
	 *
	 * @example
	 * ```ts
	 * const img = Image.fromBuffer(buffer, 'png')
	 * ```
	 */
	static fromBuffer(buffer: Buffer, format?: ImageFormat): Image {
		return new Image(buffer, format);
	}

	// ─── Resize Operations ───────────────────────────────────

	/**
	 * Resize the image.
	 *
	 * @param width - Target width (omit to auto-scale by height)
	 * @param height - Target height (omit to auto-scale by width)
	 * @param options - Resize options (mode, withoutEnlargement, background)
	 *
	 * @example
	 * ```ts
	 * Image.open('photo.jpg').resize(200, 200).save('thumb.jpg')
	 * Image.open('photo.jpg').resize(800).save('wide.jpg')
	 * Image.open('photo.jpg').resize(200, 200, { mode: 'cover' }).save('cover.jpg')
	 * ```
	 */
	resize(
		width?: number,
		height?: number,
		options?: ResizeOptions | "fit" | "fill" | "cover",
	): Image {
		let opts: ResizeOptions = {};
		if (typeof options === "string") {
			opts = { mode: options };
		} else if (options) {
			opts = options;
		}

		const fitMap: Record<string, keyof FitEnum> = {
			fit: "inside",
			fill: "fill",
			cover: "cover",
			inside: "inside",
			outside: "outside",
		};

		this._sharp.resize({
			width,
			height,
			fit: opts.mode ? (fitMap[opts.mode] ?? "inside") : "inside",
			withoutEnlargement: opts.withoutEnlargement ?? false,
			background: opts.background,
		});
		return this;
	}

	/**
	 * Fit image within dimensions (preserves aspect ratio, pads with background).
	 *
	 * @param width - Max width
	 * @param height - Max height
	 * @param background - Background color for padding (default: 'transparent')
	 *
	 * @example
	 * ```ts
	 * Image.open('photo.jpg').fit(200, 200, '#ffffff').save('fitted.jpg')
	 * ```
	 */
	fit(width: number, height: number, background?: string): Image {
		this._sharp.resize({
			width,
			height,
			fit: "contain",
			background: background ?? { r: 0, g: 0, b: 0, alpha: 0 },
		});
		return this;
	}

	/**
	 * Crop the image to exact dimensions.
	 *
	 * @param width - Crop width
	 * @param height - Crop height
	 * @param x - Start X offset (default: center/gravity)
	 * @param y - Start Y offset (default: center/gravity)
	 *
	 * @example
	 * ```ts
	 * Image.open('photo.jpg').crop(200, 200).save('cropped.jpg')
	 * Image.open('photo.jpg').crop(100, 100, 50, 50).save('offset.jpg')
	 * ```
	 */
	crop(width: number, height: number, x?: number, y?: number): Image {
		if (x !== undefined && y !== undefined) {
			this._sharp.extract({ left: x, top: y, width, height });
		} else {
			this._sharp.resize(width, height, { fit: "cover", position: "centre" });
		}
		return this;
	}

	// ─── Rotate & Flip ──────────────────────────────────────

	/**
	 * Rotate the image.
	 *
	 * @param degrees - Rotation angle (90, 180, 270, or -90 for counter-clockwise)
	 * @param background - Background color for uncovered areas (default: 'transparent')
	 *
	 * @example
	 * ```ts
	 * Image.open('photo.jpg').rotate(90).save('rotated.jpg')
	 * Image.open('photo.jpg').rotate(-90).save('ccw.jpg')
	 * ```
	 */
	rotate(degrees: number, background?: string): Image {
		this._sharp.rotate(degrees, {
			background: background ?? { r: 0, g: 0, b: 0, alpha: 0 },
		});
		return this;
	}

	/**
	 * Flip the image horizontally (mirror).
	 *
	 * @example
	 * ```ts
	 * Image.open('photo.jpg').flipH().save('mirrored.jpg')
	 * ```
	 */
	flipH(): Image {
		this._sharp.flop();
		return this;
	}

	/**
	 * Flip the image vertically (upside down).
	 *
	 * @example
	 * ```ts
	 * Image.open('photo.jpg').flipV().save('flipped.jpg')
	 * ```
	 */
	flipV(): Image {
		this._sharp.flip();
		return this;
	}

	// ─── Filters & Effects ──────────────────────────────────

	/**
	 * Convert the image to grayscale.
	 *
	 * @example
	 * ```ts
	 * Image.open('photo.jpg').greyscale().save('bw.jpg')
	 * ```
	 */
	greyscale(): Image {
		this._sharp.greyscale();
		return this;
	}

	/**
	 * Alias for greyscale().
	 */
	grayscale(): Image {
		return this.greyscale();
	}

	/**
	 * Apply gaussian blur.
	 *
	 * @param sigma - Blur radius (1-1000, default: 3)
	 *
	 * @example
	 * ```ts
	 * Image.open('photo.jpg').blur(5).save('blurred.jpg')
	 * ```
	 */
	blur(sigma?: number): Image {
		this._sharp.blur(sigma ?? true);
		return this;
	}

	/**
	 * Sharpen the image.
	 *
	 * @param sigma - Sharpening sigma (default: 1)
	 *
	 * @example
	 * ```ts
	 * Image.open('photo.jpg').sharpen(2).save('sharp.jpg')
	 * ```
	 */
	sharpen(sigma?: number): Image {
		if (sigma) {
			this._sharp.sharpen({ sigma });
		} else {
			this._sharp.sharpen({ sigma: 1 });
		}
		return this;
	}

	/**
	 * Negate the image (invert colors).
	 */
	negate(): Image {
		this._sharp.negate();
		return this;
	}

	/**
	 * Adjust brightness, saturation, hue, lightness.
	 *
	 * All values range from -100 to 100 (0 = no change).
	 *
	 * @param options.modulate - Brightness (-100 to 100, default: 0)
	 * @param options.saturation - Saturation (-100 to 100, default: 0)
	 * @param options.hue - Hue rotation (-100 to 100, default: 0)
	 * @param options.lightness - Lightness (-100 to 100, default: 0)
	 */
	modulate(options: {
		brightness?: number;
		saturation?: number;
		hue?: number;
		lightness?: number;
	}): Image {
		const b =
			options.brightness !== undefined
				? 1 + options.brightness / 100
				: undefined;
		const s =
			options.saturation !== undefined
				? 1 + options.saturation / 100
				: undefined;
		const h = options.hue !== undefined ? options.hue * 3.6 : undefined;
		const l =
			options.lightness !== undefined ? 1 + options.lightness / 100 : undefined;

		const opts: Record<string, number> = {};
		if (b !== undefined) opts.brightness = b;
		if (s !== undefined) opts.saturation = s;
		if (h !== undefined) opts.hue = h;
		if (l !== undefined) opts.lightness = l;

		this._sharp.modulate(opts);
		return this;
	}

	/**
	 * Tint the image with a color.
	 *
	 * @param color - CSS color string (e.g. '#ff0000', 'rgb(255,0,0)', 'red')
	 */
	tint(color: string): Image {
		this._sharp.tint(color);
		return this;
	}

	// ─── Watermark ──────────────────────────────────────────

	/**
	 * Add an image watermark.
	 *
	 * @param watermarkPath - Path to watermark image
	 * @param position - Position (default: 'bottom-right')
	 * @param opacity - Opacity 0-1 (default: 1)
	 * @param margin - Margin from edges in pixels (default: 10)
	 *
	 * @example
	 * ```ts
	 * Image.open('photo.jpg').watermark('logo.png').save('marked.jpg')
	 * Image.open('photo.jpg').watermark('logo.png', 'center', 0.5).save('watermarked.jpg')
	 * ```
	 */
	watermark(
		watermarkPath: string,
		position: WatermarkPosition = "bottom-right",
		_opacity: number = 1,
		margin: number = 10,
	): Image {
		if (!existsSync(watermarkPath)) {
			throw new Error(`Watermark image not found: ${watermarkPath}`);
		}

		const gravityMap: Record<string, Gravity> = {
			center: "centre" as Gravity,
			"top-left": "northwest" as Gravity,
			top: "north" as Gravity,
			"top-right": "northeast" as Gravity,
			left: "west" as Gravity,
			right: "east" as Gravity,
			"bottom-left": "southwest" as Gravity,
			bottom: "south" as Gravity,
			"bottom-right": "southeast" as Gravity,
		};

		this._sharp.composite([
			{
				input: watermarkPath,
				gravity: gravityMap[position] ?? ("southeast" as Gravity),
				top: position.includes("top") ? margin : undefined,
				left: position.includes("left") ? margin : undefined,
			},
		]);

		return this;
	}

	/**
	 * Add text watermark (overlay).
	 *
	 * Requires SVG text rendering support in sharp.
	 *
	 * @param text - Text to overlay
	 * @param options - Text styling options
	 *
	 * @example
	 * ```ts
	 * Image.open('photo.jpg').text('© 2026', {
	 *   fontSize: 24,
	 *   color: '#ffffff',
	 *   position: 'bottom-right'
	 * }).save('marked.jpg')
	 * ```
	 */
	text(text: string, options: TextOptions = {}): Image {
		const fontSize = options.fontSize ?? 32;
		const color = options.color ?? "#ffffff";
		const position = options.position ?? "bottom-right";
		const margin = options.margin ?? 10;
		const opacity = options.opacity ?? 0.8;

		const svgText = `
			<svg width="100%" height="100%">
				<text
					x="${position.includes("right") ? margin : position.includes("left") ? margin : "50%"}"
					y="${position.includes("bottom") ? `calc(100% - ${margin}px)` : position.includes("top") ? `${margin}` : "50%"}"
					font-family="${options.font ?? "Arial"}"
					font-size="${fontSize}"
					fill="${color}"
					fill-opacity="${opacity}"
					text-anchor="${position === "center" ? "middle" : position.includes("right") ? "end" : "start"}"
					alignment-baseline="${position === "center" || position === "bottom" || position === "top" ? "middle" : position.includes("bottom") ? "bottom" : "top"}"
				>${escapeXml(text)}</text>
			</svg>
		`;

		const gravityMap: Record<string, number> = {
			center: sharp.gravity.centre,
			"top-left": sharp.gravity.northwest,
			top: sharp.gravity.north,
			"top-right": sharp.gravity.northeast,
			left: sharp.gravity.west,
			right: sharp.gravity.east,
			"bottom-left": sharp.gravity.southwest,
			bottom: sharp.gravity.south,
			"bottom-right": sharp.gravity.southeast,
		};

		this._sharp.composite([
			{
				input: Buffer.from(svgText),
				gravity: gravityMap[position] ?? sharp.gravity.southeast,
			},
		]);

		return this;
	}

	// ─── Metadata ──────────────────────────────────────────

	/**
	 * Get image metadata (dimensions, format, EXIF, etc.).
	 *
	 * @example
	 * ```ts
	 * const meta = await Image.open('photo.jpg').metadata()
	 * console.log(meta.width, meta.height, meta.format)
	 * ```
	 */
	async metadata(): Promise<ImageMetadata> {
		const meta = await this._sharp.metadata();
		return {
			width: meta.width ?? 0,
			height: meta.height ?? 0,
			format: (meta.format as ImageFormat) ?? "jpeg",
			space: meta.space,
			channels: meta.channels,
			density: meta.density,
			hasAlpha: meta.hasAlpha,
			hasProfile: meta.hasProfile,
			exif: meta.exif as Record<string, any>,
		};
	}

	// ─── Output ────────────────────────────────────────────

	/**
	 * Save the processed image to a file.
	 *
	 * @param outputPath - Output file path
	 * @param format - Output format (default: inferred from extension or original)
	 *
	 * @example
	 * ```ts
	 * await Image.open('photo.jpg').resize(200).save('thumb.jpg')
	 * await Image.open('photo.png').save('photo.jpg', 'jpeg')  // convert format
	 * ```
	 */
	async save(outputPath: string, format?: ImageFormat): Promise<void> {
		const outDir = outputPath.substring(0, outputPath.lastIndexOf("/"));
		if (outDir && !existsSync(outDir)) {
			mkdirSync(outDir, { recursive: true });
		}

		const outFormat =
			format ??
			(extname(outputPath).toLowerCase().replace(".", "") as ImageFormat);
		await this._formatOutput(outFormat).toFile(outputPath);
	}

	/**
	 * Get the processed image as a Buffer.
	 *
	 * @param format - Output format (default: original)
	 *
	 * @example
	 * ```ts
	 * const buf = await Image.open('photo.jpg').resize(100).toBuffer('png')
	 * ```
	 */
	async toBuffer(format?: ImageFormat): Promise<Buffer> {
		return this._formatOutput(format ?? this._format).toBuffer();
	}

	// ─── Internal ──────────────────────────────────────────

	/** Apply output format settings. */
	private _formatOutput(format: ImageFormat): Sharp {
		const img = this._sharp.clone();

		switch (format) {
			case "jpeg":
				img.jpeg({ quality: 85, mozjpeg: true });
				break;
			case "png":
				img.png({ compressionLevel: 8 });
				break;
			case "webp":
				img.webp({ quality: 80 });
				break;
			case "gif":
				break;
			case "avif":
				img.avif({ quality: 65 });
				break;
			case "tiff":
				img.tiff({ quality: 85 });
				break;
		}

		return img;
	}
}

/** Escape XML special characters for SVG text. */
function escapeXml(s: string): string {
	return s
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&apos;");
}
