import { createApp } from '../server/src/createApp.js';
import { repairApiPath } from '../server/src/vercelPath.js';

const app = createApp();

/** Vercel Serverless — khôi phục path gốc trước khi vào Express */
export default function handler(req, res) {
  repairApiPath(req);
  return app(req, res);
}
