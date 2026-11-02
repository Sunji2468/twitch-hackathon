import Overlay from '@/components/overlay';
export default async function OverlayPage({ params }: { params: Promise<{ token: string }> }) { return <Overlay token={(await params).token} />; }
