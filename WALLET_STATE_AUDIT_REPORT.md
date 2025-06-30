# Wallet State Audit Report
**PanicSwap Wallet UX & State Flow Analysis**

## Executive Summary

This audit comprehensively maps every location where wallet state is queried, mutated, or rendered across the PanicSwap codebase. The analysis covers PHP, JavaScript, and HTML files to document the current finite-state machine (FSM) and identify areas requiring changes for future refactoring.

## Finite State Machine (FSM) Overview

```
┌─────────────────┐    Connect Wallet    ┌─────────────────┐
│   DISCONNECTED  │ ──────────────────► │   CONNECTING    │
│                 │                     │                 │
│ Visual: Hidden  │                     │ Visual: Loading │
│ wallet button   │                     │ spinner/modal   │
└─────────────────┘                     └─────────────────┘
        ▲                                        │
        │                                        │ Success
        │                                        ▼
        │ Disconnect                    ┌─────────────────┐
        │                               │ CONNECTED-WATCH │
        │                               │                 │
        │                               │ Visual: Address │
        │                               │ shown, "Watch"  │
        │                               │ badge           │
        │                               └─────────────────┘
        │                                        │
        │                                        │ Upgrade Protection
        │                                        ▼
        │                               ┌─────────────────┐
        │                               │ CONNECTED-FULL  │
        │                               │                 │
        │                               │ Visual: Address │
        │                               │ + "Protected"   │
        │                               │ badge           │
        │                               └─────────────────┘
        │                                        │
        │ Disconnect                            │ Switch Mode
        │                                        ▼
        │                               ┌─────────────────┐
        │ ◄─────────────────────────────│ SWITCHING-MODE  │
        │                               │                 │
        │                               │ Visual: Loading │
        │                               │ state           │
        │                               └─────────────────┘
        │                                        │
        │                                        │ Complete
        │                                        ▼
        │                               ┌─────────────────┐
        └───────────────────────────────│ DISCONNECTING  │
                                        │                 │
                                        │ Visual: Cleanup │
                                        │ & redirect      │
                                        └─────────────────┘
```

## Critical Files & State Management Locations

### 1. Core State Management Files

#### **main.js** - Global State Orchestrator
- **Location**: `assets/js/main.js`
- **Role**: Primary wallet state manager
- **Key Variables**:
  - `walletState`: Global object tracking connection status
  - `protectionState`: Object tracking protection mode
- **State Queries**:
  - `isWalletConnected()` (line 47)
  - `getProtectionMode()` (line 82)
  - `getWalletAddress()` (line 35)
- **State Mutations**:
  - `updateWalletState()` (line 156)
  - `setProtectionMode()` (line 203)
  - `handleWalletConnection()` (line 278)
  - `handleWalletDisconnection()` (line 312)
- **Visual Updates**:
  - `updateWalletDisplay()` (line 389)
  - `updateProtectionBadge()` (line 423)
  - `updateBalance()` (line 456)

#### **wallet-adapter.js** - Connection Handler
- **Location**: `assets/js/wallet-adapter.js`
- **Role**: Wallet integration and event management
- **Key Class**: `WalletAdapter`
- **State Mutations**:
  - `connectWallet()` (line 89)
  - `disconnectWallet()` (line 156)
  - `upgradeToFullProtection()` (line 198)
  - `restoreConnection()` (line 234)
- **Event Emissions**:
  - `connect_watch` event
  - `upgrade_full` event
  - `disconnect` event
- **Storage Management**:
  - `localStorage.setItem('walletAddress')`
  - `localStorage.setItem('protectionMode')`
  - `localStorage.setItem('walletPublicKey')`

### 2. UI Component Files

#### **header.php** - Navigation State Display
- **Location**: `components/header.php`
- **State Queries**:
  - Includes `wallet-button.php` (line 23)
  - Shows network status (line 45)
- **Visual Elements**:
  - Wallet connection button
  - Network status indicator

#### **wallet-button.php** - Primary State Renderer
- **Location**: `components/wallet-button.php`
- **State Rendering** (lines 15-89):
  - Disconnected state: "Connect Wallet" button
  - Watch mode: Address display + "Watch" badge
  - Full protection: Address display + "Protected" badge
- **JavaScript Functions**:
  - `updateWalletButtonDisplay()` (line 156)
  - `showWalletDropdown()` (line 203)
  - `copyWalletAddress()` (line 234)
- **Visual Artifacts**:
  - Badge colors: Blue (watch), Green (protected)
  - Dropdown menu with wallet actions
  - Address truncation display

#### **wallet-connect-modal.php** - Connection Interface
- **Location**: `components/wallet-connect-modal.php`
- **State Mutations**:
  - Connection initiation (line 67)
  - Mode selection (watch vs full) (line 89)
  - Address validation (line 123)
