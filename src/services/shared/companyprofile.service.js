import { prisma } from "@/utils/server/db";
import {
  NotFoundError,
  ConflictError,
  ValidationError,
} from "../../utils/server/errors.js";

// Validation regex patterns
const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
const GST_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/;

const validatePAN = (pan) => {
  if (!PAN_REGEX.test(pan)) {
    throw new ValidationError(
      "Invalid PAN format. Expected format: ABCDE1234F (5 letters + 4 digits + 1 letter)",
    );
  }
};

const validateGST = (gst) => {
  if (!GST_REGEX.test(gst)) {
    throw new ValidationError(
      "Invalid GST format. Expected format: 27AAAAA0000A1Z5",
    );
  }
};

const validateIFSC = (ifsc) => {
  if (!IFSC_REGEX.test(ifsc)) {
    throw new ValidationError(
      "Invalid IFSC format. Expected format: SBIN0001234",
    );
  }
};

/**
 * Create a new company profile
 */
const createCompanyProfile = async (data, created_by) => {
  return prisma.$transaction(async (tx) => {
    const pan = data.pan ? data.pan.toUpperCase() : null;
    const gst_number = data.gst_number ? data.gst_number.toUpperCase() : null;
    const bank_ifsc = data.bank_ifsc ? data.bank_ifsc.toUpperCase() : null;

    if (pan) validatePAN(pan);

    if (gst_number) {
      validateGST(gst_number);

      if (!pan) {
        throw new ValidationError(
          "PAN is required when GST number is provided",
        );
      }

      if (gst_number.substring(2, 12) !== pan) {
        throw new ValidationError("GST number must contain the same PAN");
      }
    }

    if (bank_ifsc) validateIFSC(bank_ifsc);

    const hasBankName = data.bank_name?.trim();
    const hasBankAccount = data.bank_account_no?.trim();
    const hasBankIFSC = bank_ifsc?.trim();

    const bankCount = [hasBankName, hasBankAccount, hasBankIFSC].filter(
      Boolean,
    ).length;

    if (bankCount > 0 && bankCount < 3) {
      throw new ValidationError(
        "All bank details (name, account number, IFSC) are required if any bank detail is provided",
      );
    }

    if (pan) {
      const existingPAN = await tx.companyProfile.findFirst({ where: { pan } });
      if (existingPAN)
        throw new ConflictError("Company with this PAN already exists");
    }

    if (gst_number) {
      const existingGST = await tx.companyProfile.findFirst({
        where: { gst_number },
      });
      if (existingGST)
        throw new ConflictError("Company with this GST number already exists");
    }

    if (data.is_default === true) {
      await tx.companyProfile.updateMany({
        where: { is_default: true },
        data: { is_default: false },
      });
    }

    return tx.companyProfile.create({
      data: {
        name: data.name,
        legal_name: data.legal_name ?? null,
        pan,
        gst_number,
        email: data.email ?? null,
        phone: data.phone ?? null,
        address_line1: data.address_line1 ?? null,
        address_line2: data.address_line2 ?? null,
        city: data.city ?? null,
        state: data.state ?? null,
        pincode: data.pincode ?? null,
        bank_name: data.bank_name ?? null,
        bank_account_no: data.bank_account_no ?? null,
        bank_ifsc,
        bank_branch: data.bank_branch ?? null,
        is_default: data.is_default ?? false,
        is_active: data.is_active ?? true,
        created_by,
        updated_by: created_by,
      },
    });
  });
};

/**
 * Update an existing company profile
 */
