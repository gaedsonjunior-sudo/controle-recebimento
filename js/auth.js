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

  const { data: profile, error: profileError } =
    await window.supabaseClient
      .from('profiles')
      .select('role')
      .eq('id', data.user.id)
      .single();

  if (profileError || !profile) {
    errorEl.innerText = 'Perfil do usuário não encontrado.';
    return;
  }

  window.location.href =
    profile.role === 'admin'
      ? 'admin.html'
      : 'dashboard.html';
}
