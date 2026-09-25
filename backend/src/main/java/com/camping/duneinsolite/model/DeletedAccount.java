package com.camping.duneinsolite.model;

import java.util.UUID;

/**
 * The stand-in owner of reservations whose customer account was deleted.
 *
 * <p>A reservation cannot exist without a user (its {@code user_id} is mandatory and it
 * carries no customer name of its own), so deleting an account re-points its reservations
 * here: the booking stays for stock and history, the person is no longer linked to it.
 * The row is created by V56 and has no Keycloak identity, so nobody can log in as it, and
 * it is hidden from the client lists. Mail addressed to it is dropped.
 */
public final class DeletedAccount {

    public static final UUID USER_ID = UUID.fromString("00000000-0000-4000-8000-00000000de1e");
    public static final String EMAIL = "client-supprime@dunes-insolites.invalid";
    public static final String NAME = "Client supprimé";

    private DeletedAccount() {}

    public static boolean isEmail(String email) {
        return EMAIL.equalsIgnoreCase(email);
    }
}
