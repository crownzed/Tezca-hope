import { useAnyCommunitySession } from '../../lib/useCommunitySession';
import { DirectMessagesPanel } from '../../components/community/DirectMessagesPanel';

export function CommunityDmPage() {
  const { token, user } = useAnyCommunitySession();
  if (!user?.id) return null;
  return (
    <DirectMessagesPanel
      token={token}
      currentUserId={user.id}
      currentUserName={user.name || 'Bạn'}
    />
  );
}
