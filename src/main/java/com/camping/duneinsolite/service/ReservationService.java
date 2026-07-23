package com.camping.duneinsolite.service;


import com.camping.duneinsolite.dto.request.*;
import com.camping.duneinsolite.dto.response.CampingStatsResponse;
import com.camping.duneinsolite.dto.response.InvoiceResponse;
import com.camping.duneinsolite.dto.response.ReservationResponse;
import com.camping.duneinsolite.model.enums.CompanyType;
import com.camping.duneinsolite.model.enums.ReservationStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public interface ReservationService {
    ReservationResponse createReservation(ReservationRequest request);
    ReservationResponse getReservationById(UUID reservationId);
    List<ReservationResponse> getAllReservations();
    List<ReservationResponse> getReservationsByUser(UUID userId);
    List<ReservationResponse> getNonCompletedReservationsByUser(UUID userId);
    Page<ReservationResponse> getReservationsByStatus(ReservationStatus status, Pageable pageable);
    ReservationResponse updateReservationStatus(UUID reservationId, ReservationStatus status, String rejectionReason, CompanyType companyType, String paymentLink);
    ReservationResponse updateReservation(UUID reservationId, ReservationUpdateRequest request);
    void deleteReservation(UUID reservationId);
    List<ReservationResponse> getMyReservations(UUID userId);
    Page<ReservationResponse> searchReservationsByName(String name, Pageable pageable);


    ReservationResponse addStaffToReservation(UUID reservationId, ReservationStaffRequest request);

    ReservationResponse updateGuide(UUID reservationId, UUID guideId, GuideUpdateRequest request);
    String deleteGuide(UUID reservationId, UUID guideId);
    ReservationResponse updateChauffeur(UUID reservationId, UUID chauffeurId, ChauffeurUpdateRequest request);
    String deleteChauffeur(UUID reservationId, UUID chauffeurId);


    Page<ReservationResponse> getActiveReservations(Pageable pageable);
    Page<ReservationResponse> getActiveReservationsByDate(LocalDate date, Pageable pageable);

    Page<ReservationResponse> getReservationsByDate(LocalDate date, Pageable pageable);
    Page<ReservationResponse> getReservationsFiltered(ReservationStatus status, String name, LocalDate date, Pageable pageable);
    // camping
    Page<ReservationResponse> getCampingActiveReservations(Pageable pageable);
    Page<ReservationResponse> getCampingActiveReservationsByDate(LocalDate date, Pageable pageable);
    Page<ReservationResponse> searchCampingReservationsByName(String name, Pageable pageable);
    Page<ReservationResponse> getCampingReservationsByStatus(ReservationStatus status, Pageable pageable);

    CampingStatsResponse getCampingStats();

    InvoiceResponse generateFactureLater(UUID reservationId, CompanyType companyType);

}
