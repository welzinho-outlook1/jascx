const { createApp } = Vue;

createApp({
  data() {
    return {
      user: '',
      pass: '',
      showPass: false,
      loading: false,
      serverErrors: window.__ADMIN_LOGIN_ERRORS || [],
      clientErrors: []
    }
  },
  methods: {
    onSubmit(e) {
      this.clientErrors = [];
      if (!this.user) this.clientErrors.push('O usuário é obrigatório.');
      if (!this.pass) this.clientErrors.push('A senha é obrigatória.');
      if (this.clientErrors.length) return;

      this.loading = true;

      // Try to use the event target (form) first, fallback to querySelector
      try {
        const form = (e && (e.target || e.currentTarget)) || document.querySelector('#admin-login-app form');
        if (!form) throw new Error('Formulário não encontrado');
        // Use the native submit to avoid re-triggering Vue handlers
        form.submit();
      } catch (err) {
        // If something goes wrong, restore state and show a helpful message
        console.error('Erro ao submeter o formulário de login:', err);
        this.loading = false;
        this.clientErrors.push('Não foi possível enviar o formulário. Atualize a página e tente novamente.');
      }
    }
  }
}).mount('#admin-login-app');

// Format server-provided last-login timestamp (if any) using the client's timezone
(function renderLastLogin() {
  const el = document.querySelector('.alert-time[data-last-ts]');
  if (!el) return;
  const ts = parseInt(el.getAttribute('data-last-ts'), 10);
  if (!ts) return;
  const d = new Date(ts * 1000);
  const formatted = d.toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false
  });
  const span = el.querySelector('.js-last-login');
  if (span) span.textContent = formatted;
  else el.textContent = 'Último login: ' + formatted;
})();
