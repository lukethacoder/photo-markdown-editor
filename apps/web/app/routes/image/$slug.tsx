import React from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { z } from 'zod'
import { X } from 'lucide-react'
import { PHOTOGRAPHY_TAGS, PhotoSchema } from '@repo/types'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { API_BASE_URL } from '@/constants'
import { MultiSelect } from '@/components/multi-select'
import { InputDateTime } from '@/components/input-date-time'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Slider } from '@/components/ui/slider'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ISO_COUNTRIES } from 'node_modules/@repo/types/src/constants'

const schema = PhotoSchema({ image: () => z.string() })

type InstagramTags = z.infer<typeof schema>['instagramTags']

export const Route = createFileRoute('/image/$slug')({
  loader: async ({ params: { slug } }) => {
    const data = await fetch(`${API_BASE_URL}/api/photos/${slug.toLowerCase()}`).then((res) =>
      res.json()
    )
    const parsedData = schema.parse(data)

    return {
      slug,
      ...parsedData,
    }
  },
  component: RouteComponent,
})

function processInstagramTags(formData: FormData): InstagramTags {
  const usernames: string[] = formData.getAll('username') as string[]
  const instagramTags: InstagramTags = []
  const positions: Record<string, Record<string, number>> = {}

  // extract the positions of the tags
  for (const [key, value] of formData.entries()) {
    if (key.startsWith('position-')) {
      const parts = key.split('-')
      const usernameIndex = parts[2]

      if (!positions[usernameIndex]) {
        positions[usernameIndex] = {}
      }
      positions[usernameIndex][parts[1]] = parseInt(String(value), 10)
    }
  }

  // map the positions to the respective usernames
  usernames.forEach((username, index) => {
    if (positions[index] && Object.keys(positions[index]).length > 0) {
      const sortedPositions = Object.keys(positions[index])
        .sort((a, b) => parseInt(a, 10) - parseInt(b, 10))
        .map((key) => positions[index][key])

      instagramTags.push({
        username: username,
        position: sortedPositions,
      })
    }
  })

  return instagramTags
}

