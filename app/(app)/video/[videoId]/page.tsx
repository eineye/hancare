import { notFound } from 'next/navigation';
import VideoLessonScreen from '@/components/VideoLessonScreen';
import { getVideos } from '@/lib/content';

export const dynamic = 'force-dynamic';

export default async function VideoLessonPage({
  params,
  searchParams,
}: {
  params: Promise<{ videoId: string }>;
  searchParams: Promise<{ t?: string }>;
}) {
  const { videoId } = await params;
  const { t } = await searchParams;
  const videos = await getVideos();
  const index = videos.findIndex((v) => v.id === videoId);
  if (index === -1) notFound();

  const prev = index > 0 ? videos[index - 1] : undefined;
  const next = index < videos.length - 1 ? videos[index + 1] : undefined;
  const initialTimeSec = t !== undefined && Number.isFinite(Number(t)) ? Number(t) : undefined;

  return (
    <VideoLessonScreen
      key={videoId}
      video={videos[index]}
      initialTimeSec={initialTimeSec}
      prevHref={prev ? `/video/${prev.id}` : undefined}
      nextHref={next ? `/video/${next.id}` : undefined}
    />
  );
}
