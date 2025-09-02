// FranIQ State Auto-Fill Chrome Extension
// Popup Script - Handles popup interactions

document.addEventListener('DOMContentLoaded', function () {
  const autoFillBtn = document.getElementById('autoFillBtn');
  const status = document.getElementById('status');
  const btnIcon = document.getElementById('btnIcon');
  const btnText = document.getElementById('btnText');

  // Show status message
  function showStatus(message, type = 'info') {
    status.textContent = message;
    status.className = `status ${type}`;
    status.style.display = 'block';

    // Auto-hide after 5 seconds for success/error messages
    if (type === 'success' || type === 'error') {
      setTimeout(() => {
        status.style.display = 'none';
      }, 5000);
    }
  }

  // Set button loading state
  function setButtonLoading(loading) {
    autoFillBtn.disabled = loading;

    if (loading) {
      btnIcon.innerHTML = '<div class="spinner"></div>';
      btnText.textContent = 'Processing...';
    } else {
      btnIcon.innerHTML = '🚀';
      btnText.textContent = 'Auto-Fill All States';
    }
  }

  // Check if current tab is valid for the extension
  async function checkCurrentTab() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      // Check if URL contains Zoho Creator domains or any common FranIQ patterns
      const validDomains = [
        'creatorapp.zoho.com',
        'creatorl.zohopublic.com',
        'creator.zoho.com',
        'zoho.com',
      ];

      const isValidDomain = validDomains.some((domain) => tab.url.includes(domain));

      // For debugging - show the current URL in console
      console.log('Current URL:', tab.url);
      console.log('Valid domain check:', isValidDomain);

      // Special handling for iframe embedded forms
      if (tab.url.includes('crm.zoho.com') && tab.url.includes('CustomTab')) {
        console.log('Detected CRM iframe embedded form');
        showStatus('Detected iframe embedded form - extension will work inside iframe', 'info');
        return tab; // Allow CRM pages with embedded Creator forms
      }

      if (!isValidDomain) {
        // Temporary bypass for testing - allow any domain with confirmation
        const bypassConfirm = confirm(
          `Not on expected Zoho domain (${
            new URL(tab.url).hostname
          }). Try anyway? (This might not work)`
        );
        if (!bypassConfirm) {
          showStatus(`Not on Zoho domain. Current: ${new URL(tab.url).hostname}`, 'error');
          autoFillBtn.disabled = true;
          return false;
        } else {
          showStatus('Bypassing domain check...', 'info');
        }
      }

      return tab;
    } catch (error) {
      console.error('Error checking current tab:', error);
      showStatus('Error: Unable to access current tab.', 'error');
      return false;
    }
  }

  // Main auto-fill function
  async function triggerAutoFill() {
    setButtonLoading(true);
    showStatus('Checking current page...', 'info');

    try {
      const tab = await checkCurrentTab();
      if (!tab) {
        setButtonLoading(false);
        return;
      }

      showStatus('Starting auto-fill process...', 'info');

      // First try to inject the content script if it's not already loaded
      try {
        if (chrome.scripting && chrome.scripting.executeScript) {
          await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['content.js'],
          });
          await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait for script to load
        }
      } catch (error) {
        console.log('Content script injection failed:', error);
      }

      // Send message to content script
      const response = await chrome.tabs.sendMessage(tab.id, {
        action: 'autoFillStates',
      });

      if (response && response.success) {
        showStatus('Auto-fill process initiated! Check the page for progress.', 'success');
      } else {
        showStatus('Failed to start auto-fill process.', 'error');
      }
    } catch (error) {
      console.error('Error during auto-fill:', error);

      if (error.message.includes('Could not establish connection')) {
        showStatus('Please refresh the page and try again.', 'error');
      } else {
        showStatus(`Error: ${error.message}`, 'error');
      }
    } finally {
      setButtonLoading(false);
    }
  }

  // Event listeners
  autoFillBtn.addEventListener('click', triggerAutoFill);

  // Initialize - check current tab on popup open
  checkCurrentTab().then((tab) => {
    if (tab) {
      showStatus('Ready! Click the button to auto-fill all states.', 'info');
    }
  });

  // Listen for messages from content script (optional feedback)
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'updatePopupStatus') {
      showStatus(request.message, request.type || 'info');
    }
  });
});

// Add some helpful keyboard shortcuts
document.addEventListener('keydown', function (event) {
  // Press 'Enter' or 'Space' to trigger auto-fill
  if (
    (event.key === 'Enter' || event.key === ' ') &&
    !document.getElementById('autoFillBtn').disabled
  ) {
    event.preventDefault();
    document.getElementById('autoFillBtn').click();
  }
});
