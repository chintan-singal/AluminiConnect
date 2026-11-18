const fs = require('node:fs/promises')
const path = require('node:path')
const sharp = require('sharp')
const manifest = require('../../web/public/assets/sau/manifest.json')

test.each(manifest.assets)(
  '$id has local responsive images with accurate dimensions and a recorded license',
  async (asset) => {
    expect(asset.sourcePage).toMatch(
      /^https:\/\/commons.wikimedia.org\/wiki\/File:/,
    )
    expect(asset.licenseUrl).toMatch(/^https:\/\/creativecommons.org\//)
    expect(asset.author).toBeTruthy()
    expect(asset.downloadedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(asset.variants.length).toBeGreaterThan(1)
    for (const variant of asset.variants) {
      const filename = path.join(__dirname, '../../web/public', variant.src)
      const buffer = await fs.readFile(filename)
      const metadata = await sharp(buffer).metadata()
      expect(metadata.format).toBe('webp')
      expect(metadata.width).toBe(variant.width)
      expect(metadata.height).toBe(variant.height)
      expect(buffer.length).toBe(variant.bytes)
      expect(variant.bytes).toBeLessThan(300000)
    }
  },
)
