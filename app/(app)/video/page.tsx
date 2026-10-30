import VideoGrid from '@/components/VideoGrid';
import { getVideos } from '@/lib/content';

// content/videos.json이 재배포 없이 수시로 바뀔 수 있으므로 매 요청마다 새로 읽는다.
export const dynamic = 'force-dynamic';

export default async function VideoListPage() {
  const videos = await getVideos();
  return <VideoGrid videos={videos} />;
}
