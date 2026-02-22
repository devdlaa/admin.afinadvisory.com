import { verifyTotpForUnlock } from "./auth";
import { ForbiddenError, ValidationError } from "./errors";

export const requireTotp = async (authorizerId, totpCode) => {
  if (!authorizerId) {
    throw new ValidationError("Authorizer ID is required");
  }

  if (!totpCode) {
    throw new ValidationError("TOTP code is required for this action");
  }

  // ensure authorizer is actually a super admin
  const authorizer = await prisma.adminUser.findUnique({
    where: { id: authorizerId },
    select: { admin_role: true },
  });

  if (!authorizer || authorizer.admin_role !== "SUPER_ADMIN") {
    throw new ForbiddenError("Authorizer must be a Super Admin");
  }

  // reuse the already working verifyTotpForUnlock
  const isValid = await verifyTotpForUnlock(authorizerId, totpCode);

  if (!isValid) {
    throw new ForbiddenError(
      "Invalid or expired TOTP code — open your authenticator app and try again",
    );
  }

  return true;
};
