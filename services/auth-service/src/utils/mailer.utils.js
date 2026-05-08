const transporter = require("../config/mailer");
const env = require("../config/env");

function buildRegisterTemplate(fullName, otp) {
  return `
    <p>Xin chào ${fullName},</p>
    <p>Mã OTP xác minh tài khoản của bạn là: <strong>${otp}</strong></p>
    <p>Mã có hiệu lực trong <strong>${env.otp.ttlSeconds / 60} phút</strong>. Không chia sẻ mã này với bất kỳ ai.</p>
  `;
}

function buildResetTemplate(otp) {
  return `
    <p>Xin chào,</p>
    <p>Mã OTP để đặt lại mật khẩu của bạn là: <strong>${otp}</strong></p>
    <p>Mã có hiệu lực trong <strong>${env.otp.ttlSeconds / 60} phút</strong>.</p>
    <p>Nếu bạn không yêu cầu, hãy bỏ qua email này.</p>
  `;
}

async function sendOtpEmail(to, otp, type = "register", fullName = "") {
  const isRegister = type === "register";

  await transporter.sendMail({
    from: `"ShopNova" <${env.smtp.user}>`,
    to,
    subject: isRegister
      ? "[ShopNova] Xác minh tài khoản của bạn"
      : "[ShopNova] Yêu cầu đặt lại mật khẩu",
    html: isRegister
      ? buildRegisterTemplate(fullName || "bạn", otp)
      : buildResetTemplate(otp),
    text: isRegister
      ? `Xin chào ${fullName || "bạn"},\nMã OTP xác minh tài khoản của bạn là: ${otp}\nMã có hiệu lực trong 5 phút.`
      : `Xin chào,\nMã OTP để đặt lại mật khẩu của bạn là: ${otp}\nMã có hiệu lực trong 5 phút.`,
  });
}

module.exports = {
  sendOtpEmail,
};
