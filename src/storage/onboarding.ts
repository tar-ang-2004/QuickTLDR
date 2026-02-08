const ONBOARDING_KEY = 'onboardingComplete';

export async function isOnboardingComplete(): Promise<boolean> {
  return new Promise((resolve) => {
    chrome.storage.local.get([ONBOARDING_KEY], (result) => {
      if (chrome.runtime.lastError) {
        console.warn('Failed to check onboarding status:', chrome.runtime.lastError);
        resolve(false);
        return;
      }
      
      resolve(result[ONBOARDING_KEY] === true);
    });
  });
}

export async function markOnboardingComplete(): Promise<void> {
  return new Promise((resolve, reject) => {
    chrome.storage.local.set({ [ONBOARDING_KEY]: true }, () => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      
      resolve();
    });
  });
}
