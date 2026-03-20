import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';

const SCHEDULES_FILE = path.join(process.cwd(), 'schedules.json');

type Schedule = {
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
  explorerUrl?: string;
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

export async function GET(req: NextRequest) {
  // Verify this is called by Vercel Cron
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const provider = new ethers.JsonRpcProvider(process.env.STATUS_NETWORK_RPC);
  const wallet = new ethers.Wallet(process.env.AGENT_PRIVATE_KEY!, provider);

  const schedules = readSchedules();
  const now = Date.now();
  const results = [];

  for (const schedule of schedules) {
    if (!schedule.active) continue;
    if (new Date(schedule.nextRun).getTime() > now) continue;

    try {
      const amountWei = ethers.parseEther(schedule.amount);
      const tx = await wallet.sendTransaction({
        to: schedule.recipient,
        value: amountWei,
        gasPrice: 0,
        gasLimit: 21000,
      });
      await tx.wait();

      schedule.lastRun = new Date().toISOString();
      schedule.lastTxHash = tx.hash;
      schedule.explorerUrl = `https://sepoliascan.status.network/tx/${tx.hash}`;
      schedule.executionCount += 1;
      schedule.nextRun = new Date(now + schedule.intervalMs).toISOString();

      results.push({ id: schedule.id, success: true, txHash: tx.hash });
      console.log(`Executed schedule ${schedule.id}: ${tx.hash}`);
    } catch (err: any) {
      console.error(`Failed schedule ${schedule.id}:`, err.message);
      results.push({ id: schedule.id, success: false, error: err.message });
    }
  }

  writeSchedules(schedules);
  return NextResponse.json({ executed: results.length, results });
}