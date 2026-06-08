import { useCustomerAuth } from '../../context/CustomerAuthContext';
import { DirectMessagesPanel } from '../../components/community/DirectMessagesPanel';

export function CommunityDmPage() {
  const { token, user } = useCustomerAuth();
  if (!user?.id) return null;
  return (
    <DirectMessagesPanel
      token={token}
      currentUserId={user.id}
      currentUserName={user.name || 'Bạn'}
    />
  );
}
