/**
 * The single seam to the Spring Boot backend for this app — same convention
 * as frontend/lib/api.ts. NEXT_PUBLIC_API_URL already includes the
 * backend's own `/api` prefix (e.g. http://localhost:8099/api), so paths
 * below never repeat it.
 */
const BASE = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/+$/, "");

async function authedGet<T>(path: string, accessToken: string, fallback: T): Promise<T> {
  if (!BASE) return fallback;
  try {
    const res = await fetch(`${BASE}${path}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
    if (!res.ok) return fallback;
    return (await res.json()) as T;
  } catch {
    return fallback;
  }
}

export type DashboardStats = {
  totalRevenue: number | null;
  revenueGrowth: number | null;
  totalReservations: number | null;
  confirmedReservations: number | null;
  pendingReservations: number | null;
  cancelledReservations: number | null;
  reservationGrowth: number | null;
  passengerDirectRevenue: number | null;
  passengerDirectCount: number | null;
  passengerRevenuePercentage: number | null;
  period: number | null;
};

export function getDashboardStats(accessToken: string, period = 30): Promise<DashboardStats | null> {
  return authedGet<DashboardStats | null>(
    `/admin/statistics/dashboard?period=${period}`,
    accessToken,
    null,
  );
}

export type AdminReservationLine = { name: string; totalPrice: number };

export type AdminReservation = {
  reservationId: string;
  userName: string;
  reservationType: string;
  status: string;
  checkInDate: string | null;
  checkOutDate: string | null;
  serviceDate: string | null;
  totalAmount: number;
  currency: string;
  createdAt: string;
  tourTypes: AdminReservationLine[];
  tours: AdminReservationLine[];
};

export type Page<T> = { content: T[]; totalElements: number; totalPages: number; number: number };

export function getActiveReservations(
  accessToken: string,
  page = 0,
  size = 10,
): Promise<Page<AdminReservation>> {
  const empty: Page<AdminReservation> = { content: [], totalElements: 0, totalPages: 0, number: 0 };
  return authedGet<Page<AdminReservation>>(
    `/reservations/active?page=${page}&size=${size}`,
    accessToken,
    empty,
  );
}

/* ------------------------------------------------------------------ users */

export type UserRole = "CLIENT" | "PARTENAIRE" | "CAMPING" | "ADMIN";

export type AdminUser = {
  userId: string;
  name: string;
  email: string;
  phone: string | null;
  role: UserRole;
  loyaltyPoints: number | null;
  loyaltyTier: string | null;
  matriculeFiscal: string | null;
  agencyAddress: string | null;
};

export function searchUsers(
  accessToken: string,
  opts: { roles?: UserRole[]; term?: string; page?: number; size?: number } = {},
): Promise<Page<AdminUser>> {
  const empty: Page<AdminUser> = { content: [], totalElements: 0, totalPages: 0, number: 0 };
  const params = new URLSearchParams();
  (opts.roles ?? []).forEach((r) => params.append("roles", r));
  if (opts.term) params.set("term", opts.term);
  params.set("page", String(opts.page ?? 0));
  params.set("size", String(opts.size ?? 20));
  return authedGet<Page<AdminUser>>(`/users/search?${params.toString()}`, accessToken, empty);
}

export function getUserById(accessToken: string, id: string): Promise<AdminUser | null> {
  return authedGet<AdminUser | null>(`/users/${id}`, accessToken, null);
}

/* --------------------------------------------------------------- catalogue */

export type AdminTourType = {
  tourTypeId: string;
  name: string;
  slug: string | null;
  description: string | null;
  duration: string | null;
  passengerAdultPrice: number;
  passengerChildPrice: number;
  partnerAdultPrice: number;
  partnerChildPrice: number;
  tva: number;
  isActive: boolean;
  location: string | null;
  coverPhotoUrl: string | null;
};

export function getAllTourTypes(accessToken: string): Promise<AdminTourType[]> {
  return authedGet<AdminTourType[]>("/tour-types", accessToken, []);
}

export function getTourTypeById(accessToken: string, id: string): Promise<AdminTourType | null> {
  return authedGet<AdminTourType | null>(`/tour-types/${id}`, accessToken, null);
}

export type AdminExtra = {
  extraId: string;
  name: string;
  slug: string | null;
  description: string | null;
  duration: string | null;
  unitPrice: number;
  tva: number;
  isActive: boolean;
  location: string | null;
  coverPhotoUrl: string | null;
};

export function getAllExtras(accessToken: string): Promise<AdminExtra[]> {
  return authedGet<AdminExtra[]>("/extras", accessToken, []);
}

export function getExtraById(accessToken: string, id: string): Promise<AdminExtra | null> {
  return authedGet<AdminExtra | null>(`/extras/${id}`, accessToken, null);
}

export type AdminTour = {
  tourId: string;
  name: string;
  slug: string | null;
  description: string | null;
  duration: string | null;
  passengerAdultPrice: number;
  passengerChildPrice: number;
  partnerAdultPrice: number;
  partnerChildPrice: number;
  tva: number;
  isActive: boolean;
  location: string | null;
  coverPhotoUrl: string | null;
};

export function getAllTours(accessToken: string): Promise<AdminTour[]> {
  return authedGet<AdminTour[]>("/tours", accessToken, []);
}

export function getTourById(accessToken: string, id: string): Promise<AdminTour | null> {
  return authedGet<AdminTour | null>(`/tours/${id}`, accessToken, null);
}

/* -------------------------------------------------------------------- CMS */

export type PageLocale = "FR" | "EN" | "DE" | "IT" | "DA" | "AR";
export type PageStatus = "DRAFT" | "PUBLISHED";
export type CompanyType = "DUNES_INSOLITES" | "ROUTE_INSOLITE";

export type PageBlock = { type: string; dataJson: string };

export type AdminPage = {
  pageId: string;
  title: string;
  slug: string;
  locale: PageLocale;
  companyType: CompanyType;
  status: PageStatus;
  publishedAt: string | null;
  seoTitle: string | null;
  metaDescription: string | null;
  focusKeyword: string | null;
  canonicalUrl: string | null;
  noIndex: boolean;
  noFollow: boolean;
  ogTitle: string | null;
  ogDescription: string | null;
  ogImageUrl: string | null;
  blocks: PageBlock[];
  createdAt: string;
  updatedAt: string;
};

export function getAllPages(accessToken: string): Promise<AdminPage[]> {
  return authedGet<AdminPage[]>("/pages", accessToken, []);
}

export function getPageById(accessToken: string, id: string): Promise<AdminPage | null> {
  return authedGet<AdminPage | null>(`/pages/${id}`, accessToken, null);
}
