// FranIQ State Auto-Fill Chrome Extension
// Content Script - Runs on the registration form page

// Complete list of all US states as they appear in the dropdown
const ALL_STATES = [
  'Alabama',
  'Alaska',
  'Arizona',
  'Arkansas',
  'California',
  'Colorado',
  'Connecticut',
  'Delaware',
  'Florida',
  'Georgia',
  'Hawaii',
  'Idaho',
  'Illinois',
  'Indiana',
  'Iowa',
  'Kansas',
  'Kentucky',
  'Louisiana',
  'Maine',
  'Maryland',
  'Massachusetts',
  'Michigan',
  'Minnesota',
  'Mississippi',
  'Missouri',
  'Montana',
  'Nebraska',
  'Nevada',
  'New Hampshire',
  'New Jersey',
  'New Mexico',
  'New York',
  'North Carolina',
  'North Dakota',
  'Ohio',
  'Oklahoma',
  'Oregon',
  'Pennsylvania',
  'Rhode Island',
  'South Carolina',
  'South Dakota',
  'Tennessee',
  'Texas',
  'Utah',
  'Vermont',
  'Virginia',
  'Washington',
  'Washington DC',
  'West Virginia',
  'Wisconsin',
  'Wyoming',
];

// Utility function to wait/sleep
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Get currently selected states to avoid duplicates
function getCurrentlySelectedStates() {
  const selectedStates = new Set();
  const existingRows = document.querySelectorAll('div[elname="formRow"]');

  existingRows.forEach((row) => {
    const stateSpan = row.querySelector('span.select2-chosen');
    if (stateSpan && stateSpan.textContent.trim() !== '-Select-') {
      selectedStates.add(stateSpan.textContent.trim());
    }
  });

  console.log('Currently selected states:', Array.from(selectedStates));
  return selectedStates;
}

// Find and click the "Add New" button
function clickAddNewButton() {
  const addButton = document.querySelector('a[aria-label="Add New"]');
  if (addButton) {
    console.log('Clicking Add New button');

    // Check if button has onclick or href attributes
    const href = addButton.getAttribute('href');
    const onclick = addButton.getAttribute('onclick');
    console.log('Button href:', href);
    console.log('Button onclick:', onclick);

    // Use single reliable click method to avoid duplicates
    try {
      // Just use direct click - it works and doesn't create extra rows
      addButton.click();
    } catch (error) {
      console.log('Click failed, trying event dispatch');
      // Fallback: single event dispatch
      const event = new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        view: window,
      });
      addButton.dispatchEvent(event);
    }

    // Method 4: Try to manually trigger row addition if button doesn't work
    // Wait a moment to see if a new row was added
    return true;
  }
  console.error('Add New button not found');
  return false;
}

// Find the newest/last state dropdown and click it
async function clickNewestStateDropdown() {
  await sleep(400); // Reduced wait time

  // Find state dropdowns using the method that works
  let stateDropdowns = document.querySelectorAll('div[elname="formRow"] .select2-choice');

  // Filter to state-specific dropdowns only
  const stateSpecificDropdowns = Array.from(stateDropdowns).filter((dropdown) => {
    const formGroup = dropdown.closest('.form-group');
    if (!formGroup) return false;

    // Look for the exact state group class (most reliable)
    return (
      formGroup.classList.contains('zc-Registration_Record_Details-States-group') ||
      formGroup.style.left === '34px'
    ); // First column position as backup
  });

  if (stateSpecificDropdowns.length > 0) {
    stateDropdowns = stateSpecificDropdowns;
    console.log(`Found ${stateDropdowns.length} state dropdowns`);
  } else {
    console.log('No state dropdowns found');
    return false;
  }

  // Click the last/newest dropdown (simplified)
  const newestDropdown = stateDropdowns[stateDropdowns.length - 1];
  const chosenText = newestDropdown.querySelector('.select2-chosen');
  const currentValue = chosenText ? chosenText.textContent.trim() : 'unknown';
  console.log(`Clicking state dropdown with value: "${currentValue}"`);

  try {
    // Method 1: Focus first, then click (this was working!)
    newestDropdown.focus();
    await sleep(100);

    // Method 2: Try different event types to bypass CSP (THIS WAS WORKING!)
    ['focus', 'mousedown', 'mouseup', 'click'].forEach((eventType) => {
      const event = new Event(eventType, {
        bubbles: true,
        cancelable: true,
      });
      newestDropdown.dispatchEvent(event);
    });

    // Method 3: Try clicking different parts of the dropdown
    const arrow = newestDropdown.querySelector('.select2-arrow');
    if (arrow) {
      console.log('Clicking dropdown arrow');
      arrow.click();
    }

    // Method 4: Direct click as fallback
    newestDropdown.click();

    await sleep(600); // Increased wait for dropdown to fully open
    return true;
  } catch (error) {
    console.log('Dropdown click failed:', error);
    return false;
  }
}

