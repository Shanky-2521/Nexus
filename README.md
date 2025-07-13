# Nexus

A real-time scalable leaderboard system built on AWS serverless architecture, designed to handle millions of users and high-velocity score updates for online gaming and competitive events.

## Project Overview

Nexus is a globally-distributed leaderboard service that showcases advanced DynamoDB data modeling techniques and serverless architecture patterns. It's not just a simple ranking list—it's a comprehensive API-driven system that provides:

- **Real-time score ingestion** with millions of concurrent updates
- **On-demand ranking** for top-N player queries
- **User-specific rank lookup** with contextual player information
- **Time-based leaderboards** (daily, weekly, monthly, all-time)
- **Efficient percentile ranking** without full table scans

## Architecture

### Core Technologies
- **AWS Lambda** - Serverless compute for API endpoints
- **Amazon API Gateway** - RESTful API management and routing
- **Amazon DynamoDB** - NoSQL database with single-table design
- **TypeScript** - Type-safe development with modern JavaScript features

### DynamoDB Design Philosophy
This project demonstrates advanced DynamoDB patterns:
- **Single-table design** for optimal performance and cost
- **Global Secondary Indexes (GSIs)** for multiple access patterns
- **Composite keys** for efficient data organization
- **Pay-per-request billing** for automatic scaling

## Current Status

### Completed
- [x] Project structure and configuration
- [x] DynamoDB table design and documentation
- [x] TypeScript models and interfaces
- [x] Setup scripts and documentation

### In Progress
- [ ] DynamoDB table provisioning
- [ ] Lambda function implementation
- [ ] API Gateway integration
- [ ] Testing framework setup

### Upcoming
- [ ] Real-time score ingestion API
- [ ] Ranking query implementations
- [ ] Performance testing and optimization
- [ ] Deployment automation

## Quick Start

### Prerequisites
- AWS Account with appropriate permissions
- Node.js 18+ and npm
- AWS CLI (included in project)

### Setup Steps

1. **Configure AWS Credentials**
   ```bash
   aws configure
   ```

2. **Create DynamoDB Table**
   ```bash
   ./scripts/create-dynamodb-table.sh
   ```

3. **Install Dependencies**
   ```bash
   npm install
   ```

4. **Deploy to AWS** (coming soon)
   ```bash
   npm run deploy
   ```

## Documentation

- [DynamoDB Design](docs/dynamodb-design.md) - Detailed table structure and indexing strategy
- [Setup Guide](docs/setup-guide.md) - Step-by-step installation instructions
- [API Documentation](docs/api-docs.md) - Coming soon
- [Performance Guide](docs/performance.md) - Coming soon

## Key Features

### Real-Time Score Updates
Handle millions of concurrent score submissions with sub-millisecond latency using DynamoDB's single-item operations.

### Efficient Ranking Queries
Leverage GSIs to provide instant top-N player lookups without expensive table scans.

### User Context Queries
Find a player's exact rank and show surrounding players using optimized DynamoDB query patterns.

### Time-Based Leaderboards
Support multiple timeframes (daily, weekly, monthly, all-time) using intelligent partition key strategies.

### Percentile Calculations
Calculate user percentiles efficiently using DynamoDB's query capabilities and mathematical optimization.

## Development

### Project Structure
```
nexus/
├── src/
│   ├── handlers/          # Lambda function handlers
│   ├── models/           # TypeScript interfaces and types
│   ├── services/         # Business logic and DynamoDB operations
│   └── utils/            # Utility functions and helpers
├── scripts/              # Setup and deployment scripts
├── docs/                 # Documentation and guides
└── tests/                # Unit and integration tests
```

### Available Scripts
- `npm run deploy` - Deploy to AWS
- `npm run test` - Run test suite
- `npm run lint` - Code linting
- `npm run local` - Local development server

## Contributing

This is a learning project showcasing serverless architecture and DynamoDB design patterns. Feel free to explore the code and documentation to understand the implementation details.

## License

MIT License - see [LICENSE](LICENSE) file for details.

---

**Built to demonstrate advanced AWS serverless patterns and DynamoDB single-table design.**