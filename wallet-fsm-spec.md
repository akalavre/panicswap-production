# Wallet FSM Specification

## Overview

This document defines the canonical Finite State Machine (FSM) for wallet connection states in the PanicSwap application. The FSM manages wallet connection lifecycle with explicit events and states, ensuring consistent UI behavior and user experience.

## State Diagram

```mermaid
stateDiagram-v2
    [*] --> idle : INIT
    idle --> connecting : CONNECT_OK
    connecting --> full : UPGRADE_FULL
    connecting --> watch : DOWNGRADE_WATCH
    connecting --> error : CONNECT_FAIL
    full --> watch : DOWNGRADE_WATCH
    watch --> full : UPGRADE_FULL
    full --> idle : DISCONNECT
    watch --> idle : DISCONNECT
    error --> idle : DISCONNECT

    state idle {
        banner: hidden
        button: [Connect, icon-connect, badge-inactive]
        actions: [CONNECT_OK]
        transitions: connecting
    }

    state connecting {
        banner: visible
        button: [Connecting, icon-connecting, badge-pending]
        actions: [UPGRADE_FULL, DOWNGRADE_WATCH, CONNECT_FAIL]
        transitions: full, watch, error
    }

    state full {
        banner: visible
        button: [Full Access, icon-full, badge-active]
        actions: [DOWNGRADE_WATCH, DISCONNECT]
        transitions: watch, idle
    }

    state watch {
        banner: hidden
        button: [Watch Only, icon-watch, badge-inactive]
        actions: [UPGRADE_FULL, DISCONNECT]
        transitions: full, idle
    }

    state error {
        banner: visible
        button: [Error, icon-error, badge-error]
        actions: [DISCONNECT]
        transitions: idle
    }
```

## Events

| Event | Description | Trigger |
|-------|-------------|---------|
| `INIT` | Initialize wallet system | Application startup |
| `CONNECT_OK` | User initiates wallet connection | Click connect button |
| `CONNECT_FAIL` | Wallet connection failed | Connection timeout/error |
| `UPGRADE_FULL` | Upgrade to full wallet access | User approves transaction signing |
| `DOWNGRADE_WATCH` | Downgrade to watch-only mode | User denies transaction signing |
| `DISCONNECT` | Disconnect wallet | User disconnects or session expires |

## States Specification

### 1. Idle State
**Purpose:** Initial state when no wallet is connected

#### UI Configuration
- **Banner Visibility:** `hidden`
- **Button Layout:**
  - Label: "Connect Wallet"
  - Icon: `wallet-connect-icon` (outline style)
  - Badge: `inactive` (grey dot)
- **Button Style:** Primary button with call-to-action styling

#### Allowed Actions
- `CONNECT_OK` → Transition to `connecting`

#### Behavior
- Display wallet selection modal on button click
- Show available wallet providers (MetaMask, WalletConnect, etc.)
- No banner notifications visible

---

### 2. Connecting State
**Purpose:** Transitional state during wallet connection process

#### UI Configuration
- **Banner Visibility:** `visible`
- **Banner Content:** "Connecting to wallet..." with spinner
- **Button Layout:**
  - Label: "Connecting..."
  - Icon: `spinner-icon` (animated)
  - Badge: `pending` (pulsing orange dot)
- **Button Style:** Disabled state with loading animation

#### Allowed Actions
- `UPGRADE_FULL` → Transition to `full`
- `DOWNGRADE_WATCH` → Transition to `watch`
- `CONNECT_FAIL` → Transition to `error`

#### Behavior
- Show connection progress in banner
- Button is non-interactive during connection
- Display timeout after 30 seconds if no response

---

### 3. Full State
**Purpose:** Wallet connected with full transaction capabilities

#### UI Configuration
- **Banner Visibility:** `visible`
- **Banner Content:** "Wallet connected" with wallet address (truncated)
- **Button Layout:**
  - Label: "Connected" + wallet name
  - Icon: `wallet-full-icon` (filled style)
  - Badge: `active` (green dot)
- **Button Style:** Success state with dropdown arrow

#### Allowed Actions
- `DOWNGRADE_WATCH` → Transition to `watch`
- `DISCONNECT` → Transition to `idle`

#### Behavior
- Show wallet address and balance in banner
- Button opens wallet menu with options:
  - View full address
  - Copy address
  - Switch to watch-only
  - Disconnect
- Enable all transaction features

---

### 4. Watch State
**Purpose:** Wallet connected in read-only mode

