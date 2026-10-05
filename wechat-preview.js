const chat = document.querySelector('#chat');
const form = document.querySelector('#previewForm');
const input = document.querySelector('#question');

function escapeHtml(value = '') {
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function message(text, type) {
  const wrapper = document.createElement('div');
  wrapper.className = `message ${type}`;
  wrapper.innerHTML = type === 'received'
    ? `<span class="avatar">W</span><p>${escapeHtml(text)}</p>`
    : `<p>${escapeHtml(text)}</p>`;
  chat.append(wrapper);
  chat.scrollTop = chat.scrollHeight;
}

function queueNote(text) {
  const note = document.createElement('div');
  note.className = 'queue-note';
  note.textContent = text;
  chat.append(note);
  chat.scrollTop = chat.scrollHeight;
}

async function testQuestion(question) {
  if (!question.trim()) return;
  message(question.trim(), 'sent');
  input.value = '';
  input.disabled = true;
  try {
    const response = await fetch('/api/wechat-official?action=preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || '测试失败');
    window.setTimeout(() => {
      message(data.answer, 'received');
      if (data.queued) queueNote('已模拟进入统一任务队列 · 未保存任何内容');
    }, 260);
  } catch (error) {
    message(`暂时无法完成测试：${error.message}`, 'received');
  } finally {
    input.disabled = false;
    input.focus();
  }
}

form.addEventListener('submit', event => {
  event.preventDefault();
  testQuestion(input.value);
});

document.querySelector('#quickQuestions').addEventListener('click', event => {
  if (event.target.matches('button')) testQuestion(event.target.textContent);
});
