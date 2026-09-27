package com.camping.duneinsolite.service.impl;

import com.camping.duneinsolite.mail.ReservationOverview;
import com.camping.duneinsolite.mail.StaffBookingMailer;
import com.camping.duneinsolite.model.DeletedAccount;
import com.camping.duneinsolite.model.User;
import com.camping.duneinsolite.model.enums.EmailType;
import com.camping.duneinsolite.model.enums.ReservationType;
import com.camping.duneinsolite.model.enums.UserRole;
import com.camping.duneinsolite.repository.UserRepository;
import com.camping.duneinsolite.service.EmailDispatchService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

class StaffBookingNotifierTest {

    private final UUID reservationId = UUID.randomUUID();
    private final UUID dispatchId = UUID.randomUUID();

    private ReservationOverviewFactory factory;
    private UserRepository users;
    private EmailDispatchService dispatch;
    private StaffBookingMailer mailer;
    private StaffBookingNotifier notifier;

    @BeforeEach
    void setUp() {
        factory = mock(ReservationOverviewFactory.class);
        users = mock(UserRepository.class);
        dispatch = mock(EmailDispatchService.class);
        mailer = mock(StaffBookingMailer.class);
        notifier = new StaffBookingNotifier(factory, users, dispatch, mailer);
        ReflectionTestUtils.setField(notifier, "configuredRecipients", "");
        ReflectionTestUtils.setField(notifier, "configuredCircuitRecipients", "");
        when(users.findAllByRole(UserRole.ADMIN)).thenReturn(List.of(
                User.builder().email("owner@example.com").build(),
                User.builder().email("second@example.com").build()));
        when(dispatch.claim(any(), any(EmailType.class), anyString(), any()))
                .thenReturn(new EmailDispatchService.Claim(dispatchId, false, 1));
        stubFacts("Site web", ReservationType.HEBERGEMENT);
    }

    private void stubFacts(String source, ReservationType type) {
        var overview = new ReservationOverview("DI-1", LocalDate.of(2026, 10, 5), null, 2, 0, 0, List.of(),
                BigDecimal.TEN, List.of(), BigDecimal.TEN, BigDecimal.ZERO, BigDecimal.TEN, "EUR");
        when(factory.staffFacts(reservationId)).thenReturn(new ReservationOverviewFactory.StaffFacts(
                source, "Marie", "marie@example.com", "+216 1", "fr", type, overview));
    }

    @Test
    @SuppressWarnings("unchecked")
    void aSiteBookingIsAnnouncedToEveryAdminByDefault() {
        notifier.notifyNewBooking(reservationId, "corr");

        ArgumentCaptor<List<String>> to = ArgumentCaptor.forClass(List.class);
        ArgumentCaptor<StaffBookingMailer.Customer> customer = ArgumentCaptor.forClass(StaffBookingMailer.Customer.class);
        verify(mailer).send(to.capture(), eq(StaffBookingMailer.Kind.NEW), any(), customer.capture(),
                eq("https://admin.dunesinsolites.com/reservations/" + reservationId));
        assertThat(to.getValue()).containsExactly("owner@example.com", "second@example.com");
        assertThat(customer.getValue().language()).isEqualTo("Français");
        verify(dispatch).claim(eq(reservationId), eq(EmailType.STAFF_NEW_BOOKING), anyString(), eq("corr"));
        verify(dispatch).markSent(dispatchId);
    }

    @Test
    void confirmedAndCancelledUseTheirOwnEmailTypeAndKind() {
        notifier.notifyConfirmed(reservationId, null);
        verify(dispatch).claim(eq(reservationId), eq(EmailType.STAFF_RESERVATION_CONFIRMED), anyString(), any());
        verify(mailer).send(anyList(), eq(StaffBookingMailer.Kind.CONFIRMED), any(), any(), anyString());

        notifier.notifyCancelled(reservationId, null);
        verify(dispatch).claim(eq(reservationId), eq(EmailType.STAFF_RESERVATION_CANCELLED), anyString(), any());
        verify(mailer).send(anyList(), eq(StaffBookingMailer.Kind.CANCELLED), any(), any(), anyString());
    }

