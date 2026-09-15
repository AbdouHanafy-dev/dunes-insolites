package com.camping.duneinsolite.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UuidGenerator;

import java.time.LocalDateTime;
import java.util.UUID;

// The vitrine's newsletter signup (Footer/Newsletter.tsx) used to validate
// the email, return 201, and throw it away - `// TODO: push to the mailing-
// list provider.` literally in the route handler, found in the SEO/vitrine
// audit. This is the real store that TODO was standing in for. No mailing-
// list provider is wired up yet either (Mailchimp/Brevo/etc. all need an
// account + API key this session doesn't have) - subscribers land here for
// now, exportable/queryable directly, rather than continuing to vanish.
@Entity
@Table(name = "newsletter_subscribers")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NewsletterSubscriber {

    @Id
    @GeneratedValue
    @UuidGenerator
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "email", nullable = false, unique = true)
    private String email;

    @Column(name = "subscribed_at", nullable = false)
    @Builder.Default
    private LocalDateTime subscribedAt = LocalDateTime.now();

    // Set once the "site is ready" launch announcement has actually been
    // triggered for this subscriber - makes the admin's send button
    // idempotent (see V9__newsletter_launch_email.sql): pressing it again
    // only reaches subscribers who joined since the last send, never
    // double-emails someone.
    @Column(name = "launch_email_sent_at")
    private LocalDateTime launchEmailSentAt;
}
