# Image Manipulation

> Image processing with resize, crop, rotate, filters, watermarks, and format conversion.

Uses `sharp` (libvips) for high-performance image processing. Available via `this.imageOpen()` in Controllers.

---

## Basic Usage

```ts
export class Photos extends Controller {
  async upload() {
    const file = await this.upload.file('photo')
    if (!file) return this.badRequest({ photo: 'File required' })

    // Open, resize, save
    await this.imageOpen(file.absolutePath!)
      .resize(800)
      .save('storage/thumbs/thumb.jpg')

    return this.json({ ok: true })
  }
}
```

---

## API Reference

### Factory Methods

#### `Image.open(path)`

Open an image file from disk.

```ts
const img = Image.open('uploads/photo.jpg')
```

#### `Image.fromBuffer(buffer, format?)`

Create an Image from a Buffer.

```ts
const img = Image.fromBuffer(buffer, 'png')
```

---

### Resize & Crop

#### `resize(width?, height?, options?)`

Resize the image. Omit width or height to auto-scale.

```ts
// Auto-height
Image.open('photo.jpg').resize(800).save('wide.jpg')

// Exact dimensions
Image.open('photo.jpg').resize(200, 200).save('thumb.jpg')

// Cover mode (crop to fill)
Image.open('photo.jpg').resize(200, 200, { mode: 'cover' }).save('cover.jpg')

// Fit mode (contain with background)
Image.open('photo.jpg').resize(200, 200, { mode: 'fit', background: '#ffffff' }).save('fitted.jpg')

// Without enlargement
Image.open('photo.jpg').resize(2000, { withoutEnlargement: true }).save('no-enlarge.jpg')
```

Resize modes:

| Mode | Behavior |
|------|----------|
| `'fit'` | Contain within bounds, preserves aspect ratio (default) |
| `'fill'` | Exact dimensions, may stretch |
| `'cover'` | Crop to fill exact dimensions |
| `'inside'` | Shrink to fit, never enlarge |
| `'outside'` | Stretch to cover, may exceed bounds |

#### `fit(width, height, background?)`

Fit image within dimensions (contain mode). Pads with background color if needed.

```ts
Image.open('photo.jpg').fit(200, 200, '#ffffff').save('fitted.jpg')
Image.open('logo.png').fit(200, 200).save('fitted.png')  // transparent bg
```

#### `crop(width, height, x?, y?)`

Crop to exact dimensions.

```ts
// Center crop (gravity)
Image.open('photo.jpg').crop(200, 200).save('cropped.jpg')

// Offset crop
Image.open('photo.jpg').crop(100, 100, 50, 50).save('offset.jpg')
```

---

### Rotate & Flip

#### `rotate(degrees, background?)`

Rotate the image. Any angle is supported.

```ts
Image.open('photo.jpg').rotate(90).save('rotated.jpg')   // clockwise
Image.open('photo.jpg').rotate(-90).save('ccw.jpg')       // counter-clockwise
Image.open('photo.jpg').rotate(45, '#ffffff').save('angled.jpg')  // with bg
```

#### `flipH()` / `flipV()`

Flip the image horizontally or vertically.

```ts
Image.open('photo.jpg').flipH().save('mirrored.jpg')     // mirror
Image.open('photo.jpg').flipV().save('upside-down.jpg')  // upside down
```

---

### Filters & Effects

#### `greyscale()` / `grayscale()`

Convert to black and white.

```ts
Image.open('photo.jpg').greyscale().save('bw.jpg')
```

#### `blur(sigma?)`

Apply gaussian blur.

```ts
Image.open('photo.jpg').blur(5).save('blurred.jpg')
Image.open('photo.jpg').blur().save('slightly-blurred.jpg')  // default sigma
```

#### `sharpen(sigma?)`

Sharpen the image.

```ts
Image.open('photo.jpg').sharpen(2).save('sharp.jpg')
```

#### `negate()`

Invert all colors (negative effect).

```ts
Image.open('photo.jpg').negate().save('negative.jpg')
```

#### `modulate(options)`

Adjust brightness, saturation, hue, and lightness. All values range from -100 to 100 (0 = no change).

```ts
// Brighten
Image.open('photo.jpg').modulate({ brightness: 30 }).save('brighter.jpg')

// Increase saturation
Image.open('photo.jpg').modulate({ saturation: 20 }).save('vibrant.jpg')

// Shift hue
Image.open('photo.jpg').modulate({ hue: 45 }).save('color-shifted.jpg')

// Combine
Image.open('photo.jpg')
  .modulate({ brightness: 10, saturation: -10, lightness: 5 })
  .save('adjusted.jpg')
```

