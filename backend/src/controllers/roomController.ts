import type { Request, Response } from 'express';
import { createRoom, listAvailableRooms, listRooms, updateRoom } from '../services/roomService.js';
import { created, ok } from '../utils/apiResponse.js';

export async function listRoomsController(req: Request, res: Response) {
  const result = await listRooms(req);
  return ok(res, result.items, 'Rooms loaded', result.meta);
}

export async function createRoomController(req: Request, res: Response) {
  const room = await createRoom(req);
  return created(res, room, 'Room created');
}

export async function updateRoomController(req: Request, res: Response) {
  const room = await updateRoom(req);
  return ok(res, room, 'Room updated');
}

export async function availabilityController(req: Request, res: Response) {
  const rooms = await listAvailableRooms(
    String(req.query.propertyId),
    new Date(String(req.query.checkIn)),
    new Date(String(req.query.checkOut))
  );
  return ok(res, rooms, 'Available rooms loaded');
}
