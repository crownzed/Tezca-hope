import type { CustomerBasicProfile } from '../components/CustomerProfileForm';
import type { BmiEntry } from './healthStorage';

export type HealthProfileSnapshot = {
  currentConditions?: string;
  medicalHistory?: string;
  allergies?: string;
  medications?: string;
  contraindications?: string;
};

export function ageFromDob(dob: string | undefined | null): number | null {
  if (!dob?.trim()) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(dob.trim());
  if (!m) return null;
  const birth = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  if (Number.isNaN(birth.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age -= 1;
  if (age < 14 || age > 100) return null;
  return age;
}

export function summarizeHealthProfile(health: HealthProfileSnapshot | null | undefined): string {
  if (!health) return '';
  const parts: string[] = [];
  if (health.currentConditions?.trim()) parts.push(`Tình trạng hiện tại: ${health.currentConditions.trim()}`);
  if (health.medicalHistory?.trim()) parts.push(`Tiền sử: ${health.medicalHistory.trim()}`);
  if (health.allergies?.trim()) parts.push(`Dị ứng: ${health.allergies.trim()}`);
  if (health.medications?.trim()) parts.push(`Thuốc đang dùng: ${health.medications.trim()}`);
  if (health.contraindications?.trim()) parts.push(`Chống chỉ định / lưu ý: ${health.contraindications.trim()}`);
  return parts.join('\n');
}

export function buildPlanUserContext(input: {
  profile: CustomerBasicProfile | null;
  healthProfile: HealthProfileSnapshot | null;
  bmiEntries: BmiEntry[];
}) {
  const age = ageFromDob(input.profile?.dob);
  const sortedBmi = [...input.bmiEntries].sort((a, b) => b.date.localeCompare(a.date));
  const latestBmi = sortedBmi[0] ?? null;

  const profileLines: string[] = [];
  if (input.profile?.fullName?.trim()) profileLines.push(`Họ tên: ${input.profile.fullName.trim()}`);
  if (age != null) profileLines.push(`Tuổi: ${age}`);
  if (input.profile?.gender?.trim()) profileLines.push(`Giới tính: ${input.profile.gender.trim()}`);
  if (latestBmi) {
    profileLines.push(
      `Chỉ số gần nhất (${latestBmi.date}): ${latestBmi.weightKg} kg, ${latestBmi.heightCm} cm, BMI ${latestBmi.bmi.toFixed(1)}`,
    );
  }

  const healthSummary = summarizeHealthProfile(input.healthProfile);

  return {
    age,
    latestBmi,
    profileLines,
    healthSummary,
    hasDob: Boolean(input.profile?.dob?.trim()),
  };
}
