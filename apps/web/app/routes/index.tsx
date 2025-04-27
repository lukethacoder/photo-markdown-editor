import { createFileRoute } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';
import { API_BASE_URL } from '../constants';

async function getPhotos() {
  return await fetch(`${API_BASE_URL}/api/photos`).then((res) => res.json());
}

const getCount = createServerFn({
  method: 'GET',
}).handler(() => {
  return getPhotos();
});

export const Route = createFileRoute('/')({
  component: Home,
  loader: async () => await getCount(),
});

function Home() {
  const state = Route.useLoaderData();

  return (
    <div className="image-grid">
      {state.map((item) => (
        <a href={`/image/${item.slug}`} key={item.slug} className='overflow-hidden aspect-square hover:opacity-80 transform-opacity duration-200 ease-in-out'>
          <img className="w-full h-full object-cover" src={`${API_BASE_URL}/images/${item.slug}.avif`} />
        </a>
      ))}
    </div>
  );
}
