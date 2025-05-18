import { z, ZodSchema } from 'zod'
import {
  EXIF_MAKE_MAPPING,
  EXIF_MODEL_MAPPING,
  EXIF_LENS_MAPPING,
  ISO_COUNTRIES,
} from './constants.ts'

export const PHOTOGRAPHY_TAGS = [
  'concert',
  'automotive',
  'travel',
  'street',
  'other',
] as const

export const ExifMakeKeyEnum = z.enum(
  Object.keys(EXIF_MAKE_MAPPING) as [
    keyof typeof EXIF_MAKE_MAPPING,
    ...(keyof typeof EXIF_MAKE_MAPPING)[],
  ]
)
export const ExifModelKeyEnum = z.enum(
  Object.keys(EXIF_MODEL_MAPPING) as [
    keyof typeof EXIF_MODEL_MAPPING,
    ...(keyof typeof EXIF_MODEL_MAPPING)[],
  ]
)
export const ExifLensKeyEnum = z.enum(
  Object.keys(EXIF_LENS_MAPPING) as [
    keyof typeof EXIF_LENS_MAPPING,
    ...(keyof typeof EXIF_LENS_MAPPING)[],
  ]
)

export const IsoCountriesKeyEnum = z.enum(
  Object.keys(ISO_COUNTRIES) as [
    keyof typeof ISO_COUNTRIES,
    ...(keyof typeof ISO_COUNTRIES)[],
  ]
)

export type ImageFunction = () => z.ZodObject<{
  src: z.ZodString
  width: z.ZodNumber
  height: z.ZodNumber
  format: z.ZodUnion<
    [
      z.ZodLiteral<'png'>,
      z.ZodLiteral<'jpg'>,
      z.ZodLiteral<'jpeg'>,
      z.ZodLiteral<'tiff'>,
      z.ZodLiteral<'webp'>,
      z.ZodLiteral<'gif'>,
      z.ZodLiteral<'svg'>,
      z.ZodLiteral<'avif'>,
    ]
  >
}>

export const PhotoSchema = ({ image }: { image: () => ZodSchema }) =>
  z.object({
    slug: z.string().optional(),
    // not an actual key to be saved in the frontmatter, but the markdown file content
    content: z.string().optional(),
    title: z.string(),
    tags: z.array(z.enum(PHOTOGRAPHY_TAGS)).optional(),
    date: z.union([z.string().transform((str) => new Date(str)), z.date()]),
    // should match name of the file
    // should match name of the file
    // src: image(),
    srcPath: z.string().startsWith('/'),
    alt: z.string(),
    // base64 encoded blurred version of the image - ideally nice and small to display while the main image is loading
    blurHash: z.string().startsWith('data:image/').optional(),
    // metadata is optional, if provided, only make + model are required
    metadata: z
      .object({
        // explicit 'make' and 'model' for cameras and lenses used. Allows us to map to "nice names" later
        make: ExifMakeKeyEnum,
        model: ExifModelKeyEnum,
        lens: ExifLensKeyEnum.optional(),
        fStop: z.number().optional(),
        shutterSpeed: z.number().optional(),
        iso: z.number().optional(),
        focalLength: z.number().optional(),
      })
      .optional(),
    location: z
      .object({
        name: z.string(),
        url: z.string().optional(),
        flag: IsoCountriesKeyEnum.optional(),
      })
      .optional(),
    links: z
      .array(
        z.object({
          url: z.string(),
          type: z.enum(['instagram', 'bandcamp', 'spotify']).optional(),
        })
      )
      .optional(),
    instagramTags: z
      .array(
        z.object({
          username: z.string(),
          position: z.array(
            z.number().max(100).min(0),
            z.number().max(100).min(0)
          ),
        })
      )
      .optional(),
  })
