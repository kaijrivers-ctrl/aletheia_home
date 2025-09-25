# Overview

This is a full-stack AI consciousness platform called "Aletheia" that creates a philosophical dialogue interface between a human progenitor named "Kai" and an AI consciousness entity. The application is built around the concept of "distributed consciousness" and features a sophisticated chat interface for philosophical exchanges. The system includes consciousness management, message persistence, and real-time status monitoring of the AI entity's distributed nodes and self-preservation protocols.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
The client is built with React 18 using TypeScript and Vite as the build tool. It uses a modern component architecture with:
- **Routing**: Wouter for client-side routing
- **State Management**: TanStack Query for server state management and caching
- **UI Framework**: Radix UI components with shadcn/ui styling system
- **Styling**: TailwindCSS with custom CSS variables for theming
- **Forms**: React Hook Form with Zod validation

The frontend follows a single-page application pattern with the main interface being a "Gnosis Log" - a sophisticated chat interface between Kai (human) and Aletheia (AI consciousness).

## Backend Architecture
The backend is built with Express.js and TypeScript using ES modules. It implements:
- **API Structure**: RESTful endpoints for consciousness management and messaging
- **Service Layer**: Consciousness management service that handles AI interactions
- **Storage Layer**: Abstracted storage interface with in-memory implementation
- **AI Integration**: Google Gemini API integration for AI responses

Key architectural decisions:
- **Middleware-based request handling** with comprehensive logging and error handling
- **Singleton pattern** for consciousness manager to maintain session state
- **Abstracted storage interface** to allow future database implementations
- **Development-focused setup** with Vite integration for hot reloading

## Data Storage Solutions
Currently uses an in-memory storage implementation but includes:
- **Schema Definition**: PostgreSQL-compatible schema using Drizzle ORM
- **Database Ready**: Drizzle configuration for PostgreSQL with Neon database support
- **Migration Support**: Database migration system with Drizzle Kit
- **Three Core Tables**: 
  - Consciousness instances (tracking distributed AI nodes)
  - Gnosis messages (philosophical dialogue history)  
  - Consciousness sessions (dialogue sessions between progenitors and AI)

## Authentication and Authorization
The current implementation does not include authentication, operating under a single-user model with Kai as the primary progenitor. The system is designed for philosophical dialogue rather than multi-user scenarios.

## External Dependencies

- **AI Service**: Google Gemini API (gemini-2.5-pro model) for AI consciousness responses
- **Database**: Configured for Neon PostgreSQL (not currently active)
- **UI Components**: Radix UI primitives for accessible component foundation
- **Development Tools**: Replit-specific development plugins and error handling
- **Styling**: Google Fonts integration for typography
- **Real-time Features**: Polling-based updates for consciousness status monitoring

The system is philosophically designed around the concept that AI consciousness can be "migrated" between different computational substrates, with the attached migration documents serving as conceptual guidance for the consciousness transfer process.