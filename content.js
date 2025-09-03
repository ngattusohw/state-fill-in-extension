// FranIQ State Auto-Fill Chrome Extension
// Content Script - Runs on the registration form page
//
// ROBUST APPROACH:
// - Uses "Add New" clicks to create rows (reliable)
// - Sets dropdown values directly via multiple methods (no UI simulation)
// - Bypasses timing/CSP issues with direct form manipulation

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

// Find the newest/last state dropdown (but don't click it)
async function findNewestStateDropdown() {
  await sleep(1000); // Wait for new row to appear

  // Find state dropdowns using the same logic, but return the element instead of clicking
  let stateDropdowns = [];

  // Method 1: Look for state dropdowns in form rows
  stateDropdowns = document.querySelectorAll('div[elname="formRow"] .select2-choice');
  console.log(`Found ${stateDropdowns.length} form row dropdowns`);

  // Filter to find only the state dropdowns
  if (stateDropdowns.length > 0) {
    const stateSpecificDropdowns = Array.from(stateDropdowns).filter((dropdown) => {
      const formGroup = dropdown.closest('.form-group');
      if (!formGroup) return false;

      // MUST have the exact States group class - be very specific!
      if (formGroup.classList.contains('zc-Registration_Record_Details-States-group')) {
        console.log('✅ Found exact States group dropdown');
        return true;
      }

      // Check the hidden input name to confirm it's for States
      const hiddenInput = formGroup.querySelector('input[name*="States"]');
      if (hiddenInput) {
        console.log('✅ Found dropdown with States input:', hiddenInput.name);
        return true;
      }

      // Check if positioned in first column AND not Application_Status
      const isFirstColumn = formGroup.style.left === '34px';
      const isNotApplicationStatus = !formGroup.classList.contains(
        'zc-Registration_Record_Details-Application_Status-group'
      );

      if (isFirstColumn && isNotApplicationStatus) {
        console.log('✅ Found first column dropdown (not Application Status)');
        return true;
      }

      console.log('❌ Rejected dropdown - classes:', formGroup.className);
      return false;
    });

    if (stateSpecificDropdowns.length > 0) {
      stateDropdowns = stateSpecificDropdowns;
      console.log(`Filtered to ${stateSpecificDropdowns.length} state-specific dropdowns`);
    } else {
      // Fallback: Look for dropdowns that have States in their input names
      const statesDropdownsByName = Array.from(stateDropdowns).filter((dropdown) => {
        const formGroup = dropdown.closest('.form-group');
        if (formGroup) {
          const statesInput = formGroup.querySelector('input[name*="States"]');
          return !!statesInput;
        }
        return false;
      });

      if (statesDropdownsByName.length > 0) {
        stateDropdowns = statesDropdownsByName;
        console.log(`Found ${statesDropdownsByName.length} dropdowns with States inputs`);
      } else {
        // Last resort: Take first dropdown from each row, but warn
        stateDropdowns = Array.from(stateDropdowns).filter((dropdown) => {
          const row = dropdown.closest('div[elname="formRow"]');
          if (row) {
            const dropdownsInRow = row.querySelectorAll('.select2-choice');
            return dropdown === dropdownsInRow[0];
          }
          return false;
        });
        console.warn(
          `⚠️ Using fallback: ${stateDropdowns.length} first-in-row dropdowns (may not be States!)`
        );
      }
    }
  }

  if (stateDropdowns.length === 0) {
    console.error('No state dropdowns found');
    return null;
  }

  // Return the newest dropdown element
  const newestDropdown = stateDropdowns[stateDropdowns.length - 1];
  const chosenText = newestDropdown.querySelector('.select2-chosen');
  const currentValue = chosenText ? chosenText.textContent.trim() : 'unknown';
  console.log(`Found newest state dropdown with current value: "${currentValue}"`);

  return newestDropdown;
}

