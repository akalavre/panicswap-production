# PanicSwap Backend Purpose

This document outlines the purpose and core functionalities of the PanicSwap backend services.

## Overview

The PanicSwap backend is a Node.js/TypeScript application designed to support the PanicSwap trading dashboard. Its primary responsibilities include:

1.  **Real-time Token Indexing**:
    *   Discover new tokens as they are created on the Solana blockchain, focusing initially on:
        *   **Pump.fun**: Utilizing the PumpPortal WebSocket (`wss://pumpportal.fun/api/data`) for immediate notification of new token mints.
        *   **Raydium**: Periodically polling for new liquidity pools via the Raydium SDK v2 (`@raydium-io/raydium-sdk-v2`).

2.  **Token Data Enrichment**:
    *   For each newly discovered token, fetch comprehensive metadata (such as name, symbol, decimals, logo URI) using the Helius API (`@helius-labs/helius-sdk`).

3.  **Data Persistence**:
    *   Store the enriched token information in a Supabase PostgreSQL database. This involves populating several normalized tables, including `token_metadata`, `token_prices`, and `memecoin_details`.

4.  **API for Frontend**: (Future Goal)
    *   Develop and expose API endpoints (e.g., `/api/tokens`) to serve aggregated and processed token data to the PanicSwap React frontend. This will enable the dashboard to display up-to-date token lists and details.

5.  **Advanced Features**: (Future Goals)
    *   **Swap Functionality**: Integrate with the Jupiter API/SDK to facilitate token swaps directly through the PanicSwap interface.
    *   **Anti-Rugpull Mechanisms**: Implement features to assess the risk associated with new tokens and provide automated protection mechanisms for memecoins held in user wallets.

## Current Status & Next Steps

Core services for token discovery (Pump.fun, Raydium) and data enrichment (Helius, Supabase) have been implemented.

**The immediate priority is to resolve critical issues preventing the backend server from starting.** This involves addressing problems with Yarn dependency management (ensuring `yarn.lock` is created and dependencies are correctly installed) and resolving any persistent module resolution errors (e.g., for `@raydium-io/raydium-sdk-v2`, `@helius-labs/helius-sdk`).

Once the backend server is stable, development will proceed with thorough testing of existing services, followed by the implementation of API endpoints and advanced features.
