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
  // Set once, server-side, at self-registration — null for staff/partner/
  // guest-checkout accounts, which never went through that consent
  // checkbox. Display-only: not part of `fields` in ClientsCrud.tsx on
  // purpose, an admin editing a client record must never be able to
  // roundtrip this back to the server and overwrite a real legal fact.
  termsAcceptedAt: string | null;
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

export const ALL_USER_ROLES: UserRole[] = ["CLIENT", "PARTENAIRE", "CAMPING", "ADMIN"];

// One cheap call per role (size=1 — only totalElements is read) rather than
// paging through every user, since the "Rôles & permissions" overview only
// needs the count, not the rows.
export async function getUserCountsByRole(
  accessToken: string,
): Promise<Record<UserRole, number>> {
  const counts = await Promise.all(
    ALL_USER_ROLES.map((role) => searchUsers(accessToken, { roles: [role], size: 1 })),
  );
  return ALL_USER_ROLES.reduce(
    (acc, role, i) => ({ ...acc, [role]: counts[i].totalElements }),
    {} as Record<UserRole, number>,
  );
}

export type SecurityEndpoint = {
  controller: string;
  httpMethod: string;
  path: string;
  rule: string | null;
};

export function getSecurityEndpoints(accessToken: string): Promise<SecurityEndpoint[]> {
  return authedGet<SecurityEndpoint[]>("/admin/security-overview/endpoints", accessToken, []);
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

export type AvailabilityDay = {
  date: string;
  reservationCount: number;
  adults: number;
  children: number;
  blockId: string | null;
  blockNote: string | null;
};

// month is "yyyy-MM" (e.g. "2026-09") — matches the backend's
// @DateTimeFormat(pattern = "yyyy-MM") on AvailabilityController.
export function getAvailabilityCalendar(
  accessToken: string,
  tourTypeId: string,
  month: string,
): Promise<AvailabilityDay[]> {
  return authedGet<AvailabilityDay[]>(
    `/availability/calendar?tourTypeId=${tourTypeId}&month=${month}`,
    accessToken,
    [],
  );
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

/* --------------------------------------------------------------- navigation */

export type NavMenuType = "NONE" | "EXPERIENCES" | "STAYS";

export type AdminNavigationItem = {
  navItemId: string;
  label: string;
  url: string;
  locale: PageLocale;
  companyType: CompanyType;
  displayOrder: number;
  menuType: NavMenuType;
  createdAt: string;
  updatedAt: string;
};

export function getAllNavigationItems(accessToken: string): Promise<AdminNavigationItem[]> {
  return authedGet<AdminNavigationItem[]>("/navigation", accessToken, []);
}

export function getNavigationItemById(
  accessToken: string,
  id: string,
): Promise<AdminNavigationItem | null> {
  return authedGet<AdminNavigationItem | null>(`/navigation/${id}`, accessToken, null);
}

export type AdminRedirect = {
  redirectId: string;
  fromPath: string;
  toPath: string;
  statusCode: number;
  createdAt: string;
  updatedAt: string;
};

export function getAllRedirects(accessToken: string): Promise<AdminRedirect[]> {
  return authedGet<AdminRedirect[]>("/redirects", accessToken, []);
}

export function getRedirectById(accessToken: string, id: string): Promise<AdminRedirect | null> {
  return authedGet<AdminRedirect | null>(`/redirects/${id}`, accessToken, null);
}

/* --------------------------------------------------------------- content blocks */

export type AdminContentBlock = {
  blockId: string;
  label: string;
  type: string;
  dataJson: string;
  locale: PageLocale;
  companyType: CompanyType;
  createdAt: string;
  updatedAt: string;
};

export function getAllContentBlocks(accessToken: string): Promise<AdminContentBlock[]> {
  return authedGet<AdminContentBlock[]>("/content-blocks", accessToken, []);
}

export function getContentBlockById(
  accessToken: string,
  id: string,
): Promise<AdminContentBlock | null> {
  return authedGet<AdminContentBlock | null>(`/content-blocks/${id}`, accessToken, null);
}

/* -------------------------------------------------------------------- media */

export type AdminMediaAsset = {
  assetId: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  /** Already absolute — see MediaController.absolute(). */
  url: string;
  companyType: CompanyType;
  createdAt: string;
};

export function getAllMediaAssets(accessToken: string): Promise<AdminMediaAsset[]> {
  return authedGet<AdminMediaAsset[]>("/media", accessToken, []);
}

/* --------------------------------------------------------------------- staff */

export function searchStaff(
  accessToken: string,
  opts: { term?: string; page?: number; size?: number } = {},
): Promise<Page<AdminUser>> {
  return searchUsers(accessToken, { ...opts, roles: ["ADMIN", "CAMPING"] });
}

/* ------------------------------------------------------------------ reviews */

export type AdminReview = {
  reviewId: string;
  userId: string;
  userName: string;
  productId: string;
  productType: "TOURTYPE" | "TOUR" | "EXTRA";
  rating: number;
  comment: string | null;
  createdAt: string;
};

export function getReviewsForProduct(
  accessToken: string,
  productId: string,
  productType: string,
  page = 0,
  size = 50,
): Promise<Page<AdminReview>> {
  const empty: Page<AdminReview> = { content: [], totalElements: 0, totalPages: 0, number: 0 };
  return authedGet<Page<AdminReview>>(
    `/reviews?productId=${productId}&productType=${productType}&page=${page}&size=${size}`,
    accessToken,
    empty,
  );
}

export function getReviewById(accessToken: string, id: string): Promise<AdminReview | null> {
  return authedGet<AdminReview | null>(`/reviews/${id}`, accessToken, null);
}

/**
 * There is no "all reviews" endpoint on the backend — only reviews for one
 * product. This fans out across every catalogue product and merges the
 * results, newest first. Fine at this catalogue's size; would need a real
 * paginated endpoint if the product count grows a lot.
 */
export async function getAllReviews(accessToken: string): Promise<AdminReview[]> {
  const [tourTypes, tours, extras] = await Promise.all([
    getAllTourTypes(accessToken),
    getAllTours(accessToken),
    getAllExtras(accessToken),
  ]);
  const targets = [
    ...tourTypes.map((t) => ({ id: t.tourTypeId, type: "TOURTYPE" })),
    ...tours.map((t) => ({ id: t.tourId, type: "TOUR" })),
    ...extras.map((e) => ({ id: e.extraId, type: "EXTRA" })),
  ];
  const pages = await Promise.all(
    targets.map((t) => getReviewsForProduct(accessToken, t.id, t.type, 0, 100)),
  );
  return pages
    .flatMap((p) => p.content)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

/* -------------------------------------------------------------- transactions */

export type AdminTransaction = {
  transactionId: string;
  transactionNumber: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  status: string;
  transactionDate: string;
  reservationId: string;
  invoiceId: string | null;
};

export function getAllTransactions(accessToken: string): Promise<AdminTransaction[]> {
  return authedGet<AdminTransaction[]>("/transactions", accessToken, []);
}

export function getTransactionById(accessToken: string, id: string): Promise<AdminTransaction | null> {
  return authedGet<AdminTransaction | null>(`/transactions/${id}`, accessToken, null);
}

/* ------------------------------------------------------------------ invoices */

export type InvoiceType = "STANDARD" | "PROFORMA" | "CREDIT_NOTE";

export type AdminInvoice = {
  invoiceId: string;
  invoiceNumber: string;
  invoiceType: InvoiceType;
  invoiceDate: string;
  dueDate: string;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  status: string;
  paymentStatus: string;
  currency: string;
  reservationId: string;
  userName: string | null;
  companyType: CompanyType | null;
};

// GET /api/invoices has no server-side type filter — it always returns
// every invoice, sorted by number. Filtered here instead of pretending an
// unsupported query param does something.
export async function getAllInvoices(accessToken: string, type?: InvoiceType): Promise<AdminInvoice[]> {
  const all = await authedGet<AdminInvoice[]>("/invoices", accessToken, []);
  return type ? all.filter((i) => i.invoiceType === type) : all;
}

export function getInvoiceById(accessToken: string, id: string): Promise<AdminInvoice | null> {
  return authedGet<AdminInvoice | null>(`/invoices/${id}`, accessToken, null);
}

/* --------------------------------------------------------------- settings */

export type AdminCampingSettings = {
  maxCapacity: number | null;
  configured: boolean;
  updatedAt: string | null;
};

export function getCampingSettings(accessToken: string): Promise<AdminCampingSettings | null> {
  return authedGet<AdminCampingSettings | null>("/camping-settings", accessToken, null);
}
