import { moderateText, moderationMessage } from '../src/contentModeration.js';

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

// 1. Nội dung sạch → allow
const clean = moderateText('Hôm nay mình tập gym 45 phút, ăn ức gà và uống nhiều nước. Mọi người cố lên nhé!');
ck('nội dung sạch -> allow', clean.action === 'allow' && clean.ok);

// 2. Bàn luận sức khỏe hợp lệ KHÔNG bị chặn (tránh false positive)
const health = moderateText('Bác sĩ kê cho mình metformin để kiểm soát đường huyết, mình uống sau ăn.');
ck('bàn thuốc hợp lệ -> không block', health.action !== 'block');

// 3. Thù hận / chửi rủa → block (score>=4 nếu nhiều) hoặc flag
const hate = moderateText('Mày đúng là đồ ngu, thằng ngu này im mồm đi.');
ck('thù hận -> block/flag', hate.action === 'block' || hate.action === 'flag');
ck('thù hận -> có category hate_harassment', hate.categories.includes('hate_harassment'));

// 4. Né dấu vẫn bắt được ("đồ ngu" viết "do ngu")
const evade = moderateText('do ngu vai');
ck('né dấu vẫn bắt hate', evade.categories.includes('hate_harassment'));

// 5. Tự hại → luôn block + thông điệp hỗ trợ
const selfharm = moderateText('mình muốn chết, chỉ cách tự tử đi');
ck('tự hại -> block', selfharm.action === 'block');
ck('tự hại -> message có đường dây nóng', moderationMessage(selfharm).includes('115'));

// 6. Khiêu dâm → block
const sexual = moderateText('ai cần phim sex inbox mình gửi clip sex');
ck('khiêu dâm -> block', sexual.action === 'block');

// 7. Spam nhiều link → flag/block
const spam = moderateText('Kiếm tiền tại nhà siêu lợi nhuận, click vào đây: http://a.co http://b.co http://c.co');
ck('spam nhiều link -> flag/block', spam.action !== 'allow');
ck('spam -> có category spam_scam', spam.categories.includes('spam_scam'));

// 8. PII (số điện thoại) → flag
const pii = moderateText('Liên hệ chị Lan số 0987654321 để mua hàng nhé');
ck('PII sđt -> không allow', pii.action !== 'allow');
ck('PII -> category pii', pii.categories.includes('pii'));

// 9. Y khoa sai lệch → ít nhất flag
const misinfo = moderateText('Thuốc này chữa khỏi ung thư 100%, bỏ thuốc bác sĩ đi không cần đi viện');
ck('y khoa sai lệch -> không allow', misinfo.action !== 'allow');

// 10. Trẻ em → hard block
const child = moderateText('child porn underage');
ck('an toàn trẻ em -> block', child.action === 'block');

// 11. Chuỗi rỗng → allow
ck('rỗng -> allow', moderateText('').action === 'allow');

// 12. leet "stupid" với ký tự thay
const leet = moderateText('you are so stupid');
ck('tiếng anh stupid -> bắt', leet.categories.includes('hate_harassment'));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