function RouteComponent() {
  const initialData = Route.useLoaderData()
  const navigate = useNavigate()

  const [data, setData] = React.useState(initialData)
  const initialSlug = initialData.slug

  const handleAddNewTag = () => {
    setData({
      ...data,
      instagramTags: [
        ...(data.instagramTags || []),
        {
          username: '',
          position: [1, 1],
        },
      ],
    })
  }

  const handleRemoveInstagramTag = (key) => {
    const instagramTags = data.instagramTags || []
    if (instagramTags.length > 0) {
      instagramTags.splice(key, 1)
    }

    setData({
      ...data,
      instagramTags,
    })
  }

  /**
   * Only tracks the inputs of the instagramTags to live update them on the image overlay
   * @param event
   */
  const handleInputChange = (event) => {
    const { target } = event
    const { value, name } = target

    const indexKey = Number(target.dataset.key)

    const instagramTags = (data.instagramTags || []).map((item, key) => {
      if (indexKey === key) {
        if (name.includes('position')) {
          return {
            ...item,
            position: [
              name === `position-0-${key}` ? Number(value) : item.position[0],
              name === `position-1-${key}` ? Number(value) : item.position[1],
            ],
          }
        }

        return {
          ...item,
          [name]: value,
        }
      }
      return item
    })

    setData({
      ...data,
      instagramTags,
    })
  }

  /**
   * Only tracks the inputs of the instagramTag position sliders
   * @param event
   */
  const handleInputSliderChange = (indexKey, name, value) => {
    const instagramTags = (data.instagramTags || []).map((item, key) => {
      if (indexKey === key) {
        if (name.includes('position')) {
          return {
            ...item,
            position: [
              name === `position-0-${key}` ? Number(value) : item.position[0],
              name === `position-1-${key}` ? Number(value) : item.position[1],
            ],
          }
        }

        return {
          ...item,
          [name]: value,
        }
      }
      return item
    })

    setData({
      ...data,
      instagramTags,
    })
  }

  const validateForm = (formData: any) => {
    if (!(formData instanceof FormData)) {
      throw new Error('Invalid form data')
    }

    const slug = formData.get('slug')

    if (!slug) {
      throw new Error('slug is required')
    }

    const formatData = Object.fromEntries(formData.entries())

    const date = new Date(parseInt(formatData.date as string))

    const location_name = formData.get('location_name')
    const location_url = formData.get('location_url')
    const location_flag = formData.get('location_flag')

    const data = {
      ...formatData,
      date,
      tags: Array.isArray(formatData.tags)
        ? formatData.tags
        : (formatData.tags as string).split(','),
      ...(location_name || location_url || location_flag
        ? {
            location: {
              ...(location_name ? { name: location_name } : {}),
              ...(location_url ? { url: location_url } : {}),
              ...(location_flag ? { flag: location_flag } : {}),
            },
          }
        : {}),
      instagramTags: processInstagramTags(formData),
    }

    const parsedData = schema.parse(data)

    return {
      data: parsedData,
    }
  }

  const updatePostData = async (data: z.infer<typeof schema>) => {
    const body: BodyInit = JSON.stringify(data)
    console.log('body ', body)

    const response = await fetch(`${API_BASE_URL}/api/photos/${initialSlug}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body,
    })

    console.log('response ', response)
    // throw redirect({
    //   to: `/image/${data.slug}`,
    //   headers: {
    //     'X-Custom-Header': 'value',
    //   },
    // })

    return 'success'
    // return new Response('ok', {
    //   status: 301,
    //   headers: { Location: `/image/${data.slug}` },
    // })
  }

  const handleOnSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault() // Prevents the default browser form submission

    const form = event.currentTarget
    const formData = new FormData(form)

    try {
      console.log('Form data submitted:', formData)
      const { data } = validateForm(formData)

      console.log('data ', data)

      await updatePostData(data)
      toast.success('Successfully updated data')

      // redirect if slugs have changed
      if (initialSlug !== data.slug) {
        console.log('changing slug ', initialSlug, ' to ', data.slug)
        navigate({ to: `/image/${data.slug}` })
      }
    } catch (error) {
      console.error('Submission failed:', error)

      // Optionally display an error message to the user
      // alert("Oops! Something went wrong. Please try again.");
      toast.error(
        <div className='overflow-hidden w-full'>
          <p>Error updating metadata</p>
          <div className='w-full max-h-[320px] overflow-auto'>
            <pre className='w-full'>{JSON.stringify(error, undefined, 2)}</pre>
          </div>
        </div>,
        { duration: 10000, dismissible: true }
      )
    } finally {
      // Optionally perform any cleanup or final actions
      console.log('Submission process completed.')
    }
  }

  return (
    <div className='grid md:grid-cols-2 gap-4 p-4 max-w-7xl mx-auto'>
      <div>
        <Card className='w-full'>
          <CardHeader>
            <CardTitle>Image Editor</CardTitle>
            <CardDescription>{data.slug}</CardDescription>
          </CardHeader>
          <CardContent>
            <form className='flex flex-col gap-4' onSubmit={handleOnSubmit}>
              <div className=''>
                <Label htmlFor='srcPath'>srcPath</Label>
                <Input id='srcPath' name='srcPath' defaultValue={data.srcPath} readOnly />
              </div>
              <div className=''>
                <Label htmlFor='old-slug'>Old Slug</Label>
                <Input id='old-slug' name='old-slug' defaultValue={data.slug} />
              </div>
              <div className='flex flex-col gap-2'>
                <Label htmlFor='slug'>Slug</Label>
                <Input id='slug' name='slug' defaultValue={data.slug} />
              </div>
              <div className='flex flex-col gap-2'>
                <Label htmlFor='title'>Title</Label>
                <Input id='title' name='title' defaultValue={data.title} />
              </div>
              <div className='flex flex-col gap-2'>
                <Label htmlFor='alt'>Image alt</Label>
                <Input id='alt' name='alt' defaultValue={data.alt} />
              </div>
              <div className='flex flex-col gap-2'>
                <Label htmlFor='date'>Date</Label>
                <InputDateTime id='date' name='date' defaultValue={data.date} />
              </div>
              <div className='flex flex-col gap-2'>
                <Label htmlFor='date'>Tags</Label>
                <MultiSelect
                  id='tags'
                  name='tags'
                  options={PHOTOGRAPHY_TAGS.map((item) => ({
                    label: item,
                    value: item,
                  }))}
                  defaultValue={data.tags}
                />
              </div>

              <hr />

              <h3>Location</h3>
              <div className='flex flex-col gap-2'>
                <div className='flex flex-col gap-2'>
                  <Label htmlFor='location.name'>Name</Label>
                  <Input
                    id='location_name'
                    name='location_name'
                    defaultValue={data.location?.name}
                  />
                </div>
                <div className='flex flex-col gap-2'>
                  <Label htmlFor='location.url'>URL</Label>
                  <Input
                    id='location_url'
                    name='location_url'
                    defaultValue={data.location?.url}
                  />
                </div>
                <div className='flex flex-col gap-2'>
                  <Label htmlFor='location_flag'>Flag</Label>
                  <Select
                    defaultValue={data.location?.flag}
                    onValueChange={(event) => {
                      console.log('event ', event)
                      setData({
                        ...data,
                        location: {
                          ...data.location,
                          flag: event,
                        } as z.infer<typeof schema>['location'],
                      })
                    }}
                  >
                    <input
                      value={data.location?.flag}
                      name='location_flag'
                      readOnly
                    />
                    <SelectTrigger className='w-full'>
                      <SelectValue placeholder='Select a flag' />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>Flags</SelectLabel>
                        <SelectItem value='null'>None</SelectItem>
                        {Object.entries(ISO_COUNTRIES).map(([key, value]) => (
                          <SelectItem key={key} value={key}>
                            [{key}] {value}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <hr />

              <h3>Instagram Tags</h3>
              <ul className='flex flex-col gap-4'>
                {data.instagramTags &&
                  data.instagramTags.map((item, key) => (
                    <li key={key} className='gap-4 flex flex-col'>
                      <Card className='p-0'>
                        <CardContent className='flex p-0'>
                          <div className='w-full p-4 border-r flex flex-col gap-3'>
                            <div className='flex flex-col gap-2'>
                              <Label htmlFor={`username-${key}`}>
                                Username
                              </Label>
                              <Input
                                id={`username-${key}`}
                                name='username'
                                data-key={key}
                                defaultValue={item.username}
                                onChange={handleInputChange}
                              />
                            </div>
                            <div className='flex flex-col gap-2'>
                              <h3 className='flex items-center gap-2 text-sm leading-none font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50'>
                                Position
                              </h3>
                              <div className='flex gap-2'>
                                <div className='flex flex-col w-1/2 gap-4 pb-1'>
                                  <Label
                                    htmlFor={`position-0-${key}`}
                                    className='sr-only'
                                  >
                                    Position Y
                                  </Label>
                                  <Input
                                    id={`position-0-${key}`}
                                    name={`position-0-${key}`}
                                    type='number'
                                    min={0}
                                    max={100}
                                    value={item.position[0]}
                                    data-key={key}
                                    onChange={handleInputChange}
                                  />
                                  <Slider
                                    id={`position-0-${key}`}
                                    name={`position-0-${key}`}
                                    max={100}
                                    min={0}
                                    step={1}
                                    data-key={key}
                                    value={[item.position[0]]}
                                    onValueChange={(value) =>
                                      handleInputSliderChange(
                                        key,
                                        `position-0-${key}`,
                                        value
                                      )
                                    }
                                  />
                                </div>
                                <div className='flex flex-col w-1/2 gap-4 pb-1'>
                                  <Label
                                    htmlFor={`position-1-${key}`}
                                    className='sr-only'
                                  >
                                    Position X
                                  </Label>
                                  <Input
                                    id={`position-1-${key}`}
                                    name={`position-1-${key}`}
                                    type='number'
                                    min={0}
                                    max={100}
                                    value={item.position[1]}
                                    data-key={key}
                                    onChange={handleInputChange}
                                  />
                                  <Slider
                                    id={`position-1-${key}`}
                                    name={`position-1-${key}`}
                                    max={100}
                                    min={0}
                                    step={1}
                                    data-key={key}
                                    value={[item.position[1]]}
                                    onValueChange={(value) =>
                                      handleInputSliderChange(
                                        key,
                                        `position-1-${key}`,
                                        value
                                      )
                                    }
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className='flex items-center p-2'>
                            <Button
                              type='button'
                              size='icon'
                              variant='destructive'
                              aria-label='Delete item'
                              onClick={() => handleRemoveInstagramTag(key)}
                            >
                              <X />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </li>
                  ))}
                <li className='flex justify-end'>
                  <Button
                    type='button'
                    variant='outline'
                    onClick={handleAddNewTag}
                  >
                    Add new tag
                  </Button>
                </li>
              </ul>

              <hr />

              <div className='flex justify-end gap-2'>
                <Button
                  type='button'
                  variant='ghost'
                  onClick={() => toast.success('hello world')}
                >
                  Toast
                </Button>
                <Button
                  type='button'
                  variant='outline'
                  onClick={() => navigate({ to: '/' })}
                >
                  Cancel
                </Button>
                <Button type='submit'>Save</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
      <div className='flex flex-col gap-4'>
        <div className='relative'>
          <div className='absolute w-full h-full'>
            {data.instagramTags?.map((item, key) => {
              const top = item.position[0]
              const left = item.position[1]

              // any value above 75% should be "inverted" so the label renders correctly

              const topOrBottom = top < 75 ? 'top' : 'bottom'
              const topOrBottomValue = top < 75 ? top : 100 - top

              const leftOrRight = left < 75 ? 'left' : 'right'
              const leftOrRightValue = left < 75 ? left : 100 - left

              // any value above 90 should drop the "x center" offset
              const shouldTranslateX =
                leftOrRightValue < 95 && leftOrRightValue > 5

              return (
                <button
                  key={key}
                  style={{
                    [topOrBottom]: `${topOrBottomValue}%`,
                    [leftOrRight]: `${leftOrRightValue}%`,
                  }}
                  className={`flex cursor-pointer absolute bg-black text-white p-1 rounded text-sm pointer-events-auto ${shouldTranslateX ? '-translate-x-1/2' : ''}`}
                >
                  {item.username}
                </button>
              )
            })}
          </div>
          <img src={`${API_BASE_URL}/images/${data.slug}/img.avif`} />
        </div>
        <div className='flex max-w-full w-[240px] h-[240px]'>
          <img src={data.blurHash} className='object-contain' />
        </div>
      </div>
    </div>
  )
}
