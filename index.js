const functions = require('@google-cloud/functions-framework');

// Đăng ký một hàm HTTP đơn giản
functions.http('handleWebhook', (req, res) => {
  console.log('Hello World function was called!');
  res.status(200).send('Hello World! The service is running correctly.');
});
