const API_URL = "http://localhost:3000";

document.getElementById("registerForm").addEventListener("submit", async function (e) {
  e.preventDefault();

  const name     = document.getElementById("nombre").value.trim();
  const email    = document.getElementById("correo").value.trim();
  const password = document.getElementById("nuevaPassword").value;
  const btnSubmit = e.target.querySelector("button[type='submit']");
  const errorDiv  = document.getElementById("registerError");

  if (errorDiv) errorDiv.textContent = "";

  btnSubmit.disabled = true;
  btnSubmit.textContent = "Registrando...";

  try {
    const res = await fetch(`${API_URL}/auth/register`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ name, email, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || "Error al registrarse");
    }

    alert(`¡Registro exitoso! Bienvenido/a ${data.user.name}. Ahora inicia sesión.`);
    window.location.href = "login.html";

  } catch (err) {
    if (errorDiv) {
      errorDiv.textContent = err.message;
    } else {
      alert(err.message);
    }
    btnSubmit.disabled = false;
    btnSubmit.textContent = "Registrarme";
  }
});