import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serve } from '@hono/node-server'
import { zValidator } from '@hono/zod-validator'
import { serveStatic } from '@hono/node-server/serve-static'
import { z } from 'zod'
import matter from 'gray-matter'
// import exifr from 'exifr'
// import sharp from 'sharp'
import { PhotoSchema } from '@repo/types'

const app = new Hono()
const port = 3001

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/* TODO: adjust as required - this may be an absolute path to a different project if required */
const photosFolder = path.normalize(
  'C:\\Github\\luke-secomb-simple\\src\\content\\photography'
)
// const photosFolder = path.join(__dirname, 'photos')
const photosFolderRelative = path.relative('./', photosFolder)
// const toLoadFolder = path.join(__dirname, 'processing')

const schema = PhotoSchema({ image: () => z.string() })
type ImageItem = z.infer<typeof schema>

// Middleware for CORS
app.use(cors())

// Serve static files from the 'photos' directory at the '/images' prefix
app.use(
  '/images/*',
  serveStatic({
    root: photosFolderRelative,
    rewriteRequestPath(path) {
      return path.replace('/images/', '')
    },
    onNotFound: (path, c) => {
      console.log(
        `${path} is not found, you access ${c.req.path} with root: ${photosFolderRelative}`
      )
    },
  })
)

// Ensure the 'photos' folder exists
async function ensurePhotosFolderExists() {
  try {
    await fs.mkdir(photosFolder, { recursive: true })
  } catch (error) {
    console.error('Error creating photos folder:', error)
  }
}

// get all photos currently in the specified folder
app.get('/api/photos', async (c) => {
  try {
    await ensurePhotosFolderExists()
    const files = await fs.readdir(photosFolder)
    const markdownFiles = files.filter((file) => file.endsWith('.md'))
    const imageData = await Promise.all(
      markdownFiles.map(async (mdFile) => {
        const filePath = path.join(photosFolder, mdFile)
        const fileContent = await fs.readFile(filePath, 'utf-8')
        const { data } = matter(fileContent)
        return {
          slug: mdFile.replace('.md', ''),
          date: data.date,
          ...data,
        } as ImageItem
      })
    )

    imageData.sort(
      (a, b) => new Date(b.date).valueOf() - new Date(a.date).valueOf()
    )

    return c.json(imageData)
  } catch (error) {
    console.error('Error fetching photo metadata:', error)
    return c.json({ error: 'Failed to fetch photo metadata.' }, 500)
  }
})

// get photo markdown frontmatter and content
app.get('/api/photos/:slug', async (c) => {
  const slug = c.req.param('slug')
  const markdownPath = path.join(photosFolder, `${slug}.md`)
  try {
    const fileContent = await fs.readFile(markdownPath, 'utf-8')
    const { data } = matter(fileContent)
    return c.json(data)
  } catch (error) {
    console.error(`Error fetching metadata for ${slug}:`, error)
    return c.json({ error: 'Metadata not found.' }, 404)
  }
})

// update photo markdown frontmatter and/or content
app.post('/api/photos/:slug', zValidator('json', schema), async (c) => {
  const slug = c.req.param('slug')
  const newData = c.req.valid('json')
  const oldMarkdownPath = path.join(photosFolder, `${slug}.md`)
  const oldImagePath = path.join(photosFolder, `${slug}.avif`)

  try {
    const newSlug = newData.slug || slug
    const newMarkdownPath = path.join(photosFolder, `${newSlug}.md`)
    const newImagePath = path.join(photosFolder, `./${newSlug}.avif`)

    // Update the src property in the newData
    newData.src = `./${newSlug}.avif`

    // Construct the content (body of the Markdown file)
    const fileContent = await fs.readFile(oldMarkdownPath, 'utf-8')
    const oldMd = matter(fileContent)
    const { data, content } = oldMd

    const {
      slug: _slug,
      content: _content,
      ...newDataWithoutSlugOrContent
    } = newData
    const newComputedData = {
      ...data,
      ...newDataWithoutSlugOrContent,
    }

    // merge the new data with the old data - make sure title,slug,..rest is the key order
    const markdown = matter.stringify(newData.content || content, {
      src: newComputedData.src,
      ...newComputedData,
    })

    // Write the updated markdown file
    await fs.writeFile(newMarkdownPath, markdown, 'utf-8')
    console.log(`Updated metadata file: ${path.basename(newMarkdownPath)}`)

    // Rename files if the slug has changed
    if (slug !== newSlug) {
      // await fs.rename(oldMarkdownPath, newMarkdownPath);
      if (
        await fs
          .access(oldMarkdownPath)
          .then(() => true)
          .catch(() => false)
      ) {
        await fs.rm(oldMarkdownPath)
        console.log(`Removed old markdown file ${oldMarkdownPath}`)
      }
      if (
        await fs
          .access(oldImagePath)
          .then(() => true)
          .catch(() => false)
      ) {
        await fs.rename(oldImagePath, newImagePath)
        console.log(`Renamed image to ${path.basename(newImagePath)}`)
      }
    }

    return c.json({
      message: `Metadata for ${newSlug} updated successfully.`,
    })
  } catch (error) {
    console.error(`Error updating metadata for ${slug}:`, error)
    return c.json({ error: `Failed to update metadata for ${slug}.` }, 500)
  }
})

// Function to process a single image from the 'to load' folder
// async function processImage(imagePath: string) {
//   try {
//     const imageName = path.basename(imagePath)
//     const imageSlug = path
//       .parse(imageName)
//       .name.toLowerCase()
//       .replace(/\s+/g, '-')
//     const newImageName = `${imageSlug}.avif`
//     const newImagePath = path.join(photosFolder, newImageName)
//     const markdownPath = path.join(photosFolder, `${imageSlug}.md`)

//     // Extract EXIF metadata
//     const exifData = await exifr(imagePath)

//     // Create markdown content
//     const frontmatter = {
//       slug: imageSlug,
//       title: exifData?.ImageDescription || imageName,
//       description: Object.entries(exifData || {})
//         .map(([key, value]) => `${key}: ${value}`)
//         .join('\n'),
//     }
//     const content = `![${frontmatter.title}](${newImageName})`
//     const markdown = matter.stringify(content, frontmatter)

//     // Save markdown file
//     await fs.writeFile(markdownPath, markdown, 'utf-8')
//     console.log(`Created metadata file: ${path.basename(markdownPath)}`)

//     // TODO: sharp the image?

//     // Delete the original file
//     await fs.unlink(imagePath)
//     console.log(`Deleted original file: ${imageName}`)
//   } catch (error) {
//     console.error(`Error processing ${path.basename(imagePath)}:`, error)
//   }
// }

// app.post('/api/load-new-images', async (c) => {
//   try {
//     await ensurePhotosFolderExists()
//     const files = await fs.readdir(toLoadFolder)
//     const imageFiles = files.filter((file) =>
//       /\.(jpg|jpeg|png|gif)$/i.test(file)
//     ) // Basic image extension filter

//     if (imageFiles.length === 0) {
//       return c.json({ message: 'No new images found in the "to load" folder.' })
//     }

//     await Promise.all(
//       imageFiles.map((file) => processImage(path.join(toLoadFolder, file)))
//     )
//     return c.json({
//       message: `Successfully processed ${imageFiles.length} new images.`,
//     })
//   } catch (error) {
//     console.error('Error loading new images:', error)
//     return c.json({ error: 'Failed to load new images.' }, 500)
//   }
// })

serve(
  {
    fetch: app.fetch,
    port,
  },
  () => {
    console.log(`Server listening on port ${port}`)
  }
)