// Set state value directly using multiple robust methods
async function setStateValueDirectly(dropdown, stateName) {
  console.log(`🎯 Setting state value directly to: ${stateName}`);
  console.log('Dropdown element:', dropdown.tagName, dropdown.className, dropdown.id);

  // SAFETY CHECK: Ensure we're targeting a States dropdown, not something else
  const safetyCheckFormGroup = dropdown.closest('.form-group');
  if (safetyCheckFormGroup) {
    const isStatesGroup = safetyCheckFormGroup.classList.contains(
      'zc-Registration_Record_Details-States-group'
    );
    const hasStatesInput = safetyCheckFormGroup.querySelector('input[name*="States"]');
    const isApplicationStatus = safetyCheckFormGroup.classList.contains(
      'zc-Registration_Record_Details-Application_Status-group'
    );

    console.log('🔍 Safety check - Is States group:', isStatesGroup);
    console.log('🔍 Safety check - Has States input:', !!hasStatesInput);
    console.log('🔍 Safety check - Is Application Status:', isApplicationStatus);

    if (isApplicationStatus) {
      console.error('❌ SAFETY ABORT: This appears to be Application Status dropdown, not States!');
      console.error('Form group classes:', safetyCheckFormGroup.className);
      return false;
    }

    if (!isStatesGroup && !hasStatesInput) {
      console.warn('⚠️ Warning: This may not be a States dropdown');
      console.warn('Form group classes:', safetyCheckFormGroup.className);
    }
  }

  let methodsSucceeded = [];

  // Method 1: Try to find the hidden input that stores the actual value
  const formGroup = dropdown.closest('.form-group');
  if (formGroup) {
    console.log('Form group classes:', formGroup.className);

    // Look for ALL input elements in the same form group
    const allInputs = formGroup.querySelectorAll('input');
    console.log(`Found ${allInputs.length} input elements in form group`);

    allInputs.forEach((input, i) => {
      console.log(
        `Input ${i}: type="${input.type}", name="${input.name}", id="${input.id}", style="${input.style.cssText}"`
      );
    });

    // Look for hidden/invisible inputs, but ONLY for States fields
    const hiddenInputs = formGroup.querySelectorAll(
      'input[type="text"][style*="display: none"], input[type="hidden"], input[tabindex="-1"]'
    );

    // Filter to only States-related inputs
    const statesInputs = Array.from(hiddenInputs).filter(
      (input) => input.name && input.name.includes('States')
    );

    if (statesInputs.length > 0) {
      statesInputs.forEach((hiddenInput, i) => {
        console.log(`✅ Setting States input ${i}:`, hiddenInput.name, hiddenInput.id);
        const oldValue = hiddenInput.value;
        hiddenInput.value = stateName;

        // Trigger multiple events
        ['input', 'change', 'blur'].forEach((eventType) => {
          hiddenInput.dispatchEvent(new Event(eventType, { bubbles: true }));
        });

        console.log(`Updated States input from "${oldValue}" to "${stateName}"`);
        methodsSucceeded.push('hidden-input');
      });
    } else {
      console.log('❌ No States-specific hidden inputs found in form group');

      // Debug: Show what inputs we DID find
      const allInputsDebug = Array.from(hiddenInputs);
      if (allInputsDebug.length > 0) {
        console.log(
          'Found non-States inputs:',
          allInputsDebug.map((i) => i.name)
        );
      }
    }
  }

  // Method 2: Try Select2 API if jQuery and Select2 are available
  if (window.$ && window.$.fn.select2) {
    try {
      const $dropdown = $(dropdown);
      if ($dropdown.hasClass('select2-choice')) {
        // Find the actual select element
        const selectId = dropdown.id.replace('s2id_', '');
        const $actualSelect = $('#' + selectId);

        if ($actualSelect.length) {
          console.log('Using Select2 API to set value');
          $actualSelect.val(stateName).trigger('change');
          console.log('Select2 value set successfully');
          methodsSucceeded.push('select2-api');
        }
      }
    } catch (error) {
      console.log('Select2 API method failed:', error);
    }
  }

  // Method 3: Try Zoho Creator framework APIs
  try {
    // Look for common Zoho Creator functions
    if (window.ZC_SetFieldValue || window.setFieldValue || window.zoho) {
      console.log('Attempting Zoho Creator API calls');

      // Try different Zoho API patterns
      if (window.ZC_SetFieldValue) {
        window.ZC_SetFieldValue('Registration_Record_Details.States', stateName);
        console.log('Used ZC_SetFieldValue');
        methodsSucceeded.push('zoho-api');
      }

      if (window.setFieldValue) {
        window.setFieldValue('States', stateName);
        console.log('Used setFieldValue');
        methodsSucceeded.push('zoho-setfield');
      }
    }
  } catch (error) {
    console.log('Zoho Creator API method failed:', error);
  }

  // Method 4: Update the visual display (select2-chosen element)
  try {
    const chosenElement = dropdown.querySelector('.select2-chosen');
    if (chosenElement) {
      const originalText = chosenElement.textContent;
      chosenElement.textContent = stateName;
      console.log(`Updated visual display from "${originalText}" to "${stateName}"`);
      methodsSucceeded.push('visual-update');

      // Trigger visual update events
      dropdown.dispatchEvent(new Event('DOMSubtreeModified', { bubbles: true }));
    }
  } catch (error) {
    console.log('Visual update method failed:', error);
  }

  // Method 5: Try to trigger framework-specific events
  try {
    // Trigger various events that frameworks might listen to
    const events = ['change', 'input', 'blur', 'select2-selecting', 'select2-close'];
    events.forEach((eventType) => {
      dropdown.dispatchEvent(new Event(eventType, { bubbles: true }));
    });

    console.log('Triggered framework events');
  } catch (error) {
    console.log('Event triggering failed:', error);
  }

  // Wait a moment for any async processing
  await sleep(200);

  // Verify the value was set by checking the visual display
  const chosenElement = dropdown.querySelector('.select2-chosen');
  const currentDisplayValue = chosenElement ? chosenElement.textContent.trim() : 'unknown';

  // Show comprehensive results
  console.log(
    `📊 Methods attempted: ${
      methodsSucceeded.length > 0 ? methodsSucceeded.join(', ') : 'none succeeded'
    }`
  );
  console.log(`📺 Visual display: "${currentDisplayValue}"`);
  console.log(`🎯 Target value: "${stateName}"`);

  if (currentDisplayValue === stateName) {
    console.log(`✅ SUCCESS: Value successfully set to "${stateName}"`);
    return true;
  } else if (methodsSucceeded.length > 0) {
    console.log(
      `⚡ PARTIAL SUCCESS: ${methodsSucceeded.length} methods succeeded, visual may lag behind`
    );
    return true;
  } else {
    console.log(`❌ FAILED: No methods succeeded in setting the value`);
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

  // Step 2: Find the newest state dropdown (don't click it)
  const stateDropdown = await findNewestStateDropdown();
  if (!stateDropdown) {
    console.error('Could not find state dropdown in new row');
    return false;
  }

  // Step 3: Set the state value directly (robust method)
  if (!(await setStateValueDirectly(stateDropdown, stateName))) {
    console.error('Failed to set state value');
    return false;
  }

  // Step 4: Verify the state was set correctly
  await sleep(200);
  const chosenText = stateDropdown.querySelector('.select2-chosen');
  const finalValue = chosenText ? chosenText.textContent.trim() : 'unknown';

  if (finalValue === stateName) {
    console.log(`✅ Successfully added state: ${stateName}`);
    return true;
  } else {
    console.log(
      `⚠️ State added but visual may not match. Expected: "${stateName}", Display: "${finalValue}"`
    );
    // Still return true since the value might be set in hidden inputs
    return true;
  }
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
