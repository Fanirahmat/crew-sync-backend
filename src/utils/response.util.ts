import { Response } from 'express';
import { ApiSuccessResponse, PaginationMeta } from '@/types/common';

export const sendSuccess = <T>(
  res: Response,
  data: T,
  message?: string,
  statusCode = 200,
  meta?: PaginationMeta
): Response => {
  const responsePayload: ApiSuccessResponse<T> = {
    success: true,
    ...(message ? { message } : {}),
    data,
    ...(meta ? { meta } : {}),
  };
  return res.status(statusCode).json(responsePayload);
};
