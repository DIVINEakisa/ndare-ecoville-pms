import { apiClient } from '../../services/apiClient';
import type { ApiResponse, EmailTemplate, ReportSummary, Setting } from '../../types/api';

export async function getReports(params: Record<string, string | undefined>) {
  const { data } = await apiClient.get<ApiResponse<ReportSummary>>('/reports', { params });
  return data.data;
}

export async function downloadReportCsv(params: Record<string, string | undefined>) {
  const { data } = await apiClient.get<Blob>('/reports', {
    params: { ...params, format: 'csv' },
    responseType: 'blob'
  });
  const url = URL.createObjectURL(data);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'hms-report.csv';
  link.click();
  URL.revokeObjectURL(url);
}

export async function listSettings(params: Record<string, string | undefined>) {
  const { data } = await apiClient.get<ApiResponse<Setting[]>>('/settings', { params });
  return data.data;
}

export async function saveSetting(input: { propertyId: string; key: string; value: unknown; description?: string }) {
  const { data } = await apiClient.post<ApiResponse<Setting>>('/settings', input);
  return data.data;
}

export async function listEmailTemplates() {
  const { data } = await apiClient.get<ApiResponse<EmailTemplate[]>>('/settings/email-templates');
  return data.data;
}

export async function saveEmailTemplate(input: Omit<EmailTemplate, '_id'>) {
  const { data } = await apiClient.post<ApiResponse<EmailTemplate>>('/settings/email-templates', input);
  return data.data;
}
