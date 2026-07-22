import { apiClient } from '../../services/apiClient';
import type { ApiResponse, Folio, FolioItem, PaginationMeta, Payment } from '../../types/api';

type ListResponse<T> = ApiResponse<T[]> & { meta: PaginationMeta };

export async function listFolios(params: Record<string, string | number | undefined>) {
  const cleanParams: Record<string, string | number> = {};
  if (params.search) cleanParams.search = params.search;
  if (params.status && params.status !== 'All statuses' && String(params.status).toLowerCase() !== 'all') {
    cleanParams.status = params.status;
  }
  if (params.limit) cleanParams.limit = params.limit;
  if (params.page) cleanParams.page = params.page;

  const { data } = await apiClient.get<ListResponse<Folio>>('/folios', { params: cleanParams });
  return { items: data.data, meta: data.meta };
}

export async function getFolio(id: string) {
  const { data } = await apiClient.get<ApiResponse<{ folio: Folio; items: FolioItem[]; payments: Payment[] }>>(`/folios/${id}`);
  return data.data;
}

export async function postFolioPayment(input: {
  folioId: string;
  amount: number;
  method: Payment['method'];
  reference?: string;
}) {
  const { data } = await apiClient.post<ApiResponse<Folio>>(`/folios/${input.folioId}/payments`, {
    amount: input.amount,
    method: input.method,
    reference: input.reference
  });
  return data.data;
}
