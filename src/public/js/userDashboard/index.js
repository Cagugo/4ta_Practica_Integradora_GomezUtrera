const socket = io();
const addOrUpdateProductRow = (data) => {
  console.log('documents:', data);

  const documents = data.documents; 
  const productRows = documents.map(
    (document) => `
  <tr id='${document.id}'>
    <td>${document.id}</td>
    <td>${document.name}</td>
    <td>${document.reference}</td>
    <td>${document.fieldname}</td>
    <td>
      <button class='btn btn-danger btn-sm' onclick="deleteDocument('${document.id}')">Delete</button>
    </td>
  </tr>
`
  );
  const productRowsHTML = productRows.join('');
  const productTable = document.getElementById('product-table');
  const existingRow = document.getElementById(documents[0]._id);

  if (existingRow) {
    existingRow.innerHTML = productRowsHTML;
  } else {
    productTable.insertAdjacentHTML('beforeend', productRowsHTML);
  }
};
const deleteDocumentRow = (documentId) => {
  const documentRow = document.getElementById(documentId);
  if (documentRow) {
    documentRow.remove();
  }
};
socket.on('newDocument', addOrUpdateProductRow);
socket.on('deleteDocument', deleteDocumentRow);

const addOrUpdateStatusRow = (data) => {
  console.log('statusData', data);
  const documents_status = data.user.documents_status;
  const premium_documents_status = data.user.premium_documents_status;
  const statusTable = document.getElementById('status-table');
  const statusRows = [
    `
    <thead>
      <tr>
        <th>Document</th>
        <th>Status</th>
      </tr>
    </thead>
    `,
    `
    <tr>
      <td>Any document</td>
      <td>${documents_status}</td>
    </tr>
    `,
    `
    <tr>
      <td>Premium documents</td>
      <td>${premium_documents_status}</td>
    </tr>
    `,
  ];
  const statusRowsHTML = statusRows.join('');
  statusTable.innerHTML = statusRowsHTML;
};
socket.on('newStatus', addOrUpdateStatusRow);

const userIdDiv = document.getElementById('userId');
const userId = userIdDiv.getAttribute('data-user-id');

console.log('cartIdDiv', userId);

const deleteDocument = (id) => {
  console.log(id);
  fetch(`/api/users/${userId}/documents/${id}`, {
    method: 'DELETE',
  })
    .then((response) => {
      if (response.ok) {
        socket.emit('deleteDocument', id);
      } else {
        console.error('Error deleting product ');
      }
    })
    .catch((error) => {
      console.error('Error deleting product:', error);
    });
};
document.addEventListener('DOMContentLoaded', () => {
  const productForm = document.getElementById('documentFormIdentification');
  productForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(productForm);
    for (const entry of formData.entries()) {
      const [name, value] = entry;
      console.log(`name: ${name}, value: ${value}`);
    }
    const response = await fetch(` /api/users/${userId}/documents/identificacion`, {
      method: 'POST',
      body: formData,
    });
    if (response.ok) {
      console.log('Document added successfully');
      productForm.reset();
    } else {
      const error = await response.json();
      console.error('Error adding document:', error);
    }
  });
});
document.addEventListener('DOMContentLoaded', () => {
  const productForm = document.getElementById('documentFormProofOfAddress');
  productForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(productForm);
    for (const entry of formData.entries()) {
      const [name, value] = entry;
      console.log(`name: ${name}, value: ${value}`);
    }
    const response = await fetch(` /api/users/${userId}/documents/comprobanteDeDomicilio`, {
      method: 'POST',
      body: formData,
    });
    if (response.ok) {
      console.log('Document added successfully');
      productForm.reset();
    } else {
      const error = await response.json();
      console.error('Error adding document:', error);
    }
  });
});
document.addEventListener('DOMContentLoaded', () => {
  const productForm = document.getElementById('documentFormBankStatement');
  productForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(productForm);
    for (const entry of formData.entries()) {
      const [name, value] = entry;
      console.log(`name: ${name}, value: ${value}`);
    }
    const response = await fetch(` /api/users/${userId}/documents/comprobanteDeEstadoDeCuenta`, {
      method: 'POST',
      body: formData,
    });
    if (response.ok) {
      console.log('Document added successfully');
      productForm.reset();
    } else {
      const error = await response.json();
      console.error('Error adding document:', error);
    }
  });
});
document.addEventListener('DOMContentLoaded', () => {
  const productForm = document.getElementById('document');
  productForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(productForm);
    for (const entry of formData.entries()) {
      const [name, value] = entry;
      console.log(`name: ${name}, value: ${value}`);
    }
    const response = await fetch(` /api/users/${userId}/documents`, {
      method: 'POST',
      body: formData,
    });
    if (response.ok) {
      console.log('Document added successfully');
      productForm.reset();
    } else {
      const error = await response.json();
      console.error('Error adding document:', error);
    }
  });
});
document.addEventListener('DOMContentLoaded', function () {
  const roleSelectForm = document.getElementById('roleSelect');
  roleSelectForm.addEventListener('submit', function (event) {
    event.preventDefault();

    const selectedRole = document.querySelector('#roleSelect select').value;
    const userIdElement = document.getElementById('userId');
    const userId = userIdElement.getAttribute('data-user-id');

    fetch(`/api/users/premium/${userId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ role: selectedRole }),
    })
      .then((response) => {
        if (response.status === 200) {
          fetch('/api/session/auth/logout')
            .then(() => {
              swal('The Role change request has been completed successfully!', 'Login again with your new Role', 'success').then(function () {
                window.location.href = '/';
              });
            })
            .catch((logoutError) => {
              console.error('Logout request error:', logoutError);
              swal('Error', 'The Role change request was successful but there was an error in the logout ', 'error');
            });
        } else {
          swal('Error', 'Error when trying to change Role. You have not finished processing your required documentation to change from Role User to Premium', 'error');
        }
      })
      .catch((error) => {
        console.error('PUT request failed:', error);
      });
  });
});
const select = document.getElementById('roleSelect');
const submitButton = document.getElementById('submitButton');

select.addEventListener('change', function () {
  if (select.value !== 'Role') {
    submitButton.removeAttribute('disabled');
  } else {
    submitButton.setAttribute('disabled', 'true');
  }
});
