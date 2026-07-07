import { Schema, type SchemaDefinition } from 'mongoose';

export const propertyOwnedFields: SchemaDefinition = {
  propertyId: { type: Schema.Types.ObjectId, ref: 'Property', required: true, index: true },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: false },
  updatedBy: { type: Schema.Types.ObjectId, ref: 'User', required: false },
  deletedAt: { type: Date, default: null, index: true },
  deletedBy: { type: Schema.Types.ObjectId, ref: 'User', required: false }
};

export const auditFields: SchemaDefinition = {
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: false },
  updatedBy: { type: Schema.Types.ObjectId, ref: 'User', required: false },
  deletedAt: { type: Date, default: null, index: true },
  deletedBy: { type: Schema.Types.ObjectId, ref: 'User', required: false }
};
