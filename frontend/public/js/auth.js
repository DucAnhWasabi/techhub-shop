const page = document.body.dataset.page;
const notice = document.querySelector('#notice');

async function api(path, method = 'GET', data) {
  const headers = { Accept: 'application/json' };
  const options = { method, headers, credentials: 'same-origin' };
  if (!['GET', 'HEAD'].includes(method)) {
    const csrf = await fetch('/api/auth/csrf', { credentials: 'same-origin' }).then((r) => r.json());
    headers['Content-Type'] = 'application/json';
    headers['X-CSRF-Token'] = csrf.csrfToken;
    options.body = JSON.stringify(data || {});
  }
  const response = await fetch(path, options);
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Không thể thực hiện yêu cầu.');
  return result;
}

function show(message, isError = false) {
  notice.textContent = message;
  notice.className = `alert ${isError ? 'alert-danger' : 'alert-success'}`;
}

const form = document.querySelector('form');
form?.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!form.reportValidity()) return;
  const value = (id) => document.querySelector(`#${id}`)?.value || '';
  try {
    if (page === 'register') {
      await api('/api/auth/register', 'POST', {
        email: value('email'), fullName: value('fullName'), address: value('address'), password: value('password')
      });
      window.location.assign('/account');
    } else if (page === 'login') {
      await api('/api/auth/login', 'POST', { email: value('email'), password: value('password') });
      window.location.assign('/account');
    } else if (page === 'forgot') {
      const result = await api('/api/auth/forgot-password', 'POST', { email: value('email') });
      show(result.message);
    } else if (page === 'reset') {
      const result = await api('/api/auth/reset-password', 'POST', {
        token: new URLSearchParams(window.location.search).get('token'), newPassword: value('password')
      });
      show(result.message);
    }
  } catch (error) { show(error.message, true); }
});

if (page === 'login') {
  fetch('/api/auth/providers').then((response) => response.json()).then((providers) => {
    const links = [...document.querySelectorAll('#oauth-buttons a')];
    let enabled = false;
    for (const link of links) {
      const provider = link.href.includes('/google') ? 'google' : 'facebook';
      if (!providers[provider]) link.remove(); else enabled = true;
    }
    if (!enabled) document.querySelector('#oauth-note')?.classList.remove('d-none');
  }).catch(() => {});
}
