import {
  PLAN_SCHEMA,
  buildPlanUserPrompt,
  normalizePlanInput,
  planJsonToExercises,
  planJsonToMarkdown,
  generateStructuredPlan,
} from '../src/trainingPlanAi.js';

let pass = 0;
let fail = 0;
function ck(name, cond) {
  if (cond) {
    pass++;
    console.log('✓ ' + name);
  } else {
    fail++;
    console.log('✗ ' + name);
  }
}

// --- normalizePlanInput: clamp + default ---
const ni = normalizePlanInput({ age: 30, goal: 'lose', activity: 'high', sessionsPerWeek: 99, equipment: 'gym' });
ck('normalize: sessions clamp về 7', ni.sessions === 7);
ck('normalize: goal giữ nguyên hợp lệ', ni.goal === 'lose');

const ni2 = normalizePlanInput({ age: 20, goal: 'xxx', activity: 'yyy', sessionsPerWeek: 0, equipment: 'zzz' });
ck('normalize: goal lỗi -> maintain', ni2.goal === 'maintain');
ck('normalize: activity lỗi -> medium', ni2.activity === 'medium');
ck('normalize: equipment lỗi -> both', ni2.equipment === 'both');
ck('normalize: sessions min 1', ni2.sessions === 1);

// --- buildPlanUserPrompt: health context (A3) phải xuất hiện ---
const promptNoHealth = buildPlanUserPrompt({ ...ni, weightKg: 70, heightCm: 175 });
ck('prompt: có BMI khi đủ cân/cao', /BMI/.test(promptNoHealth));
ck('prompt: không có mục y tế khi không có health', !/HỒ SƠ Y TẾ/.test(promptNoHealth));

const promptHealth = buildPlanUserPrompt({
  ...ni,
  health: { contraindications: 'thoát vị đĩa đệm L4-L5', medications: 'metformin' },
});
ck('prompt: có mục HỒ SƠ Y TẾ khi có health', /HỒ SƠ Y TẾ/.test(promptHealth));
ck('prompt: chứa chống chỉ định cụ thể', /thoát vị đĩa đệm/.test(promptHealth));
ck('prompt: chứa thuốc đang dùng', /metformin/.test(promptHealth));

// --- planJsonToExercises: giữ day + group, gộp rest vào reps ---
const sampleJson = {
  summary: 'Kế hoạch 2 buổi.',
  days: [
    {
      day: 1,
      group: 'Push (Ngực-Vai-Tay sau)',
      warmup: 'Xoay khớp 5 phút',
      cooldown: 'Giãn cơ 5 phút',
      exercises: [
        { title: 'Đẩy ngực với tạ đòn', sets: 4, reps: '8-10', rest: '90s', note: 'Giữ lưng phẳng' },
        { title: 'Đẩy vai dumbbell', sets: 3, reps: '10-12', rest: '60s' },
      ],
    },
    {
      day: 2,
      group: 'Pull (Lưng-Tay trước)',
      exercises: [{ title: 'Kéo xà', sets: 3, reps: 'tối đa' }],
    },
  ],
  progression: 'Tuần 3-4 tăng tạ 5%.',
  tracking: 'Chụp ảnh mỗi tuần.',
  disclaimer: 'Tham khảo bác sĩ nếu có bệnh nền.',
};

const exs = planJsonToExercises(sampleJson);
ck('exercises: đúng tổng số bài (3)', exs.length === 3);
ck('exercises: bài 1 day=1', exs[0].day === 1);
ck('exercises: bài 3 day=2', exs[2].day === 2);
ck('exercises: giữ group', exs[0].group === 'Push (Ngực-Vai-Tay sau)');
ck('exercises: gộp rest vào reps', /nghỉ 90s/.test(exs[0].reps));
ck('exercises: isPTLocked mặc định true', exs[0].isPTLocked === true);
ck('exercises: sets clamp hợp lệ', exs[0].sets === 4);

// reps bị cắt <= 40 ký tự
ck('exercises: reps cắt <=40 ký tự', exs.every((e) => e.reps.length <= 40));

// --- planJsonToMarkdown: có heading "#### Ngày N" cho mỗi ngày ---
const md = planJsonToMarkdown(sampleJson);
ck('markdown: có "#### Ngày 1"', /#### Ngày 1:/.test(md));
ck('markdown: có "#### Ngày 2"', /#### Ngày 2:/.test(md));
ck('markdown: có tổng quan', /## Tổng quan/.test(md));
ck('markdown: có disclaimer blockquote', /^> /m.test(md));
ck('markdown: tên bài in đậm', /\*\*Đẩy ngực với tạ đòn\*\*/.test(md));

// --- schema sanity ---
ck('schema: required gồm summary + days', PLAN_SCHEMA.required.includes('summary') && PLAN_SCHEMA.required.includes('days'));
ck('schema: days là array of object', PLAN_SCHEMA.properties.days.type === 'array');

// --- generateStructuredPlan: dùng jsonFn mock, không gọi mạng ---
const fakePlan = { summary: 'x', days: [{ day: 1, group: 'Full body', exercises: [{ title: 'Squat', sets: 3, reps: '10' }] }] };
let capturedArgs = null;
const mockJsonFn = async (args) => {
  capturedArgs = args;
  return fakePlan;
};
const result = await generateStructuredPlan({
  jsonFn: mockJsonFn,
  input: ni,
  health: { contraindications: 'đau gối' },
});
ck('generate: trả json/markdown/exercises', Boolean(result.json && result.markdown && result.exercises));
ck('generate: truyền schema cho jsonFn', capturedArgs.schema === PLAN_SCHEMA);
ck('generate: prompt có health đau gối', /đau gối/.test(capturedArgs.user));
ck('generate: exercises từ json mock', result.exercises[0].title === 'Squat');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
