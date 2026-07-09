import type { Request, Response } from 'express';
import { adjustStock, createInventoryItem, listInventory } from '../services/inventoryService.js';
import { created, ok } from '../utils/apiResponse.js';

export async function listInventoryController(req: Request, res: Response) {
  const result = await listInventory(req);
  return ok(res, result.items, 'Inventory loaded', result.meta);
}

export async function createInventoryItemController(req: Request, res: Response) {
  const item = await createInventoryItem(req);
  return created(res, item, 'Inventory item created');
}

export async function adjustStockController(req: Request, res: Response) {
  const item = await adjustStock(req);
  return ok(res, item, 'Stock updated');
}
