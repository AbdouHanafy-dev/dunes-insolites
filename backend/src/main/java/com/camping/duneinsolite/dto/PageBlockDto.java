package com.camping.duneinsolite.dto;

import lombok.Data;

/** One block in a Page's content — see model.PageBlock for why dataJson is a flexible string. */
@Data
public class PageBlockDto {
    private String type;
    private String dataJson;
}
