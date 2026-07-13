import { AuditLog, AUDIT_ACTIONS, type AuditAction } from '../models/AuditLog.js';

export type AuditLogFilters = {
  page?:      number;
  limit?:     number;
  action?:    AuditAction;
  role?:      string;
  userId?:    string;
  dateFrom?:  string;
  dateTo?:    string;
  search?:    string;
};

export async function listAuditLogs(filters: AuditLogFilters) {
  const {
    page     = 1,
    limit    = 50,
    action,
    role,
    userId,
    dateFrom,
    dateTo,
    search,
  } = filters;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const query: Record<string, any> = {};

  if (action && AUDIT_ACTIONS.includes(action as AuditAction)) {
    query.action = action;
  }
  if (role) {
    query['performedBy.role'] = role;
  }
  if (userId) {
    query['performedBy.userId'] = userId;
  }
  if (dateFrom || dateTo) {
    query.timestamp = {};
    if (dateFrom) query.timestamp.$gte = new Date(dateFrom);
    if (dateTo)   query.timestamp.$lte = new Date(new Date(dateTo).setHours(23, 59, 59, 999));
  }
  if (search) {
    query.$or = [
      { description:       { $regex: search, $options: 'i' } },
      { resource:          { $regex: search, $options: 'i' } },
      { 'performedBy.name':{ $regex: search, $options: 'i' } },
    ];
  }

  const skip  = (page - 1) * limit;
  const total = await AuditLog.countDocuments(query);

  const logs = await AuditLog.find(query)
    .sort({ timestamp: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  return {
    logs,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    }
  };
}

/** Manually write an audit entry from a controller (e.g. for login events). */
export async function writeAuditLog(entry: {
  action:      AuditAction;
  resource:    string;
  description: string;
  ipAddress?:  string;
  performedBy: {
    userId?:  string;
    name:     string;
    role:     string;
    email?:   string;
  };
  metadata?: Record<string, unknown>;
}) {
  // Fire-and-forget — never throw
  AuditLog.create(entry).catch((err: Error) =>
    console.error('[AuditLog] Manual write failed:', err.message)
  );
}
