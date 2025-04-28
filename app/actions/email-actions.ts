"use server"

import { Resend } from "resend"
import { config } from "@/lib/config"

const resend = new Resend(config.email.resendApiKey)

interface ContactFormData {
  name: string
  email: string
  subject: string
  message: string
}

export async function sendContactEmail(data: ContactFormData) {
  try {
    if (!config.email.resendApiKey) {
      console.warn("RESEND_API_KEY not set, skipping email send")
      return { success: false, error: "Email service not configured" }
    }

    const { name, email, subject, message } = data

    const { data: emailData, error } = await resend.emails.send({
      from: "ACYUM Contact <noreply@acyum.com>",
      to: "accalyuhh@gmail.com", // Updated to the user's email
      reply_to: email,
      subject: `Contact Form: ${subject}`,
      html: `
        <h1>New Contact Form Submission</h1>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Subject:</strong> ${subject}</p>
        <h2>Message:</h2>
        <p>${message.replace(/\n/g, "<br>")}</p>
      `,
    })

    if (error) {
      console.error("Error sending email:", error)
      return { success: false, error: error.message }
    }

    return { success: true, data: emailData }
  } catch (error) {
    console.error("Exception sending email:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "An unknown error occurred",
    }
  }
}
