import type { Request, Response } from 'express';
import { getDashboardSummary, getOwnerPortfolioSummary } from '../services/dashboardService.js';
import { ok } from '../utils/apiResponse.js';

export async function dashboardSummaryController(req: Request, res: Response) {
  const summary = await getDashboardSummary(req);
  return ok(res, summary, 'Dashboard summary loaded');
}

export async function ownerPortfolioController(_req: Request, res: Response) {
  const portfolio = await getOwnerPortfolioSummary();
  return ok(res, portfolio, 'Portfolio summary loaded');
}
