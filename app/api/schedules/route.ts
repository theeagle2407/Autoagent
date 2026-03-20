import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const SCHEDULES_FILE = path.join(process.cwd(), 'schedules.json');

export type Schedule = {
  id: string;
  description: string;
  recipient: string;
  amount: string;
  interval: string;
  intervalMs: number;
  createdAt: string;
  nextRun: string;
  lastRun?: string;
  lastTxHash?: string;
  executionCount: number;
  active: boolean;
};

function readSchedules(): Schedule[] {
  try {
    if (!fs.existsSync(SCHEDULES_FILE)) return [];
    return JSON.parse(fs.readFileSync(SCHEDULES_FILE, 'utf-8'));
  } catch { return []; }
}

function writeSchedules(schedules: Schedule[]) {
  fs.writeFileSync(SCHEDULES_FILE, JSON.stringify(schedules, null, 2));
}

export function getSchedules() {
  return readSchedules();
}

export function saveSchedule(schedule: Schedule) {
  const schedules = readSchedules();
  const existing = schedules.findIndex(s => s.id === schedule.id);
  if (existing >= 0) schedules[existing] = schedule;
  else schedules.push(schedule);
  writeSchedules(schedules);
}

export function updateSchedule(id: string, updates: Partial<Schedule>) {
  const schedules = readSchedules();
  const idx = schedules.findIndex(s => s.id === id);
  if (idx >= 0) {
    schedules[idx] = { ...schedules[idx], ...updates };
    writeSchedules(schedules);
  }
}

// GET - list all schedules
export async function GET() {
  const schedules = readSchedules();
  return NextResponse.json(schedules);
}

// POST - create new schedule
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { description, recipient, amount, interval, intervalMs } = body;

  const schedule: Schedule = {
    id: Date.now().toString(),
    description,
    recipient,
    amount,
    interval,
    intervalMs,
    createdAt: new Date().toISOString(),
    nextRun: new Date(Date.now() + intervalMs).toISOString(),
    executionCount: 0,
    active: true,
  };

  saveSchedule(schedule);
  return NextResponse.json({ success: true, schedule });
}

// DELETE - remove schedule
export async function DELETE(req: NextRequest) {
  const { id } = await req.json();
  const schedules = readSchedules().filter(s => s.id !== id);
  writeSchedules(schedules);
  return NextResponse.json({ success: true });
}