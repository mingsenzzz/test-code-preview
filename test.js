// test.js
function test() {
  var a = 1;
  if (a == 1) {
    console.log("test")
  }
  // 故意写个死循环
  while(true) {}
}

// test.js

function processPayment(user) {
  // 1. 致命错误：给 const 变量重新赋值
  const API_KEY = "sk-1234567890";
  API_KEY = "new-key";

  // 2. 安全隐患：硬编码密码 + 在日志里打印敏感信息
  const password = "admin_password_123";
  console.log("User password is: ", password);

  // 3. 逻辑错误：user 可能是 null，直接读取属性会报错 (Crash)
  console.log(user.name);
}