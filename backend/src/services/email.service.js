/**
 * ============================================================================
 * EMAIL SERVICE — sử dụng Brevo HTTP API (thay thế SMTP)
 * ============================================================================
 *
 * Lý do:
 *   - Render Free Tier chặn outbound SMTP (ports 25, 465, 587).
 *   - Brevo (Sendinblue) hỗ trợ API HTTP, bypass hoàn toàn giới hạn SMTP.
 *   - Brevo cho phép Single Sender Verification (chỉ cần verify 1 email gửi đi, không cần setup domain).
 */

import logger from '../utils/logger.js';

// Helper: Lấy thông tin người gửi
function getSenderInfo() {
  return {
    name: process.env.APP_NAME || 'WebCall',
    email: process.env.EMAIL_USER || process.env.EMAIL_FROM
  };
}

// Helper: Gửi email thông qua Brevo HTTP API (native fetch)
async function sendBrevoEmail(to, subject, htmlContent) {
  const brevoApiKey = process.env.BREVO_API_KEY;

  if (!brevoApiKey) {
    logger.warn('BREVO_API_KEY is not set — emails will not be sent');
    return null;
  }

  const payload = {
    sender: getSenderInfo(),
    to: [{ email: to }],
    subject: subject,
    htmlContent: htmlContent,
  };

  try {
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": brevoApiKey,
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(`Brevo API Error: ${JSON.stringify(result)}`);
    }

    logger.info({ to, messageId: result.messageId }, 'Email sent successfully via Brevo HTTP API');
    return result;
  } catch (error) {
    logger.error({ err: error.message, to }, 'Failed to send email via Brevo');
    throw error;
  }
}

