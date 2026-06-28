# File Upload

> File upload handling with validation and disk storage.

The `Upload` service is available via `this.upload` in Controllers. It handles file detection from multipart form data, validation (size, MIME type, extension), and disk storage.

---

## Configuration

Upload is configured in `src/index.ts` when creating the app. Default: 10MB max, stored in `storage/` directory.

```ts
import { createUpload } from 'bunigniter'

createUpload({
  maxSize: 5 * 1024 * 1024,     // 5MB (default: 10MB)
  allowedMimes: ['image/jpeg', 'image/png'],  // restrict MIME types
  allowedExts: ['.jpg', '.png'],              // restrict extensions
  storageDir: 'storage',                      // relative to CWD
  maxFiles: 10,                               // max files per request
  overwrite: false,                           // don't overwrite existing
})
```

---

## Basic Usage

### Single File Upload

```ts
export class Users extends Controller {
  async create() {
    // Auto-detect file from request body
    const file = await this.upload.file('avatar')
    if (!file) return this.badRequest({ avatar: 'File is required' })

    // Validate
    if (file._errors) {
      return this.badRequest({ avatar: file._errors })
    }

    // Store to disk
    const path = await this.upload.store(file, 'avatars')
    return this.json({ path })
  }
}
```

### Multiple File Upload

```ts
export class Gallery extends Controller {
  async create() {
    const files = await this.upload.files('photos')
    if (files.length === 0) {
      return this.badRequest({ photos: 'No files uploaded' })
    }

    const paths = await Promise.all(
      files.map(f => this.upload.store(f, 'gallery'))
    )

    return this.json({ paths })
  }
}
```

---

## API Reference

### `hasFile(field)`

Check if a file was uploaded for the given field name.

```ts
if (this.upload.hasFile('avatar')) {
  // file exists
}
```

### `file(field)`

Get a single uploaded file. Returns `UploadedFile | null`.

```ts
const file = await this.upload.file('avatar')
```

If multiple files are submitted under the same field name, the first one is returned and a warning is logged. Use `files()` instead.

### `files(field)`

Get multiple uploaded files. Returns `UploadedFile[]`.

```ts
const files = await this.upload.files('gallery')
```

### UploadedFile

| Property | Type | Description |
|----------|------|-------------|
| `field` | `string` | Form field name |
| `name` | `string` | Original file name from client |
| `size` | `number` | File size in bytes |
| `type` | `string` | MIME type |
| `storedPath` | `string?` | Relative path after `store()` (e.g. `avatars/abc.jpg`) |
| `absolutePath` | `string?` | Absolute path on disk after `store()` |
| `_errors` | `string[]?` | Validation error messages (if any) |

### `validate(file)`

Manually validate a file against configured rules. Returns `string[]` of error messages (empty array if valid).

```ts
const errors = this.upload.validate(file)
if (errors.length > 0) {
  return this.badRequest({ file: errors })
}
```

Validation includes:

- **Size** — exceeds `maxSize` (default 10MB)
- **MIME type** — not in `allowedMimes` (if configured)
- **Extension** — not in `allowedExts` (if configured)

### `extension(file)`

Get the file extension from the original name (lowercased, with dot).

```ts
this.upload.extension(file)  // '.jpg', '.pdf', ''
```

### `store(file, subdir?, filename?)`

Store a file to disk. Returns the relative path.

```ts
// Auto-generated filename: 1748200000_a1b2c3d4.jpg
const path = await this.upload.store(file, 'avatars')
// → 'avatars/1748200000_a1b2c3d4.jpg'

// Custom filename: profile.jpg
const path = await this.upload.store(file, 'avatars', 'profile')
// → 'avatars/profile.jpg'

// No subdirectory
const path = await this.upload.store(file)
// → '1748200000_a1b2c3d4.jpg'
```

### `delete(subpath)`

Delete a stored file by its relative path. Returns `true` if deleted, `false` if not found.

```ts
await this.upload.delete('avatars/old_profile.jpg')
```

### `deleteFile(file)`

Delete the stored file associated with an `UploadedFile` object.

```ts
const file = await this.upload.file('avatar')
await this.upload.store(file, 'avatars')
// ... later:
this.upload.deleteFile(file)
```

### `maxSize`

Get the configured max upload size in bytes (read-only).

```ts
const limit = this.upload.maxSize  // 10485760 (10MB)
```

### `storageDir`

Get the configured storage directory (read-only).

```ts
const dir = this.upload.storageDir  // 'storage'
```

---

## Examples

### Upload with Validation

```ts
async upload() {
  const file = await this.upload.file('document')

  if (!file) return this.badRequest({ document: 'File required' })
  if (file._errors) return this.badRequest({ document: file._errors })

  const path = await this.upload.store(file, 'documents')
  return this.json({ path, name: file.name, size: file.size })
}
```

### Upload with Custom Path and Extension Check

```ts
async uploadPhoto() {
  const file = await this.upload.file('photo')
  if (!file) return this.badRequest({ photo: 'No file' })

  const ext = this.upload.extension(file)
  if (!['.jpg', '.png', '.webp'].includes(ext)) {
    return this.badRequest({ photo: 'Only JPG, PNG, WebP allowed' })
  }

  const path = await this.upload.store(file, 'photos')
  return this.json({ path })
}
```

### Delete Previously Uploaded File

```ts
async replace(id: number) {
  const old = await this.db.first('SELECT avatar FROM users WHERE id = ?', [id])
  if (old?.avatar) {
    this.upload.delete(old.avatar)  // remove old file
  }

  const file = await this.upload.file('avatar')
  const path = await this.upload.store(file, 'avatars', `user_${id}`)
  await this.db.update('users', { avatar: path }, { id })

  return this.json({ path })
}
```

---

## UploadedFile Properties After Store

After `store()` is called, the file's `storedPath` and `absolutePath` are populated:

```ts
const file = await this.upload.file('doc')
await this.upload.store(file, 'docs')

console.log(file.storedPath)    // 'docs/1748200000_abc123.pdf'
console.log(file.absolutePath)  // '/app/storage/docs/1748200000_abc123.pdf'
```

---

## Source

- Implementation: `src/helpers/upload.ts`
- Controller injection: `src/router/file-router.ts`
- Exported from: `bunigniter`
