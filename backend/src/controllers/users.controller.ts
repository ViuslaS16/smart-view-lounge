import { Request, Response } from 'express';
import db from '../db';
import { uploadNicImage, deleteNicImage, getNicImageSignedUrl } from '../services/storage.service';

// GET /api/users/profile
export async function getProfile(req: Request, res: Response): Promise<void> {
  const { rows } = await db.query(
    'SELECT id, full_name, email, mobile, nic_number, nic_image_key, status, role, rejection_reason, created_at FROM users WHERE id = $1',
    [req.user!.id]
  );
  
  const profile = rows[0];
  if (!profile) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  // If there's an NIC image, generate a temporary viewing link for the frontend to display if needed
  let nic_image_url = null;
  if (profile.nic_image_key) {
    nic_image_url = await getNicImageSignedUrl(profile.nic_image_key);
  }

  res.json({ ...profile, nic_image_url });
}

// PATCH /api/users/profile
export async function updateProfile(req: Request, res: Response): Promise<void> {
  const { full_name, mobile } = req.body;
  
  const { rows } = await db.query(
    'UPDATE users SET full_name = $1, mobile = $2 WHERE id = $3 RETURNING id, full_name, mobile, updated_at',
    [full_name, mobile, req.user!.id]
  );

  res.json({ user: rows[0] });
}

// POST /api/users/nic
// Expects multipart/form-data with 'nic_front', 'nic_back' files and 'nic_number' text field
export async function uploadNic(req: Request, res: Response): Promise<void> {
  const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
  
  if (!files || !files.nic_front || !files.nic_back) {
    res.status(400).json({ error: 'Both front and back NIC images are required' });
    return;
  }

  const nic_number = req.body.nic_number;
  if (!nic_number) {
    res.status(400).json({ error: 'NIC number is required' });
    return;
  }

  const userId = req.user!.id;

  // Check if this NIC number is already used by someone else
  const { rows: nicCheck } = await db.query(
    'SELECT id FROM users WHERE nic_number = $1 AND id != $2',
    [nic_number, userId]
  );
  if (nicCheck.length > 0) {
    res.status(409).json({ error: 'This NIC number is already associated with another account.' });
    return;
  }

  // Check if they already have images
  const { rows: current } = await db.query('SELECT full_name, nic_image_key, nic_back_key FROM users WHERE id = $1', [userId]);
  const userName = current[0]?.full_name || 'unknown_user';

  if (current[0]?.nic_image_key) {
    try { await deleteNicImage(current[0].nic_image_key); } catch (e) { console.error('[Storage]', e); }
  }
  if (current[0]?.nic_back_key) {
    try { await deleteNicImage(current[0].nic_back_key); } catch (e) { console.error('[Storage]', e); }
  }

  // Upload new images to R2
  const frontFile = files.nic_front[0];
  const backFile = files.nic_back[0];
  
  const frontKey = await uploadNicImage(frontFile.buffer, frontFile.mimetype, userName, 'front');
  const backKey = await uploadNicImage(backFile.buffer, backFile.mimetype, userName, 'back');

  // Update DB and set status back to pending if they were rejected
  await db.query(
    `UPDATE users 
     SET nic_number = $1, nic_image_key = $2, nic_back_key = $3, status = 'pending_verification', rejection_reason = NULL 
     WHERE id = $4`,
    [nic_number, frontKey, backKey, userId]
  );

  res.json({ message: 'NIC uploaded successfully and is pending review.' });
}

// GET /api/users/bookings
export async function getMyBookings(req: Request, res: Response): Promise<void> {
  const { rows } = await db.query(
    `SELECT id, start_time, end_time, duration_minutes, status, total_amount, payhere_order_id, created_at 
     FROM bookings 
     WHERE user_id = $1 
     ORDER BY start_time DESC`,
    [req.user!.id]
  );

  res.json({ bookings: rows });
}
