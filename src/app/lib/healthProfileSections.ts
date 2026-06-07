import type { HealthProfile } from '../components/HealthProfileForm';

export type HealthProfileSection = {
  key: keyof HealthProfile;
  title: string;
  hint: string;
  placeholder: string;
  rows: number;
};

export const HEALTH_PROFILE_SECTIONS: HealthProfileSection[] = [
  {
    key: 'currentConditions',
    title: 'Tình trạng hiện tại',
    hint: 'Bệnh đang mắc, triệu chứng hoặc đau ốm gần đây',
    placeholder: 'Ví dụ: tiểu đường type 2, đau lưng cấp tính tuần trước…',
    rows: 3,
  },
  {
    key: 'medicalHistory',
    title: 'Tiền sử bệnh lý',
    hint: 'Các vấn đề từng trải qua, phẫu thuật, nằm viện',
    placeholder: 'Ví dụ: thoát vị đĩa đệm 2020, nội soi dạ dày 2022…',
    rows: 3,
  },
  {
    key: 'allergies',
    title: 'Dị ứng',
    hint: 'Thuốc, thực phẩm, môi trường',
    placeholder: 'Ví dụ: penicillin, hải sản, phấn hoa…',
    rows: 2,
  },
  {
    key: 'medications',
    title: 'Thuốc đang dùng',
    hint: 'Tên thuốc, liều lượng, tần suất (nếu biết)',
    placeholder: 'Ví dụ: metformin 500mg x2/ngày…',
    rows: 2,
  },
  {
    key: 'contraindications',
    title: 'Chống chỉ định',
    hint: 'Hạn chế vận động hoặc dinh dưỡng cần tránh',
    placeholder: 'Ví dụ: không squat sâu, hạn chế đường tinh luyện…',
    rows: 2,
  },
];

export function hasHealthProfileData(profile: HealthProfile | null | undefined) {
  if (!profile) return false;
  return HEALTH_PROFILE_SECTIONS.some((s) => Boolean(profile[s.key]?.trim()));
}
