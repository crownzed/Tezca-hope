import { useAnyCommunitySession } from '../../lib/useCommunitySession';
import { AnnouncementChannel } from '../../components/community/AnnouncementChannel';

export function CommunityAnnouncementsPage() {
  const { token, user } = useAnyCommunitySession();
  return (
    <AnnouncementChannel
      token={token}
      userRole={user?.role || 'user'}
      userName={user?.name || 'Bạn'}
    />
  );
}
