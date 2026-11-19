// DESIGN PATTERN: Adapter (Structural)
package com.eventhub.structural.adapter;

import java.util.ArrayList;
import java.util.List;

// DESIGN PATTERN: Adapter (Structural)
public class AdapterPattern {

    // DESIGN PATTERN: Adapter (Structural)
    public interface ModernTicketGateway {
        String issueTicket(String guestName, String eventCode, double priceMdl);
    }

    // DESIGN PATTERN: Adapter (Structural)
    static class LegacyBookingSystem {
        // Sistem vechi cu semnătură incompatibilă (preț în bani și format CSV)
        public String bookOldFormat(String csvPayload, int amountInBani) {
            return "SYNC_OK[" + csvPayload + "|BANI=" + amountInBani + "]";
        }
    }

    // DESIGN PATTERN: Adapter (Structural)
    static class LegacyBookingAdapter implements ModernTicketGateway {
        private final LegacyBookingSystem legacySystem;

        LegacyBookingAdapter(LegacyBookingSystem legacySystem) {
            this.legacySystem = legacySystem;
        }

        @Override
        public String issueTicket(String guestName, String eventCode, double priceMdl) {
            String csv = eventCode.toUpperCase() + ";" + guestName;
            int bani = (int) Math.round(priceMdl * 100);
            return legacySystem.bookOldFormat(csv, bani);
        }
    }

    // DESIGN PATTERN: Adapter (Structural)
    public static List<String> run(String input) {
        List<String> logs = new ArrayList<>();
        String raw = (input == null || input.isBlank()) ? "Elena Moraru | CONF-2026 | 450" : input.trim();
        String[] parts = raw.split("\\|");

        String guest = parts.length > 0 && !parts[0].isBlank() ? parts[0].trim() : "Elena Moraru";
        String code = parts.length > 1 && !parts[1].isBlank() ? parts[1].trim() : "CONF-2026";
        double price = 450.0;
        if (parts.length > 2) {
            try { price = Double.parseDouble(parts[2].trim()); } catch (NumberFormatException ignored) {}
        }

        ModernTicketGateway gateway = new LegacyBookingAdapter(new LegacyBookingSystem());
        logs.add("[Adapter] EventHub apelează interfața modernă ModernTicketGateway.issueTicket(...).");
        logs.add("[Adapter] LegacyBookingAdapter traduce '" + guest + "', '" + code + "', " + price + " MDL în format CSV + bani.");

        String legacyResponse = gateway.issueTicket(guest, code, price);
        logs.add("[Adapter] Răspuns sistem extern adaptat -> " + legacyResponse);
        return logs;
    }
}