#### `tint(color)`

Tint the image with a CSS color.

```ts
Image.open('photo.jpg').tint('#ff0000').save('red-tinted.jpg')
Image.open('photo.jpg').tint('rgba(0, 100, 255, 0.5)').save('blue-tinted.jpg')
```

---

### Watermark

#### `watermark(path, position?, opacity?, margin?)`

Add an image watermark overlay.

```ts
// Default: bottom-right, full opacity, 10px margin
Image.open('photo.jpg').watermark('logo.png').save('marked.jpg')

// Custom position and opacity
Image.open('photo.jpg')
  .watermark('logo.png', 'center', 0.5)
  .save('watermarked.jpg')

// All positions
Image.open('photo.jpg').watermark('logo.png', 'top-left').save('tl.jpg')
Image.open('photo.jpg').watermark('logo.png', 'top-right').save('tr.jpg')
Image.open('photo.jpg').watermark('logo.png', 'bottom-left').save('bl.jpg')
Image.open('photo.jpg').watermark('logo.png', 'bottom-right').save('br.jpg')
Image.open('photo.jpg').watermark('logo.png', 'center').save('center.jpg')
```

#### `text(text, options?)`

Add text overlay using SVG rendering.

```ts
// Simple copyright
Image.open('photo.jpg')
  .text('© 2026 Bunigniter')
  .save('copyright.jpg')

// Styled text
Image.open('photo.jpg')
  .text('Hello', {
    fontSize: 48,
    color: '#ffffff',
    position: 'center',
    opacity: 0.8,
    font: 'Arial',
  })
  .save('text-overlay.jpg')
```

Text options:

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `fontSize` | `number` | `32` | Font size in pixels |
| `color` | `string` | `'#ffffff'` | Text color (CSS) |
| `position` | `string` | `'bottom-right'` | Position |
| `opacity` | `number` | `0.8` | Text opacity (0-1) |
| `font` | `string` | `'Arial'` | Font family |
| `margin` | `number` | `10` | Margin from edges |

---

### Metadata

#### `metadata()`

Get image metadata including dimensions, format, and EXIF data.

```ts
const meta = await Image.open('photo.jpg').metadata()
console.log(meta)
// {
//   width: 1920,
//   height: 1080,
//   format: 'jpeg',
//   space: 'srgb',
//   channels: 3,
//   hasAlpha: false,
//   exif: { ... }
// }
```

---

### Output

#### `save(path, format?)`

Save the processed image to a file. Format is inferred from extension or specified explicitly.

```ts
// Same format as input
await Image.open('photo.png').save('output.png')

// Convert format
await Image.open('photo.png').save('output.jpg', 'jpeg')
await Image.open('photo.jpg').save('output.webp', 'webp')
await Image.open('photo.jpg').save('output.avif', 'avif')
```

Supported formats: `jpeg`, `png`, `webp`, `gif`, `avif`, `tiff`

#### `toBuffer(format?)`

Get the processed image as a Buffer.

```ts
const buf = await Image.open('photo.jpg').resize(100).toBuffer('png')
// buf is a Buffer with PNG data
```

---

## Chained Operations

All methods return `this`, so operations can be chained in any order:

```ts
await Image.open('photo.jpg')
  .resize(800, 600, { mode: 'cover' })
  .greyscale()
  .sharpen(1)
  .watermark('logo.png', 'bottom-right', 0.5)
  .save('final.jpg')
```

---

## Compared to CodeIgniter

| Bunigniter | CodeIgniter 3 | Description |
|-----------|---------------|-------------|
| `Image.open(path)` | `$img->load()` | Load image |
| `.resize(w, h)` | `->resize()` | Resize |
| `.crop(w, h)` | `->crop()` | Crop |
| `.rotate(deg)` | `->rotate()` | Rotate |
| `.flipH()` / `.flipV()` | `->flip()` | Flip |
| `.watermark(path)` | `->watermark()` | Watermark |
| `.greyscale()` | — | Grayscale |
| `.blur()` | — | Blur |
| `.sharpen()` | — | Sharpen |
| `.negate()` | — | Negative |
| `.tint()` | — | Color tint |
| `.modulate()` | — | Adjustments |
| `.text()` | — | Text overlay |
| `.metadata()` | `get_image_properties()` | Metadata |
| `.save()` | `->save()` | Save |

---

## Source

- Implementation: `src/services/image.ts`
- Controller: `this.imageOpen()` — `src/base/controller.ts`
- Engine: `sharp` (libvips)
