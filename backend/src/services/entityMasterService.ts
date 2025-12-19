import { query } from '../config/database';

export interface OrganizationData {
  name: string;
  logoUrl?: string;
  address?: string;
  email?: string;
  mobile?: string;
  gst?: string;
  pan?: string;
  cin?: string;
  accountingYearStart?: string;
}

/**
 * Get organization data for Entity Master auto-fill
 * @param organizationId - Organization ID
 * @returns Organization data with all Entity Master fields
 */
export async function getOrganizationData(organizationId: string): Promise<OrganizationData> {
  const result = await query(
    `SELECT 
      name,
      logo_url,
      address,
      email,
      mobile,
      gst,
      pan,
      cin,
      accounting_year_start
    FROM organizations
    WHERE id = $1`,
    [organizationId]
  );

  if (result.rows.length === 0) {
    throw new Error('Organization not found');
  }

  const row = result.rows[0];

  return {
    name: row.name || '',
    logoUrl: row.logo_url || undefined,
    address: row.address || undefined,
    email: row.email || undefined,
    mobile: row.mobile || undefined,
    gst: row.gst || undefined,
    pan: row.pan || undefined,
    cin: row.cin || undefined,
    accountingYearStart: row.accounting_year_start
      ? new Date(row.accounting_year_start).toISOString().split('T')[0]
      : undefined,
  };
}

/**
 * Format organization data for template replacement
 * Returns data in format suitable for template placeholders like {{org.name}}, {{org.gst}}
 */
export function formatOrganizationDataForTemplate(orgData: OrganizationData): Record<string, any> {
  return {
    org: {
      name: orgData.name,
      logoUrl: orgData.logoUrl || '',
      address: orgData.address || '',
      email: orgData.email || '',
      mobile: orgData.mobile || '',
      gst: orgData.gst || '',
      pan: orgData.pan || '',
      cin: orgData.cin || '',
      accountingYearStart: orgData.accountingYearStart || '',
    },
  };
}

