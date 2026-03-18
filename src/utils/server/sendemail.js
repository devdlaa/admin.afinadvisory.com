// @ts-ignore
import handlebars from /* webpackIgnore: true */ "handlebars";

import fs from "fs-extra";
import path from "path";

import { SendMailClient } from "zeptomail";

// Email Templates Mapping
const EMAIL_TEMPLATES = {
  SEND_USER_INVITE_LINK: {
    subject: "You're Invited to Join the Afin Advisory Admin Dashboard",
    template: "adminUserInvite",
  },
  SEND_USER_PWD_RESET_LINK: {
    subject: "Password Reset Request - Afin Advisory Admin Dashboard",
    template: "adminUserPwdRestLink",
  },
  SEND_USER_ONBOARDING_RESET_LINK: {
    subject: "Onboarding Reset Request - Afin Advisory Admin Dashboard",
    template: "adminOnboardingResetLink",
  },
  ADMIN_USER_ONBOARDED_NOTIFICATION: {
    subject:
      "Security Alert: New Admin User Onboarded - Afin Advisory Dashboard",
    template: "adminUserOnboardedNotification",
  },
  INFLUNCER_PASSWORD_RESET_NOTIFICATION: {
    subject: "Reset Your Afin Influncer Dashboard Password - Afin Advisory",
    template: "pwd_reset_link_influncer",
  },
};

const loadTemplate = async (templateName, variables) => {
  try {
    const filePath = path.join(
      process.cwd(),
      "emails",
      "templates",
      `${templateName}.hbs`,
    );
    const templateFile = await fs.readFile(filePath, "utf8");
    const compiledTemplate = handlebars.compile(templateFile);
    return compiledTemplate(variables);
  } catch (error) {
    console.error("❌ Error loading email template:");
    throw new Error("Failed to load email template");
  }
};

const client = new SendMailClient({
  url: "https://api.zeptomail.in/v1.1/email",
  token: process.env.ZEPTO_MAIL_TOKEN_SECONDARY,
});

export async function SEND_EMAIL({
  to,
  type,
  variables = {},
  attachments = [],
  from,
  cc,
  bcc,
  html,
  subjectOverride,
}) {
  try {
    let subject;
    let htmlBody;

    if (!to) {
      return { success: false, error: "Missing or invalid email type." };
    }

    if (html) {
      subject = subjectOverride || "Notification";
      htmlBody = html;
    } else {
      if (!type || !EMAIL_TEMPLATES[type]) {
        return { success: false, error: "Invalid email type" };
      }

      const template = EMAIL_TEMPLATES[type];

      subject = template.subject;
      htmlBody = await loadTemplate(template.template, variables);
    }

    // ZeptoMail attachment format
    const formattedAttachments = attachments.map((file) => ({
      name: file.filename || file.name,
      content: file.content.toString("base64"),
    }));

    const payload = {
      from: {
        address: from || process.env.OFFICE_EMAIL,
        name: "AFINTHRIVE ADVISORY PVT LTD",
      },

      to: [
        {
          email_address: {
            address: to,
            name: variables?.name ?? "",
          },
        },
      ],

      subject,
      htmlbody: htmlBody,
      attachments: formattedAttachments.length
        ? formattedAttachments
        : undefined,
    };

    if (cc) {
      payload.cc = [
        {
          email_address: { address: cc },
        },
      ];
    }

    if (bcc) {
      payload.bcc = [
        {
          email_address: { address: bcc },
        },
      ];
    }

    const resp = await client.sendMail(payload);

    return { success: true, message: "Email sent successfully", resp };
  } catch (error) {
  console.error("Email Sending Error:", error);

  return {
    success: false,
    error: error?.message || "Unknown error",
    status: error?.response?.status,
  };
}
}
