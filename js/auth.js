async function login() {
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

  // busca o perfil do usuário
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

  // redirecionamento automático
  if (profile.role === 'admin') {
    window.location.href = 'admin.html';
  } else {
    window.location.href = 'dashboard.html';
  }
}
