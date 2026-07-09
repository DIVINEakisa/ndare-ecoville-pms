import type { Request, Response } from 'express';
import { createCategory, createMenuItem, listCategories, listMenuItems } from '../services/menuService.js';
import { created, ok } from '../utils/apiResponse.js';

export async function listMenuCategoriesController(req: Request, res: Response) {
  const categories = await listCategories(req);
  return ok(res, categories, 'Menu categories loaded');
}

export async function createMenuCategoryController(req: Request, res: Response) {
  const category = await createCategory(req);
  return created(res, category, 'Menu category created');
}

export async function listMenuItemsController(req: Request, res: Response) {
  const result = await listMenuItems(req);
  return ok(res, result.items, 'Menu items loaded', result.meta);
}

export async function createMenuItemController(req: Request, res: Response) {
  const item = await createMenuItem(req);
  return created(res, item, 'Menu item created');
}
