# PanicSwap User Flow Sequence Diagrams

## 1. "Start Demo" Flow - From User Input to Token Appearing in Wallet List

```mermaid
sequenceDiagram
    participant U as User
    participant D as DOM
    participant LS as LocalStorage
    participant JS as JavaScript
    participant PF as PumpFun API
    participant H as Helius API
    participant J as Jupiter API
    participant SB as Supabase
    participant TL as Token List Component

    Note over U,TL: Demo Token Addition Flow
    
    U->>D: Enters token mint in #demo-token-input
    U->>D: Clicks "Start Demo" button
    D->>JS: onclick="startDemo(event)"
    
    Note over JS: demo-mode.js processes input
    JS->>LS: Read walletAddress from localStorage
    alt Wallet not connected
        JS->>D: DOM Mutation: Show error notification
        JS-->>U: "Please connect wallet first"
    else Wallet connected
        Note over JS: Validate token mint address format
        
        Note over JS,PF: Network Request Chain - Token Data Fetching
        JS->>PF: POST https://pumpfun-scraper-api.p.rapidapi.com/search_tokens
        Note over PF: Headers: x-rapidapi-key, x-rapidapi-host
        PF-->>JS: JSON response with token metadata
        
        alt PumpFun API fails
            JS->>H: POST https://mainnet.helius-rpc.com/?api-key={key}
            Note over H: getAsset method for token metadata
            H-->>JS: JSON response with basic metadata
            
            JS->>J: GET https://price.jup.ag/v6/price?ids={mint}
            Note over J: Price and market data
            J-->>JS: JSON response with pricing data
        end
        
        Note over JS: Combine metadata from all sources
        
        Note over JS,SB: Supabase Database Operations
        JS->>SB: INSERT into token_metadata table
        Note over SB: Store: mint, symbol, name, image, decimals, price
        SB-->>JS: Success confirmation
        
        JS->>SB: INSERT into user_tokens table  
        Note over SB: Link token to wallet: wallet_address, token_mint
        SB-->>JS: Success confirmation
        
        Note over JS: Real-time subscription triggers
        SB-->>TL: Real-time update via postgres_changes subscription
        Note over TL: token-list-v3.js receives update
        
        TL->>LS: Write token data to localStorage cache
        TL->>D: DOM Mutation: Add new row to #token-list-tbody-v3
        Note over D: New token row appears with balance, price, protect button
        
        TL->>D: DOM Mutation: Update #total-value-v3 display
        TL->>D: DOM Mutation: Flash animation on new row
        Note over D: Green flash animation indicates successful addition
        
        JS->>D: DOM Mutation: Show success notification
        JS-->>U: "Token added successfully! 🎉"
    end
```

## 2. Auto-Protect Toggle Flow - Enabling, Disabling, Real-time Sync

```mermaid
sequenceDiagram
    participant U as User
    participant D as DOM
    participant LS as LocalStorage
    participant AT as AutoProtect JS
    participant API as Backend API
    participant SB as Supabase
    participant TL as Token List
    participant RT as Real-time Risk

    Note over U,RT: Auto-Protect Toggle Flow
    
    U->>D: Clicks Auto-Protect toggle switch
    D->>AT: change event on #auto-protect-v3
    Note over AT: auto-protect-toggle.js handles event
    
    AT->>LS: Read walletAddress from localStorage  
    alt Wallet not connected
        AT->>D: DOM Mutation: Revert checkbox, show error
        AT-->>U: "Please connect your wallet first"
    else Wallet connected
        Note over AT: Prevent double-clicks, set loading state
        AT->>D: DOM Mutation: Disable checkbox, show spinner
        AT->>LS: Write autoProtectEnabled=true to localStorage
        Note over LS: Optimistic UI update
        
        Note over AT,API: Network Request - Bulk Toggle
        AT->>API: POST ./api/auto-protection/bulk-toggle.php
        Note over API: Body: {"enabled": true}
        Note over API: Query: ?wallet={address}
        
        API->>SB: UPDATE wallet_auto_protection table
        Note over SB: Set auto_protect_enabled = true
        SB-->>API: Success confirmation
        
        API->>SB: SELECT all user tokens for bulk update
        SB-->>API: List of user's tokens
        
        loop For each user token
            API->>SB: INSERT/UPDATE protected_tokens table
            Note over SB: monitoring_active=true, is_active=true
        end
        
        API-->>AT: JSON: {"success": true, "message": "Auto-Protect enabled"}
        
        Note over SB: Real-time subscriptions trigger
        SB-->>TL: postgres_changes on protected_tokens table
        SB-->>RT: postgres_changes on protection events
        
        Note over TL: token-list-v3.js processes updates
        loop For each affected token
            TL->>D: DOM Mutation: Update protection button state
            Note over D: Button changes to red "protected" style
            TL->>D: DOM Mutation: Add protection indicator dot
            RT->>D: DOM Mutation: Update risk badge to "Monitoring"
            Note over D: Badge color changes to blue with pulse animation
        end
        
        TL->>D: DOM Mutation: Update #protected-count-v3 display
        AT->>D: DOM Mutation: Remove loading spinner
        AT->>D: DOM Mutation: Show success notification
        AT-->>U: "Auto-Protect enabled! All tokens automatically protected."
    end
```

