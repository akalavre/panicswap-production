# Risk Badge Regression Test Checklist

## Overview
This checklist covers manual and automated testing for risk badge stability, async race conditions, and visual consistency in the PanicSwap dashboard.

## Prerequisites

### Environment Setup
- [ ] Development environment is running (`npm run dev` or equivalent)
- [ ] Test data is available (at least 3-5 test tokens)
- [ ] Browser developer tools are open (for performance monitoring)
- [ ] Network throttling is available for connection tests

### Test Data Requirements
- [ ] Tokens with different risk levels (Safe, Low, Moderate, High, Critical)
- [ ] At least one known rugged token for testing
- [ ] Tokens with active monitoring enabled
- [ ] Tokens with ML risk predictions available

## Automated Test Execution

### Jest/Vitest Unit Tests
- [ ] Run race condition tests: `npm test risk-store-race-conditions.test.ts`
- [ ] Verify all async order tests pass
- [ ] Check test coverage reports
- [ ] Validate performance benchmarks within thresholds

### Cypress Visual Tests
- [ ] Run visual stability tests: `npx cypress run --spec "cypress/e2e/risk-badge-visual-stability.cy.js"`
- [ ] Review generated screenshots for visual regressions
- [ ] Verify no flicker detection in automated tests
- [ ] Check memory leak test results

## Manual Testing Scenarios

### 1. Basic Risk Level Display
**Objective**: Verify risk badges display correctly for each risk level

**Steps**:
1. Navigate to dashboard
2. Locate tokens with different risk levels
3. Verify badge colors and text match expected values:
   - Safe: Green background, "Safe" text
   - Low: Blue background, "Low" text  
   - Moderate: Yellow background, "Moderate" text
   - High: Orange background, "High" text
   - Critical: Red background, "Critical" text
   - Rugged: Gray background, "Rugged" text

**Expected Result**: All badges display correct colors and text
**Pass/Fail**: ⬜

### 2. Real-time Updates
**Objective**: Test real-time risk updates without visual flicker

**Steps**:
1. Open dashboard with tokens loaded
2. Enable "slow network" in browser dev tools (optional)
3. Trigger risk level changes through:
   - Protection toggle changes
   - Simulated monitoring alerts
   - ML prediction updates
4. Observe badge updates for smooth transitions
5. Check for any flicker or rapid color changes

**Expected Result**: Badges update smoothly without flicker
**Pass/Fail**: ⬜

### 3. Race Condition Handling
**Objective**: Verify correct final state when updates arrive out of order

**Test Case 3a - Priority Override**:
1. Start with token showing "Low" risk
2. Simultaneously trigger:
   - Critical risk from monitoring
   - Safe risk from token data
3. Verify final state shows "Critical"

**Expected Result**: Critical risk takes priority
**Pass/Fail**: ⬜

**Test Case 3b - Rugged Override**:
1. Start with token showing "High" risk
2. Trigger rugged flag from any source
3. Verify badge immediately shows "Rugged" state

**Expected Result**: Rugged state overrides all other risk levels
**Pass/Fail**: ⬜

### 4. WebSocket Connection Stability
**Objective**: Test behavior during connection issues

**Steps**:
1. Load dashboard with active monitoring
2. Use browser dev tools to simulate network disconnection
3. Observe badge behavior during disconnection
4. Restore network connection
5. Verify badges restore to correct state

**Expected Result**: Badges remain stable during disconnection and restore correctly
**Pass/Fail**: ⬜

### 5. Performance Under Load
**Objective**: Verify system performance with rapid updates

**Steps**:
1. Open browser performance monitoring
2. Load dashboard with 10+ tokens
3. Enable rapid price/monitoring updates (if available)
4. Monitor for 2-3 minutes
5. Check performance metrics:
   - CPU usage remains reasonable
   - Memory usage doesn't continuously grow
   - No JavaScript errors in console

**Expected Result**: System remains responsive, no memory leaks detected
**Pass/Fail**: ⬜

### 6. Mobile Responsiveness
**Objective**: Verify badges work correctly on mobile devices

**Steps**:
1. Switch to mobile view (or use actual mobile device)
2. Navigate to dashboard
3. Verify badges are visible and readable
4. Test touch interactions with badges
5. Verify tooltips work on mobile

**Expected Result**: Badges display correctly and are functional on mobile
**Pass/Fail**: ⬜

### 7. Tooltip Accuracy
**Objective**: Verify tooltip data matches displayed risk level

**Steps**:
1. Hover over each risk badge type
2. Verify tooltip shows:
   - Correct risk score
   - Monitoring status
   - Last update time
   - Relevant alert messages
