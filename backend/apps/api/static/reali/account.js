(() => {
  "use strict";

  const token = new URLSearchParams(window.location.hash.slice(1)).get("token");
  const activation = document.querySelector("main").dataset.mode === "activate";
  const status = document.getElementById("status");
  const passwordForm = document.getElementById("password-form");
  const loginForm = document.getElementById("login-form");
  const existing = document.getElementById("existing-account");
  const activationPath = "/api/v1/auth/invitations/activate/";

  window.addEventListener("hashchange", () => {
    if (window.location.hash) window.location.reload();
  });
  window.history.replaceState(null, "", window.location.pathname);

  async function post(path, body, access) {
    const headers = { "Content-Type": "application/json" };
    if (access) headers.Authorization = "Bearer " + access;
    const response = await fetch(path, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      cache: "no-store",
      credentials: "omit",
      referrerPolicy: "no-referrer",
    });
    return { ok: response.ok, data: response.status === 204 ? {} : await response.json() };
  }

  function showLogin() {
    passwordForm.reset();
    passwordForm.hidden = true;
    existing.hidden = true;
    loginForm.hidden = false;
    status.textContent = "Entre com a conta convidada para concluir o vínculo.";
    loginForm.elements.email.focus();
  }

  function success(form) {
    form.reset();
    form.hidden = true;
    if (existing) existing.hidden = true;
    status.textContent = activation
      ? "Convite aceito. Você já pode usar o aplicativo Reali."
      : "Senha atualizada. Entre novamente no aplicativo Reali.";
  }

  function showError(data) {
    const errors = [data.token, data.password_confirmation, data.password, data.detail].flat();
    status.textContent = errors.find(value => typeof value === "string") || "Não foi possível continuar. Verifique o link e tente novamente.";
  }

  function submit(form, handle) {
    form.addEventListener("submit", async event => {
      event.preventDefault();
      const button = form.querySelector("button");
      button.disabled = true;
      try {
        await handle(Object.fromEntries(new FormData(form)));
      } catch {
        status.textContent = "Não foi possível completar a solicitação. Tente novamente.";
      } finally {
        button.disabled = false;
      }
    });
  }

  async function start() {
    if (!token) {
      status.textContent = "Abra o link completo recebido por e-mail.";
      return;
    }
    if (activation) {
      const verification = await post("/api/v1/auth/invitations/verify/", { token });
      if (!verification.ok) {
        showError(verification.data);
        return;
      }
      existing.hidden = false;
      existing.addEventListener("click", showLogin);
      submit(loginForm, async credentials => {
        const session = await post("/api/v1/auth/login/", credentials);
        if (!session.ok) {
          showError(session.data);
          return;
        }
        try {
          const result = await post(activationPath, { token }, session.data.access);
          if (result.ok) success(loginForm);
          else showError(result.data);
        } finally {
          // This browser session is used only to authorize the invitation.
          await post("/api/v1/auth/logout/", { refresh: session.data.refresh }).catch(() => {});
        }
      });
    }
    passwordForm.hidden = false;
    submit(passwordForm, async fields => {
      const path = activation ? activationPath : "/api/v1/auth/password-reset/confirm/";
      const result = await post(path, { token, ...fields });
      if (result.ok) success(passwordForm);
      else if (activation && result.data.code === "login_required") showLogin();
      else showError(result.data);
    });
  }

  start().catch(() => {
    status.textContent = "Não foi possível verificar o link. Abra novamente o e-mail e tente mais tarde.";
  });
})();
