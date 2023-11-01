const socket = io();
const addOrUpdateProductRow = (product) => {
  console.log('product');
  const productRow = `
    <tr id="${product._id}">
      <td>${product._id}</td>
      <td>${product.title}</td>
      <td>${product.description}</td>
      <td>${product.code}</td>
      <td>${product.price}</td>
      <td>${product.stock}</td>
      <td>${product.category}</td>
      <td>${product.thumbnails}</td>
      <td>${product.owner}</td>
      <td>
        <button class="btn btn-danger btn-sm" onclick="deleteProduct('${product._id}')">Delete</button>
      </td>
    </tr>
  `;
  const productTable = document.getElementById('product-table');
  const existingRow = document.getElementById(product._id);
  if (existingRow) {
    existingRow.innerHTML = productRow;
  } else {
    productTable.insertAdjacentHTML('beforeend', productRow);
  }
};
const deleteProductRow = (productId) => {
  const productRow = document.getElementById(productId);
  if (productRow) {
    productRow.remove();
  }
};
socket.on('newProduct', addOrUpdateProductRow);
socket.on('updateProduct', addOrUpdateProductRow);
socket.on('deleteProduct', deleteProductRow);
socket.on('totalProductsUpdate', (totalProducts) => {
  document.getElementById('totalProductsValue').innerText = totalProducts;
});
document.addEventListener('DOMContentLoaded', () => {
  const productForm = document.getElementById('productForm');
  productForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(productForm);

    for (const entry of formData.entries()) {
      const [name, value] = entry;
      console.log(`Campo: ${name}, Valor: ${value}`);
    }
    const response = await fetch('/api/products', {
      method: 'POST',
      body: formData,
    });
    if (response.ok) {
      console.log('Product successfully added');
      productForm.reset();
    } else {
      const error = await response.json();
      console.error('Error adding product:', error);
    }
  });
});
const deleteProduct = (id) => {
  fetch(`/api/products/${id}`, {
    method: 'DELETE',
  })
    .then((response) => {
      if (response.ok) {
        socket.emit('deleteProduct', id);
      } else {
        console.error('Error deleting product');
      }
    })
    .catch((error) => {
      console.error('Error deleting product:', error);
    });
};
const productUpdateForm = document.getElementById('productUpdate');
productUpdateForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const formData = new FormData(productUpdateForm);
  const productId = formData.get('_id');
  console.log('Product ID', productId);
  if (!productId) {
    console.error('No valid product ID provided');
    return;
  }
  formData.delete('_id');

  const fileData = new FormData();
  for (const [name, value] of formData.entries()) {
    if (value !== '') {
      if (name === 'image') {
        const files = productUpdateForm.querySelector('input[name="image"]').files;
        for (const file of files) {
          fileData.append('image', file);
        }
      } else {
        fileData.append(name, value);
      }
    }
  }
  const response = await fetch(`/api/products/${productId}`, {
    method: 'PUT',
    body: fileData,
  });

  if (response.ok) {
    console.log('Product updated successfully');
    productUpdateForm.reset();
    const error = await response.json();
    console.error('Error updating product:', error);
  }
});
const mockingButton = document.getElementById('mockingButton');
mockingButton.addEventListener('click', async (e) => {
  e.preventDefault(); 
  try {
    const response = await fetch('/mockingproducts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        roles: ['ADMIN'],
      }),
    });
    if (response.ok) {
      swal('Products successfully created with Faker!', 'Re-enter "Manage Products" from the Admin dashboard to view them', 'success').then(function () {
        window.location.reload();
      });
    } else {
      console.error('Error when making POST request');
    }
  } catch (error) {
    console.error('POST request failed:', error);
  }
});
