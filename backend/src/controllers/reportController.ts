import type { Request, Response } from 'express';
import { getReports, sendReportCsv } from '../services/reportService.js';
import { ok } from '../utils/apiResponse.js';

export async function reportsController(req: Request, res: Response) {
  const report = await getReports(req);
  if (req.query.format === 'csv') {
    return sendReportCsv(res, report);
  }
  return ok(res, report, 'Reports loaded');
}
