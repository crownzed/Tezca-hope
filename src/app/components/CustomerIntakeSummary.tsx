import { HEALTH_PROFILE_SECTIONS } from '../lib/healthProfileSections';
import { tezcaCardStyle, tezcaTheme } from '../lib/tezcaTheme';
import { ProfileSectionNote } from './profile/ProfileSectionNote';
import type { CustomerBasicProfile } from './CustomerProfileForm';
import type { HealthProfile } from './HealthProfileForm';

export type CustomerIntakePacket = {
  profile?: CustomerBasicProfile | null;
  healthProfile?: HealthProfile | null;
};

function genderLabel(gender: string | undefined) {
  if (gender === 'male') return 'Nam';
  if (gender === 'female') return 'Nữ';
  if (gender === 'other') return 'Khác';
  return gender || '';
}

type Props = {
  intake: CustomerIntakePacket | null | undefined;
  title?: string;
  compact?: boolean;
};

export function CustomerIntakeSummary({ intake, title = 'Hồ sơ gửi chuyên gia', compact }: Props) {
  const profile = intake?.profile;
  const health = intake?.healthProfile;
  const hasProfile =
    profile &&
    (profile.fullName || profile.phone || profile.notes || profile.address || profile.dob || profile.gender);
  const hasHealth = health && HEALTH_PROFILE_SECTIONS.some((s) => Boolean(health[s.key]?.trim()));

  if (!hasProfile && !hasHealth) {
    return (
      <div className={`rounded-xl border px-4 py-3 text-sm opacity-70 ${compact ? '' : 'mt-2'}`} style={tezcaCardStyle}>
        Khách hàng chưa hoàn thiện hồ sơ gửi chuyên gia.
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${compact ? '' : 'mt-2'}`}>
      {title ? (
        <p className="m-0 text-xs font-semibold uppercase tracking-wide px-1" style={{ color: tezcaTheme.accentDark }}>
          {title}
        </p>
      ) : null}
      {hasProfile && (
        <div className="space-y-2">
          <p className="m-0 text-xs font-semibold opacity-70 px-1">Thông tin cá nhân</p>
          <ProfileSectionNote title="Họ và tên" value={profile?.fullName} />
          <div className={compact ? 'space-y-2' : 'grid sm:grid-cols-2 gap-2'}>
            <ProfileSectionNote title="Giới tính" value={genderLabel(profile?.gender)} />
            <ProfileSectionNote title="Ngày sinh" value={profile?.dob} />
          </div>
          <ProfileSectionNote title="Điện thoại" value={profile?.phone} />
          <ProfileSectionNote title="Địa chỉ" value={profile?.address} />
          <ProfileSectionNote title="Ghi chú" hint="Mục tiêu & lưu ý" value={profile?.notes} />
        </div>
      )}
      {hasHealth && (
        <div className="space-y-2">
          <p className="m-0 text-xs font-semibold opacity-70 px-1 pt-1">Hồ sơ bệnh lý (theo mục)</p>
          {HEALTH_PROFILE_SECTIONS.map((section) => (
            <ProfileSectionNote
              key={section.key}
              title={section.title}
              hint={section.hint}
              value={health?.[section.key]}
            />
          ))}
        </div>
      )}
    </div>
  );
}
