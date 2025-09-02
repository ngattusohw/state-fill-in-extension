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

    // Try different click methods to bypass CSP
    try {
      // Method 1: Try multiple event types
      ['mousedown', 'mouseup', 'click', 'focus'].forEach((eventType) => {
        const event = new MouseEvent(eventType, {
          bubbles: true,
          cancelable: true,
          view: window,
        });
        addButton.dispatchEvent(event);
      });

      // Method 2: Try touch events for mobile compatibility
      if (window.TouchEvent) {
        const touchEvent = new TouchEvent('touchstart', {
          bubbles: true,
          cancelable: true,
        });
        addButton.dispatchEvent(touchEvent);
      }
    } catch (error) {
      console.log('Event dispatch failed:', error);
    }

    // Method 3: Direct click as fallback
    try {
      addButton.click();
    } catch (error) {
      console.log('Direct click failed:', error);
    }

    // Method 4: Try to manually trigger row addition if button doesn't work
    // Wait a moment to see if a new row was added
    setTimeout(() => {
      const rowsBefore = document.querySelectorAll('div[elname="formRow"]').length;
      console.log('Rows before add attempt:', rowsBefore);

      // If no new row was added by the button, we might need to try a different approach
      setTimeout(() => {
        const rowsAfter = document.querySelectorAll('div[elname="formRow"]').length;
        console.log('Rows after add attempt:', rowsAfter);

        if (rowsAfter <= rowsBefore) {
          console.log('Button may not have worked, new row not detected');
        } else {
          console.log('New row was added successfully');
        }
      }, 1000);
    }, 500);

    return true;
  }
  console.error('Add New button not found');
  return false;
}

// Find the newest/last state dropdown and click it
async function clickNewestStateDropdown() {
  await sleep(1000); // Wait longer for new row to appear

  // Try multiple selectors for state dropdowns
  let stateDropdowns = [];

  // Method 1: Look for state dropdowns in form rows (most specific)
  stateDropdowns = document.querySelectorAll('div[elname="formRow"] .select2-choice');
  console.log(`Method 1 found ${stateDropdowns.length} form row dropdowns`);

  // Filter to find only the state dropdowns (much more specific)
  if (stateDropdowns.length > 0) {
    const stateSpecificDropdowns = Array.from(stateDropdowns).filter((dropdown) => {
      // Look for dropdowns that are specifically for states
      const formGroup = dropdown.closest('.form-group');
      if (!formGroup) return false;

      // Must have the exact state group class
      if (formGroup.classList.contains('zc-Registration_Record_Details-States-group')) {
        console.log('Found exact state group dropdown');
        return true;
      }

      // Check if the formGroup is positioned in the first column (states column)
      const leftPosition = formGroup.style.left;
      if (leftPosition === '34px') {
        console.log('Found dropdown at state column position (34px)');
        return true;
      }

      // Check if dropdown is in first column
      if (dropdown.closest('.formColumn.column-0')) {
        console.log('Found dropdown in first column');
        return true;
      }

      return false;
    });

    if (stateSpecificDropdowns.length > 0) {
      stateDropdowns = stateSpecificDropdowns;
      console.log(`Filtered to ${stateDropdowns.length} state-specific dropdowns`);
    } else {
      console.log('No state-specific dropdowns found, keeping all form row dropdowns');
      // If we can't filter properly, just take the first few dropdowns from each row
      stateDropdowns = Array.from(stateDropdowns).filter((dropdown, index) => {
        // Only take first dropdown from each row (assuming it's the state dropdown)
        const row = dropdown.closest('div[elname="formRow"]');
        if (row) {
          const dropdownsInRow = row.querySelectorAll('.select2-choice');
          return dropdown === dropdownsInRow[0]; // First dropdown in each row
        }
        return false;
      });
      console.log(`Filtered to ${stateDropdowns.length} first-in-row dropdowns`);
    }
  }

  // Method 2: Original selector as fallback
  if (stateDropdowns.length === 0) {
    stateDropdowns = document.querySelectorAll(
      '.zc-Registration_Record_Details-States .select2-choice'
    );
    console.log(`Method 2 found ${stateDropdowns.length} state dropdowns`);
  }

  // Method 3: Look for any dropdowns with state-related content
  if (stateDropdowns.length === 0) {
    const allDropdowns = document.querySelectorAll('.select2-choice');
    stateDropdowns = Array.from(allDropdowns).filter((dropdown) => {
      const chosenText = dropdown.querySelector('.select2-chosen');
      if (chosenText) {
        const text = chosenText.textContent.trim();
        // Check if it contains state names or "-Select-"
        return text === '-Select-' || ALL_STATES.includes(text);
      }
      return false;
    });
    console.log(`Method 3 found ${stateDropdowns.length} content-filtered dropdowns`);
  }

  if (stateDropdowns.length === 0) {
    console.error('No state dropdowns found');
    return false;
  }

  // Click the last/newest dropdown
  let newestDropdown = stateDropdowns[stateDropdowns.length - 1];

  // Debug: Show what dropdown we're about to click
  const chosenText = newestDropdown.querySelector('.select2-chosen');
  const currentValue = chosenText ? chosenText.textContent.trim() : 'unknown';
  console.log(`Clicking newest state dropdown with current value: "${currentValue}"`);

  // Also log the dropdown's position and classes for debugging
  const formGroup = newestDropdown.closest('.form-group');
  if (formGroup) {
    console.log('Dropdown classes:', formGroup.className);
    console.log('Dropdown position:', formGroup.style.left);

    // Validate this is actually a state dropdown
    const isStateDropdown = formGroup.classList.contains(
      'zc-Registration_Record_Details-States-group'
    );
    const isFirstColumn = formGroup.style.left === '34px';

    console.log('Is state dropdown:', isStateDropdown);
    console.log('Is first column:', isFirstColumn);

    if (!isStateDropdown && !isFirstColumn) {
      console.warn('WARNING: This does not appear to be a state dropdown!');
      // Try to find the actual state dropdown in this row
      const row = newestDropdown.closest('div[elname="formRow"]');
      if (row) {
        const stateDropdownInRow = row.querySelector(
          '.zc-Registration_Record_Details-States-group .select2-choice'
        );
        if (stateDropdownInRow) {
          console.log('Found actual state dropdown in this row, switching to it');
          newestDropdown = stateDropdownInRow;
          const newChosenText = newestDropdown.querySelector('.select2-chosen');
          const newCurrentValue = newChosenText ? newChosenText.textContent.trim() : 'unknown';
          console.log(`Switched to correct dropdown with value: "${newCurrentValue}"`);
        }
      }
    }
  }

  // Try multiple approaches to open the dropdown
  console.log('Attempting to open dropdown with multiple methods...');

  try {
    // Method 1: Focus first, then click
    newestDropdown.focus();
    await sleep(100);

    // Method 2: Try different event types
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

    // Method 4: Direct click
    newestDropdown.click();
  } catch (error) {
    console.log('All click methods failed:', error);
  }

  // Wait and check if dropdown opened
  await sleep(500);

  const dropdownAfterClick = document.getElementById('select2-drop');
  if (dropdownAfterClick && !dropdownAfterClick.classList.contains('select2-display-none')) {
    console.log('SUCCESS: Dropdown opened after click');
  } else {
    console.log('FAILED: Dropdown did not open');

    // Debug: Check what dropdowns exist
    const allDropdowns = document.querySelectorAll('[id*="select2"], [class*="select2-drop"]');
    console.log('All select2 elements found:', allDropdowns.length);
    allDropdowns.forEach((el, i) => {
      console.log(`Dropdown ${i}:`, el.id, el.className, el.style.display);
    });
  }

  return true;
}

