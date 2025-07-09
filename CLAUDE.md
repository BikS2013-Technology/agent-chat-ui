# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Agent Chat UI is a Next.js 15 application that provides a chat interface for interacting with LangGraph servers. It connects to LangGraph deployments and enables conversational interactions with AI agents through a modern web interface.

## Essential Commands

### Development
```bash
pnpm dev              # Start development server (http://localhost:3000)
pnpm build            # Build for production
pnpm start            # Start production server
```

### Code Quality
```bash
pnpm lint             # Run ESLint
pnpm lint:fix         # Fix ESLint issues automatically
pnpm format           # Format code with Prettier
pnpm format:check     # Check code formatting without changes
```

### Package Management
This project uses pnpm 10.5.1. Always use pnpm for dependency management:
```bash
pnpm install          # Install dependencies
pnpm add <package>    # Add new dependency
```

## Architecture Overview

### Core Architecture Pattern
The application follows a **provider-based architecture** with streaming capabilities:

1. **API Passthrough Pattern**: All LangGraph API calls go through `/api/[..._path]` which proxies requests to the backend server configured via environment variables.

2. **Provider Hierarchy**:
   - `ThreadProvider`: Manages chat threads and history
   - `StreamProvider`: Handles real-time streaming from LangGraph
   - `ArtifactProvider`: Controls artifact display state
   - All providers wrap the main Thread component in `src/app/page.tsx`

3. **State Management**:
   - URL state synchronization using `nuqs` library
   - React Context for global state
   - Local storage for API keys

### Key Architectural Decisions

1. **Streaming Architecture**: The app uses LangGraph's streaming capabilities for real-time chat responses. The `StreamProvider` manages WebSocket connections and message streaming.

2. **Message Type System**: Different message types (AI, Human, Tool) have dedicated components in `src/components/thread/messages/` with specific rendering logic.

3. **Agent Interrupts**: Special handling for agent interrupts through the inbox system, allowing for human-in-the-loop interactions.

4. **Artifact System**: Side panel for displaying code snippets, documents, or other artifacts returned by the agent.

## Environment Configuration

Required environment variables (see `.env.example`):
- `NEXT_PUBLIC_API_URL`: Frontend API endpoint
- `NEXT_PUBLIC_ASSISTANT_ID`: Default graph/assistant ID
- `LANGGRAPH_API_URL`: Backend LangGraph server URL (for production)
- `LANGSMITH_API_KEY`: API key for authentication (for production)

## Important Implementation Details

### API Integration
- The API passthrough is implemented using `langgraph-nextjs-api-passthrough` package
- All requests to `/api/*` are forwarded to the LangGraph backend
- Authentication is handled via `LANGSMITH_API_KEY` in production

### Component Patterns
- UI components follow shadcn/ui patterns with Radix UI primitives
- All components use TypeScript with strict mode
- Tailwind CSS for styling with custom animations

### Message Handling
- Messages can be filtered/hidden using the `shouldIncludeMessage` utility
- Tool calls and responses are specially formatted
- Multimodal content (images, artifacts) is supported

### Thread Management
- Threads are persisted and can be resumed
- History is managed through the ThreadProvider
- Each thread maintains its own message stream

## Development Guidelines

1. **TypeScript**: Always use TypeScript with proper types. The project has strict mode enabled.

2. **Component Structure**: Follow the existing pattern of feature-based organization in `src/components/`.

3. **API Calls**: All API interactions should go through the passthrough route, not direct to external services.

4. **State Updates**: Use the appropriate provider for state management rather than local component state where possible.

5. **Styling**: Use Tailwind CSS classes. Custom styles should be added to the Tailwind config.

6. **Environment Variables**: Never commit actual values. Always update `.env.example` when adding new variables.

## Testing Note

Currently, no testing framework is configured. When implementing tests, consider:
- Adding Jest or Vitest for unit tests
- Testing providers and hooks separately
- Mocking the LangGraph API responses
- Adding test scripts to package.json

## Production Deployment

The app supports two deployment modes:
1. **API Passthrough**: Using the built-in proxy (recommended)
2. **Custom Authentication**: Direct client-to-LangGraph with custom auth

See README.md for detailed deployment instructions.