import * as nodemailer from "nodemailer"

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_SERVER_HOST,
  port: Number(process.env.EMAIL_SERVER_PORT ?? "465"),
  secure: true,
  auth: {
    user: process.env.EMAIL_SERVER_USER,
    pass: process.env.EMAIL_SERVER_PASSWORD,
  },
})

export async function sendMail({
  to,
  subject,
  html,
  attachments,
}: {
  to: string
  subject: string
  html: string
  attachments?: nodemailer.SendMailOptions["attachments"]
}) {
  return transporter.sendMail({
    from: process.env.EMAIL_FROM ?? process.env.EMAIL_SERVER_USER,
    to,
    subject,
    html,
    attachments,
  })
}