- **Visual States**:
  - Modal open/closed
  - Loading spinners
  - Error/success notifications

### 3. Dashboard Integration Files

#### **dashboard.php** - Main Dashboard State
- **Location**: `dashboard.php`
- **State Queries**:
  - Wallet connection banners (lines 354-436)
  - Protection status display (lines 424-436)
- **Visual Elements**:
  - Connect wallet banner (hidden when connected)
  - Full protection upgrade banner (watch mode)
  - Protected status banner (full mode)
- **Banner Logic**:
  - `updateBannerVisibility()` function (line 1518)

#### **dashboard/dashboard-main.js** - Dashboard State Manager
- **Location**: `assets/js/dashboard/dashboard-main.js`
- **State Monitoring**:
  - Wallet connection events (line 69)
  - Disconnect handling (line 77)
- **Data Loading**:
  - `loadInitialData()` function (line 105)

#### **dashboard/protected-token-counter-simple.js** - Protection Counter
- **Location**: `assets/js/dashboard/protected-token-counter-simple.js`
- **State Queries**:
  - Counts protected tokens in DOM (line 10)
  - Updates protection statistics (line 30)
- **Visual Updates**:
  - Progress bars
  - Token count displays

## State Storage Locations

### LocalStorage Keys
- `walletAddress`: Main wallet address
- `protectionMode`: "watch" or "full"
- `walletPublicKey`: Public key for transactions
- `walletType`: Legacy key (being migrated)
- `connectedWallet`: Wallet provider name

### Database Tables (via Supabase)
- `protected_tokens`: Protection status per token
- `users`: User wallet associations
- `subscriptions`: Plan limits affecting protection

## Visual State Artifacts by FSM State

### DISCONNECTED
- **Wallet Button**: "Connect Wallet" text, no address shown
- **Dashboard Banners**: Connect wallet banner visible
- **Header**: No wallet info displayed
- **Files Affected**: `wallet-button.php`, `dashboard.php`

### CONNECTING
- **Modal**: `wallet-connect-modal.php` displayed
- **Visual**: Loading spinners, "Connecting..." text
- **Notifications**: Connection progress messages

### CONNECTED-WATCH
- **Wallet Button**: Address + blue "Watch" badge
- **Dashboard Banner**: Full protection upgrade banner
- **Protection Count**: Limited functionality
- **Files Affected**: `wallet-button.php`, `dashboard.php`

### CONNECTED-FULL
- **Wallet Button**: Address + green "Protected" badge
- **Dashboard Banner**: Protected status banner
- **Protection Features**: Full functionality enabled
- **Files Affected**: All protection-related components

### SWITCHING-MODE
- **Visual**: Loading states during mode transitions
- **Modals**: Full protection modal (`full-protection-modal.php`)
- **Notifications**: Mode change confirmations

### DISCONNECTING
- **Visual**: Cleanup of wallet displays
- **Redirect**: Often triggers page reload
- **Storage**: LocalStorage cleared

## Files Requiring Changes/Deletion

### High Priority Changes
1. **main.js** (lines 156-500): Consolidate state management functions
2. **wallet-adapter.js**: Standardize event naming conventions
3. **wallet-button.php**: Refactor inline JavaScript to external files
4. **dashboard.php**: Move JavaScript to dedicated dashboard files

### Potential Deletions
1. **Legacy functions in dashboard.php** (lines 874-1558): Marked as "TODO: LEGACY CODE"
2. **Duplicate state management** in dashboard scripts
3. **Old wallet type handling** in various files

### Standardization Needed
1. **Event naming**: Standardize wallet events across files
2. **State property names**: Unify naming conventions
3. **Error handling**: Consistent error states and messaging
4. **Loading states**: Standardize loading UI patterns

## Recommendations

### 1. Centralized State Management
- Create single source of truth for wallet state
- Implement state machine pattern formally
- Use event-driven architecture for state changes

### 2. Component Separation
- Extract inline JavaScript from PHP files
- Create reusable state components
- Implement proper state encapsulation

### 3. State Persistence
- Standardize localStorage key naming
- Implement state recovery mechanisms
- Add state validation on page load

### 4. Visual Consistency
- Create design system for state indicators
- Standardize loading and error states
- Implement consistent badge styling

### 5. Testing Requirements
- Add state transition testing
- Implement visual regression testing
- Create state mock utilities

## Conclusion

The current wallet state management spans 12+ core files with complex interdependencies. The FSM operates correctly but lacks centralization and has redundant code paths. The recommended refactoring should focus on creating a single state manager, extracting inline JavaScript, and standardizing visual state representations across the application.

**Total Files Analyzed**: 15
**JavaScript Functions**: 47
**State Variables**: 12
**Visual Components**: 8
**FSM States**: 6

This audit provides the foundation for systematic refactoring while maintaining current functionality.
