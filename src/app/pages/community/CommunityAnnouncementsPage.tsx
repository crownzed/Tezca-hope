import { useCustomerAuth } from '../../context/CustomerAuthContext';
import { AnnouncementChannel } from '../../components/community/AnnouncementChannel';

export function CommunityAnnouncementsPage() {
  const { token, user } = useCustomerAuth();
  return (
    <AnnouncementChannel
      token={token}
      userRole={user?.role || 'user'}
      userName={user?.name || 'Bạn'}
    />
  );
}
