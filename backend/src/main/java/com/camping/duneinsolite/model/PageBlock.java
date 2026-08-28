package com.camping.duneinsolite.model;

import jakarta.persistence.*;
import lombok.*;

/**
 * One block in a Page's ordered content — a Payload-style block-based page
 * builder. `type` picks the block (e.g. "hero", "richText", "cta",
 * "accommodationShowcase"); `dataJson` holds that block's own fields as a
 * JSON string. A single flexible payload column rather than one entity per
 * block type — 14+ block types with their own relational schema is a much
 * bigger, slower-to-extend model for the same information, and nothing here
 * needs to be queried by a block's internal fields.
 */
@Embeddable
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class PageBlock {

    @Column(name = "type", nullable = false)
    private String type;

    @Column(name = "data_json", columnDefinition = "TEXT")
    private String dataJson;
}