## 3. Manual Protect/Unprotect Button Per Token Flow

```mermaid
sequenceDiagram
    participant U as User
    participant D as DOM
    participant LS as LocalStorage
    participant PT as ProtectionToggle JS
    participant API as Protection API
    participant SB as Supabase
    participant RT as Real-time Risk
    participant M as Monitoring Backend

    Note over U,M: Manual Protection Toggle Flow
    
    U->>D: Clicks protect/unprotect button for specific token
    D->>PT: click event on [data-protection-btn]
    Note over PT: protection-toggle.js handles delegation
    
    PT->>LS: Read walletAddress from localStorage
    alt Wallet not connected
        PT->>D: DOM Mutation: Show error notification
        PT-->>U: "Please connect your wallet first"
    else Token already rugged
        PT->>D: DOM Mutation: Show error notification  
        PT-->>U: "Cannot protect rugged tokens"
    else Valid protection toggle
        Note over PT: Extract token data from button attributes
        Note over PT: Check if toggle already in progress (prevent double-clicks)
        
        PT->>D: DOM Mutation: Set button loading state (spinning icon)
        PT->>D: DOM Mutation: Optimistically update button appearance
        Note over D: Button changes color immediately for UX
        
        alt Disabling Protection
            Note over PT,API: Network Request - Unprotect
            PT->>API: DELETE ./api/protection/protect.php
            Note over API: Query: ?wallet={address}&mint={token_mint}
            
            API->>SB: UPDATE protected_tokens SET is_active=false
            SB-->>API: Success confirmation
            API-->>PT: JSON: {"success": true, "message": "Protection disabled"}
            
        else Enabling Protection  
            Note over PT,API: Network Request - Protect
            PT->>API: POST ./api/protection/protect.php
            Note over API: Body: {token_mint, wallet_address, mempool_settings}
            
            API->>SB: INSERT/UPDATE protected_tokens table
            Note over SB: is_active=true, monitoring_active=true, mempool_monitoring=true
            SB-->>API: Success confirmation
            
            Note over API,M: Trigger monitoring activation
            API->>M: POST http://localhost:3001/api/monitoring/force-update
            Note over M: Start mempool monitoring for token
            M-->>API: Monitoring started confirmation
            
            API-->>PT: JSON: {"success": true, "message": "Token protected"}
        end
        
        Note over SB: Real-time subscriptions fire
        SB-->>PT: postgres_changes on protected_tokens
        SB-->>RT: postgres_changes on protection_alerts
        
        PT->>D: DOM Mutation: Remove loading state from button
        PT->>D: DOM Mutation: Update button final state
        Note over D: Correct colors, icons, accessibility attributes
        
        RT->>D: DOM Mutation: Update risk badge
        Note over D: Badge changes to "Monitoring" with blue color and pulse
        
        PT->>LS: Update tokenListV3State in localStorage
        PT->>D: DOM Mutation: Update #protected-count-v3
        PT->>D: DOM Mutation: Show success notification
        
        alt Protection enabled
            PT-->>U: "TokenXYZ is now protected! 🛡️"
        else Protection disabled
            PT-->>U: "TokenXYZ protection disabled"
        end
        
        Note over RT: Start fetching real-time monitoring data
        RT->>API: GET ./api/monitoring-status.php/{token_mint}
        API-->>RT: Current monitoring status, liquidity, price data
        RT->>D: DOM Mutation: Update risk badge with current data
    end
```

## 4. Risk Badge Live Update and Tooltip Display Flow

