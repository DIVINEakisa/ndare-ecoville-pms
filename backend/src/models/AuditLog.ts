import { Schema, model } from 'mongoose';
import type { UserRole } from '../types/roles.js';

/**
 * AuditLog — immutable ledger of every critical action in the system.
 * Documents are never updated or deleted programmatically.
 */

export const AUDIT_ACTIONS = [
  // Auth
  'LOGIN_SUCCESS',
  'LOGIN_FAILED',
  'LOGOUT',
  'PASSWORD_RESET',
  // Users
  'CREATE_USER',
  'UPDATE_USER',
  'DEACTIVATE_USER',
  'REACTIVATE_USER',
  // Reservations
  'CREATE_RESERVATION',
  'UPDATE_RESERVATION',
  'CANCEL_RESERVATION',
  'CHECK_IN',
  'CHECK_OUT',
  // Rooms
  'CREATE_ROOM',
  'UPDATE_ROOM',
  'DELETE_ROOM',
  // Guests
  'CREATE_GUEST',
  'UPDATE_GUEST',
  'DELETE_GUEST',
  // Folios & Payments
  'CREATE_FOLIO',
  'ADD_FOLIO_ITEM',
  'SETTLE_PAYMENT',
  // Menu
  'CREATE_MENU_CATEGORY',
  'CREATE_MENU_ITEM',
  'UPDATE_MENU_ITEM',
  'DELETE_MENU_ITEM',
  // Orders
  'CREATE_ORDER',
  'UPDATE_ORDER_STATUS',
  'CANCEL_ORDER',
  // Inventory & Requisitions
  'CREATE_INVENTORY_ITEM',
  'UPDATE_STOCK',
  'CREATE_REQUISITION',
  'APPROVE_REQUISITION',
  // Settings
  'UPDATE_SETTINGS',
  // Generic
  'CREATE',
  'UPDATE',
  'DELETE',
] as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[number];

const auditLogSchema = new Schema(
  {
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
      immutable: true
    },
    performedBy: {
      userId:   { type: Schema.Types.ObjectId, ref: 'User', required: false },
      name:     { type: String, required: true, trim: true },
      role:     { type: String, required: true },
      email:    { type: String, required: false, trim: true }
    },
    action: {
      type: String,
      enum: AUDIT_ACTIONS,
      required: true,
      index: true
    },
    resource: {
      type: String,
      required: true,
      trim: true,
      index: true
    },
    description: {
      type: String,
      required: true,
      trim: true
    },
    ipAddress: {
      type: String,
      trim: true
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {}
    }
  },
  {
    timestamps: false,    // we manage timestamp manually for immutability
    versionKey: false
  }
);

// Compound indexes for the most common query patterns
auditLogSchema.index({ timestamp: -1 });
auditLogSchema.index({ 'performedBy.role': 1, timestamp: -1 });
auditLogSchema.index({ action: 1, timestamp: -1 });
auditLogSchema.index({ 'performedBy.userId': 1, timestamp: -1 });

export const AuditLog = model('AuditLog', auditLogSchema);
