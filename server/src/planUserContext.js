/** Dữ liệu hồ sơ khách dùng cho sinh kế hoạch AI — một nguồn server-side. */

export function ageFromDob(dob) {
  if (!dob || typeof dob !== 'string') return null;
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

export function summarizeHealthProfile(health) {
  if (!health) return '';
  const parts = [];
  if (health.currentConditions?.trim()) parts.push(`Tình trạng hiện tại: ${health.currentConditions.trim()}`);
  if (health.medicalHistory?.trim()) parts.push(`Tiền sử: ${health.medicalHistory.trim()}`);
  if (health.allergies?.trim()) parts.push(`Dị ứng: ${health.allergies.trim()}`);
  if (health.medications?.trim()) parts.push(`Thuốc đang dùng: ${health.medications.trim()}`);
  if (health.contraindications?.trim()) parts.push(`Chống chỉ định / lưu ý: ${health.contraindications.trim()}`);
  return parts.join('\n');
}

/**
 * @param {{ profile: object|null, healthProfile: object|null, bmiEntries: object[] }} input
 */
export function buildPlanUserContext({ profile, healthProfile, bmiEntries }) {
  const age = ageFromDob(profile?.dob);
  const sortedBmi = [...(bmiEntries || [])].sort((a, b) => String(b.date).localeCompare(String(a.date)));
  const latestBmi = sortedBmi[sortedBmi.length - 1] ?? null;

  const profileLines = [];
  if (profile?.fullName?.trim()) profileLines.push(`Họ tên: ${profile.fullName.trim()}`);
  if (age != null) profileLines.push(`Tuổi: ${age} (từ ngày sinh hồ sơ)`);
  if (profile?.gender?.trim()) profileLines.push(`Giới tính: ${profile.gender.trim()}`);
  if (latestBmi) {
    profileLines.push(
      `Chỉ số gần nhất (${latestBmi.date}): ${latestBmi.weightKg} kg, ${latestBmi.heightCm} cm, BMI ${latestBmi.bmi}`,
    );
  }

  const healthSummary = summarizeHealthProfile(healthProfile);

  return {
    age,
    latestBmi,
    profileLines,
    healthSummary,
    hasDob: Boolean(profile?.dob?.trim()),
  };
}
