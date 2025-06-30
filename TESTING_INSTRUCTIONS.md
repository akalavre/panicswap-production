# Token Functionality Testing Instructions

## Overview
This document provides comprehensive testing instructions for verifying all token functionality requirements as specified in Step 8.

## Prerequisites
1. Open the dashboard.php in a web browser
2. Have a wallet connected or connect one for testing
3. Open browser developer tools (F12)
4. Ensure you have test tokens (both with and without icons)

---

## Test 1: Token Display Testing (with/without icons)

### Test 1.1: Tokens with Icons
**Objective**: Verify tokens with valid icon URLs display correctly

**Steps**:
1. Navigate to dashboard.php
2. Look for tokens in the token list that have icon images
3. Verify icons load and display properly
4. Check for proper fallback if icon fails to load

**Expected Results**:
- ✅ Icons load and display at correct size (32x32px typically)
- ✅ Icons are circular/rounded as per design
- ✅ If icon fails to load, fallback text shows token symbol

### Test 1.2: Tokens without Icons
**Objective**: Verify tokens without icons show proper fallback

**Steps**:
1. Find tokens that don't have icon URLs
2. Verify fallback display shows token symbol
3. Check styling matches design requirements

**Expected Results**:
- ✅ Fallback shows first 2-3 characters of token symbol
- ✅ Fallback has proper background color and styling
- ✅ Text is centered and readable

### Test 1.3: Broken Icon URLs
**Objective**: Test error handling for broken image URLs

**Steps**:
1. In developer tools, find a token icon image element
2. Change the src attribute to a broken URL
3. Observe the fallback behavior

**Expected Results**:
- ✅ Broken images are handled gracefully
- ✅ Fallback text appears instead of broken image icon
- ✅ No console errors related to image loading

---

## Test 2: Keyboard Shortcuts Testing

### Test 2.1: ESC Key - Modal Closing
**Objective**: Verify ESC key closes modals

**Steps**:
1. Open any modal (wallet connect, delete confirmation, etc.)
2. Press ESC key
3. Verify modal closes

**Expected Results**:
- ✅ Modal closes immediately when ESC is pressed
- ✅ Focus returns to appropriate element
- ✅ Backdrop/overlay is removed

**Test Cases**:
- [ ] Wallet connect modal
- [ ] Delete token confirmation modal
- [ ] Settings modals
- [ ] Protection settings modal

### Test 2.2: Enter Key - Confirm Actions
**Objective**: Verify Enter key confirms actions in modals

**Steps**:
1. Open delete token confirmation modal
2. Press Enter key
3. Verify action is confirmed

**Expected Results**:
- ✅ Enter key acts as confirmation button click
- ✅ Action proceeds as if "Confirm" button was clicked
- ✅ Modal closes after action

### Test 2.3: Arrow Keys Navigation (if implemented)
**Objective**: Test keyboard navigation through token list

**Steps**:
1. Focus on token list
2. Use arrow keys (Up/Down or Left/Right)
3. Verify navigation works

**Expected Results**:
- ✅ Arrow keys navigate between tokens
- ✅ Focus is visible and clear
- ✅ Navigation wraps appropriately

---

## Test 3: Animation Timing Testing

### Test 3.1: Flash Animation (Price Updates)
**Objective**: Verify flash animations have correct timing (0.5s)

**Steps**:
1. Open browser developer tools
2. Go to Console tab
3. Run this JavaScript to test flash animation:
```javascript
// Test flash animation timing
const tokenRow = document.querySelector('#token-list-tbody-v3 tr');
if (tokenRow) {
    const startTime = performance.now();
    tokenRow.classList.add('flash-green');
    setTimeout(() => {
        const endTime = performance.now();
        console.log(`Flash animation duration: ${endTime - startTime}ms`);
        console.log('Expected: ~500ms');
    }, 600);
}
```

**Expected Results**:
- ✅ Flash animation lasts approximately 500ms
- ✅ Animation is smooth and visible
- ✅ Color transitions from highlight back to normal

### Test 3.2: Modal Scale Animation
**Objective**: Verify modal animations have correct timing (0.3s)