#### UI Configuration
- **Banner Visibility:** `hidden`
- **Button Layout:**
  - Label: "Watch Only" + wallet name
  - Icon: `eye-icon` (outline style)
  - Badge: `inactive` (blue dot)
- **Button Style:** Secondary button styling

#### Allowed Actions
- `UPGRADE_FULL` → Transition to `full`
- `DISCONNECT` → Transition to `idle`

#### Behavior
- No banner visible (minimal UI footprint)
- Button opens wallet menu with options:
  - View address
  - Copy address
  - Enable transactions
  - Disconnect
- Disable transaction buttons throughout app
- Show "Watch Only" labels on disabled features

---

### 5. Error State
**Purpose:** Handle connection failures and errors

#### UI Configuration
- **Banner Visibility:** `visible`
- **Banner Content:** Error message with retry option
- **Button Layout:**
  - Label: "Connection Failed"
  - Icon: `alert-icon` (warning style)
  - Badge: `error` (red dot)
- **Button Style:** Error state styling

#### Allowed Actions
- `DISCONNECT` → Transition to `idle`

#### Behavior
- Show specific error message in banner
- Button allows retry (triggers DISCONNECT then new connection)
- Auto-dismiss banner after 10 seconds
- Log error details for debugging

## Style Guide

### Color Palette

| State | Primary Color | Badge Color | Banner Background |
|-------|--------------|-------------|-------------------|
| `idle` | `#6B7280` (Gray-500) | `#9CA3AF` (Gray-400) | N/A |
| `connecting` | `#F59E0B` (Amber-500) | `#F59E0B` (Amber-500) | `#FEF3C7` (Amber-100) |
| `full` | `#10B981` (Emerald-500) | `#10B981` (Emerald-500) | `#D1FAE5` (Emerald-100) |
| `watch` | `#3B82F6` (Blue-500) | `#3B82F6` (Blue-500) | N/A |
| `error` | `#EF4444` (Red-500) | `#EF4444` (Red-500) | `#FEE2E2` (Red-100) |

### Typography

| Element | Font Weight | Font Size | Line Height |
|---------|-------------|-----------|-------------|
| Button Label | `600 (Semi-bold)` | `14px` | `20px` |
| Banner Text | `500 (Medium)` | `14px` | `20px` |
| Wallet Address | `400 (Regular)` | `12px` | `16px` |
| Error Message | `500 (Medium)` | `13px` | `18px` |

### Animations

#### Button Transitions
```css
.wallet-button {
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.wallet-button:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}
```

#### Badge Animations
```css
.badge-pending {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

.badge-active {
  animation: fadeIn 0.3s ease-in-out;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
```

#### Banner Animations
```css
.banner-enter {
  animation: slideDown 0.3s ease-out;
}

.banner-exit {
  animation: slideUp 0.2s ease-in;
}

@keyframes slideDown {
  from {
    transform: translateY(-100%);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

@keyframes slideUp {
  from {
    transform: translateY(0);
    opacity: 1;
  }
  to {
    transform: translateY(-100%);
    opacity: 0;
  }
}
```

#### Loading Spinner
```css
.spinner {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
```

### Icon Specifications

| State | Icon | Size | Style |
|-------|------|------|-------|
| `idle` | Wallet outline | `20px` | Stroke width: 2px |
| `connecting` | Spinner | `20px` | Animated rotation |
| `full` | Wallet filled | `20px` | Filled style |
| `watch` | Eye outline | `20px` | Stroke width: 2px |
| `error` | Alert triangle | `20px` | Filled with exclamation |

### Responsive Behavior

#### Mobile (< 768px)
- Button label truncated to icon + badge only
- Banner text shortened
- Touch-friendly button sizing (min 44px height)

#### Tablet (768px - 1024px)
- Abbreviated button labels
- Full banner content
- Standard button sizing

#### Desktop (> 1024px)
- Full button labels and content
- Maximum banner width: 400px
- Hover states enabled

## Implementation Notes

### State Management
- Use a centralized state store (Redux/Zustand)
- Implement state persistence for page refreshes
- Add logging for all state transitions

### Error Handling
- Implement retry logic with exponential backoff
- Provide user-friendly error messages
- Log detailed errors for debugging

### Accessibility
- Ensure proper ARIA labels for all states
- Keyboard navigation support
- Screen reader compatibility
- High contrast mode support

### Performance
- Lazy load wallet provider libraries
- Debounce rapid state changes
- Optimize animation performance
- Cache wallet connection state

---

*This specification serves as the canonical reference for wallet FSM implementation across the PanicSwap application.*