const updateCompanyProfile = async (profile_id, data, updated_by) => {
  return prisma.$transaction(async (tx) => {
    const profile = await tx.companyProfile.findUnique({
      where: { id: profile_id },
      include: { _count: { select: { invoices: true } } },
    });

    if (!profile) {
      throw new NotFoundError("Company profile not found");
    }

    const panProvided = Object.prototype.hasOwnProperty.call(data, "pan");
    const gstProvided = Object.prototype.hasOwnProperty.call(
      data,
      "gst_number",
    );
    const ifscProvided = Object.prototype.hasOwnProperty.call(
      data,
      "bank_ifsc",
    );

    let nextPAN = panProvided
      ? data.pan
        ? data.pan.toUpperCase()
        : null
      : profile.pan;
    let nextGST = gstProvided
      ? data.gst_number
        ? data.gst_number.toUpperCase()
        : null
      : profile.gst_number;
    let nextIFSC = ifscProvided
      ? data.bank_ifsc
        ? data.bank_ifsc.toUpperCase()
        : null
      : profile.bank_ifsc;

    if (nextPAN) validatePAN(nextPAN);

    if (nextGST) {
      validateGST(nextGST);
      if (!nextPAN) {
        throw new ValidationError(
          "PAN is required when GST number is provided",
        );
      }
      if (nextGST.substring(2, 12) !== nextPAN) {
        throw new ValidationError("GST number must contain the same PAN");
      }
    }

    if (nextIFSC) validateIFSC(nextIFSC);

    const nextBankName = Object.prototype.hasOwnProperty.call(data, "bank_name")
      ? data.bank_name
      : profile.bank_name;

    const nextBankAccount = Object.prototype.hasOwnProperty.call(
      data,
      "bank_account_no",
    )
      ? data.bank_account_no
      : profile.bank_account_no;

    const bankCount = [
      nextBankName?.trim(),
      nextBankAccount?.trim(),
      nextIFSC?.trim(),
    ].filter(Boolean).length;

    if (bankCount > 0 && bankCount < 3) {
      throw new ValidationError(
        "All bank details (name, account number, IFSC) are required if any bank detail is provided",
      );
    }

    if (panProvided && nextPAN && nextPAN !== profile.pan) {
      const existingPAN = await tx.companyProfile.findFirst({
        where: { pan: nextPAN, id: { not: profile_id } },
      });
      if (existingPAN)
        throw new ConflictError("Company with this PAN already exists");
    }

    if (gstProvided && nextGST && nextGST !== profile.gst_number) {
      const existingGST = await tx.companyProfile.findFirst({
        where: { gst_number: nextGST, id: { not: profile_id } },
      });
      if (existingGST)
        throw new ConflictError("Company with this GST number already exists");
    }

    if (data.is_default === true) {
      await tx.companyProfile.updateMany({
        where: { is_default: true, id: { not: profile_id } },
        data: { is_default: false },
      });
    }

    const updateData = { updated_by };

    Object.keys(data).forEach((key) => {
      updateData[key] =
        key === "pan"
          ? nextPAN
          : key === "gst_number"
            ? nextGST
            : key === "bank_ifsc"
              ? nextIFSC
              : data[key];
    });

    return tx.companyProfile.update({
      where: { id: profile_id },
      data: updateData,
    });
  });
};

/**
 * Delete a company profile
 */
const deleteCompanyProfile = async (profile_id) => {
  return prisma.$transaction(async (tx) => {
    const profile = await tx.companyProfile.findUnique({
      where: { id: profile_id },
      include: { _count: { select: { invoices: true } } },
    });

    if (!profile) {
      throw new NotFoundError("Company profile not found");
    }

    if (profile._count.invoices > 0) {
      throw new ValidationError(
        "Cannot delete company profile with linked invoices",
      );
    }

    await tx.companyProfile.delete({ where: { id: profile_id } });

    return { id: profile_id, deleted: true };
  });
};

/**
 * List company profiles
 */
const listCompanyProfiles = async (filters = {}) => {
  const page = Number(filters.page) > 0 ? Number(filters.page) : 1;
  const pageSize = Math.min(Number(filters.page_size) || 20, 100);

  const where = {};

  if (filters.is_default !== undefined) where.is_default = filters.is_default;
  if (filters.is_active !== undefined) where.is_active = filters.is_active;
  if (filters.state) where.state = filters.state;

  if (filters.search?.trim()) {
    const term = filters.search.trim().slice(0, 100);
    where.OR = [
      { name: { contains: term, mode: "insensitive" } },
      { legal_name: { contains: term, mode: "insensitive" } },
      { pan: { contains: term, mode: "insensitive" } },
      { gst_number: { contains: term, mode: "insensitive" } },
      { email: { contains: term, mode: "insensitive" } },
      { city: { contains: term, mode: "insensitive" } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.companyProfile.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: [{ is_default: "desc" }, { created_at: "desc" }],
      include: { _count: { select: { invoices: true } } },
    }),
    prisma.companyProfile.count({ where }),
  ]);

  return {
    data: items,
    pagination: {
      page,
      page_size: pageSize,
      total_items: total,
      total_pages: Math.ceil(total / pageSize),
      has_more: page * pageSize < total,
    },
  };
};

const getCompanyProfileById = async (profile_id) => {
  const profile = await prisma.companyProfile.findUnique({
    where: { id: profile_id },
    include: { _count: { select: { invoices: true } } },
  });

  if (!profile) throw new NotFoundError("Company profile not found");

  return profile;
};

const setDefaultCompanyProfile = async (profile_id, updated_by) => {
  return prisma.$transaction(async (tx) => {
    const profile = await tx.companyProfile.findUnique({
      where: { id: profile_id },
    });

    if (!profile) throw new NotFoundError("Company profile not found");
    if (!profile.is_active) {
      throw new ValidationError("Cannot set an inactive profile as default");
    }

    await tx.companyProfile.updateMany({
      where: { is_default: true },
      data: { is_default: false },
    });

    return tx.companyProfile.update({
      where: { id: profile_id },
      data: { is_default: true, updated_by },
    });
  });
};

export {
  createCompanyProfile,
  updateCompanyProfile,
  deleteCompanyProfile,
  listCompanyProfiles,
  getCompanyProfileById,
  setDefaultCompanyProfile,
};