```mermaid
sequenceDiagram
    participant SB as Supabase
    participant RT as Real-time Risk JS  
    participant M as Monitoring Backend
    participant D as DOM
    participant U as User
    participant T as Tooltip

    Note over SB,T: Risk Badge Real-time Update Flow
    
    Note over M: Background monitoring detects threat
    M->>SB: INSERT into pattern_alerts table
    Note over SB: New alert: {token_mint, risk_score, recommendation, patterns}
    
    Note over SB: Real-time subscription triggers
    SB-->>RT: postgres_changes event on pattern_alerts
    Note over RT: real-time-risk.js receives alert
    
    RT->>RT: Process threat alert data
    Note over RT: Cache threat data in threatCache Map
    RT->>RT: Calculate risk score from multiple factors
    Note over RT: Price deltas, liquidity changes, alert severity
    
    RT->>D: DOM Mutation: Update risk badge element
    Note over D: Find element: [data-risk-badge="{token_mint}"]
    
    alt Risk Score >= 80 (Critical)
        RT->>D: DOM Mutation: Red badge "CRITICAL" with warning icon
        Note over D: Classes: bg-red-500/10 border-red-500/20 text-red-400
        RT->>D: DOM Mutation: Pulse animation effect
        Note over D: CSS animation: ml-update-flash
        
        Note over RT: Show notification if high risk
        RT->>D: DOM Mutation: Browser notification (if permitted)
        RT->>D: DOM Mutation: In-app notification banner
        
    else Risk Score 60-79 (Warning)
        RT->>D: DOM Mutation: Yellow badge "Warning" with exclamation
        Note over D: Classes: bg-yellow-500/10 border-yellow-500/20 text-yellow-400
        
    else Risk Score 40-59 (Caution) 
        RT->>D: DOM Mutation: Orange badge "Dropping" with down arrow
        
    else Risk Score < 40 (Safe)
        RT->>D: DOM Mutation: Green badge "Safe" with checkmark
        Note over D: Classes: bg-green-500/10 border-green-500/20 text-green-400
    end
    
    Note over RT: Update tooltip data attribute
    RT->>D: DOM Mutation: Set data-tooltip with JSON data
    Note over D: Includes: monitoring status, threat info, price/liquidity deltas
    
    Note over U,T: User Interaction - Tooltip Display
    U->>D: Hovers over risk badge
    D->>RT: mouseover event on .real-time-risk-badge
    
    RT->>RT: Parse tooltip data from data-tooltip attribute
    RT->>T: Create tooltip element
    T->>D: DOM Mutation: Add tooltip to document.body
    Note over D: Absolute positioned div with monitoring details
    
    Note over T: Tooltip content includes:
    Note over T: - Monitoring status (Active/Inactive)
    Note over T: - Risk threshold setting  
    Note over T: - Recent alerts and patterns
    Note over T: - Price/liquidity changes
    Note over T: - Last update timestamp
    
    T->>D: DOM Mutation: Position tooltip relative to badge
    Note over D: Calculate position to avoid screen edges
    
    U->>D: Moves mouse away from badge
    D->>RT: mouseout event
    RT->>T: Remove tooltip
    T->>D: DOM Mutation: Remove tooltip element
    
    Note over SB,RT: Continuous Updates
    loop Every 30 seconds
        Note over M: Monitor price/liquidity changes
        M->>SB: INSERT into token_price_history
        SB-->>RT: postgres_changes event
        RT->>RT: Calculate new price deltas
        RT->>D: DOM Mutation: Update badge if significant change
    end
    
    Note over SB,RT: Alert Cleanup
    loop Every 5 minutes  
        RT->>RT: Clean expired alerts from cache
        Note over RT: Remove alerts older than 10 minutes
        RT->>D: DOM Mutation: Update badge if risk level changes
    end
```

## Key Technical Implementation Details

### Network Requests Highlighted:
- **PumpFun API**: Token metadata fetching with RapidAPI authentication
- **Helius RPC**: Fallback token metadata via getAsset method  
- **Jupiter API**: Real-time price data fetching
- **Protection APIs**: RESTful endpoints for protect/unprotect operations
- **Monitoring APIs**: Real-time status and threat detection data
- **Supabase**: Database operations via REST API and real-time subscriptions

### Local Storage Operations:
- **walletAddress**: User's connected wallet address
- **autoProtectEnabled**: Auto-protect toggle state persistence
- **tokenListV3State**: Cached token data and recent changes tracking
- **defaultMempoolSettings**: User's mempool monitoring preferences

### Supabase Real-time Subscriptions:
- **protected_tokens**: Protection status changes
- **pattern_alerts**: Threat detection alerts  
- **token_price_history**: Price movement tracking
- **protection_alerts**: System-generated warnings
- **wallet_auto_protection**: Auto-protect configuration changes

### DOM Mutations:
- **Loading States**: Spinners, disabled buttons, opacity changes
- **Visual Feedback**: Color changes, animations, badge updates
- **Data Updates**: Token counts, prices, protection status
- **Notifications**: Success/error messages, tooltips, alerts
- **Real-time Indicators**: Pulse animations, status badges, monitoring indicators

Each flow demonstrates the complex interaction between frontend optimistic updates, backend API calls, database changes, and real-time synchronization that provides users with immediate feedback while ensuring data consistency across the system.
