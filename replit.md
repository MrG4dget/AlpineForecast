# Pilztastic - Swiss Mushroom Foraging App

## Overview

Pilztastic is a mobile-first web application designed for mushroom foraging enthusiasts in Switzerland. The app provides intelligent foraging location recommendations based on real-time environmental conditions, comprehensive species identification guides, and personal find tracking capabilities. Built with a modern React frontend and Express backend, it leverages PostgreSQL for data persistence and integrates with weather APIs to provide optimal foraging conditions analysis.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript for type safety
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack Query (React Query) for server state management and caching
- **UI Framework**: Shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with custom forest and earth color themes
- **Mobile-First Design**: Responsive layout optimized for mobile devices with bottom navigation

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **API Design**: RESTful API with structured error handling and logging middleware
- **Data Layer**: Storage abstraction with in-memory implementation for development
- **Build System**: Vite for frontend bundling, ESBuild for backend compilation

### Data Storage Solutions
- **Database**: PostgreSQL configured through Drizzle ORM
- **Schema Management**: Drizzle Kit for migrations and schema management
- **Connection**: Neon Database serverless PostgreSQL integration
- **Type Safety**: Drizzle-Zod integration for runtime schema validation

### Key Data Models
- **Mushroom Species**: Complete taxonomic and environmental data including optimal growing conditions
- **Foraging Locations**: GPS coordinates with elevation, forest type, and accessibility information
- **Weather Data**: Real-time and historical environmental conditions
- **User Finds**: Personal foraging logs with photos and location data

### External Dependencies
- **Weather APIs**: Open-Meteo for real-time weather data and MeteoSwiss integration
- **Geolocation**: Native browser GPS with high accuracy positioning
- **Map Services**: Custom map implementation with location probability overlays
- **UI Components**: Radix UI primitives for accessibility and interaction patterns

### Mobile Optimization Features
- **PWA Capabilities**: Offline-first architecture for field use
- **GPS Integration**: High-accuracy location tracking with error handling
- **Touch-Optimized**: Mobile-friendly UI with bottom navigation and swipe gestures
- **Performance**: Optimized bundle sizes and lazy loading for mobile networks

### Environmental Intelligence
- **Probability Calculator**: Advanced algorithm considering temperature, humidity, soil conditions, elevation, and forest types
- **Real-Time Conditions**: Live weather data integration with optimal foraging time recommendations
- **Species Matching**: Location-specific species recommendations based on environmental factors