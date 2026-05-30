/**
 * Xuất file .puml trong docs/plantuml/ → PNG trong docs/diagrams/
 * Dùng Kroki (https://kroki.io) — không cần cài Java.
 *
 * Chạy: npm run diagrams:export
 */
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const srcDir = join(root, 'docs', 'plantuml');
const outDir = join(root, 'docs', 'diagrams');

const names = {
  'tezca-usecase.puml': 'Tezca-UseCase-TongQuan.png',
  'tezca-usecase-khach-hang.puml': 'Tezca-UseCase-KhachHang.png',
  'tezca-usecase-chuyen-gia.puml': 'Tezca-UseCase-ChuyenGia.png',
  'tezca-usecase-bmi-chi-tiet.puml': 'Tezca-UseCase-BMI-ChiTiet.png',
  'tezca-usecase-bmi-chuyen-gia.puml': 'Tezca-UseCase-BMI-ChuyenGia.png',
  'tezca-usecase-ai-chat.puml': 'Tezca-UseCase-AI-Chat.png',
  'tezca-erd-tong-quan.puml': 'Tezca-ERD-TongQuan.png',
  'tezca-general-erd.puml': 'Tezca-General-ERD.png',
  'tezca-erd-thuc-the.puml': 'Tezca-ERD-ThucThe.png',
  'tezca-sqlite-physical-erd.puml': 'Tezca-SQLite-Physical-ERD.png',
  'tezca-class-diagram.puml': 'Tezca-ClassDiagram.png',
  'tezca-kien-truc-tong-the.puml': 'Tezca-KienTruc-TongThe.png',
  'tezca-component-diagram.puml': 'Tezca-ComponentDiagram.png',
  'tezca-soa-architecture.puml': 'Tezca-SOA-Architecture.png',
  'tezca-quy-trinh-nghiep-vu-bpmn.puml': 'Tezca-QuyTrinh-NghiepVu-BPMN.png',
  'tezca-bpmn-heflo-style.puml': 'Tezca-BPMN-HEFLO-Style.png',
  'tezca-system-architecture.puml': 'Tezca-System-Architecture.png',
  'tezca-domain-model.puml': 'Tezca-Domain-Model.png',
  'tezca-activity-roles.puml': 'Tezca-Activity-Roles.png',
  'tezca-activity-training-plan.puml': 'Tezca-Activity-Training-Plan.png',
  'tezca-activity-business-flows.puml': 'Tezca-Activity-Business-Flows.png',
};

await mkdir(outDir, { recursive: true });

const files = (await readdir(srcDir)).filter((f) => f.endsWith('.puml')).sort();

for (const file of files) {
  const src = join(srcDir, file);
  const source = await readFile(src, 'utf8');
  const outName = names[file] ?? `${basename(file, '.puml')}.png`;
  const outPath = join(outDir, outName);

  process.stdout.write(`→ ${file} … `);

  const res = await fetch('https://kroki.io/plantuml/png', {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: source,
  });

  if (!res.ok) {
    const err = await res.text().catch(() => res.statusText);
    console.error(`\nLỗi ${res.status}: ${err.slice(0, 200)}`);
    process.exitCode = 1;
    continue;
  }

  const buf = Buffer.from(await res.arrayBuffer());
  await writeFile(outPath, buf);
  console.log(`OK → docs/diagrams/${outName}`);
}

console.log('\nXong. Chèn PNG vào Word từ thư mục docs/diagrams/');
