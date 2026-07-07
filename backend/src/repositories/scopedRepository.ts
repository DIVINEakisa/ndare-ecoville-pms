import type { FilterQuery, Model, QueryOptions, UpdateQuery } from 'mongoose';
import type { Request } from 'express';
import { propertyFilter } from '../middleware/propertyScope.js';

export class ScopedRepository<T> {
  constructor(private readonly model: Model<T>) {}

  find(req: Request, filter: FilterQuery<T> = {}, options: QueryOptions = {}) {
    return this.model.find({ ...propertyFilter(req), deletedAt: null, ...filter }, null, options);
  }

  findOne(req: Request, filter: FilterQuery<T> = {}) {
    return this.model.findOne({ ...propertyFilter(req), deletedAt: null, ...filter });
  }

  count(req: Request, filter: FilterQuery<T> = {}) {
    return this.model.countDocuments({ ...propertyFilter(req), deletedAt: null, ...filter });
  }

  updateOne(req: Request, filter: FilterQuery<T>, update: UpdateQuery<T>) {
    return this.model.updateOne({ ...propertyFilter(req), deletedAt: null, ...filter }, update);
  }
}
