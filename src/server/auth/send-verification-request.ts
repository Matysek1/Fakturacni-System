import { sendMail } from "~/lib/mailer";

export interface SendVerificationRequestParams {
  identifier: string;
  url: string;
  expires: Date;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  provider: any;
  token: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  theme: any;
  request: Request;
}

export async function sendVerificationRequest(params: SendVerificationRequestParams) {
  const { identifier, url } = params;
  const { host } = new URL(url);

  const escapedHost = host.replace(/\./g, "&#8203;.");

  const html = `
<!DOCTYPE html>
<html lang="cs">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      background-color: #f9fafb;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol';
      padding: 40px 0;
      margin: 0;
    }
    .wrapper {
      width: 100%;
      table-layout: fixed;
    }
    .main {
      margin: 0 auto;
      width: 100%;
      max-width: 600px;
      background-color: #ffffff;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    }
    .header {
      padding: 40px;
      text-align: center;
      background-color: #f3f4f6;
      border-bottom: 1px solid #e5e7eb;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
      font-weight: 700;
      color: #111827;
      letter-spacing: -0.025em;
    }
    .content {
      padding: 40px 30px;
    }
    .content h2 {
      margin: 0 0 20px;
      font-size: 20px;
      font-weight: 600;
      color: #1f2937;
      text-align: center;
    }
    .content p {
      margin: 0 0 30px;
      font-size: 16px;
      color: #4b5563;
      text-align: center;
      line-height: 1.6;
    }
    .button-container {
      text-align: center;
      margin-bottom: 30px;
    }
    .button {
      display: inline-block;
      padding: 14px 32px;
      background-color: #2563eb;
      color: #ffffff !important;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 600;
      font-size: 16px;
    }
    .fallback-text {
      margin: 0;
      font-size: 14px;
      color: #6b7280;
      text-align: center;
      line-height: 1.5;
    }
    .fallback-link {
      margin: 10px 0 0;
      font-size: 14px;
      color: #3b82f6;
      text-align: center;
      word-break: break-all;
    }
    .fallback-link a {
      color: #2563eb;
      text-decoration: underline;
    }
    .footer {
      padding: 30px;
      text-align: center;
      background-color: #f9fafb;
      border-top: 1px solid #e5e7eb;
    }
    .footer p {
      margin: 0;
      font-size: 14px;
      color: #9ca3af;
    }
  </style>
</head>
<body>
  <table class="wrapper" border="0" cellspacing="0" cellpadding="0">
    <tr>
      <td align="center">
        <table class="main" border="0" cellspacing="0" cellpadding="0">
          <tr>
            <td class="header">
              <h1>Fakturační Systém</h1>
            </td>
          </tr>
          <tr>
            <td class="content">
              <h2>Bezpečné přihlášení</h2>
              <p>
                Požádali jste o přihlášení do svého účtu <strong>${escapedHost}</strong>. Pro pokračování klikněte na tlačítko níže.
              </p>
              <table width="100%" border="0" cellspacing="0" cellpadding="0" class="button-container">
                <tr>
                  <td align="center">
                    <a href="${url}" class="button" target="_blank">Přihlásit se do aplikace</a>
                  </td>
                </tr>
              </table>
              <p class="fallback-text">
                Pokud tlačítko nefunguje, zkopírujte a vložte následující odkaz bezpečně do vašeho prohlížeče:
              </p>
              <p class="fallback-link">
                <a href="${url}" target="_blank">${url}</a>
              </p>
            </td>
          </tr>
          <tr>
            <td class="footer">
              <p>
                Pokud jste o tento e-mail nepožádali, můžete ho bezpečně smazat.<br>Vygenerováno automaticky systémem.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  // V produkčním prostředí raději použijte textovou verzi pro klienty, co neumí překládat HTML (nebo jako fallback)
  const text = `Přihlaste se do aplikace ${escapedHost}\n\n${url}\n\nPokud jste tento e-mail nevyžádali, můžete ho ignorovat.`;

  try {
    await sendMail({
      to: identifier,
      subject: `Přihlášení do aplikace - ${escapedHost}`,
      html: html,
      // @ts-expect-error - text is a valid option but not typed in our sendMail wrapper
      text: text,
    });
  } catch (error) {
    console.error("Vyskytla se chyba při odesílání přihlašovacího e-mailu", error);
    throw new Error("Odeslání e-mailu selhalo.");
  }
}