// Select a specific state from the open dropdown
async function selectStateFromDropdown(stateName) {
  await sleep(600); // Increased wait time for dropdown options to load

  // Find state options using the working method only
  let stateOptions = [];

  // Use the exact selectors that work - find visible dropdown
  let dropdownContainer = document.getElementById('select2-drop');
  if (!dropdownContainer || dropdownContainer.classList.contains('select2-display-none')) {
    dropdownContainer = document.querySelector('.select2-drop:not(.select2-display-none)');
  }

  if (dropdownContainer && !dropdownContainer.classList.contains('select2-display-none')) {
    stateOptions = dropdownContainer.querySelectorAll(
      'li.select2-result-selectable .select2-result-label'
    );
    console.log(`Found dropdown with ${stateOptions.length} options`);
  } else {
    console.log('No visible dropdown found using method 1');
  }

  // Method 2: Try exact structure from DOM inspection (the one that works!)
  if (stateOptions.length === 0) {
    stateOptions = document.querySelectorAll(
      'li.select2-results-dept-0.select2-result.select2-result-selectable .select2-result-label'
    );
    console.log(`Method 2 found ${stateOptions.length} options`);
  }

  if (stateOptions.length === 0) {
    console.log('No dropdown options found with any method');
    return false;
  }

  // Find the option that matches our target state
  const targetOption = Array.from(stateOptions).find(
    (option) => option.textContent.trim() === stateName
  );

  if (targetOption) {
    console.log(`Selecting state: ${stateName}`);

    // The actual clickable element might be the parent li, not the label
    const clickableElement = targetOption.closest('li') || targetOption;

    try {
      // Try multiple click approaches that were working
      ['mousedown', 'mouseup', 'click'].forEach((eventType) => {
        const event = new MouseEvent(eventType, {
          bubbles: true,
          cancelable: true,
          view: window,
        });

        // Try clicking both the label and the parent li
        targetOption.dispatchEvent(event);
        if (clickableElement !== targetOption) {
          clickableElement.dispatchEvent(event);
        }
      });
    } catch (error) {
      console.log('Event dispatch failed, trying direct click');
      targetOption.click();
      if (clickableElement !== targetOption) {
        clickableElement.click();
      }
    }

    await sleep(200); // Reduced wait time
    return true;
  } else {
    console.error(`State option not found: ${stateName}`);
    console.log(
      'Available options:',
      Array.from(stateOptions).map((o) => o.textContent.trim())
    );
    return false;
  }
}

