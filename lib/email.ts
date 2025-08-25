import { Resend } from "resend"

interface EmailOptions {
  to: string
  subject: string
  html: string
  from?: string
}

export async function sendEmail({ to, subject, html, from = "YUM <noreply@yum.com>" }: EmailOptions) {
  if (!process.env.RESEND_API_KEY) {
    console.warn("RESEND_API_KEY not set, skipping email send")
    return { success: false, message: "Email service not configured" }
  }

  const resend = new Resend(process.env.RESEND_API_KEY)

  try {
    // Always send a copy to the admin email
    const recipients = Array.isArray(to) ? [...to, "accalyuhh@gmail.com"] : [to, "accalyuhh@gmail.com"]

    const { data, error } = await resend.emails.send({
      from,
      to: recipients,
      subject,
      html,
    })

    if (error) {
      console.error("Error sending email:", error)
      return { success: false, error }
    }

    return { success: true, data }
  } catch (error) {
    console.error("Exception sending email:", error)
    return { success: false, error }
  }
}