// Select a specific state from the open dropdown
async function selectStateFromDropdown(stateName) {
  await sleep(800); // Wait even longer for dropdown to open

  // First, check if ANY dropdown is actually visible
  console.log('Checking for ANY visible select2 dropdown...');

  // Check for the specific ID
  const dropdownCheck = document.getElementById('select2-drop');
  if (dropdownCheck) {
    console.log('Found select2-drop element');
    console.log('Dropdown classes:', dropdownCheck.className);
    console.log('Dropdown style display:', dropdownCheck.style.display);
    console.log(
      'Has select2-display-none class:',
      dropdownCheck.classList.contains('select2-display-none')
    );
    console.log(
      'Is visible:',
      !dropdownCheck.classList.contains('select2-display-none') &&
        dropdownCheck.style.display !== 'none'
    );
  } else {
    console.log('select2-drop element not found');
  }

  // Check for ANY visible select2 dropdown
  const anyVisibleDropdown = document.querySelector('.select2-drop:not(.select2-display-none)');
  if (anyVisibleDropdown) {
    console.log('Found visible dropdown with classes:', anyVisibleDropdown.className);
    console.log('Visible dropdown ID:', anyVisibleDropdown.id);
  } else {
    console.log('No visible select2 dropdown found');
  }

  // Check for select2 results containers
  const resultsContainers = document.querySelectorAll('.select2-results');
  console.log('Found', resultsContainers.length, 'select2-results containers');
  resultsContainers.forEach((container, i) => {
    console.log(`Results container ${i}: visible=${container.offsetParent !== null}`);
  });

  // Try multiple selectors for state options
  let stateOptions = [];

  // Method 1: Use the exact selectors you found, but try any visible dropdown
  let dropdownContainer = document.getElementById('select2-drop');

  // If the specific ID isn't found, try any visible dropdown
  if (!dropdownContainer || dropdownContainer.classList.contains('select2-display-none')) {
    dropdownContainer = document.querySelector('.select2-drop:not(.select2-display-none)');
    if (dropdownContainer) {
      console.log('Using alternative visible dropdown:', dropdownContainer.id || 'no-id');
    }
  }

  if (dropdownContainer && !dropdownContainer.classList.contains('select2-display-none')) {
    stateOptions = dropdownContainer.querySelectorAll(
      'li.select2-result-selectable .select2-result-label'
    );
    console.log(
      `Method 1 found dropdown container with ${stateOptions.length} options:`,
      Array.from(stateOptions).map((o) => o.textContent.trim())
    );
  } else {
    console.log('Method 1: No visible dropdown container found');
  }

  // Method 2: Alternative - look for any select2-results container
  if (stateOptions.length === 0) {
    const resultsContainer = document.querySelector('.select2-results');
    if (resultsContainer) {
      stateOptions = resultsContainer.querySelectorAll(
        'li.select2-result-selectable .select2-result-label'
      );
      console.log(
        `Method 2 found results container with ${stateOptions.length} options:`,
        Array.from(stateOptions).map((o) => o.textContent.trim())
      );
    } else {
      console.log('Method 2: select2-results container not found');
    }
  }

  // Method 3: Look for the exact structure you provided
  if (stateOptions.length === 0) {
    stateOptions = document.querySelectorAll(
      'li.select2-results-dept-0.select2-result.select2-result-selectable .select2-result-label'
    );
    console.log(
      `Method 3 found exact structure with ${stateOptions.length} options:`,
      Array.from(stateOptions).map((o) => o.textContent.trim())
    );
  }

  // Method 4: Look specifically for visible Select2 dropdowns with state-like options
  if (stateOptions.length === 0) {
    // Wait a bit more and try to find visible select2 dropdown
    await sleep(200);

    // Look for the specific dropdown using the exact ID you found
    const specificDropdown = document.getElementById('select2-drop');
    if (specificDropdown && !specificDropdown.classList.contains('select2-display-none')) {
      stateOptions = specificDropdown.querySelectorAll(
        'li.select2-result-selectable .select2-result-label'
      );
      console.log(
        `Method 4 found specific dropdown (ID: select2-drop) with ${stateOptions.length} options:`,
        Array.from(stateOptions).map((o) => o.textContent.trim())
      );

      // Check if these look like state options
      const optionTexts = Array.from(stateOptions).map((o) => o.textContent.trim());
      const hasStateOptions = optionTexts.some((text) => ALL_STATES.includes(text));

      if (!hasStateOptions) {
        console.log('Dropdown does not contain state options, skipping');
        stateOptions = [];
      } else {
        console.log('Found state options in dropdown!');
      }
    } else {
      console.log('select2-drop element not found or is hidden');
    }
  }

  // Method 5: Fallback to any role-based options (but filter out non-states)
  if (stateOptions.length === 0) {
    const allOptions = document.querySelectorAll('li[role="presentation"], div[role="option"]');
    const filteredOptions = Array.from(allOptions).filter((option) => {
      const text = option.textContent.trim();
      // Only include if it looks like a state name
      return (
        text.length > 2 &&
        text.length < 20 &&
        ![
          'List',
          'Calendar',
          'Timeline',
          'Print',
          'XLSX',
          'PDF',
          'HTML',
          'XML',
          'JSON',
          'CSV',
          'TSV',
          'Search',
          'Sort',
          'Group',
          'Hide',
        ].some((keyword) => text.includes(keyword))
      );
    });

    stateOptions = filteredOptions;
    console.log(
      `Method 5 found ${stateOptions.length} filtered options:`,
      Array.from(stateOptions).map((o) => o.textContent.trim())
    );
  }

  // Find the option that matches our target state
  const targetOption = Array.from(stateOptions).find(
    (option) => option.textContent.trim() === stateName
  );

  if (targetOption) {
    console.log(`Selecting state: ${stateName}`);

    // The actual clickable element might be the parent li, not the label
    const clickableElement = targetOption.closest('li') || targetOption;
    console.log('Clicking element:', clickableElement.tagName, clickableElement.className);

    try {
      // Try multiple click approaches for the exact structure you found
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

    await sleep(500); // Wait longer for selection to complete
    return true;
  } else {
    console.error(`State option not found: ${stateName}`);
    console.log(
      'Available options:',
      Array.from(stateOptions).map((o) => o.textContent.trim())
    );

    // Debug: Show what we're actually finding
    const dropdownContainer = document.getElementById('select2-drop');
    if (dropdownContainer) {
      console.log('Dropdown container found, checking contents...');
      console.log('Dropdown HTML:', dropdownContainer.innerHTML.substring(0, 500));
    }

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
  await sleep(1000);
  const rowsAfter = document.querySelectorAll('div[elname="formRow"]').length;
  console.log(`Rows after clicking Add New: ${rowsAfter}`);

  if (rowsAfter <= rowsBefore) {
    console.error('No new row was added - Add New button may not be working');
    return false;
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

  // Check if we're on the right page
  const addButton = document.querySelector('a[aria-label="Add New"]');
  if (!addButton) {
    alert(
      "This doesn't appear to be the Registration Record Details form. Please navigate to the form and try again."
    );
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
      await sleep(200);
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
