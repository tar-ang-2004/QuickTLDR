interface SummaryResponse {
  tldr: string[];
  facts: string[];
  actions: string[];
  numbers: string[];
  quotes: string[];
}

const summarizeBtn = document.getElementById('summarize-btn') as HTMLButtonElement;
const loading = document.getElementById('loading') as HTMLElement;
const output = document.getElementById('output') as HTMLElement;
const error = document.getElementById('error') as HTMLElement;

summarizeBtn.addEventListener('click', async () => {
  summarizeBtn.disabled = true;
  loading.classList.remove('hidden');
  output.classList.add('hidden');
  error.classList.add('hidden');

  try {
    const response = await chrome.runtime.sendMessage({
      type: 'SUMMARIZE_TAB'
    });

    if (!response) {
      throw new Error('No response from background');
    }

    if (response.type === 'ERROR') {
      throw new Error(response.message || 'Failed to summarize tab');
    }

    if (response.type === 'SUMMARY_RESPONSE' && response.data) {
      renderSummary(response.data);
    } else if (response.data) {
      renderSummary(response.data);
    } else {
      throw new Error('Invalid response from background');
    }
  } catch (err) {
    showError(err instanceof Error ? err.message : 'Failed to summarize tab');
  } finally {
    loading.classList.add('hidden');
    summarizeBtn.disabled = false;
  }
});

function renderSummary(summary: SummaryResponse): void {
  if (!summary) {
    showError('No summary received');
    return;
  }

  output.innerHTML = '';
  output.classList.remove('hidden');

  if (summary.tldr?.length) {
    appendSection('TL;DR', summary.tldr);
  }

  if (summary.facts?.length) {
    appendSection('Key Facts', summary.facts);
  }

  if (summary.actions?.length) {
    appendSection('Action Items', summary.actions);
  }

  if (summary.numbers?.length) {
    appendSection('Numbers', summary.numbers);
  }

  if (summary.quotes?.length) {
    appendSection('Notable Quotes', summary.quotes);
  }
}

function appendSection(title: string, items: string[]): void {
  const section = document.createElement('div');
  section.className = 'section';

  const heading = document.createElement('h3');
  heading.textContent = title;
  section.appendChild(heading);

  const list = document.createElement('ul');
  items.forEach(item => {
    const li = document.createElement('li');
    li.textContent = item;
    list.appendChild(li);
  });
  section.appendChild(list);

  output.appendChild(section);
}

function showError(message: string): void {
  error.textContent = message;
  error.classList.remove('hidden');
  output.classList.add('hidden');
}
