package com.camping.duneinsolite.service.impl;

import com.camping.duneinsolite.exception.ResourceNotFoundException;
import com.camping.duneinsolite.model.NewsletterSubscriber;
import com.camping.duneinsolite.repository.NewsletterSubscriberRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class NewsletterServiceImplTest {

    private NewsletterSubscriberRepository repository;
    private NewsletterServiceImpl service;

    @BeforeEach
    void setUp() {
        repository = mock(NewsletterSubscriberRepository.class);
        service = new NewsletterServiceImpl(repository, mock(EmailService.class));
    }

    @Test
    void deleteSubscriberRemovesTheRequestedAddress() {
        UUID id = UUID.randomUUID();
        NewsletterSubscriber subscriber = NewsletterSubscriber.builder()
                .id(id)
                .email("guest@example.com")
                .build();
        when(repository.findById(id)).thenReturn(Optional.of(subscriber));

        service.deleteSubscriber(id);

        verify(repository).delete(subscriber);
    }

    @Test
    void deleteSubscriberRejectsAnUnknownId() {
        UUID id = UUID.randomUUID();
        when(repository.findById(id)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.deleteSubscriber(id))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining(id.toString());
    }

    @Test
    void deleteAllSubscribersClearsTheListAndReturnsThePreviousCount() {
        when(repository.count()).thenReturn(3L);

        long deleted = service.deleteAllSubscribers();

        assertThat(deleted).isEqualTo(3L);
        verify(repository).deleteAllInBatch();
    }
}