    @Test
    @SuppressWarnings("unchecked")
    void aStayGoesToTheDunesInsolitesListAndACircuitToTheRouteInsoliteList() {
        ReflectionTestUtils.setField(notifier, "configuredRecipients", "dunes@example.com");
        ReflectionTestUtils.setField(notifier, "configuredCircuitRecipients", "route@example.com");

        stubFacts("Site web", ReservationType.HEBERGEMENT);
        notifier.notifyNewBooking(reservationId, null);
        ArgumentCaptor<List<String>> stayTo = ArgumentCaptor.forClass(List.class);
        verify(mailer).send(stayTo.capture(), eq(StaffBookingMailer.Kind.NEW), any(), any(), anyString());
        assertThat(stayTo.getValue()).containsExactly("dunes@example.com");

        stubFacts("Site web", ReservationType.TOURS);
        notifier.notifyConfirmed(reservationId, null);
        ArgumentCaptor<List<String>> circuitTo = ArgumentCaptor.forClass(List.class);
        verify(mailer).send(circuitTo.capture(), eq(StaffBookingMailer.Kind.CONFIRMED), any(), any(), anyString());
        assertThat(circuitTo.getValue()).containsExactly("route@example.com");
    }

    @Test
    void anEmptyCircuitListFallsBackToAdminsOnItsOwnWithoutBorrowingTheStayList() {
        ReflectionTestUtils.setField(notifier, "configuredRecipients", "dunes@example.com");
        // configuredCircuitRecipients stays blank.
        stubFacts("Site web", ReservationType.TOURS);

        assertThat(notifier.recipients(ReservationType.TOURS)).containsExactly("owner@example.com", "second@example.com");
    }

    @Test
    @SuppressWarnings("unchecked")
    void configuredAddressesReplaceTheAdminList() {
        ReflectionTestUtils.setField(notifier, "configuredRecipients", " me@example.com , camp@example.com ,, ");

        notifier.notifyNewBooking(reservationId, null);

        ArgumentCaptor<List<String>> to = ArgumentCaptor.forClass(List.class);
        verify(mailer).send(to.capture(), any(), any(), any(), anyString());
        assertThat(to.getValue()).containsExactly("me@example.com", "camp@example.com");
    }

    @Test
    void theDeletedAccountPlaceholderIsNeverMailed() {
        when(users.findAllByRole(UserRole.ADMIN)).thenReturn(List.of(
                User.builder().email(DeletedAccount.EMAIL).build(), User.builder().email("owner@example.com").build()));

        assertThat(notifier.recipients()).containsExactly("owner@example.com");
    }

    @Test
    void aBookingEnteredByTheTeamIsNotAnnounced() {
        stubFacts("Téléphone", ReservationType.HEBERGEMENT);

        notifier.notifyNewBooking(reservationId, null);
        notifier.notifyConfirmed(reservationId, null);
        notifier.notifyCancelled(reservationId, null);

        verifyNoInteractions(mailer);
        verify(dispatch, never()).claim(any(), any(), anyString(), any());
    }

    @Test
    void aRedeliveredMessageDoesNotMailTwice() {
        when(dispatch.claim(any(), eq(EmailType.STAFF_NEW_BOOKING), anyString(), any()))
                .thenReturn(new EmailDispatchService.Claim(dispatchId, true, 1));

        notifier.notifyNewBooking(reservationId, null);

        verifyNoInteractions(mailer);
    }

    @Test
    void aMailFailureIsRecordedButNeverThrown() {
        doThrow(new IllegalStateException("smtp down")).when(mailer).send(anyList(), any(), any(), any(), anyString());

        notifier.notifyNewBooking(reservationId, null); // must not throw

        verify(dispatch).markFailed(eq(dispatchId), contains("smtp down"));
        verify(dispatch, never()).markSent(any());
    }

    @Test
    void noRecipientMeansNoMailAndNoCrash() {
        when(users.findAllByRole(UserRole.ADMIN)).thenReturn(List.of());

        notifier.notifyNewBooking(reservationId, null);

        verifyNoInteractions(mailer);
    }
}
