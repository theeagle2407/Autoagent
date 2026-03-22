# AutoAgent — AI Chief of Staff on Status Network

> Tell your agent what to do. It handles the rest. On-chain. For free.

AutoAgent is an AI-powered agent that executes gasless on-chain transactions on Status Network autonomously. Speak in plain English — the agent interprets your command and executes it with zero gas fees.

## Live Demo
**https://autoagent-sn.vercel.app**

## Smart Contract
- **Address:** `0xEdD4628d4A38CA89a2Ae001694aE15225c4c8758`
- **Network:** Status Network Sepolia (Chain ID: 1660990954)
- **Explorer:** https://sepoliascan.status.network/address/0xEdD4628d4A38CA89a2Ae001694aE15225c4c8758

## Gasless Transaction Proof
Every transaction on AutoAgent uses gasPrice=0 and gasLimit set explicitly — leveraging Status Network's protocol-level gasless infrastructure.

## Key Features
- **Natural language commands** — "Send 0.001 ETH to 0x... every week"
- **Autonomous scheduling** — Vercel Cron executes recurring transactions automatically
- **Gasless transactions** — gasPrice=0 at protocol level on Status Network
- **Smart contract task management** — create and execute on-chain tasks
- **Live schedule dashboard** — track all running schedules with next execution time
- **AI agent** — Groq LLaMA 3.3 70B interprets commands and decides actions

## AI Agent Component
The AI agent uses Groq's LLaMA 3.3 70B model to:
- Interpret natural language commands
- Decide the appropriate on-chain action (SEND, SCHEDULE, CREATE_TASK, etc.)
- Execute transactions gaslessly on Status Network
- Schedule recurring autonomous transactions via Vercel Cron

## Architecture
```
User → Natural Language Command
     → Groq LLaMA AI interprets command
     → Agent builds transaction (gasPrice=0)
     → Transaction executes on Status Network Sepolia
     → TX hash returned with explorer link
     → Scheduled tasks run autonomously via Vercel Cron
```

## Dependencies
- Next.js 15
- TypeScript
- Tailwind CSS
- ethers.js
- groq-sdk
- Hardhat (contract deployment)

## Running Locally

### Prerequisites
- Node.js 18+
- Groq API key (free at console.groq.com)
- EVM wallet with Status Network Sepolia ETH

### Setup
```bash
git clone https://github.com/theeagle2407/autoagent.git
cd autoagent
npm install
```

Create `.env.local`:
```
GROQ_API_KEY=your_groq_api_key
AGENT_PRIVATE_KEY=your_wallet_private_key_with_0x
STATUS_NETWORK_RPC=https://public.sepolia.rpc.status.network
CRON_SECRET=your_cron_secret
NEXT_PUBLIC_URL=http://localhost:3000
```

```bash
npm run dev
```

Open http://localhost:3000

### Deploy Contract
```bash
npx hardhat run scripts/deploy.js --network statusNetwork
```

## Status Network Details
- **RPC:** https://public.sepolia.rpc.status.network
- **Chain ID:** 1660990954
- **Explorer:** https://sepoliascan.status.network
- **Gas Price:** 0 (protocol level)

## Team
**Aremu Elijah Oreoluwa** — Builder
- GitHub: https://github.com/theeagle2407
- Twitter: https://x.com/theeagle2407

## License
MIT