**Steps**:
1. Open a modal and observe the scale-in animation
2. Close the modal and observe the scale-out animation
3. Time should feel smooth and not too fast/slow

**Expected Results**:
- ✅ Modal scales in smoothly (~300ms)
- ✅ Modal scales out smoothly (~300ms)
- ✅ No jarring or abrupt movements

### Test 3.3: Hover Transitions
**Objective**: Verify hover transitions are smooth (0.3s)

**Steps**:
1. Hover over interactive elements (buttons, token rows)
2. Observe transition timing
3. Move mouse quickly on/off elements

**Expected Results**:
- ✅ Hover effects are smooth and responsive
- ✅ No flickering or abrupt changes
- ✅ Transitions work in both directions (hover in/out)

---

## Test 4: Accessibility Attributes Testing

### Test 4.1: ARIA Labels and Roles
**Objective**: Verify proper accessibility attributes

**Steps**:
1. Open browser developer tools
2. Go to Elements tab
3. Search for aria-label, role, and aria-* attributes
4. Run this JavaScript in console:
```javascript
// Check ARIA attributes
const interactiveElements = document.querySelectorAll('button, [onclick], [role="button"]');
const missingAria = [];
interactiveElements.forEach((el, i) => {
    if (!el.getAttribute('aria-label') && !el.textContent.trim()) {
        missingAria.push(`Element ${i}: ${el.tagName} missing aria-label`);
    }
});
console.log('Missing ARIA labels:', missingAria);

// Check for alt text on images
const images = document.querySelectorAll('img');
const missingAlt = [];
images.forEach((img, i) => {
    if (!img.getAttribute('alt')) {
        missingAlt.push(`Image ${i}: Missing alt text`);
    }
});
console.log('Missing alt text:', missingAlt);
```

**Expected Results**:
- ✅ All interactive elements have appropriate labels
- ✅ Images have alt text
- ✅ Roles are properly assigned

### Test 4.2: Focus Management
**Objective**: Test keyboard focus behavior

**Steps**:
1. Use Tab key to navigate through the interface
2. Open modals and verify focus trapping
3. Close modals and verify focus returns correctly

**Expected Results**:
- ✅ Focus is visible and clear
- ✅ Tab order is logical
- ✅ Focus is trapped in modals
- ✅ Focus returns to trigger element after modal closes

### Test 4.3: Screen Reader Testing
**Objective**: Test with screen reader (if available)

**Steps**:
1. Enable screen reader (Windows Narrator, NVDA, etc.)
2. Navigate through the token list
3. Interact with modals and buttons

**Expected Results**:
- ✅ Content is read in logical order
- ✅ Interactive elements are announced properly
- ✅ Status changes are announced

---

## Test 5: List Updates After Deletion

### Test 5.1: Token List Update
**Objective**: Verify list updates correctly after token deletion

**Steps**:
1. Note the current number of tokens in the list
2. Delete a token using the delete button
3. Verify the token is removed from the list
4. Check that remaining tokens adjust properly

**Expected Results**:
- ✅ Deleted token disappears from list
- ✅ List layout adjusts smoothly
- ✅ No orphaned elements remain
- ✅ Animation during removal is smooth

### Test 5.2: Total Value Update
**Objective**: Verify total value recalculates after deletion

**Steps**:
1. Note the current total value displayed
2. Delete a token with a known value
3. Verify total value decreases correctly
4. Check calculation accuracy

**Expected Results**:
- ✅ Total value updates immediately
- ✅ Calculation is accurate
- ✅ Currency formatting is maintained

### Test 5.3: Protected Count Update
**Objective**: Verify protected token count updates

**Steps**:
1. Note the current protected token count
2. Delete a protected token
3. Verify count decreases by 1
4. Delete an unprotected token and verify count stays same

**Expected Results**:
- ✅ Protected count decreases when protected token deleted
- ✅ Protected count unchanged when unprotected token deleted
- ✅ Count updates immediately

---

## Test 6: Error Path Testing (Supabase Offline)

### Test 6.1: Simulate Network Failure
**Objective**: Test behavior when Supabase is unreachable

**Steps**:
1. Open developer tools, go to Network tab
2. Set throttling to "Offline" or block specific domains
3. Try to load/refresh token data
4. Observe error handling

