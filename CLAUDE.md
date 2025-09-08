# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Node.js backend for "Chaupar" (an Indian board game similar to Ludo/Pachisi) that provides dice rolling functionality via REST API endpoints. The backend is built with Express.js and includes Socket.io for potential real-time functionality.

## Development Commands

- `npm start` - Start the server (production)
- `npm install` - Install dependencies  
- `nodemon server.js` - Development mode with auto-restart (nodemon available as devDependency)
- Server runs on port 3000 locally or uses PORT environment variable

## Architecture

The application follows a simple modular structure:

- `server.js` - Main Express server with CORS configuration and API route definitions
- `dice.js` - Core game logic module with three main functions:
  - `generateDiceValues()` - Basic dice generation
  - `isSpecialDouble()` - Special double validation (1-1, 6-6)
  - `rollDiceWithAnimation()` - Promise-based animated roll simulation

### API Design
All endpoints return JSON with consistent structure:
- Success responses include `success: true` field
- Error responses include `success: false` and error message
- Dice endpoints include `isSpecialDouble` boolean for game logic

### Key Implementation Details
- CORS enabled for all origins (`*`) for frontend integration
- Error handling with proper HTTP status codes (400 for validation, 500 for server errors)
- Animation simulation uses `setInterval` with 10 steps over 1.5-2 seconds
- Query parameter validation ensures dice values are integers 1-6

## API Endpoints
- `GET /` - Server status and available endpoints documentation
- `GET /api/roll/simple` - Immediate dice roll with results
- `GET /api/roll/animated` - Dice roll with animation timing simulation
- `GET /api/check-double?dice1=X&dice2=Y` - Validate if dice values form special double

## Project Context

The codebase uses Russian comments throughout for game mechanics explanation. This is intended as a backend service for deployment on platforms like Render, designed to work with a separate frontend application. Special doubles (1-1, 6-6) have significance in Chaupar game rules.