3. Test tooltip positioning edge cases (screen edges)

**Expected Result**: Tooltips show accurate, up-to-date information
**Pass/Fail**: ⬜

### 8. Error Handling
**Objective**: Test graceful handling of data errors

**Test Case 8a - Invalid Risk Data**:
1. Simulate invalid risk level data
2. Verify system doesn't crash
3. Check fallback display behavior

**Expected Result**: Invalid data handled gracefully with fallback
**Pass/Fail**: ⬜

**Test Case 8b - API Timeout**:
1. Simulate slow/timeout API responses
2. Verify loading states display correctly
3. Check timeout error handling

**Expected Result**: Timeouts handled gracefully, appropriate feedback shown
**Pass/Fail**: ⬜

### 9. Browser Compatibility
**Objective**: Verify functionality across different browsers

**Test on each browser**:
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (if available)
- [ ] Edge (latest)

**For each browser, verify**:
- [ ] Badges display correctly
- [ ] Colors match design
- [ ] Tooltips work
- [ ] Real-time updates function
- [ ] No console errors

### 10. Accessibility
**Objective**: Verify badges are accessible to all users

**Steps**:
1. Test with screen reader (if available)
2. Verify keyboard navigation works
3. Check color contrast ratios
4. Test with high contrast mode
5. Verify ARIA labels are present

**Expected Result**: Badges are fully accessible
**Pass/Fail**: ⬜

## Edge Cases Testing

### Rapid State Changes
- [ ] Test extremely rapid risk level changes (multiple per second)
- [ ] Verify final state is always correct
- [ ] Check for race conditions in event handling

### Data Consistency
- [ ] Test with conflicting data from multiple sources
- [ ] Verify priority system works correctly
- [ ] Test timestamp-based conflict resolution

### Memory Management
- [ ] Long-running session (30+ minutes) memory test
- [ ] Multiple token addition/removal cycles
- [ ] WebSocket reconnection cycles

## Performance Benchmarks

### Rendering Performance
- [ ] Badge render time < 10ms average
- [ ] Badge render time < 50ms maximum
- [ ] No dropped frames during updates

### Memory Usage
- [ ] No memory leaks detected after 100 updates
- [ ] Memory increase < 5MB after extensive use
- [ ] Garbage collection working properly

### Network Efficiency
- [ ] WebSocket updates are processed efficiently
- [ ] No unnecessary API calls during updates
- [ ] Proper cleanup on page navigation

## Regression Specific Tests

### Visual Regression
- [ ] Compare screenshots with baseline
- [ ] Verify no unexpected visual changes
- [ ] Check badge positioning consistency

### Functional Regression
- [ ] All existing features still work
- [ ] New risk source integrations don't break existing functionality
- [ ] Event handling remains stable

### Performance Regression
- [ ] Response times haven't increased
- [ ] Memory usage patterns remain stable
- [ ] No new performance bottlenecks introduced

## Bug Reporting Template

When issues are found, use this template:

```
**Bug Title**: [Brief description]

**Priority**: [High/Medium/Low]

**Environment**: 
- Browser: [Browser and version]
- Device: [Desktop/Mobile/Tablet]
- Test Type: [Manual/Automated]

**Steps to Reproduce**:
1. [Step 1]
2. [Step 2]
3. [Step 3]

**Expected Result**: [What should happen]

**Actual Result**: [What actually happened]

**Screenshots/Videos**: [If applicable]

**Console Errors**: [Any JavaScript errors]

**Additional Notes**: [Any other relevant information]
```

## Test Completion Sign-off

**Automated Tests**:
- [ ] Jest/Vitest tests: All passing
- [ ] Cypress tests: All passing
- [ ] Performance benchmarks: Within thresholds

**Manual Tests**:
- [ ] Core functionality: All tests passing
- [ ] Edge cases: All tests passing
- [ ] Cross-browser: All tests passing
- [ ] Performance: All tests passing

**Issues Found**: [Count] 
**Critical Issues**: [Count]
**Must-fix Issues**: [Count]

**QA Engineer**: ___________________
**Date**: ___________________
**Sign-off**: ⬜ PASS / ⬜ FAIL

**Notes**:
```
[Any additional notes or recommendations]
```

## Continuous Monitoring

### Production Monitoring Setup
- [ ] Error tracking configured for risk badge updates
- [ ] Performance monitoring in place
- [ ] User feedback collection enabled
- [ ] A/B testing capability available (if needed)

### Metrics to Track
- [ ] Badge render success rate
- [ ] Average update latency
- [ ] User interaction rates with badges
- [ ] Error rates by browser/device type