// ─── Send Verification Email ─────────────────────────────────────────────────
export async function sendVerificationEmail(to, token, fullName) {
  const appUrl = process.env.APP_URL || `http://localhost:${process.env.PORT || 3000}`;
  const link = `${appUrl}/auth/verify-email?token=${encodeURIComponent(token)}`;

  const subject = '🔐 Xác thực email của bạn - WebCall';
  const htmlContent = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px; background: #fff8f3; border-radius: 16px; border: 1px solid #dfc0b7;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h1 style="color: #a4370f; font-size: 24px; margin: 0;">WebCall</h1>
      </div>
      <h2 style="color: #1d1b18; margin-bottom: 16px; font-size: 20px;">Xin chào ${fullName || ''},</h2>
      <p style="color: #58423b; font-size: 15px; line-height: 1.6; margin-bottom: 24px;">
        Cảm ơn bạn đã đăng ký tài khoản trên <strong>WebCall</strong>. 
        Vui lòng bấm nút bên dưới để xác thực địa chỉ email của bạn:
      </p>
      <div style="text-align: center; margin: 28px 0;">
        <a href="${link}" 
           style="display: inline-block; background: #a4370f; color: #ffffff; padding: 14px 36px; 
                  border-radius: 999px; text-decoration: none; font-weight: bold; font-size: 15px;
                  letter-spacing: 0.3px;">
          ✉️ Xác thực Email
        </a>
      </div>
      <p style="color: #8c7169; font-size: 13px; line-height: 1.5; margin-top: 24px;">
        Nếu nút không hoạt động, hãy sao chép và dán đường link sau vào trình duyệt:<br/>
        <a href="${link}" style="color: #a4370f; word-break: break-all; font-size: 12px;">${link}</a>
      </p>
      <hr style="border: none; border-top: 1px solid #dfc0b7; margin: 24px 0;" />
      <p style="color: #8c7169; font-size: 12px; margin: 0;">
        Link xác thực có hiệu lực trong <strong>24 giờ</strong>. 
        Nếu bạn không tạo tài khoản này, vui lòng bỏ qua email này.
      </p>
    </div>
  `;

  return sendBrevoEmail(to, subject, htmlContent);
}

// ─── Send Reset Password Email ───────────────────────────────────────────────
export async function sendResetPasswordEmail(to, token, fullName) {
  const appUrl = process.env.APP_URL || `http://localhost:${process.env.PORT || 3000}`;
  const link = `${appUrl}/auth/reset-password?token=${encodeURIComponent(token)}`;
  const subject = '🔑 Đặt lại mật khẩu - WebCall';
  const htmlContent = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px; background: #fff8f3; border-radius: 16px; border: 1px solid #dfc0b7;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h1 style="color: #a4370f; font-size: 24px; margin: 0;">WebCall</h1>
      </div>
      <h2 style="color: #1d1b18; margin-bottom: 16px; font-size: 20px;">Xin chào ${fullName || ''},</h2>
      <p style="color: #58423b; font-size: 15px; line-height: 1.6; margin-bottom: 24px;">
        Bạn đã yêu cầu đặt lại mật khẩu tài khoản <strong>WebCall</strong>. 
        Bấm nút bên dưới để tiếp tục:
      </p>
      <div style="text-align: center; margin: 28px 0;">
        <a href="${link}" 
           style="display: inline-block; background: #a4370f; color: #ffffff; padding: 14px 36px; 
                  border-radius: 999px; text-decoration: none; font-weight: bold; font-size: 15px;">
          🔑 Đặt lại mật khẩu
        </a>
      </div>
      <p style="color: #8c7169; font-size: 13px; line-height: 1.5; margin-top: 24px;">
        Hoặc truy cập link sau:<br/>
        <a href="${link}" style="color: #a4370f; word-break: break-all; font-size: 12px;">${link}</a>
      </p>
      <hr style="border: none; border-top: 1px solid #dfc0b7; margin: 24px 0;" />
      <p style="color: #8c7169; font-size: 12px; margin: 0;">
        Link có hiệu lực trong <strong>1 giờ</strong>. 
        Nếu bạn không yêu cầu, vui lòng bỏ qua email này.
      </p>
    </div>
  `;

  return sendBrevoEmail(to, subject, htmlContent);
}

// ─── Send Meeting Invite Email ───────────────────────────────────────────────
export async function sendMeetingInviteEmail(to, roomCode, hostName, fullName) {
  const appUrl = process.env.APP_URL || `http://localhost:${process.env.PORT || 3000}`;
  const link = `${appUrl}/lobby?code=${roomCode}`;
  const subject = `📹 ${hostName} mời bạn tham gia cuộc họp - WebCall`;
  const htmlContent = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px; background: #fff8f3; border-radius: 16px; border: 1px solid #dfc0b7;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h1 style="color: #a4370f; font-size: 24px; margin: 0;">WebCall</h1>
      </div>
      <h2 style="color: #1d1b18; margin-bottom: 16px; font-size: 20px;">Xin chào ${fullName || ''},</h2>
      <p style="color: #58423b; font-size: 15px; line-height: 1.6; margin-bottom: 16px;">
        <strong>${hostName}</strong> đã mời bạn tham gia một phòng họp trên <strong>WebCall</strong>.
      </p>
      <div style="background: #f3ede8; border-radius: 12px; padding: 16px; text-align: center; margin-bottom: 24px;">
        <p style="color: #8c7169; font-size: 12px; margin: 0 0 6px 0; text-transform: uppercase; letter-spacing: 0.1em;">Mã phòng họp</p>
        <p style="color: #a4370f; font-size: 28px; font-weight: bold; font-family: monospace; margin: 0; letter-spacing: 4px;">${roomCode}</p>
      </div>
      <div style="text-align: center; margin: 24px 0;">
        <a href="${link}" 
           style="display: inline-block; background: #a4370f; color: #ffffff; padding: 14px 36px; 
                  border-radius: 999px; text-decoration: none; font-weight: bold; font-size: 15px;">
          📹 Tham gia phòng họp
        </a>
      </div>
      <hr style="border: none; border-top: 1px solid #dfc0b7; margin: 24px 0;" />
      <p style="color: #8c7169; font-size: 12px; margin: 0;">
        Hoặc truy cập: <a href="${link}" style="color: #a4370f;">${link}</a>
      </p>
    </div>
  `;

  return sendBrevoEmail(to, subject, htmlContent);
}

export default { sendVerificationEmail, sendResetPasswordEmail, sendMeetingInviteEmail };
