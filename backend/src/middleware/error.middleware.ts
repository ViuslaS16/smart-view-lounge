import { Request, Response, NextFunction } from 'express';

export function errorMiddleware(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  console.error('[Error]', err.message);
  console.error(err.stack);

  // Multer errors
  if (err.message?.includes('Only JPEG')) {
    res.status(400).json({ error: err.message });
    return;
  }
  if (err.message?.includes('File too large')) {
    res.status(400).json({ error: 'File size must be under 5MB' });
    return;
  }

  // PostgreSQL unique violation
  if ((err as any).code === '23505') {
    const detail = (err as any).detail || '';
    if (detail.includes('email')) {
      res.status(409).json({ error: 'Email already registered' });
      return;
    }
    if (detail.includes('mobile')) {
      res.status(409).json({ error: 'Mobile number already registered' });
      return;
    }
    res.status(409).json({ error: 'Duplicate entry' });
    return;
  }

  // PostgreSQL exclusion violation (booking overlap)
  if ((err as any).code === '23P01') {
    res.status(409).json({ error: 'This time slot is already booked' });
    return;
  }

  res.status(500).json({ error: 'Internal server error' });
}
