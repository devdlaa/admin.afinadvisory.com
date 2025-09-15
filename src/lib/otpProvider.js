export class OTPProvider {
  async sendOtp(otp) {
    throw new Error("Not implemented");
  }
}

export class Msg91Provider extends OTPProvider {
  async sendOtp(otp) {
    const msg91AuthKey = process.env.MSG91_AUTH_KEY;
    const templateId = process.env.MSG91_TEMPLATE_ID;
    const ADMIN_PHONE = process.env.ADMIN_PHONE_NUMBER;
    console.log(msg91AuthKey,templateId,ADMIN_PHONE);
    const url = "https://api.msg91.com/api/v5/otp";
    const payload = {
      authkey: msg91AuthKey,
      template_id: templateId,
      mobile: ADMIN_PHONE,
      variables: [otp],
    };

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    console.log("MSG91 Response:", data);

    if (data.type !== "success") {
      throw new Error(`Msg91 OTP send failed: ${data.message}`);
    }

    return true;
  }
}
