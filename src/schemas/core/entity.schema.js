
import { z } from 'zod';

// Enums
export const EntityTypeEnum = z.enum([
  'INDIVIDUAL',
  'PRIVATE_LIMITED_COMPANY',
  'PUBLIC_LIMITED_COMPANY',
  'ONE_PERSON_COMPANY',
  'SECTION_8_COMPANY',
  'PRODUCER_COMPANY',
  'SOLE_PROPRIETORSHIP',
  'PARTNERSHIP_FIRM',
  'LIMITED_LIABILITY_PARTNERSHIP',
  'TRUST',
  'SOCIETY',
  'COOPERATIVE_SOCIETY',
  'FOREIGN_COMPANY',
  'GOVERNMENT_COMPANY'
]);

export const EntityStatusEnum = z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']);

// PAN validation (10 chars: 5 letters, 4 digits, 1 letter)
const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
// TAN validation (10 chars: 4 letters, 5 digits, 1 letter)
const tanRegex = /^[A-Z]{4}[0-9]{5}[A-Z]{1}$/;
// Pincode validation (6 digits)
const pincodeRegex = /^[0-9]{6}$/;
// Phone validation (10 digits)
const phoneRegex = /^[0-9]{10}$/;

export const EntityCreateSchema = z.object({
  entity_type: EntityTypeEnum,
  name: z.string().min(1).max(120).trim(),
  pan: z.string().regex(panRegex, 'Invalid PAN format (e.g., ABCDE1234F)').toUpperCase(),
  tan: z.string().regex(tanRegex, 'Invalid TAN format (e.g., ABCD12345E)').toUpperCase().optional().nullable(),
  email: z.string().email('Invalid email').optional().nullable(),
  primary_phone: z.string().regex(phoneRegex, 'Phone must be 10 digits'),
  secondary_phone: z.string().regex(phoneRegex, 'Phone must be 10 digits').optional().nullable(),
  address_line1: z.string().min(1).max(200).trim(),
  address_line2: z.string().max(200).trim().optional().nullable(),
  city: z.string().min(1).max(50).trim(),
  state: z.string().min(1).max(50).trim(),
  pincode: z.string().regex(pincodeRegex, 'Pincode must be 6 digits').optional().nullable(),
  is_retainer: z.boolean().default(false),
  status: EntityStatusEnum.default('INACTIVE')
});

export const EntityUpdateSchema = EntityCreateSchema.partial();

export const EntityQuerySchema = z.object({
  entity_type: EntityTypeEnum.optional(),
  status: EntityStatusEnum.optional(),
  is_retainer: z.boolean().optional(),
  search: z.string().optional(), 
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20)
});