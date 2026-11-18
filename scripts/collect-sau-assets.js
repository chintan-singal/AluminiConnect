const fs = require('node:fs/promises')
const path = require('node:path')
const sharp = require('sharp')
const headers = {
  'User-Agent': 'SAUAlumniAssetLibrary/1.0 (curated educational project)',
}

async function download(url) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const response = await fetch(url, { headers })
    if (response.ok) return response
    if (response.status !== 429 && response.status !== 503)
      throw new Error('Download failed ' + response.status + ' ' + url)
    const retryAfter = Number(response.headers.get('retry-after'))
    const delay = retryAfter > 0 ? retryAfter : 15 * (attempt + 1)
    if (delay > 180)
      throw new Error('Source requests a later retry in ' + delay + ' seconds')
    console.log('Source rate limit. Waiting', delay, 'seconds')
    await new Promise((resolve) => setTimeout(resolve, delay * 1000))
  }
  throw new Error(
    'Source rate limit persisted. Retry the curated collection later.',
  )
}

// Curated file pages, individually reviewed for attribution and reuse terms.
const sources = [
  {
    id: 'campus',
    file: 'South asian university campus photo.png',
    name: 'sau-maidan-garhi-campus',
    category: 'campus',
    title: 'A home for South Asian scholarship',
    description: 'South Asian University campus, Maidan Garhi, New Delhi.',
    author: 'South Asian University, via Wikimedia Commons',
    year: '2025',
    license: 'CC0 1.0',
    licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
    widths: [640, 1280, 1920],
    crop: { left: 0.09, top: 0.08, width: 0.69, height: 0.67 },
  },
  {
    id: 'community',
    file: 'Students of South Asian University, New Delhi.JPG',
    name: 'sau-independence-day-2013',
    category: 'student-life',
    title: 'Celebrating together',
    description:
      'Indian and Pakistani students at a joint Independence Day celebration at SAU in 2013.',
    author: 'Aheibam',
    year: '2013',
    license: 'CC BY-SA 3.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0/',
    widths: [640, 1280],
  },
  {
    id: 'library',
    file: 'Prof. G. K. Chadha Library.jpg',
    name: 'sau-chadha-library-2015',
    category: 'infrastructure',
    title: 'Where curiosity finds its home',
    description:
      'Entrance to the Prof. G. K. Chadha Library at SAU’s former campus, photographed in 2015.',
    author: 'Almodabber',
    year: '2015',
    license: 'CC BY-SA 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
    widths: [640, 1280],
  },
  {
    id: 'campus-plan',
    file: 'Proposed Campus of SAU.jpg',
    name: 'sau-proposed-campus-concept-2014',
    category: 'institutional',
    title: 'A campus imagined',
    description:
      'A 2014 architectural projection of the proposed Maidan Garhi campus.',
    author: 'Aheibam',
    year: '2014',
    license: 'CC BY-SA 3.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0/',
    widths: [640, 1280],
  },
]

async function main() {
  const destination = path.resolve(__dirname, '../web/public/assets/sau')
  const assets = []
  for (const source of sources) {
    const sourcePage =
      'https://commons.wikimedia.org/wiki/File:' +
      encodeURIComponent(source.file)
    const api = new URL('https://commons.wikimedia.org/w/api.php')
    api.search = new URLSearchParams({
      action: 'query',
      format: 'json',
      titles: 'File:' + source.file,
      prop: 'imageinfo',
      iiprop: 'url|size|extmetadata',
      iiurlwidth: '1920',
    })
    const response = await download(api)
    if (!response.ok)
      throw new Error('Metadata download failed ' + response.status)
    const payload = await response.json()
    const info = Object.values(payload.query.pages)[0].imageinfo[0]
    const publishedLicense = info.extmetadata.LicenseShortName.value
    if (
      !publishedLicense.includes(source.license.split(' ')[0]) ||
      !/CC0|CC BY-SA/.test(publishedLicense)
    ) {
      throw new Error('Review license before downloading ' + source.file)
    }
    const image = await download(info.thumburl || info.url)
    if (!image.ok) throw new Error('Image download failed ' + image.status)
    const buffer = Buffer.from(await image.arrayBuffer())
    let picture = sharp(buffer).rotate()
    if (source.crop) {
      const metadata = await picture.metadata()
      picture = picture.extract(
        Object.fromEntries(
          Object.entries(source.crop).map(([key, ratio]) => [
            key,
            Math.round(
              ratio *
                (['left', 'width'].includes(key)
                  ? metadata.width
                  : metadata.height),
            ),
          ]),
        ),
      )
    }
    await fs.mkdir(path.join(destination, source.category), { recursive: true })
    const variants = []
    for (const width of source.widths) {
      const filename =
        source.category + '/' + source.name + '-' + width + '.webp'
      const output = await picture
        .clone()
        .resize({ width, withoutEnlargement: true })
        .webp({ quality: 83 })
        .toFile(path.join(destination, filename))
      variants.push({
        src: '/assets/sau/' + filename,
        width: output.width,
        height: output.height,
        bytes: output.size,
      })
    }
    assets.push({
      ...source,
      file: undefined,
      name: undefined,
      widths: undefined,
      sourcePage,
      originalUrl: info.url,
      originalWidth: info.width,
      originalHeight: info.height,
      downloadedAt: new Date().toISOString().slice(0, 10),
      permissionStatus:
        'Published open license verified on the Wikimedia file page',
      modifications:
        (source.crop
          ? 'Cropped to the campus architecture within the source video frame. '
          : '') +
        'Resized and converted to WebP. Display crops vary by composition. Derivatives retain the source license.',
      variants,
    })
    console.log(
      source.id,
      publishedLicense,
      variants.map((v) => v.bytes).join(',') + ' bytes',
    )
    await new Promise((resolve) => setTimeout(resolve, 1000))
  }
  const manifest = {
    reviewedAt: '2026-11-18',
    assets,
    pending: [
      {
        category: 'branding',
        sourcePage: 'https://sau.int/media-coverages/media-downloads/',
        originalUrl:
          'https://sau.int/wp-content/themes/sau/images/sau_logo.gif',
        status:
          'Reference only. Explicit republication permission pending. Theme directory is disallowed by robots.txt.',
      },
      {
        category: 'events',
        sourcePage: 'https://gallery.sau.ac.in/',
        status:
          'Reference only. All-rights-reserved institutional gallery. Written permission needed for local republication.',
      },
      {
        category: 'convocation',
        sourcePage: 'https://sau.int/sau-films/second-convocation-2017/',
        status:
          'Reference only. Video archive linked without downloading media.',
      },
      {
        category: 'research',
        sourcePage: 'https://sau.int/r-and-d/home/',
        status:
          'Verified information source. Additional photography permission pending.',
      },
    ],
  }
  await fs.writeFile(
    path.join(destination, 'manifest.json'),
    JSON.stringify(manifest, null, 2) + '\n',
  )
}
main().catch((error) => {
  console.error(error.message)
  process.exitCode = 1
})
