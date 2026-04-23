const API_URL = "http://localhost:3000";

document.getElementById("loginForm").addEventListener("submit", async function (e) {
  e.preventDefault();

  const email    = document.getElementById("usuario").value.trim();
  const password = document.getElementById("password").value;
  const btnSubmit = e.target.querySelector("button[type='submit']");
  const errorDiv  = document.getElementById("loginError");

  if (errorDiv) errorDiv.textContent = "";

  btnSubmit.disabled = true;
  btnSubmit.textContent = "Entrando...";

  try {
    const res = await fetch(`${API_URL}/auth/login`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ email, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || "Credenciales incorrectas");
    }

    localStorage.setItem("token", data.token);
    localStorage.setItem("user",  JSON.stringify(data.user));

    if (data.user.role === "ADMIN") {
      window.location.href = "inicio.html";
    } else {
      window.location.href = "inicio.html";
    }

  } catch (err) {
    if (errorDiv) {
      errorDiv.textContent = err.message;
    } else {
      alert(err.message);
    }
    btnSubmit.disabled = false;
    btnSubmit.textContent = "Entrar";
  }
});