**Alternative Method**:
```javascript
// Simulate Supabase failure
if (window.supabaseClient) {
    const originalFrom = window.supabaseClient.from;
    window.supabaseClient.from = () => ({
        select: () => ({
            eq: () => ({
                then: () => Promise.reject(new Error('Simulated network failure'))
            })
        })
    });
    console.log('Supabase client mocked to fail');
}
```

**Expected Results**:
- ✅ Error is handled gracefully
- ✅ User is notified of connectivity issues
- ✅ Application doesn't crash
- ✅ Fallback data or cached data is used if available

### Test 6.2: Graceful Degradation
**Objective**: Verify app functions with limited connectivity

**Steps**:
1. Partially block network requests
2. Verify essential functions still work
3. Check for appropriate loading states

**Expected Results**:
- ✅ Core functionality remains available
- ✅ Loading states are shown appropriately
- ✅ User can still navigate the interface

---

## Test 7: Memory Leak Testing (Event Listeners)

### Test 7.1: Event Listener Cleanup
**Objective**: Verify event listeners are removed properly

**Steps**:
1. Open developer tools console
2. Run this JavaScript to monitor listeners:
```javascript
// Monitor event listener addition/removal
let listenerCount = 0;
const originalAdd = EventTarget.prototype.addEventListener;
const originalRemove = EventTarget.prototype.removeEventListener;

EventTarget.prototype.addEventListener = function(...args) {
    listenerCount++;
    console.log(`Listener added: ${args[0]}, Total: ${listenerCount}`);
    return originalAdd.apply(this, args);
};

EventTarget.prototype.removeEventListener = function(...args) {
    listenerCount--;
    console.log(`Listener removed: ${args[0]}, Total: ${listenerCount}`);
    return originalRemove.apply(this, args);
};

console.log('Event listener monitoring enabled');
```

3. Open and close modals several times
4. Navigate between sections
5. Monitor console for listener count

**Expected Results**:
- ✅ Listeners are added when needed
- ✅ Listeners are removed when components unmount
- ✅ No significant accumulation of listeners
- ✅ Memory usage remains stable

### Test 7.2: DOM Node Cleanup
**Objective**: Verify DOM nodes are cleaned up properly

**Steps**:
1. Monitor DOM node count during navigation
2. Open/close modals multiple times
3. Check for memory growth in browser tools

**Chrome DevTools Method**:
1. Open DevTools → Performance tab
2. Record performance while using the app
3. Look for memory leaks in the heap

**Expected Results**:
- ✅ DOM nodes are removed when no longer needed
- ✅ Memory usage doesn't grow continuously
- ✅ No detached DOM nodes accumulate

---

## Test Execution Checklist

### Before Testing
- [ ] Browser developer tools are open
- [ ] Wallet is connected (or ready to connect)
- [ ] Test tokens are available
- [ ] Network connectivity is stable

### During Testing
- [ ] Record any failures or unexpected behavior
- [ ] Take screenshots of issues
- [ ] Note browser console errors
- [ ] Test in multiple browsers if possible

### After Testing
- [ ] Document all findings
- [ ] Categorize issues by severity
- [ ] Verify all test cases have been executed
- [ ] Clean up any test data

---

## Browser Compatibility Testing

Test the above scenarios in multiple browsers:
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (if on Mac)
- [ ] Edge (latest)

---

## Performance Considerations

While testing, monitor:
- [ ] Page load times
- [ ] Animation smoothness
- [ ] Memory usage
- [ ] Network request efficiency
- [ ] CPU usage during interactions

---

## Reporting Template

For each test that fails, document:

```
Test ID: [e.g., Test 2.1]
Test Name: [e.g., ESC Key - Modal Closing]
Browser: [e.g., Chrome 120]
Issue: [Description of what went wrong]
Expected: [What should have happened]
Actual: [What actually happened]
Severity: [Critical/High/Medium/Low]
Screenshots: [If applicable]
Console Errors: [Any JavaScript errors]
Reproduction Steps: [Detailed steps to reproduce]
```

This comprehensive testing approach ensures all aspects of the token functionality are thoroughly verified according to the requirements.
