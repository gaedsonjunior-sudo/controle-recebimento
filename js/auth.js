async function login(event) {
  event.preventDefault();

  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  const errorEl = document.getElementById('error');
  errorEl.innerText = '';

  const { data, error } =
    await window.supabaseClient.auth.signInWithPassword({
      email,
      password
    });

  if (error) {
    errorEl.innerText = error.message;
    return;
  }

  const { data: profile } =
    await window.supabaseClient
      .from('profiles')
      .select('role')
      .eq('id', data.user.id)
      .single();

  if (!profile) {
    errorEl.innerText = 'Perfil não encontrado';
    return;
  }

  localStorage.setItem('role', profile.role);
  window.location.href = 'dashboard.html';
}
