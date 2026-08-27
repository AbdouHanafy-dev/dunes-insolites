import { getTranslations } from "next-intl/server";
import { getSession } from "@/lib/session";
import { getMyReservations, getMyReviews } from "@/lib/api";
import ReviewForm, { type ReviewableItem } from "@/components/ReviewForm";

export default async function AccountReviewsPage() {
  const t = await getTranslations("account");
  const session = await getSession();
  if (!session) return null;

  const [reservations, myReviews] = await Promise.all([
    getMyReservations(session.accessToken),
    getMyReviews(session.accessToken),
  ]);

  const reviewedIds = new Set(myReviews.content.map((r) => r.productId));

  const reviewable: ReviewableItem[] = reservations
    .flatMap((r) => [
      ...r.tourTypes
        .filter((l) => l.catalogTourTypeId)
        .map((l) => ({ catalogId: l.catalogTourTypeId!, name: l.name, productType: "TOURTYPE" as const })),
      ...r.tours
        .filter((l) => l.catalogTourId)
        .map((l) => ({ catalogId: l.catalogTourId!, name: l.name, productType: "TOUR" as const })),
      ...r.extras.map((l) => ({ catalogId: l.catalogExtraId, name: l.name, productType: "EXTRA" as const })),
    ])
    .filter((item, i, arr) => arr.findIndex((x) => x.catalogId === item.catalogId) === i)
    .filter((item) => !reviewedIds.has(item.catalogId));

  return (
    <div className="book-card">
      <h2>{t("reviewsTitle")}</h2>
      <p className="hint">{t("reviewsLead")}</p>

      {myReviews.content.length === 0 ? (
        <p className="account-empty">{t("reviewsEmpty")}</p>
      ) : (
        <div className="account-list" style={{ marginTop: 32 }}>
          {myReviews.content.map((r) => (
            <div
              key={r.reviewId}
              className="ticket"
              style={{ maxWidth: "none", boxShadow: "none", padding: "24px 32px" }}
            >
              <div className="rows">
                <div>
                  <div className="k">{t("reviewRatingLabel")}</div>
                  <div className="v">{r.rating} / 5</div>
                </div>
                <div>
                  <div className="k">{t("dateLabel")}</div>
                  <div className="v">{new Date(r.createdAt).toLocaleDateString()}</div>
                </div>
              </div>
              {r.comment && <p style={{ marginTop: 16, lineHeight: 1.6 }}>{r.comment}</p>}
            </div>
          ))}
        </div>
      )}

      {reviewable.length > 0 && (
        <>
          <h2 style={{ marginTop: 48 }}>{t("reviewFormTitle")}</h2>
          <p className="hint">{t("reviewNoPhotosNote")}</p>
          <div style={{ marginTop: 24 }}>
            <ReviewForm items={reviewable} />
          </div>
        </>
      )}
    </div>
  );
}
