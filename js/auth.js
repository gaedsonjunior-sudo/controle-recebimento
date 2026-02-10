async function login(){
const email=email=document.getElementById('email').value;
const password=document.getElementById('password').value;
const {error}=await supabase.auth.signInWithPassword({email,password});
if(error){document.getElementById('error').innerText=error.message}
else{window.location='dashboard.html'}
}