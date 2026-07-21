package com.camping.duneinsolite.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SnapshotLineDto {
    private Integer lineNumber;
    private String  description;
    private String  itemType;
    private Integer quantity;
    private Double  unitPrice;
    private Double  tva;
    private String  activityDate;
    private String  activityEndDate;
}
