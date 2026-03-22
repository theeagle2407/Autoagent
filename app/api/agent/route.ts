import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import { ethers } from 'ethers';
import deploymentInfo from '../../../deployment.json';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const provider = new ethers.JsonRpcProvider(process.env.STATUS_NETWORK_RPC || 'https://public.sepolia.rpc.status.network');
const privateKey = process.env.AGENT_PRIVATE_KEY || '0x55f98d8672e08e5b6416961cf4aaad44d9a26fa05fa20335af146f3c8fadb79b';
const wallet = new ethers.Wallet(privateKey, provider);
const contract = new ethers.Contract(deploymentInfo.address, deploymentInfo.abi, wallet);

function parseInterval(text: string): { label: string; ms: number } | null {
  const t = text.toLowerCase();
  if (t.includes('minute')) return { label: 'every minute', ms: 60 * 1000 };
  if (t.includes('hour')) return { label: 'every hour', ms: 60 * 60 * 1000 };
  if (t.includes('day')) return { label: 'every day', ms: 24 * 60 * 60 * 1000 };
  if (t.includes('week')) return { label: 'every week', ms: 7 * 24 * 60 * 60 * 1000 };
  if (t.includes('month')) return { label: 'every month', ms: 30 * 24 * 60 * 60 * 1000 };
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const { message } = await req.json();

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: `You are AutoAgent. You MUST respond with ONLY a valid JSON object. No text before or after. No markdown. No explanation. Just raw JSON.

Available actions: SEND, SCHEDULE, CHECK_BALANCE, LIST_TASKS, CREATE_TASK, EXECUTE_TASK, UNKNOWN

Respond ONLY with this exact JSON format:
{"action":"SEND","recipient":"0x...","amount":"0.001","description":"","interval":"","taskId":0,"message":"explanation here"}

Rules:
- For SEND: fill recipient and amount
- For SCHEDULE: fill recipient, amount, and interval (every minute/hour/day/week/month)
- For "every two days" use "every day"
- For CHECK_BALANCE: just set action and message
- For LIST_TASKS: just set action and message
- amount must be a number string like "0.001" not "$10"
- Always fill the message field with a human readable explanation`,
        },
        { role: 'user', content: message },
      ],
    });

    const responseText = completion.choices[0].message.content || '{}';
    let agentDecision: any;

    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      agentDecision = JSON.parse(jsonMatch ? jsonMatch[0] : responseText);
    } catch {
      return NextResponse.json({ success: false, message: `Agent could not parse command. Response was: ${responseText}` });
    }

    let txHash = null;
    let result = agentDecision.message || 'Done.';
    let schedule = null;

    if (agentDecision.action === 'SEND' && agentDecision.recipient && agentDecision.amount) {
      const amountWei = ethers.parseEther(agentDecision.amount);
      const tx = await wallet.sendTransaction({
        to: agentDecision.recipient,
        value: amountWei,
        gasPrice: 0,
        gasLimit: 21000,
      });
      await tx.wait();
      txHash = tx.hash;
      result = `✅ Sent ${agentDecision.amount} ETH to ${agentDecision.recipient} gaslessly on Status Network.`;

    } else if (agentDecision.action === 'SCHEDULE' && agentDecision.recipient && agentDecision.amount) {
      const intervalInfo = parseInterval(agentDecision.interval || message);
      if (!intervalInfo) {
        result = '❌ Could not understand the interval. Try: every minute, every hour, every day, every week, or every month.';
      } else {
        const res = await fetch(`${process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'}/api/schedules`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            description: agentDecision.description || `Send ${agentDecision.amount} ETH to ${agentDecision.recipient}`,
            recipient: agentDecision.recipient,
            amount: agentDecision.amount,
            interval: intervalInfo.label,
            intervalMs: intervalInfo.ms,
          }),
        });
        const data = await res.json();
        schedule = data.schedule;
        result = `⏰ Scheduled! I will automatically send ${agentDecision.amount} ETH to ${agentDecision.recipient} ${intervalInfo.label}. First execution: ${new Date(schedule.nextRun).toLocaleString()}. Gas cost: $0.00 every time.`;
      }

    } else if (agentDecision.action === 'CREATE_TASK') {
      const amountWei = ethers.parseEther(agentDecision.amount || '0');
      const tx = await contract.createTask(
        agentDecision.description || 'Agent task',
        agentDecision.recipient || wallet.address,
        amountWei,
        { gasPrice: 0, gasLimit: 300000 }
      );
      await tx.wait();
      txHash = tx.hash;
      result = `✅ Task created on-chain: "${agentDecision.description}"`;

    } else if (agentDecision.action === 'EXECUTE_TASK') {
      const tx = await contract.executeTask(agentDecision.taskId, { gasPrice: 0, gasLimit: 300000 });
      await tx.wait();
      txHash = tx.hash;
      result = `✅ Task #${agentDecision.taskId} executed gaslessly.`;

    } else if (agentDecision.action === 'CHECK_BALANCE') {
      const balance = await provider.getBalance(wallet.address);
      result = `💰 Agent wallet balance: ${ethers.formatEther(balance)} ETH on Status Network`;

    } else if (agentDecision.action === 'LIST_TASKS') {
      const count = await contract.getTaskCount();
      const tasks = [];
      for (let i = 0; i < Number(count); i++) {
        const task = await contract.getTask(i);
        tasks.push(`#${i}: ${task.description} → ${ethers.formatEther(task.amount)} ETH — ${task.executed ? 'Executed' : 'Pending'}`);
      }
      result = count === BigInt(0) ? '📋 No tasks yet.' : `📋 ${count} task(s):\n${tasks.join('\n')}`;
    }

    return NextResponse.json({
      success: true,
      action: agentDecision.action,
      message: result,
      txHash,
      explorerUrl: txHash ? `https://sepoliascan.status.network/tx/${txHash}` : null,
      schedule,
    });

  } catch (err: any) {
    console.error('Agent error:', err);
    return NextResponse.json({ success: false, message: `❌ Error: ${err.message}` }, { status: 500 });
  }
}