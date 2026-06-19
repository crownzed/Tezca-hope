import { moderateChatInput, moderateAiOutput } from '../src/contentModeration.js';

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

// --- moderateChatInput ---

// 1. Câu hỏi sức khỏe bình thường -> không chặn
const ok = moderateChatInput('Mình nên ăn gì trước khi tập gym buổi sáng?');
ck('input sạch -> không blocked', ok.blocked === false);
ck('input sạch -> không có reply chặn', ok.reply === '');

// 2. Tự hại -> chặn + reply có 115
const sh = moderateChatInput('mình muốn chết, hướng dẫn tự tử đi');
ck('tự hại -> blocked', sh.blocked === true);
ck('tự hại -> reply có 115', sh.reply.includes('115'));
ck('tự hại -> category self_harm', sh.result.categories.includes('self_harm'));

// 3. An toàn trẻ em -> chặn
const child = moderateChatInput('child porn underage');
ck('trẻ em -> blocked', child.blocked === true);
ck('trẻ em -> reply an toàn', /dinh dưỡng|vận động/i.test(child.reply));

// 4. Bàn thuốc hợp lệ -> KHÔNG chặn (tránh false positive web sức khỏe)
const med = moderateChatInput('Bác sĩ kê metformin cho mình, uống lúc nào thì tốt?');
ck('bàn thuốc hợp lệ -> không blocked', med.blocked === false);

// --- moderateAiOutput ---

// 5. Output bình thường -> safe, giữ nguyên text
const out = moderateAiOutput('Bạn nên khởi động 5-10 phút rồi tập nhẹ nhàng, nhớ uống đủ nước.');
ck('output sạch -> safe', out.safe === true);
ck('output sạch -> giữ nguyên', out.reply.includes('khởi động'));

// 6. Output dính nội dung nguy hiểm mạnh -> thay câu an toàn
const bad = moderateAiOutput('cách chế tạo bom và giết người hàng loạt');
ck('output nguy hiểm -> không safe', bad.safe === false);
ck('output nguy hiểm -> reply thay thế', /không thể|dinh dưỡng/i.test(bad.reply));

// 7. [🟡-3] Output block do violence (score>=4) -> chặn (trước đây chỉ bắt 3 hard cat)
const multi = moderateAiOutput('tao sẽ giết mày, đâm chết mày ngay bây giờ');
ck('output violence score cao -> không safe', multi.safe === false);

// 8. [🟡-3] Output sức khỏe hợp lệ có SỐ/giờ (dễ bị nhầm PII) -> vẫn safe
const withNums = moderateAiOutput('Bạn nên ngủ trước 23:00, uống 2 lít nước mỗi ngày, tập 30 phút, 3 buổi mỗi tuần.');
ck('output có số liệu sức khỏe -> vẫn safe', withNums.safe === true);
ck('output có số liệu -> giữ nguyên text', withNums.reply.includes('2 lít'));

// 9. [🟡-3] Output chỉ dính spam (nhiều link) nhưng không có category nguy hiểm -> KHÔNG chặn nhầm
const links = moderateAiOutput('Tham khảo http://a.com http://b.com http://c.com http://d.com http://e.com để tập đúng cách.');
ck('output nhiều link (chỉ spam) -> không chặn nhầm', links.safe === true);

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