// Add a single state to the form
async function addSingleState(stateName) {
  console.log(`Adding state: ${stateName}`);

  // Count rows before adding
  const rowsBefore = document.querySelectorAll('div[elname="formRow"]').length;
  console.log(`Rows before adding ${stateName}: ${rowsBefore}`);

  // Step 1: Click "Add New"
  if (!clickAddNewButton()) {
    return false;
  }

  // Wait and check if a new row was actually added
  await sleep(500); // Reduced wait time
  const rowsAfter = document.querySelectorAll('div[elname="formRow"]').length;
  console.log(`Rows after clicking Add New: ${rowsAfter}`);

  if (rowsAfter <= rowsBefore) {
    console.error('No new row was added - Add New button may not be working');
    return false;
  } else if (rowsAfter > rowsBefore + 1) {
    console.warn(
      `Warning: ${rowsAfter - rowsBefore} rows added instead of 1. Continuing with newest row.`
    );
  } else {
    console.log('✅ Exactly 1 new row added successfully');
  }

  // Step 2: Click the newest state dropdown
  if (!(await clickNewestStateDropdown())) {
    return false;
  }

  // Step 3: Select the specific state
  if (!(await selectStateFromDropdown(stateName))) {
    return false;
  }

  console.log(`Successfully added state: ${stateName}`);
  return true;
}

// Main function to auto-fill all missing states
async function autoFillAllStates() {
  console.log('Starting auto-fill process...');

  // Check if we're on the right page (silently exit if not)
  const addButton = document.querySelector('a[aria-label="Add New"]');
  if (!addButton) {
    console.log('Add New button not found - not on registration form, exiting silently');
    return;
  }

  // Get currently selected states
  const selectedStates = getCurrentlySelectedStates();

  // Filter out states that are already selected
  const statesToAdd = ALL_STATES.filter((state) => !selectedStates.has(state));

  if (statesToAdd.length === 0) {
    alert('All states are already added!');
    return;
  }

  console.log(`Found ${statesToAdd.length} states to add:`, statesToAdd);

  // Confirm with user
  const confirmed = confirm(
    `This will add ${statesToAdd.length} missing states to the form. Continue?`
  );
  if (!confirmed) {
    console.log('Auto-fill cancelled by user');
    return;
  }

  // Add each missing state
  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < statesToAdd.length; i++) {
    const state = statesToAdd[i];

    try {
      const success = await addSingleState(state);
      if (success) {
        successCount++;
        console.log(`Progress: ${i + 1}/${statesToAdd.length} - Added ${state}`);
      } else {
        errorCount++;
        console.error(`Failed to add ${state}`);
      }

      // Small delay between each state to avoid overwhelming the system
      await sleep(100); // Further reduced for speed
    } catch (error) {
      errorCount++;
      console.error(`Error adding ${state}:`, error);
    }
  }

  // Show final results
  const message = `Auto-fill complete!\n\nSuccessfully added: ${successCount} states\nErrors: ${errorCount} states`;
  alert(message);
  console.log(message);
}

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'autoFillStates') {
    autoFillAllStates();
    sendResponse({ success: true });
  }
});

// Add a visual indicator that the extension is loaded
console.log('FranIQ State Auto-Fill extension loaded and ready!');

// Optional: Add a floating button for easy access
function addFloatingButton() {
  // Only add if we're on the right page and button doesn't already exist
  if (
    document.querySelector('a[aria-label="Add New"]') &&
    !document.getElementById('franiq-autofill-btn')
  ) {
    const button = document.createElement('button');
    button.id = 'franiq-autofill-btn';
    button.innerHTML = '🌟 Auto-Fill All States';
    button.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
            background: #007bff;
            color: white;
            border: none;
            padding: 10px 15px;
            border-radius: 5px;
            cursor: pointer;
            font-weight: bold;
            box-shadow: 0 2px 5px rgba(0,0,0,0.2);
        `;

    button.addEventListener('click', autoFillAllStates);
    document.body.appendChild(button);

    console.log('Added floating auto-fill button');
  }
}

// Add the floating button when page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', addFloatingButton);
} else {
  addFloatingButton();
}

// Also try to add it after a delay in case the form loads dynamically
setTimeout(addFloatingButton, 2000);
