function mostrarSweetAlertSuccess() {
  swal('¡Email sent!', 'Check your email inbox to reset your password.', 'success').then(function () {
    window.location.href = '/';
  });
}
function mostrarSweetAlertError() {
  swal('¡Email not registered!', 'Complete the registration form and once registered enter Login', 'error').then(function () {
    window.location.href = '/register';
  });
}
function submitForm(event) {
  event.preventDefault();

  const email = document.getElementById('email').value;

  fetch(`/api/session/useradmin/resetPassByEmail?email=${email}`, {
    method: 'GET',
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.success) {
        mostrarSweetAlertSuccess();
      } else {
        mostrarSweetAlertError();
      }
    })
    .catch((error) => {
      console.error('Error:', error);
    });
}
