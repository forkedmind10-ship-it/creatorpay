# CreatorPay - Creator Micropayment Platform

*Built from PayToll analysis + Hrishikesh insights + AgentPay concept*

## Architecture Overview

### Core Components
1. **Creator Onboarding API** - Content upload, pricing, wallet setup
2. **x402 Payment Gateway** - USDC micropayments on Base L2
3. **MCP Server** - AI agent integration (Claude, OpenClaw, Cursor)
4. **Content Delivery System** - Cached, paywall-protected content
5. **Analytics Dashboard** - Creator revenue tracking

### Technical Stack
- **Payments:** x402 protocol + Base L2 + USDC
- **Backend:** Node.js/Express + PostgreSQL
- **Frontend:** React + TailwindCSS
- **AI Integration:** MCP (Model Context Protocol)
- **Blockchain:** Base L2 (cheap, fast settlement)
- **Storage:** IPFS for content + PostgreSQL for metadata

## Payment Flow
1. AI agent requests content → 402 Payment Required
2. Agent pays USDC to creator wallet via Base L2
3. Payment proof verified → content delivered
4. Revenue split: 80% creator, 20% platform

## Competitive Advantages
- Built on proven x402 infrastructure (PayToll model)
- Targets 100x larger market (creators vs crypto APIs)
- MCP integration = native AI agent support
- Direct creator monetization (no platform permission needed)

## MVP Scope
- 10 crypto creators as beta users
- Basic payment flow (x402 + Base L2)
- Simple MCP server for AI agents
- Revenue tracking dashboard
- **Complete website frontend** with creator dashboard

## 🌐 Website

**Full website now available at**: http://localhost:3000

- **Landing page** - Creator onboarding, content browsing, AI agent integration
- **Creator dashboard** - Content management, analytics, payment tracking
- **Professional UI** - Responsive design, real-time stats, demo mode
- **One-click setup** - Run `./start-website.sh` to launch

See [WEBSITE.md](WEBSITE.md) for complete documentation.