package com.camping.duneinsolite.model;

import com.camping.duneinsolite.model.enums.MealFormat;
import com.camping.duneinsolite.model.enums.MealType;
import jakarta.persistence.*;
import lombok.*;

@Embeddable
@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class Meal {

    @Enumerated(EnumType.STRING)
    @Column(name = "meal_type", nullable = false)
    private MealType mealType;

    @Enumerated(EnumType.STRING)
    @Column(name = "meal_format", nullable = false)
    private MealFormat format;
}
