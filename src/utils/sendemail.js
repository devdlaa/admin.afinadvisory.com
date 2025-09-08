// @ts-ignore
import handlebars from /* webpackIgnore: true */ "handlebars";
import nodemailer from "nodemailer";
import fs from "fs-extra";
import path from "path";

// Email Templates Mapping
const EMAIL_TEMPLATES = {
  SEND_USER_INVITE_LINK: {
    subject: "You're Invited to Join the Afin Advisory Admin Dashboard",
    template: "adminUserInvite",
  },
  SEND_USER_PWD_RESET_LINK: {
    subject: "Your Password Reset Link - Afin Advisory Dashboard",
    template: "adminUserPwdRestLink",
  },
  ADMIN_USER_ONBOARDED_NOTIFICATION: {
    subject:
      "Security Alert: New Admin User Onboarded - Afin Advisory Dashboard",
    template: "adminUserOnboardedNotification",
  },
};

const loadTemplate = async (templateName, variables) => {
  try {
    const filePath = path.join(
      process.cwd(),
      "emails",
      "templates",
      `${templateName}.hbs`
    );
    const templateFile = await fs.readFile(filePath, "utf8");
    const compiledTemplate = handlebars.compile(templateFile);
    return compiledTemplate(variables);
  } catch (error) {
    console.error("❌ Error loading email template:");
    throw new Error("Failed to load email template");
  }
};

export async function SEND_EMAIL({
  to,
  type,
  variables = {},
  attachments = [],
  from,
  cc,
  bcc,
}) {
  try {
    // Validate Email Request Data
    if (!to || !type || !EMAIL_TEMPLATES[type]) {
      return { success: false, error: "Missing or invalid email type." };
    }

    const { subject, template } = EMAIL_TEMPLATES[type];
    const html = await loadTemplate(template, variables);

    const TRANSPORTER = nodemailer.createTransport({
      host: "smtp.hostinger.com",
      port: 465,
      secure: true,
      auth: {
        user: process.env.SERVICE_EMAIL,
        pass: process.env.SERVICE_EMAIL_PWD,
      },
    });

    // Prepare Email Options
    const mailOptions = {
      from: '"AFINTHRIVE ADVISORY" <info@afinadvisory.com>',
      to,
      cc: cc || undefined,
      bcc: bcc || undefined,
      subject,
      html,
      attachments,
    };
    await TRANSPORTER.sendMail(mailOptions);
    console.log("✅ Email sent successfully!");
    return { success: true, message: "✅ Email sent successfully!" };
  } catch (error) {
    return { success: false, error: error.message || "Unknown error" };
  }
}
