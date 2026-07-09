import type { Request, Response } from 'express';
import {
  approveRequisition,
  createRequisition,
  listRequisitions,
  receiveRequisition,
  rejectRequisition
} from '../services/requisitionService.js';
import { created, ok } from '../utils/apiResponse.js';

export async function listRequisitionsController(req: Request, res: Response) {
  const result = await listRequisitions(req);
  return ok(res, result.items, 'Requisitions loaded', result.meta);
}

export async function createRequisitionController(req: Request, res: Response) {
  const requisition = await createRequisition(req);
  return created(res, requisition, 'Requisition created');
}

export async function approveRequisitionController(req: Request, res: Response) {
  const requisition = await approveRequisition(req);
  return ok(res, requisition, 'Requisition approved');
}

export async function rejectRequisitionController(req: Request, res: Response) {
  const requisition = await rejectRequisition(req);
  return ok(res, requisition, 'Requisition rejected');
}

export async function receiveRequisitionController(req: Request, res: Response) {
  const requisition = await receiveRequisition(req);
  return ok(res, requisition, 'Requisition received');
}
