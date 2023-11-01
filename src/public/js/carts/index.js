const socket = io();
const deleteCartRow = (pid) => {
  console.log('pid', pid);
  const documentRow = document.getElementById(pid);
  if (documentRow) {
    documentRow.remove();
  }
};
const updateTotalCartProducts = (total) => {
  const totalProductosCarrito = document.getElementById('totalProductosCarrito');
  if (totalProductosCarrito) {
    totalProductosCarrito.textContent = total;
  }
};
socket.on('deleteCartProduct', deleteCartRow);
socket.on('updateTotalCartProducts', updateTotalCartProducts);

const cartDivId = document.getElementById('cartDivId');
const cartId = cartDivId.getAttribute('data-cart-id');
console.log('cartIdDiv', cartId);

const deleteCartProduct = (pid) => {
  console.log('pid', pid);
  fetch(`/api/carts/${cartId}/product/${pid}`, {
    method: 'DELETE',
  })
    .then((response) => {
      if (response.ok) {
        socket.emit('deleteCartProduct', pid);
        console.log('delete running');
      } else {
        console.error('Error deleting product');
      }
    })
    .catch((error) => {
      console.error('Error deleting product:', error);
    });
};
function mostrarSweetAlert() {
  swal('Purchase made!', 'Check your email inbox for details.', 'success').then(function () {
    window.location.href = '/products';
  });
}
document.querySelector('form[action$="/purchasecart"]').addEventListener('submit', function (event) {
  event.preventDefault();
  fetch(this.action, {
    method: 'POST',
    body: new FormData(this),
  })
    .then((response) => {
      if (response.ok) {
        mostrarSweetAlert();
      } else {
        swal('Error', 'There was a problem when making the purchase. Try it again later.', 'error');
      }
    })
    .catch((error) => {
      swal('Error', 'There was a problem when making the purchase. Try it again later.', 'error');
    });
});
